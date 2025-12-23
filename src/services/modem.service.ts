import { ModemAPIClient } from './api.service';
import {
  ModemInfo,
  SignalInfo,
  NetworkInfo,
  TrafficStats,
  ModemStatus,
  WanInfo,
  MobileDataStatus
} from '@/types';
import { parseXMLValue } from '@/utils/helpers';

export class ModemService {
  private apiClient: ModemAPIClient;

  constructor(modemIp: string) {
    this.apiClient = new ModemAPIClient(modemIp);
  }

  async login(username: string, password: string): Promise<boolean> {
    return this.apiClient.login(username, password);
  }

  async logout(): Promise<boolean> {
    return this.apiClient.logout();
  }

  async getModemInfo(): Promise<ModemInfo> {
    try {
      const response = await this.apiClient.get('/api/device/information');

      return {
        deviceName: parseXMLValue(response, 'DeviceName'),
        serialNumber: parseXMLValue(response, 'SerialNumber'),
        imei: parseXMLValue(response, 'Imei'),
        imsi: parseXMLValue(response, 'Imsi'),
        iccid: parseXMLValue(response, 'Iccid'),
        msisdn: parseXMLValue(response, 'Msisdn'),
        hardwareVersion: parseXMLValue(response, 'HardwareVersion'),
        softwareVersion: parseXMLValue(response, 'SoftwareVersion'),
        webUIVersion: parseXMLValue(response, 'WebUIVersion'),
        macAddress1: parseXMLValue(response, 'MacAddress1'),
        macAddress2: parseXMLValue(response, 'MacAddress2'),
        productFamily: parseXMLValue(response, 'ProductFamily'),
        classify: parseXMLValue(response, 'Classify'),
        supportMode: parseXMLValue(response, 'supportmode'),
        workMode: parseXMLValue(response, 'workmode'),
      };
    } catch (error) {
      console.error('Error getting modem info:', error);
      throw error;
    }
  }

  async getSignalInfo(): Promise<SignalInfo> {
    try {
      const response = await this.apiClient.get('/api/device/signal');

      return {
        rssi: parseXMLValue(response, 'rssi'),
        rsrp: parseXMLValue(response, 'rsrp'),
        rsrq: parseXMLValue(response, 'rsrq'),
        sinr: parseXMLValue(response, 'sinr'),
        rscp: parseXMLValue(response, 'rscp'),
        ecio: parseXMLValue(response, 'ecio'),
        mode: parseXMLValue(response, 'mode'),
        pci: parseXMLValue(response, 'pci'),
        cellId: parseXMLValue(response, 'cell_id'),
        band: parseXMLValue(response, 'band'),
        dlbandwidth: parseXMLValue(response, 'dlbandwidth'),
        ulbandwidth: parseXMLValue(response, 'ulbandwidth'),
      };
    } catch (error) {
      console.error('Error getting signal info:', error);
      throw error;
    }
  }

  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const response = await this.apiClient.get('/api/net/current-plmn');

