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

      if (typeof response === 'string') {
        const hostsXML = response.match(/<Host>([\s\S]*?)<\/Host>/g);
        if (hostsXML) {
          hostsXML.forEach((hostXML) => {
            const hostName = parseXMLValue(hostXML, 'HostName');
            const actualName = parseXMLValue(hostXML, 'ActualName');
            const displayName = actualName || hostName;

            devices.push({
              macAddress: parseXMLValue(hostXML, 'MacAddress'),
              ipAddress: parseXMLValue(hostXML, 'IpAddress'),
              hostName: displayName,
              id: parseXMLValue(hostXML, 'ID'),
              associatedTime: parseXMLValue(hostXML, 'AssociatedTime') || '0',
              isBlock: parseXMLValue(hostXML, 'IsBlock') === '1',
            });
          });
        }
      }

      // Try to get AssociatedTime from HostInfo API
      try {
        const hostInfoResponse = await this.apiClient.get('/api/system/HostInfo');
        let hostInfoList: any[] = [];

        if (typeof hostInfoResponse === 'string') {
          hostInfoList = JSON.parse(hostInfoResponse);
        } else if (Array.isArray(hostInfoResponse)) {
          hostInfoList = hostInfoResponse;
        }

        if (Array.isArray(hostInfoList)) {
          // Create a map of MAC address to AssociatedTime
          const timeMap = new Map<string, number>();
          hostInfoList.forEach((host: any) => {
            if (host.MACAddress && host.AssociatedTime) {
              timeMap.set(host.MACAddress.toUpperCase(), host.AssociatedTime);
            }
          });

          // Update devices with AssociatedTime
          devices.forEach((device) => {
            const time = timeMap.get(device.macAddress.toUpperCase());
            if (time) {
              device.associatedTime = String(time);
            }
          });
        }
      } catch (hostInfoError) {
        // Ignore error, keep original AssociatedTime
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

  async getGuestWiFiSettings(): Promise<{
    enabled: boolean;
    ssid: string;
    password: string;
    securityMode: string;
    duration: string;
  }> {
    try {
      const response = await this.apiClient.get('/api/wlan/multi-basic-settings');

      // Parse nested Ssid structure - Index 1 is Guest WiFi
      const ssidMatches = response.match(/<Ssid>([\s\S]*?)<\/Ssid>/g);

      if (ssidMatches) {
        for (const ssidXml of ssidMatches) {
          const index = parseXMLValue(ssidXml, 'Index');
          const isGuest = parseXMLValue(ssidXml, 'wifiisguestnetwork') === '1';

          if (index === '1' || isGuest) {
            return {
              enabled: parseXMLValue(ssidXml, 'WifiEnable') === '1',
              ssid: parseXMLValue(ssidXml, 'WifiSsid') || '',
              password: parseXMLValue(ssidXml, 'WifiWpapsk') || '',
              securityMode: parseXMLValue(ssidXml, 'WifiAuthmode') || 'OPEN',
              duration: parseXMLValue(ssidXml, 'wifiguestofftime') || '0',
            };
          }
        }
      }

      return { enabled: false, ssid: '', password: '', securityMode: 'OPEN', duration: '0' };
    } catch (error) {
      console.error('Error getting guest WiFi settings:', error);
      return { enabled: false, ssid: '', password: '', securityMode: 'OPEN', duration: '0' };
    }
  }

  async getGuestTimeRemaining(): Promise<{
    remainingSeconds: number;
    isActive: boolean;
  }> {
    try {
      const response = await this.apiClient.get('/api/wlan/guesttime-setting');
      const remaintime = parseXMLValue(response, 'remaintime') || '0';
      const isvalidtime = parseXMLValue(response, 'isvalidtime') || '0';

      return {
        remainingSeconds: parseInt(remaintime, 10) || 0,
        isActive: isvalidtime === '1',
      };
    } catch (error) {
      console.error('Error getting guest time remaining:', error);
      return { remainingSeconds: 0, isActive: false };
    }
  }

  async extendGuestWiFiTime(): Promise<boolean> {
    try {
      const data = `<?xml version="1.0" encoding="UTF-8"?><request><extendtime>30</extendtime></request>`;
      const response = await this.apiClient.post('/api/wlan/guesttime-setting', data);

      if (response.includes('<error>')) {
        throw new Error('Failed to extend guest WiFi time');
      }
      return true;
    } catch (error) {
      console.error('Error extending guest WiFi time:', error);
      throw error;
    }
  }

  async toggleGuestWiFi(enable: boolean): Promise<boolean> {
    return this.updateGuestWiFiSettings({ enabled: enable });
  }

  async updateGuestWiFiSettings(settings: {
    enabled?: boolean;
    ssid?: string;
    password?: string;
    securityMode?: string;
    duration?: string;
  }): Promise<boolean> {
    try {
      // First get current settings to preserve ALL values
      const currentResponse = await this.apiClient.get('/api/wlan/multi-basic-settings');

      // Parse both SSIDs from current settings
      const ssidMatches = currentResponse.match(/<Ssid>([\s\S]*?)<\/Ssid>/g);
      if (!ssidMatches || ssidMatches.length < 2) {
        throw new Error('Could not find SSIDs in settings');
      }

      // Extract values from main SSID (Index 0)
      const mainSsid = ssidMatches[0];
      const mainIndex = parseXMLValue(mainSsid, 'Index') || '0';
      const mainAuthmode = parseXMLValue(mainSsid, 'WifiAuthmode') || 'WPA2-PSK';
      const mainWepKeyIndex = parseXMLValue(mainSsid, 'WifiWepKeyIndex') || '1';
      const mainEncrypt = parseXMLValue(mainSsid, 'WifiWpaencryptionmodes') || 'AES';
      const mainBroadcast = parseXMLValue(mainSsid, 'WifiBroadcast') || '0';
      const mainMac = parseXMLValue(mainSsid, 'WifiMac') || '';
      const mainIsGuest = parseXMLValue(mainSsid, 'wifiisguestnetwork') || '0';
      const mainOfftime = parseXMLValue(mainSsid, 'wifiguestofftime') || '4';
      const mainId = parseXMLValue(mainSsid, 'ID') || '';
      const mainEnable = parseXMLValue(mainSsid, 'WifiEnable') || '1';

      // Extract current values from guest SSID (Index 1)
      const guestSsidXml = ssidMatches[1];
      const guestIndex = parseXMLValue(guestSsidXml, 'Index') || '1';
      const guestWepKeyIndex = parseXMLValue(guestSsidXml, 'WifiWepKeyIndex') || '1';
      const guestBroadcast = parseXMLValue(guestSsidXml, 'WifiBroadcast') || '0';
      const guestMac = parseXMLValue(guestSsidXml, 'WifiMac') || '';
      const guestId = parseXMLValue(guestSsidXml, 'ID') || '';

      // Use provided values or fall back to current
      const guestEnabled = settings.enabled !== undefined ? (settings.enabled ? '1' : '0') : parseXMLValue(guestSsidXml, 'WifiEnable') || '0';
      const guestSsidName = settings.ssid !== undefined ? settings.ssid : parseXMLValue(guestSsidXml, 'WifiSsid') || '';
      const guestAuthmode = settings.securityMode !== undefined ? settings.securityMode : parseXMLValue(guestSsidXml, 'WifiAuthmode') || 'OPEN';
      const guestPassword = settings.password !== undefined ? settings.password : parseXMLValue(guestSsidXml, 'WifiWpapsk') || '';
      const guestOfftime = settings.duration !== undefined ? settings.duration : parseXMLValue(guestSsidXml, 'wifiguestofftime') || '0';
      const guestBasicEncrypt = guestAuthmode === 'OPEN' ? 'NONE' : '';
      const guestWpaEncrypt = guestAuthmode !== 'OPEN' ? 'AES' : '';

      // Build the full request with both SSIDs
      const updateData = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<Ssids>
<Ssid>
<Index>${mainIndex}</Index>
<WifiAuthmode>${mainAuthmode}</WifiAuthmode>
<WifiWepKeyIndex>${mainWepKeyIndex}</WifiWepKeyIndex>
<WifiWpaencryptionmodes>${mainEncrypt}</WifiWpaencryptionmodes>
<WifiBroadcast>${mainBroadcast}</WifiBroadcast>
<WifiMac>${mainMac}</WifiMac>
<wifiisguestnetwork>${mainIsGuest}</wifiisguestnetwork>
<wifiguestofftime>${mainOfftime}</wifiguestofftime>
<ID>${mainId}</ID>
<wifisupportsecmodelist></wifisupportsecmodelist>
<WifiEnable>${mainEnable}</WifiEnable>
</Ssid>
<Ssid>
<Index>${guestIndex}</Index>
<WifiSsid>${guestSsidName}</WifiSsid>
<WifiAuthmode>${guestAuthmode}</WifiAuthmode>
<WifiWepKeyIndex>${guestWepKeyIndex}</WifiWepKeyIndex>
<WifiBroadcast>${guestBroadcast}</WifiBroadcast>
<WifiMac>${guestMac}</WifiMac>
${guestBasicEncrypt ? `<WifiBasicencryptionmodes>${guestBasicEncrypt}</WifiBasicencryptionmodes>` : ''}
${guestWpaEncrypt ? `<WifiWpaencryptionmodes>${guestWpaEncrypt}</WifiWpaencryptionmodes>` : ''}
${guestPassword ? `<WifiWpapsk>${guestPassword}</WifiWpapsk>` : ''}
<wifiisguestnetwork>1</wifiisguestnetwork>
<wifiguestofftime>${guestOfftime}</wifiguestofftime>
<ID>${guestId}</ID>
<wifisupportsecmodelist></wifisupportsecmodelist>
<WifiEnable>${guestEnabled}</WifiEnable>
</Ssid>
</Ssids>
<WifiRestart>1</WifiRestart>
<modify_guest_ssid>1</modify_guest_ssid>
</request>`;

      const response = await this.apiClient.post('/api/wlan/multi-basic-settings', updateData);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Guest WiFi update failed: ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating guest WiFi settings:', error);
      throw error;
    }
  }
  // Block device internet access using MAC filter
  async kickDevice(macAddress: string): Promise<boolean> {
    try {
      // Block device by adding MAC to blacklist
      const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<Ssids>
<Ssid>
<WifiMacFilterStatus>2</WifiMacFilterStatus>
<Index>0</Index>
<WifiMacFilterMac0>${macAddress}</WifiMacFilterMac0>
<wifihostname0></wifihostname0>
</Ssid>
</Ssids>
</request>`;

      const response = await this.apiClient.post('/api/wlan/multi-macfilter-settings', data);

      if (response.includes('<error>')) {
        throw new Error('Failed to block device');
      }

      return true;
    } catch (error) {
      console.error('Error blocking device:', error);
      throw error;
    }
  }

  // Unblock device to restore internet access
  async unblockDevice(macAddress: string): Promise<boolean> {
    try {
      // Unblock device by removing MAC from blacklist (empty value)
      const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<Ssids>
<Ssid>
<WifiMacFilterMac0></WifiMacFilterMac0>
<wifihostname0></wifihostname0>
<WifiMacFilterStatus>2</WifiMacFilterStatus>
<Index>0</Index>
</Ssid>
</Ssids>
</request>`;

      const response = await this.apiClient.post('/api/wlan/multi-macfilter-settings', data);

      if (response.includes('<error>')) {
        throw new Error('Failed to unblock device');
      }

      return true;
    } catch (error) {
      console.error('Error unblocking device:', error);
      throw error;
    }
  }

  // Get list of blocked devices
  async getBlockedDevices(): Promise<{ macAddress: string; hostName: string }[]> {
    try {
      const response = await this.apiClient.get('/api/wlan/multi-macfilter-settings-ex');
      const blockedDevices: { macAddress: string; hostName: string }[] = [];

      // Parse blocked devices from wifimacblacklist tag
      // Format: <WifiMacFilterMac0>MAC</WifiMacFilterMac0><wifihostname0>NAME</wifihostname0>
      for (let i = 0; i < 16; i++) {
        const macTag = `WifiMacFilterMac${i}`;
        const hostTag = `wifihostname${i}`;

        const macMatch = response.match(new RegExp(`<${macTag}>([^<]*)</${macTag}>`));
        const hostMatch = response.match(new RegExp(`<${hostTag}>([^<]*)</${hostTag}>`));

        if (macMatch && macMatch[1] && macMatch[1].trim() !== '') {
          blockedDevices.push({
            macAddress: macMatch[1].trim(),
            hostName: hostMatch ? hostMatch[1].trim() : '',
          });
        }
      }

      return blockedDevices;
    } catch (error) {
      console.error('Error getting blocked devices:', error);
      return [];
    }
  }

  async toggleWiFi(enable: boolean): Promise<boolean> {
    try {
      // Try primary endpoint first (wifi-switch)
      const toggleData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <WifiEnable>${enable ? '1' : '0'}</WifiEnable>
        </request>`;

      try {
        await this.apiClient.post('/api/wlan/wifi-switch', toggleData);
        return true;
      } catch (primaryError) {
        // If primary endpoint fails, try alternative endpoint (basic-settings)
        console.log('Primary wifi-switch failed, trying basic-settings...');

        const basicSettingsData = `<?xml version="1.0" encoding="UTF-8"?>
          <request>
            <WifiEnable>${enable ? '1' : '0'}</WifiEnable>
          </request>`;

        await this.apiClient.post('/api/wlan/basic-settings', basicSettingsData);
        return true;
      }
    } catch (error) {
      console.error('Error toggling WiFi:', error);
      throw error;
    }
  }

  // ============ Parental Control ============

  async getParentalControlEnabled(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/api/timerule/timerule');
      // Check if there are any enabled rules
      const rulesXML = response.match(/<TimeControlRule>([\s\S]*?)<\/TimeControlRule>/g);
      if (rulesXML) {
        return rulesXML.some(rule => parseXMLValue(rule, 'Enable') === '1');
      }
      return false;
    } catch (error) {
      console.error('Error getting parental control status:', error);
      return false;
    }
  }

  async toggleParentalControl(enable: boolean): Promise<boolean> {
    // This modem doesn't have a global toggle - each rule has its own enable
    // For now, just return true
    return true;
  }

  async getParentalControlProfiles(): Promise<{
    id: string;
    name: string;
    deviceMacs: string[];
    deviceNames: string[];
    startTime: string;
    endTime: string;
    activeDays: number[];
    enabled: boolean;
  }[]> {
    try {
      const response = await this.apiClient.get('/api/timerule/timerule');

      const profiles: {
        id: string;
        name: string;
        deviceMacs: string[];
        deviceNames: string[];
        startTime: string;
        endTime: string;
        activeDays: number[];
        enabled: boolean;
      }[] = [];

      const rulesXML = response.match(/<TimeControlRule>([\s\S]*?)<\/TimeControlRule>/g);

      if (rulesXML) {
        rulesXML.forEach((ruleXML, index) => {

          // Parse device MACs - look for DevicesMAC inside DevicesMACs
          const macsMatch = ruleXML.match(/<DevicesMAC>([^<]+)<\/DevicesMAC>/g);
          const deviceMacs = macsMatch ? macsMatch.map(m => m.replace(/<\/?DevicesMAC>/g, '')) : [];

          // Parse device names
          const namesMatch = ruleXML.match(/<DevicesName>([^<]+)<\/DevicesName>/g);
          const deviceNames = namesMatch ? namesMatch.map(m => m.replace(/<\/?DevicesName>/g, '')) : [];

          const weekEnable = parseXMLValue(ruleXML, 'WeekEnable') || '0000000';
          const id = parseXMLValue(ruleXML, 'ID') || `rule_${index}`;

          profiles.push({
            id: id,
            name: deviceNames[0] || `Rule ${index + 1}`,
            deviceMacs: deviceMacs,
            deviceNames: deviceNames,
            startTime: parseXMLValue(ruleXML, 'StartTime') || '00:00',
            endTime: parseXMLValue(ruleXML, 'EndTime') || '23:59',
            activeDays: this.parseDaysString(weekEnable),
            enabled: parseXMLValue(ruleXML, 'Enable') === '1',
          });
        });
      }

      return profiles;
    } catch (error) {
      console.error('Error getting parental control profiles:', error);
      return [];
    }
  }

  async createParentalControlProfile(profile: {
    name: string;
    deviceMacs: string[];
    deviceNames?: string[];
    startTime: string;
    endTime: string;
    activeDays: number[];
    enabled: boolean;
  }): Promise<boolean> {
    try {

      // Build DevicesMAC elements
      const deviceMacsXml = profile.deviceMacs.map(mac => `<DevicesMAC>${mac}</DevicesMAC>`).join('');

      // Build DevicesName elements
      const deviceNamesXml = (profile.deviceNames || [profile.name]).map(name => `<DevicesName>${name}</DevicesName>`).join('');

      // WeekEnable format: 7 digits for Sun-Sat (0=disabled, 1=enabled)
      const weekEnable = this.daysToString(profile.activeDays);

      const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<TimeControlRules>
<TimeControlRule>
<Action>create</Action>
<Enable>${profile.enabled ? '1' : '0'}</Enable>
<TimeMode>1</TimeMode>
<ID></ID>
<DevicesMACs>${deviceMacsXml}</DevicesMACs>
<DevicesNames>${deviceNamesXml}</DevicesNames>
<WeekEnable>${weekEnable}</WeekEnable>
<StartTime>${profile.startTime}</StartTime>
<EndTime>${profile.endTime}</EndTime>
</TimeControlRule>
</TimeControlRules>
</request>`;


      const response = await this.apiClient.post('/api/timerule/timerule', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Failed to create profile: error ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('[DEBUG] createParentalControlProfile: Error:', error);
      throw error;
    }
  }

  async updateParentalControlProfile(profile: {
    id: string;
    name: string;
    deviceMacs: string[];
    deviceNames?: string[];
    startTime: string;
    endTime: string;
    activeDays: number[];
    enabled: boolean;
  }): Promise<boolean> {
    try {

      // Web interface uses DELETE + CREATE for editing (not modify)
      // Step 1: Delete the old rule
      await this.deleteParentalControlProfile(profile.id);

      // Step 2: Create new rule with updated settings
      await this.createParentalControlProfile({
        name: profile.name,
        deviceMacs: profile.deviceMacs.filter((mac, index, self) => self.indexOf(mac) === index), // Remove duplicates
        deviceNames: profile.deviceNames,
        startTime: profile.startTime,
        endTime: profile.endTime,
        activeDays: profile.activeDays,
        enabled: profile.enabled,
      });

      return true;
    } catch (error) {
      console.error('[DEBUG] updateParentalControlProfile: Error:', error);
      throw error;
    }
  }

  // Toggle enable/disable for a rule without changing other settings
  async toggleParentalControlProfileEnabled(profile: {
    id: string;
    name: string;
    deviceMacs: string[];
    deviceNames?: string[];
    startTime: string;
    endTime: string;
    activeDays: number[];
    enabled: boolean;
  }): Promise<boolean> {
    try {

      // Build DevicesMAC elements - remove duplicates
      const uniqueMacs = profile.deviceMacs.filter((mac, index, self) => self.indexOf(mac) === index);
      const deviceMacsXml = uniqueMacs.map(mac => `<DevicesMAC>${mac}</DevicesMAC>`).join('');

      // Build DevicesName elements
      const deviceNamesXml = (profile.deviceNames || [profile.name]).map(name => `<DevicesName>${name}</DevicesName>`).join('');

      const weekEnable = this.daysToString(profile.activeDays);

      const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<TimeControlRules>
<TimeControlRule>
<Action>update</Action>
<Enable>${profile.enabled ? '1' : '0'}</Enable>
<TimeMode>1</TimeMode>
<ID>${profile.id}</ID>
<DevicesMACs>${deviceMacsXml}</DevicesMACs>
<DevicesNames>${deviceNamesXml}</DevicesNames>
<WeekEnable>${weekEnable}</WeekEnable>
<StartTime>${profile.startTime}</StartTime>
<EndTime>${profile.endTime}</EndTime>
</TimeControlRule>
</TimeControlRules>
</request>`;


      const response = await this.apiClient.post('/api/timerule/timerule', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Failed to toggle profile: error ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('[DEBUG] toggleParentalControlProfileEnabled: Error:', error);
      throw error;
    }
  }

  async deleteParentalControlProfile(profileId: string): Promise<boolean> {
    try {

      const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<TimeControlRules>
<TimeControlRule>
<Action>delete</Action>
<ID>${profileId}</ID>
</TimeControlRule>
</TimeControlRules>
</request>`;


      const response = await this.apiClient.post('/api/timerule/timerule', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Failed to delete profile: error ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('[DEBUG] deleteParentalControlProfile: Error:', error);
      throw error;
    }
  }

  // Helper methods for parental control
  private parseDaysString(daysString: string): number[] {
    // Format: "1010101" where each position is a day (Sun=0 to Sat=6)
    const days: number[] = [];
    for (let i = 0; i < daysString.length && i < 7; i++) {
      if (daysString[i] === '1') {
        days.push(i);
      }
    }
    return days;
  }

  private daysToString(days: number[]): string {
    // Convert array of day numbers to "1010101" format
    let result = '';
    for (let i = 0; i < 7; i++) {
      result += days.includes(i) ? '1' : '0';
    }
    return result;
  }

  // Change device name via API
  async changeDeviceName(deviceId: string, newName: string): Promise<boolean> {
    try {
      const data = `<?xml version="1.0" encoding="UTF-8"?><request><ID>${deviceId}</ID><ActualName>${newName}</ActualName></request>`;

      const response = await this.apiClient.post('/api/lan/changedevicename', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Failed to change device name: error ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('Error changing device name:', error);
      throw error;
    }
  }
}

