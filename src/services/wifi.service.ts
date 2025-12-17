import { ModemAPIClient } from './api.service';
import { ConnectedDevice, WiFiSettings } from '@/types';
import { parseXMLValue } from '@/utils/helpers';

export class WiFiService {
  private apiClient: ModemAPIClient;

  constructor(modemIp: string) {
    this.apiClient = new ModemAPIClient(modemIp);
  }

  async getConnectedDevices(): Promise<ConnectedDevice[]> {
    try {
      const response = await this.apiClient.get('/api/wlan/host-list');

      const devices: ConnectedDevice[] = [];
      const hostsXML = response.match(/<Host>(.*?)<\/Host>/gs);

      if (hostsXML) {
        hostsXML.forEach((hostXML) => {
          devices.push({
            macAddress: parseXMLValue(hostXML, 'MacAddress'),
            ipAddress: parseXMLValue(hostXML, 'IpAddress'),
            hostName: parseXMLValue(hostXML, 'HostName'),
            id: parseXMLValue(hostXML, 'ID'),
            associatedTime: parseXMLValue(hostXML, 'AssociatedTime'),
            isBlock: parseXMLValue(hostXML, 'IsBlock') === '1',
          });
        });
      }

      return devices;
    } catch (error) {
      console.error('Error getting connected devices:', error);
      throw error;
    }
  }

  async getWiFiSettings(): Promise<WiFiSettings> {
    try {
      const response = await this.apiClient.get('/api/wlan/basic-settings');

      return {
        ssid: parseXMLValue(response, 'WifiSsid'),
        password: parseXMLValue(response, 'WifiWepKey1') || parseXMLValue(response, 'WifiWpaPreSharedKey'),
        wifiEnable: parseXMLValue(response, 'WifiEnable') === '1',
        channel: parseXMLValue(response, 'WifiChannel'),
        band: parseXMLValue(response, 'WifiBand'),
        maxAssoc: parseXMLValue(response, 'WifiMaxassoc'),
        wifiMode: parseXMLValue(response, 'WifiMode'),
        securityMode: parseXMLValue(response, 'WifiAuthmode'),
      };
    } catch (error) {
      console.error('Error getting WiFi settings:', error);
      throw error;
    }
  }

  async setWiFiSettings(settings: Partial<WiFiSettings>): Promise<boolean> {
    try {
      const settingsData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          ${settings.ssid ? `<WifiSsid>${settings.ssid}</WifiSsid>` : ''}
          ${settings.password ? `<WifiWpaPreSharedKey>${settings.password}</WifiWpaPreSharedKey>` : ''}
          ${settings.wifiEnable !== undefined ? `<WifiEnable>${settings.wifiEnable ? '1' : '0'}</WifiEnable>` : ''}
          ${settings.channel ? `<WifiChannel>${settings.channel}</WifiChannel>` : ''}
          ${settings.band ? `<WifiBand>${settings.band}</WifiBand>` : ''}
          ${settings.maxAssoc ? `<WifiMaxassoc>${settings.maxAssoc}</WifiMaxassoc>` : ''}
          ${settings.securityMode ? `<WifiAuthmode>${settings.securityMode}</WifiAuthmode>` : ''}
        </request>`;

      await this.apiClient.post('/api/wlan/basic-settings', settingsData);
      return true;
    } catch (error) {
      console.error('Error setting WiFi settings:', error);
      throw error;
    }
  }

  async getGuestWiFiSettings(): Promise<{ enabled: boolean, ssid: string, password: string, securityMode: string }> {
    try {
      const response = await this.apiClient.get('/api/wlan/guest-basic-settings');

      return {
        enabled: parseXMLValue(response, 'WifiGuestEnable') === '1',
        ssid: parseXMLValue(response, 'WifiGuestSsid'),
        password: parseXMLValue(response, 'WifiGuestWpaPreSharedKey'),
        securityMode: parseXMLValue(response, 'WifiGuestAuthmode'),
      };
    } catch (error) {
      console.error('Error getting guest WiFi settings:', error);
      // Return default values if endpoint doesn't exist
      return { enabled: false, ssid: '', password: '', securityMode: '' };
    }
  }

  async toggleGuestWiFi(enable: boolean): Promise<boolean> {
    try {
      const toggleData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <WifiGuestEnable>${enable ? '1' : '0'}</WifiGuestEnable>
        </request>`;

      await this.apiClient.post('/api/wlan/guest-basic-settings', toggleData);
      return true;
    } catch (error) {
      console.error('Error toggling guest WiFi:', error);
      throw error;
    }
  }