      return {
        state: parseXMLValue(response, 'State'),
        registerState: parseXMLValue(response, 'RegisterState'),
        roamingState: parseXMLValue(response, 'RoamingState'),
        serviceStatus: parseXMLValue(response, 'ServiceStatus'),
        serviceDomain: parseXMLValue(response, 'ServiceDomain'),
        currentNetworkType: parseXMLValue(response, 'CurrentNetworkType'),
        currentServiceDomain: parseXMLValue(response, 'CurrentServiceDomain'),
        psState: parseXMLValue(response, 'psState'),
        networkName: parseXMLValue(response, 'FullName'),
        spnName: parseXMLValue(response, 'SpnName'),
        fullName: parseXMLValue(response, 'FullName'),
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      throw error;
    }
  }

  async getTrafficStats(): Promise<TrafficStats> {
    try {
      // Helper to safely parse int with fallback
      const safeParseInt = (value: string): number => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
      };

      // Fetch traffic stats from main endpoint
      const response = await this.apiClient.get('/api/monitoring/traffic-statistics');

      // Also fetch monthly stats from separate endpoint
      let monthDownload = 0;
      let monthUpload = 0;
      try {
        const monthResponse = await this.apiClient.get('/api/monitoring/month_statistics');

        // Try different possible tag names
        monthDownload = safeParseInt(
          parseXMLValue(monthResponse, 'CurrentMonthDownload') ||
          parseXMLValue(monthResponse, 'monthDownload') ||
          parseXMLValue(monthResponse, 'MonthDownload')
        );
        monthUpload = safeParseInt(
          parseXMLValue(monthResponse, 'CurrentMonthUpload') ||
          parseXMLValue(monthResponse, 'monthUpload') ||
          parseXMLValue(monthResponse, 'MonthUpload')
        );
      } catch {
        // Month statistics not available - continue without them
      }

      return {
        currentConnectTime: safeParseInt(parseXMLValue(response, 'CurrentConnectTime')),
        currentUpload: safeParseInt(parseXMLValue(response, 'CurrentUpload')),
        currentDownload: safeParseInt(parseXMLValue(response, 'CurrentDownload')),
        currentDownloadRate: safeParseInt(parseXMLValue(response, 'CurrentDownloadRate')),
        currentUploadRate: safeParseInt(parseXMLValue(response, 'CurrentUploadRate')),
        totalUpload: safeParseInt(parseXMLValue(response, 'TotalUpload')),
        totalDownload: safeParseInt(parseXMLValue(response, 'TotalDownload')),
        totalConnectTime: safeParseInt(parseXMLValue(response, 'TotalConnectTime')),
        monthDownload,
        monthUpload,
      };
    } catch (error) {
      console.error('Error getting traffic stats:', error);
      throw error;
    }
  }

  async getModemStatus(): Promise<ModemStatus> {
    try {
      const response = await this.apiClient.get('/api/monitoring/status');

      return {
        connectionStatus: parseXMLValue(response, 'ConnectionStatus'),
        signalIcon: parseXMLValue(response, 'SignalIcon'),
        currentNetworkType: parseXMLValue(response, 'CurrentNetworkType'),
        currentServiceDomain: parseXMLValue(response, 'CurrentServiceDomain'),
        roamingStatus: parseXMLValue(response, 'RoamingStatus'),
        batteryStatus: parseXMLValue(response, 'BatteryStatus'),
        batteryLevel: parseXMLValue(response, 'BatteryLevel'),
        batteryPercent: parseXMLValue(response, 'BatteryPercent'),
        simStatus: parseXMLValue(response, 'SimStatus'),
        wifiConnectionStatus: parseXMLValue(response, 'WifiConnectionStatus'),
        signalStrength: parseXMLValue(response, 'SignalStrength'),
      };
    } catch (error) {
      console.error('Error getting modem status:', error);
      throw error;
    }
  }

  async reboot(): Promise<boolean> {
    try {
      const rebootData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Control>1</Control>
        </request>`;

      await this.apiClient.post('/api/device/control', rebootData);
      return true;
    } catch (error) {
      console.error('Error rebooting modem:', error);
      throw error;
    }
  }

  async getWanInfo(): Promise<WanInfo> {
    try {
      // Use /api/device/information endpoint for WAN IP
      const response = await this.apiClient.get('/api/device/information');

      const safeParseInt = (value: string): number => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
      };

      return {
        wanIPAddress: parseXMLValue(response, 'WanIPAddress') || parseXMLValue(response, 'WanIpAddress') || '',
        uptime: safeParseInt(parseXMLValue(response, 'Uptime')),
        primaryDns: parseXMLValue(response, 'PrimaryDNS') || '',
        secondaryDns: parseXMLValue(response, 'SecondaryDNS') || '',
      };
    } catch (error) {
      console.error('Error getting WAN info:', error);
      throw error;
    }
  }

  async getMobileDataStatus(): Promise<MobileDataStatus> {
    try {
      const response = await this.apiClient.get('/api/dialup/mobile-dataswitch');

      const dataswitch = parseXMLValue(response, 'dataswitch');
      return {
        dataswitch: dataswitch === '1',
      };
    } catch (error) {
      console.error('Error getting mobile data status:', error);
      throw error;
    }
  }

  async toggleMobileData(enable: boolean): Promise<boolean> {
    try {
      const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <dataswitch>${enable ? '1' : '0'}</dataswitch>
        </request>`;

      await this.apiClient.post('/api/dialup/mobile-dataswitch', data);
      return true;
    } catch (error) {
      console.error('Error toggling mobile data:', error);
      throw error;
    }
  }

  async triggerPlmnScan(): Promise<boolean> {
    try {
      // Triggering PLMN list scan will cause the modem to re-register
      // on the network, which typically results in a new IP address
      await this.apiClient.get('/api/net/plmn-list');
      return true;
    } catch (error) {
      console.error('Error triggering PLMN scan:', error);
      throw error;
    }
  }

  async getAntennaMode(): Promise<string> {
    try {
      console.log('[DEBUG] getAntennaMode: Fetching from /api/device/antenna_type');
      const response = await this.apiClient.get('/api/device/antenna_type');
      console.log('[DEBUG] getAntennaMode: Raw response:', response);

      const antennaValue = parseXMLValue(response, 'antenna_type') ||
        parseXMLValue(response, 'AntennaType') ||
        parseXMLValue(response, 'antennatype');
      console.log('[DEBUG] getAntennaMode: Parsed value:', antennaValue);

      // Map numeric values to string values (B312: 0=auto, 1=external, 2=internal)
      const modeMap: Record<string, string> = {
        '0': 'auto',
        '1': 'external',
        '2': 'internal',
        'auto': 'auto',
        'internal': 'internal',
        'external': 'external',
      };

      const result = modeMap[antennaValue] || 'auto';
      console.log('[DEBUG] getAntennaMode: Mapped result:', result);
      return result;
    } catch (error) {
      console.error('[DEBUG] getAntennaMode: Error:', error);
      return 'auto'; // Default to auto if endpoint not available
    }
  }

  async setAntennaMode(mode: 'auto' | 'internal' | 'external'): Promise<boolean> {
    try {
      console.log('[DEBUG] setAntennaMode: Setting mode to:', mode);

      // Map mode to API values: 0=auto, 2=internal, 1=external (B312 modem)
      const modeMap: Record<string, string> = {
        'auto': '0',
        'internal': '2',
        'external': '1',
      };

      const modeValue = modeMap[mode];

      // Try antenna_set_type endpoint first (discovered from modem)
      // GET returns <antennasettype>2</antennasettype>
      const data1 = `<?xml version="1.0" encoding="UTF-8"?><request><antennasettype>${modeValue}</antennasettype></request>`;
      console.log('[DEBUG] setAntennaMode: Trying antenna_set_type endpoint...');

      try {
        const response = await this.apiClient.post('/api/device/antenna_set_type', data1);
        console.log('[DEBUG] setAntennaMode: antenna_set_type Response:', response);
        if (!response.includes('<error>')) {
          return true;
        }
      } catch (e) {
        console.log('[DEBUG] setAntennaMode: antenna_set_type failed');
      }

      // Try antenna_type endpoint as fallback
      const data2 = `<?xml version="1.0" encoding="UTF-8"?><request><antennatype>${modeValue}</antennatype></request>`;
      console.log('[DEBUG] setAntennaMode: Trying antenna_type endpoint...');

      try {
        const response = await this.apiClient.post('/api/device/antenna_type', data2);
        console.log('[DEBUG] setAntennaMode: antenna_type Response:', response);
        if (!response.includes('<error>')) {
          return true;
        }
      } catch (e) {
        console.log('[DEBUG] setAntennaMode: antenna_type failed');
      }

      // If both fail, throw error
      throw new Error('Antenna mode change not supported on this modem');
    } catch (error) {
      console.error('[DEBUG] setAntennaMode: Error:', error);
      throw error;
    }
  }

  // Network Mode Settings
  async getNetworkMode(): Promise<string> {
    try {
      const response = await this.apiClient.get('/api/net/net-mode');

      // NetworkMode values: 00=Auto, 01=GSM only, 02=WCDMA only, 03=LTE only, etc.
      return parseXMLValue(response, 'NetworkMode') || '00';
    } catch (error) {
      console.error('Error getting network mode:', error);
      return '00'; // Default to auto
    }
  }

  async setNetworkMode(mode: string): Promise<boolean> {
    try {
      // NetworkMode values:
      // 00 = Auto
      // 01 = GSM only (2G)
      // 02 = WCDMA only (3G)
      // 03 = LTE only (4G)
      // 0302 = LTE/WCDMA (4G/3G)
      // 030201 = LTE/WCDMA/GSM (Auto without 5G)
      const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <NetworkMode>${mode}</NetworkMode>
          <NetworkBand>3FFFFFFF</NetworkBand>
          <LTEBand>7FFFFFFFFFFFFFFF</LTEBand>
        </request>`;

      await this.apiClient.post('/api/net/net-mode', data);
      return true;
    } catch (error) {
      console.error('Error setting network mode:', error);
      throw error;
    }
  }

  // Band Settings
  async getBandSettings(): Promise<{ networkBand: string; lteBand: string }> {
    try {
      const response = await this.apiClient.get('/api/net/net-mode');

      return {
        networkBand: parseXMLValue(response, 'NetworkBand') || '3FFFFFFF',
        lteBand: parseXMLValue(response, 'LTEBand') || '7FFFFFFFFFFFFFFF',
      };
    } catch (error) {
      console.error('Error getting band settings:', error);
      return {
        networkBand: '3FFFFFFF',
        lteBand: '7FFFFFFFFFFFFFFF',
      };
    }
  }

  async setBandSettings(networkBand: string, lteBand: string): Promise<boolean> {
    try {
      // First get current network mode
      const currentModeResponse = await this.apiClient.get('/api/net/net-mode');
      const currentMode = parseXMLValue(currentModeResponse, 'NetworkMode') || '00';

      const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <NetworkMode>${currentMode}</NetworkMode>
          <NetworkBand>${networkBand}</NetworkBand>
          <LTEBand>${lteBand}</LTEBand>
        </request>`;

      await this.apiClient.post('/api/net/net-mode', data);
      return true;
    } catch (error) {
      console.error('Error setting band settings:', error);
      throw error;
    }
  }

  // ============ Mobile Network Settings ============

  async getDataRoamingStatus(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/api/dialup/connection');
      return parseXMLValue(response, 'RoamAutoConnectEnable') === '1';
    } catch (error) {
      console.error('Error getting data roaming status:', error);
      return false;
    }
  }

  async setDataRoaming(enable: boolean): Promise<boolean> {
    try {
      const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <RoamAutoConnectEnable>${enable ? '1' : '0'}</RoamAutoConnectEnable>
        </request>`;

      await this.apiClient.post('/api/dialup/connection', data);
      return true;
    } catch (error) {
      console.error('Error setting data roaming:', error);
      throw error;
    }
  }

  async getAutoNetworkStatus(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/api/net/net-mode');
      // Auto network is when NetworkMode is '00' (Auto)
      return parseXMLValue(response, 'NetworkMode') === '00';
    } catch (error) {
      console.error('Error getting auto network status:', error);
      return true;
    }
  }

  async setAutoNetwork(enable: boolean): Promise<boolean> {
    try {
      // If enabling auto, set to '00', otherwise keep the current non-auto mode
      const mode = enable ? '00' : '03'; // Default to 4G only if disabling auto
      const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <NetworkMode>${mode}</NetworkMode>
          <NetworkBand>3FFFFFFF</NetworkBand>
          <LTEBand>7FFFFFFFFFFFFFFF</LTEBand>
        </request>`;

      await this.apiClient.post('/api/net/net-mode', data);
      return true;
    } catch (error) {
      console.error('Error setting auto network:', error);
      throw error;
    }
  }

  // ============ Time Settings ============

  async getTimeSettings(): Promise<{
    currentTime: string;
    sntpEnabled: boolean;
    ntpServer: string;
    ntpServerBackup: string;
    timezone: string;
  }> {
    try {
      // Try primary endpoint first
      let response: string;
      try {
        console.log('[DEBUG] getTimeSettings: Trying /api/time/settings');
        response = await this.apiClient.get('/api/time/settings');

        // Check if response contains error
        if (response.includes('<error>') || response.includes('<code>100003</code>')) {
          console.log('[DEBUG] getTimeSettings: Endpoint not supported (100003)');
          throw new Error('Time settings not supported');
        }
        console.log('[DEBUG] getTimeSettings: Primary endpoint success');
      } catch (primaryError) {
        console.log('[DEBUG] getTimeSettings: Primary failed, trying /api/ntp/settings');
        // Try alternative endpoint
        try {
          response = await this.apiClient.get('/api/ntp/settings');
          if (response.includes('<error>')) {
            throw new Error('NTP settings not supported');
          }
          console.log('[DEBUG] getTimeSettings: Alternative endpoint success');
        } catch {
          console.log('[DEBUG] getTimeSettings: Time settings not available on this modem');
          // Return defaults silently - this is expected for some modems
          return {
            currentTime: new Date().toISOString(),
            sntpEnabled: false,
            ntpServer: 'pool.ntp.org',
            ntpServerBackup: 'time.google.com',
            timezone: 'UTC+7',
          };
        }
      }

      console.log('[DEBUG] getTimeSettings: Raw response:', response);

      // Try multiple possible tag names
      const sntpValue = parseXMLValue(response, 'NTPEnable') ||
        parseXMLValue(response, 'Enable') ||
        parseXMLValue(response, 'SntpEnable');

      return {
        currentTime: parseXMLValue(response, 'CurrentTime') ||
          parseXMLValue(response, 'Time') ||
          new Date().toISOString(),
        sntpEnabled: sntpValue === '1' || sntpValue === 'true',
        ntpServer: parseXMLValue(response, 'NTPServer') ||
          parseXMLValue(response, 'Server') ||
          parseXMLValue(response, 'NtpServer1') ||
          'pool.ntp.org',
        ntpServerBackup: parseXMLValue(response, 'NTPServerBackup') ||
          parseXMLValue(response, 'NtpServer2') ||
          parseXMLValue(response, 'BackupServer') ||
          'time.google.com',
        timezone: parseXMLValue(response, 'TimeZone') ||
          parseXMLValue(response, 'Timezone') ||
          'UTC+7',
      };
    } catch (error) {
      console.error('Error getting time settings:', error);
      return {
        currentTime: new Date().toISOString(),
        sntpEnabled: true,
        ntpServer: 'pool.ntp.org',
        ntpServerBackup: 'time.google.com',
        timezone: 'UTC+7',
      };
    }
  }

  async setTimeSettings(settings: {
    sntpEnabled?: boolean;
    ntpServer?: string;
    ntpServerBackup?: string;
    timezone?: string;
  }): Promise<boolean> {
    try {
      console.log('[DEBUG] setTimeSettings: Settings:', settings);

      const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          ${settings.sntpEnabled !== undefined ? `<NTPEnable>${settings.sntpEnabled ? '1' : '0'}</NTPEnable>` : ''}
          ${settings.ntpServer ? `<NTPServer>${settings.ntpServer}</NTPServer>` : ''}
          ${settings.ntpServerBackup ? `<NTPServerBackup>${settings.ntpServerBackup}</NTPServerBackup>` : ''}
          ${settings.timezone ? `<TimeZone>${settings.timezone}</TimeZone>` : ''}
        </request>`;
      console.log('[DEBUG] setTimeSettings: Sending data:', data);

      // Try primary endpoint first
      try {
        console.log('[DEBUG] setTimeSettings: Trying /api/time/settings');
        const response = await this.apiClient.post('/api/time/settings', data);
        console.log('[DEBUG] setTimeSettings: Response:', response);
        return true;
      } catch (primaryError) {
        console.log('[DEBUG] setTimeSettings: Primary failed, trying /api/ntp/settings');
        // Try alternative endpoint
        const response = await this.apiClient.post('/api/ntp/settings', data);
        console.log('[DEBUG] setTimeSettings: Alternative response:', response);
        return true;
      }
    } catch (error) {
      console.error('[DEBUG] setTimeSettings: Error:', error);
      throw error;
    }
  }

  async getCurrentTime(): Promise<string> {
    try {
      const response = await this.apiClient.get('/api/time/settings');
      return parseXMLValue(response, 'CurrentTime') || new Date().toISOString();
    } catch (error) {
      console.error('Error getting current time:', error);
      return new Date().toISOString();
    }
  }
}

