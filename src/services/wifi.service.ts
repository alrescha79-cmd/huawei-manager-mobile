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
        </request>`;
      
      await this.apiClient.post('/api/wlan/basic-settings', settingsData);
      return true;
    } catch (error) {
      console.error('Error setting WiFi settings:', error);
      throw error;
    }
  }

  async kickDevice(macAddress: string): Promise<boolean> {
    try {
      const kickData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <MacAddress>${macAddress}</MacAddress>
        </request>`;
      
      await this.apiClient.post('/api/wlan/kick-device', kickData);
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
