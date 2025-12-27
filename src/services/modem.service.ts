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
      let monthDuration = 0;
      let dayUsed = 0;
      let dayDuration = 0;
      try {
        const monthResponse = await this.apiClient.get('/api/monitoring/month_statistics');

        // Try different possible tag names for monthly
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

        // Parse monthly duration (seconds)
        monthDuration = safeParseInt(
          parseXMLValue(monthResponse, 'CurrentMonthDuration') ||
          parseXMLValue(monthResponse, 'monthDuration') ||
          parseXMLValue(monthResponse, 'MonthDuration')
        );

        // Parse daily usage (combined download + upload)
        dayUsed = safeParseInt(
          parseXMLValue(monthResponse, 'CurrentDayUsed') ||
          parseXMLValue(monthResponse, 'dayUsed') ||
          parseXMLValue(monthResponse, 'DayUsed')
        );

        // Parse daily duration (seconds)
        dayDuration = safeParseInt(
          parseXMLValue(monthResponse, 'CurrentDayDuration') ||
          parseXMLValue(monthResponse, 'dayDuration') ||
          parseXMLValue(monthResponse, 'DayDuration')
        );
      } catch (monthErr) {
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
        monthDuration,
        dayUsed,
        dayDuration,
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
      // Read from antenna_set_type which stores the configured setting
      // antenna_type returns the current detection state, not the setting
      const response = await this.apiClient.get('/api/device/antenna_set_type');

      const antennaValue = parseXMLValue(response, 'antennasettype') ||
        parseXMLValue(response, 'AntennaSetType') ||
        parseXMLValue(response, 'antenna_set_type');

      // Map numeric values to string values (B312: 0=auto, 1=external, 2=internal)
      const modeMap: Record<string, string> = {
        '0': 'auto',
        '1': 'external',
        '2': 'internal',
        'auto': 'auto',
        'internal': 'internal',
        'external': 'external',
      };

      return modeMap[antennaValue] || 'auto';
    } catch (error) {
      console.error('Error getting antenna mode:', error);
      return 'auto'; // Default to auto if endpoint not available
    }
  }

  async setAntennaMode(mode: 'auto' | 'internal' | 'external'): Promise<boolean> {
    try {
      // Map mode to API values: 0=auto, 2=internal, 1=external (B312 modem)
      const modeMap: Record<string, string> = {
        'auto': '0',
        'internal': '2',
        'external': '1',
      };

      const modeValue = modeMap[mode];

      // Try antenna_set_type endpoint first (discovered from modem)
      const data1 = `<?xml version="1.0" encoding="UTF-8"?><request><antennasettype>${modeValue}</antennasettype></request>`;

      try {
        const response = await this.apiClient.post('/api/device/antenna_set_type', data1);
        if (!response.includes('<error>')) {
          return true;
        }
      } catch {
        // Fallback to antenna_type endpoint
      }

      // Try antenna_type endpoint as fallback
      const data2 = `<?xml version="1.0" encoding="UTF-8"?><request><antennatype>${modeValue}</antennatype></request>`;

      try {
        const response = await this.apiClient.post('/api/device/antenna_type', data2);
        if (!response.includes('<error>')) {
          return true;
        }
      } catch {
        // Both endpoints failed
      }

      throw new Error('Antenna mode change not supported on this modem');
    } catch (error) {
      console.error('Error setting antenna mode:', error);
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
      const response = await this.apiClient.get('/api/dialup/apn-retry');
      // Auto network enabled when retrystatus is '1'
      return parseXMLValue(response, 'retrystatus') === '1';
    } catch (error) {
      console.error('Error getting auto network status:', error);
      return true;
    }
  }

  async setAutoNetwork(enable: boolean): Promise<boolean> {
    try {
      // Use dialup/apn-retry endpoint for auto network selection
      // retrystatus: "1" = auto enabled, "0" = auto disabled
      const data = `<?xml version="1.0" encoding="UTF-8"?><request><retrystatus>${enable ? '1' : '0'}</retrystatus></request>`;

      const response = await this.apiClient.post('/api/dialup/apn-retry', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Auto network setting failed: ${errorCode}`);
      }

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
      // Get SNTP status from correct endpoint
      let sntpEnabled = false;
      try {
        const sntpResponse = await this.apiClient.get('/api/sntp/sntpswitch');
        const sntpValue = parseXMLValue(sntpResponse, 'SntpSwitch');
        sntpEnabled = sntpValue === '1';
      } catch {
        // SNTP endpoint not available
      }

      return {
        currentTime: new Date().toISOString(),
        sntpEnabled,
        ntpServer: 'pool.ntp.org',
        ntpServerBackup: 'time.google.com',
        timezone: 'UTC+7',
      };
    } catch (error) {
      console.error('Error getting time settings:', error);
      return {
        currentTime: new Date().toISOString(),
        sntpEnabled: false,
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
      // Handle SNTP toggle separately using correct endpoint
      if (settings.sntpEnabled !== undefined) {
        const sntpData = `<?xml version="1.0" encoding="UTF-8"?><request><SntpSwitch>${settings.sntpEnabled ? '1' : '0'}</SntpSwitch></request>`;
        const sntpResponse = await this.apiClient.post('/api/sntp/sntpswitch', sntpData);

        if (sntpResponse.includes('<error>')) {
          const errorCode = sntpResponse.match(/<code>(\d+)<\/code>/)?.[1];
          throw new Error(`SNTP setting failed: ${errorCode}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error setting time settings:', error);
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

  // ============ Monthly Data Usage Settings ============

  async getMonthlyDataSettings(): Promise<{
    enabled: boolean;
    startDay: number;
    dataLimit: number;
    dataLimitUnit: 'MB' | 'GB';
    monthThreshold: number;
    trafficMaxLimit: number;
  }> {
    try {
      const response = await this.apiClient.get('/api/monitoring/start_date');

      const setMonthData = parseXMLValue(response, 'SetMonthData');
      const startDay = parseInt(parseXMLValue(response, 'StartDay') || '1');
      const dataLimitStr = parseXMLValue(response, 'DataLimit') || '0';
      const monthThreshold = parseInt(parseXMLValue(response, 'MonthThreshold') || '90');
      const trafficMaxLimit = parseInt(parseXMLValue(response, 'trafficmaxlimit') || '0');

      // Parse data limit string (e.g., "500GB" or "1024MB")
      let dataLimit = 0;
      let dataLimitUnit: 'MB' | 'GB' = 'GB';
      const match = dataLimitStr.match(/^(\d+)(MB|GB)$/i);
      if (match) {
        dataLimit = parseInt(match[1]);
        dataLimitUnit = match[2].toUpperCase() as 'MB' | 'GB';
      }

      return {
        enabled: setMonthData === '1',
        startDay: isNaN(startDay) ? 1 : startDay,
        dataLimit,
        dataLimitUnit,
        monthThreshold: isNaN(monthThreshold) ? 90 : monthThreshold,
        trafficMaxLimit: isNaN(trafficMaxLimit) ? 0 : trafficMaxLimit,
      };
    } catch (error) {
      console.error('Error getting monthly data settings:', error);
      return {
        enabled: false,
        startDay: 1,
        dataLimit: 0,
        dataLimitUnit: 'GB',
        monthThreshold: 90,
        trafficMaxLimit: 0,
      };
    }
  }

  async setMonthlyDataSettings(settings: {
    enabled: boolean;
    startDay: number;
    dataLimit: number;
    dataLimitUnit: 'MB' | 'GB';
    monthThreshold: number;
  }): Promise<boolean> {
    try {
      const startDayStr = settings.startDay.toString().padStart(2, '0');
      const dataLimitStr = `${settings.dataLimit}${settings.dataLimitUnit}`;

      const data = `<?xml version="1.0" encoding="UTF-8"?><request><StartDay>${startDayStr}</StartDay><DataLimit>${dataLimitStr}</DataLimit><MonthThreshold>${settings.monthThreshold}</MonthThreshold><SetMonthData>${settings.enabled ? '1' : '0'}</SetMonthData></request>`;

      const response = await this.apiClient.post('/api/monitoring/start_date', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Monthly data settings failed: ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('Error setting monthly data settings:', error);
      throw error;
    }
  }

  // ============ Diagnosis ============

  async diagnosisPing(host: string = '1.1.1.1', timeout: number = 4000): Promise<{
    success: boolean;
    host: string;
    message: string;
  }> {
    try {
      const data = `<?xml version="1.0" encoding="UTF-8"?><request><Host>${host}</Host><Timeout>${timeout}</Timeout></request>`;

      const response = await this.apiClient.post('/api/diagnosis/diagnose_ping', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        return {
          success: false,
          host,
          message: `Ping failed: error ${errorCode}`,
        };
      }

      return {
        success: true,
        host,
        message: `Ping to ${host} successful`,
      };
    } catch (error) {
      console.error('Error running diagnosis ping:', error);
      return {
        success: false,
        host,
        message: `Ping failed: ${error}`,
      };
    }
  }

  async oneClickCheck(): Promise<{
    internetConnection: boolean;
    dnsResolution: boolean;
    networkStatus: string;
    signalStrength: string;
    summaryKey: string;
  }> {
    try {
      // Check internet connection with ping to google.com
      const pingResult = await this.diagnosisPing('google.com', 5000);

      // Get network status
      const status = await this.getModemStatus();
      const signal = await this.getSignalInfo();

      const internetConnection = pingResult.success;
      const networkStatus = status.connectionStatus === '901' ? 'Connected' : 'Disconnected';
      const signalStrength = signal.rssi ? `${signal.rssi} dBm` : 'Unknown';

      // DNS check with cloudflare as fallback
      const dnsResult = await this.diagnosisPing('1.1.1.1', 5000);
      const dnsResolution = dnsResult.success;

      let summaryKey = '';
      if (internetConnection && dnsResolution) {
        summaryKey = 'allChecksPassed';
      } else if (internetConnection && !dnsResolution) {
        summaryKey = 'dnsIssue';
      } else if (!internetConnection && networkStatus === 'Connected') {
        summaryKey = 'noInternet';
      } else {
        summaryKey = 'connectionIssue';
      }

      return {
        internetConnection,
        dnsResolution,
        networkStatus,
        signalStrength,
        summaryKey,
      };
    } catch (error) {
      console.error('Error running one click check:', error);
      return {
        internetConnection: false,
        dnsResolution: false,
        networkStatus: 'Error',
        signalStrength: 'Unknown',
        summaryKey: 'checkFailed',
      };
    }
  }
}