  async kickDevice(macAddress: string): Promise<boolean> {
    try {
      // Huawei modems typically use MAC filter to block devices
      // First, get current MAC filter settings
      const currentFilterResponse = await this.apiClient.get('/api/wlan/mac-filter').catch(() => null);

      // Get current blocked MACs
      let currentBlockedMacs: string[] = [];
      if (currentFilterResponse) {
        const macListMatch = currentFilterResponse.match(/<MACAddress>(.*?)<\/MACAddress>/gs);
        if (macListMatch) {
          currentBlockedMacs = macListMatch.map(m => parseXMLValue(m, 'MACAddress')).filter(Boolean);
        }
      }

      // Add the new MAC to the blocklist if not already there
      if (!currentBlockedMacs.includes(macAddress)) {
        currentBlockedMacs.push(macAddress);
      }

      // Build MAC filter entries XML
      const macEntriesXml = currentBlockedMacs.map((mac, index) =>
        `<Ssids><Index>${index}</Index><WifiMacFilterMac>${mac}</WifiMacFilterMac></Ssids>`
      ).join('');

      // Set MAC filter to deny mode with the blocked MACs
      const filterData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <WifiMacFilterEnable>1</WifiMacFilterEnable>
          <WifiMacFilterPolicy>1</WifiMacFilterPolicy>
          ${macEntriesXml}
        </request>`;

      await this.apiClient.post('/api/wlan/mac-filter', filterData);

      // Also try the direct host control endpoint as fallback
      try {
        const hostControlData = `<?xml version="1.0" encoding="UTF-8"?>
          <request>
            <Hosts>
              <Host>
                <MacAddress>${macAddress}</MacAddress>
                <IsBlock>1</IsBlock>
              </Host>
            </Hosts>
          </request>`;
        await this.apiClient.post('/api/wlan/host-setting', hostControlData);
      } catch (e) {
        // Host setting endpoint may not exist on all models
      }

      // Schedule removal from blocklist after 10 seconds
      // This allows the device to be kicked but can reconnect later
      setTimeout(async () => {
        try {
          const updatedMacs = currentBlockedMacs.filter(m => m !== macAddress);
          const updatedMacEntriesXml = updatedMacs.map((mac, index) =>
            `<Ssids><Index>${index}</Index><WifiMacFilterMac>${mac}</WifiMacFilterMac></Ssids>`
          ).join('');

          const unblockData = `<?xml version="1.0" encoding="UTF-8"?>
            <request>
              <WifiMacFilterEnable>${updatedMacs.length > 0 ? '1' : '0'}</WifiMacFilterEnable>
              <WifiMacFilterPolicy>1</WifiMacFilterPolicy>
              ${updatedMacEntriesXml}
            </request>`;

          await this.apiClient.post('/api/wlan/mac-filter', unblockData);
        } catch (e) {
          console.log('Failed to unblock MAC after timeout:', e);
        }
      }, 10000);

      return true;
    } catch (error) {
      console.error('Error kicking device:', error);
      throw error;
    }
  }

  async toggleWiFi(enable: boolean): Promise<boolean> {
    try {
      const toggleData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <WifiEnable>${enable ? '1' : '0'}</WifiEnable>
        </request>`;

      await this.apiClient.post('/api/wlan/wifi-switch', toggleData);
      return true;
    } catch (error) {
      console.error('Error toggling WiFi:', error);
      throw error;
    }
  }
}
