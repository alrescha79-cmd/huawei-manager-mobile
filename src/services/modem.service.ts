import { ModemAPIClient } from './api.service';
import {
  ModemInfo,
  SignalInfo,
  NetworkInfo,
  TrafficStats,
  ModemStatus,
  WanInfo,
  MobileDataStatus,
  FirmwareUpdateInfo
} from '@/types';
import { estimateLteBandwidth, parseXMLValue } from '@/utils/helpers';

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
        uptime: (() => {
          const uptimeStr = parseXMLValue(response, 'uptime');
          const parsed = parseInt(uptimeStr);
          return !isNaN(parsed) && uptimeStr !== '' ? parsed : undefined;
        })(),
      };
    } catch (error) {
      console.error('Error getting modem info:', error);
      throw error;
    }
  }

  private normalizeBandValue(value?: string): string | undefined {
    if (!value) return undefined;

    const normalized = value.toString().trim();
    if (!normalized) return undefined;

    const numericBand = normalized.replace(/^B/i, '');
    if (/^\d+$/.test(numericBand)) {
      return `B${numericBand}`;
    }

    return normalized;
  }

  private async getSignalFallbackInfo(): Promise<{ band: string; dlbandwidth: string; ulbandwidth: string }> {
    try {
      const response = await this.apiClient.get('/api/net/net-mode');
      const lteBand = parseXMLValue(response, 'LTEBand') || parseXMLValue(response, 'LteBand') || parseXMLValue(response, 'lteBand') || '';
      const band = this.normalizeBandValue(lteBand) || '';
      const bandwidth = band ? estimateLteBandwidth(band) : undefined;

      return {
        band,
        dlbandwidth: bandwidth?.dl || '',
        ulbandwidth: bandwidth?.ul || '',
      };
    } catch {
      return {
        band: '',
        dlbandwidth: '',
        ulbandwidth: '',
      };
    }
  }

  async getSignalInfo(): Promise<SignalInfo> {
    try {
      const response = await this.apiClient.get('/api/device/signal');

      // Some modem models return an error XML instead of signal data (e.g. Huawei L02)
      const errorCode = parseXMLValue(response, 'code');
      if (errorCode) {
        const err = new Error(`Signal endpoint not supported (error code ${errorCode})`) as any;
        err.huaweiErrorCode = errorCode;
        throw err;
      }

      const lteBandwidth = parseXMLValue(response, 'lte_bandwidth');
      const fallback = await this.getSignalFallbackInfo();
      const band = parseXMLValue(response, 'band') || parseXMLValue(response, 'lte_bandinfo') || (response.match(/<earfcn>([\s\S]*?)<\/band>/)?.[1]?.trim() || fallback.band);
      const dlbandwidth = parseXMLValue(response, 'dlbandwidth') || lteBandwidth || fallback.dlbandwidth;
      const ulbandwidth = parseXMLValue(response, 'ulbandwidth') || lteBandwidth || fallback.ulbandwidth;

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
        band,
        dlbandwidth,
        ulbandwidth,
      };
    } catch (error) {
      console.error('Error getting signal info:', error);
      const fallback = await this.getSignalFallbackInfo();
      return {
        rssi: '',
        rsrp: '',
        rsrq: '',
        sinr: '',
        rscp: '',
        ecio: '',
        mode: '',
        pci: '',
        cellId: '',
        band: fallback.band,
        dlbandwidth: fallback.dlbandwidth,
        ulbandwidth: fallback.ulbandwidth,
      };
    }
  }

  /**
   * Fast signal info for realtime polling - skips token refresh for speed
   */
  async getSignalInfoFast(): Promise<SignalInfo> {
    try {
      const response = await this.apiClient.getFast('/api/device/signal');

      // Some modem models return an error XML instead of signal data (e.g. Huawei L02)
      const errorCode = parseXMLValue(response, 'code');
      if (errorCode) {
        const err = new Error(`Signal endpoint not supported (error code ${errorCode})`) as any;
        err.huaweiErrorCode = errorCode;
        throw err;
      }

      const lteBandwidth = parseXMLValue(response, 'lte_bandwidth');
      const fallback = await this.getSignalFallbackInfo();
      const band = parseXMLValue(response, 'band') || parseXMLValue(response, 'lte_bandinfo') || (response.match(/<earfcn>([\s\S]*?)<\/band>/)?.[1]?.trim() || fallback.band);
      const dlbandwidth = parseXMLValue(response, 'dlbandwidth') || lteBandwidth || fallback.dlbandwidth;
      const ulbandwidth = parseXMLValue(response, 'ulbandwidth') || lteBandwidth || fallback.ulbandwidth;

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
        band,
        dlbandwidth,
        ulbandwidth,
      };
    } catch {
      const fallback = await this.getSignalFallbackInfo();
      return {
        rssi: '',
        rsrp: '',
        rsrq: '',
        sinr: '',
        rscp: '',
        ecio: '',
        mode: '',
        pci: '',
        cellId: '',
        band: fallback.band,
        dlbandwidth: fallback.dlbandwidth,
        ulbandwidth: fallback.ulbandwidth,
      };
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
        shortName: parseXMLValue(response, 'ShortName'),
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
      const safeParseInt = (value: string): number => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
      };

      const response = await this.apiClient.get('/api/monitoring/traffic-statistics');

      let monthDownload = 0;
      let monthUpload = 0;
      let monthDuration = 0;
      let dayUsed = 0;
      let dayDuration = 0;
      try {
        const monthResponse = await this.apiClient.get('/api/monitoring/month_statistics');

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

        monthDuration = safeParseInt(
          parseXMLValue(monthResponse, 'CurrentMonthDuration') ||
          parseXMLValue(monthResponse, 'monthDuration') ||
          parseXMLValue(monthResponse, 'MonthDuration')
        );

        dayUsed = safeParseInt(
          parseXMLValue(monthResponse, 'CurrentDayUsed') ||
          parseXMLValue(monthResponse, 'dayUsed') ||
          parseXMLValue(monthResponse, 'DayUsed')
        );

        dayDuration = safeParseInt(
          parseXMLValue(monthResponse, 'CurrentDayDuration') ||
          parseXMLValue(monthResponse, 'dayDuration') ||
          parseXMLValue(monthResponse, 'DayDuration')
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
        monthDuration,
        dayUsed,
        dayDuration,
      };
    } catch (error) {
      console.error('Error getting traffic stats:', error);
      throw error;
    }
  }

  /**
   * Fast traffic stats for realtime polling - uses getFast, skips month stats
   * ponytail: month stats only fetched on full data interval, not every poll
   */
  async getTrafficStatsFast(): Promise<TrafficStats> {
    try {
      const safeParseInt = (value: string): number => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
      };

      const response = await this.apiClient.getFast('/api/monitoring/traffic-statistics');

      return {
        currentConnectTime: safeParseInt(parseXMLValue(response, 'CurrentConnectTime')),
        currentUpload: safeParseInt(parseXMLValue(response, 'CurrentUpload')),
        currentDownload: safeParseInt(parseXMLValue(response, 'CurrentDownload')),
        currentDownloadRate: safeParseInt(parseXMLValue(response, 'CurrentDownloadRate')),
        currentUploadRate: safeParseInt(parseXMLValue(response, 'CurrentUploadRate')),
        totalUpload: safeParseInt(parseXMLValue(response, 'TotalUpload')),
        totalDownload: safeParseInt(parseXMLValue(response, 'TotalDownload')),
        totalConnectTime: safeParseInt(parseXMLValue(response, 'TotalConnectTime')),
        monthDownload: 0,
        monthUpload: 0,
        monthDuration: 0,
        dayUsed: 0,
        dayDuration: 0,
      };
    } catch (error) {
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
        currentNetworkTypeEx: parseXMLValue(response, 'CurrentNetworkTypeEx'),
        currentServiceDomain: parseXMLValue(response, 'CurrentServiceDomain'),
        roamingStatus: parseXMLValue(response, 'RoamingStatus'),
        batteryStatus: parseXMLValue(response, 'BatteryStatus') || '',  // MOCK: 1=charging, 0=not charging
        batteryLevel: parseXMLValue(response, 'BatteryLevel') || '',    // MOCK: 1-4 level
        batteryPercent: parseXMLValue(response, 'BatteryPercent') || '', // MOCK: percentage
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

  async resetFactorySettings(): Promise<boolean> {
    try {
      const resetData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Control>2</Control>
        </request>`;

      await this.apiClient.post('/api/device/control', resetData);
      return true;
    } catch (error) {
      console.error('Error resetting modem:', error);
      throw error;
    }
  }

  async getWanInfo(): Promise<WanInfo> {
    try {
      const response = await this.apiClient.get('/api/device/information');

      const safeParseInt = (value: string): number => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
      };

      let wanIPAddress = parseXMLValue(response, 'WanIPAddress') || parseXMLValue(response, 'WanIpAddress') || '';
      let primaryDns = parseXMLValue(response, 'PrimaryDNS') || parseXMLValue(response, 'PrimaryDns') || '';
      let secondaryDns = parseXMLValue(response, 'SecondaryDNS') || parseXMLValue(response, 'SecondaryDns') || '';

      // Fallback for modems (e.g. E3276) where WAN IP is not returned by /api/device/information
      if (!wanIPAddress) {
        try {
          const statusResponse = await this.apiClient.get('/api/monitoring/status');
          wanIPAddress = parseXMLValue(statusResponse, 'WanIPAddress') || parseXMLValue(statusResponse, 'WanIpAddress') || '';
          if (!primaryDns) {
            primaryDns = parseXMLValue(statusResponse, 'PrimaryDns') || parseXMLValue(statusResponse, 'PrimaryDNS') || '';
          }
          if (!secondaryDns) {
            secondaryDns = parseXMLValue(statusResponse, 'SecondaryDns') || parseXMLValue(statusResponse, 'SecondaryDNS') || '';
          }
        } catch (fallbackError) {
          console.error('Error getting fallback WAN IP from status:', fallbackError);
        }
      }

      return {
        wanIPAddress,
        uptime: safeParseInt(parseXMLValue(response, 'Uptime')),
        primaryDns,
        secondaryDns,
      };
    } catch (error) {
      console.error('Error getting WAN info:', error);
      throw error;
    }
  }

  async getMobileDataStatus(): Promise<MobileDataStatus> {
    try {
      const response = await this.apiClient.get('/api/dialup/mobile-dataswitch');

      const rawDataSwitch = parseXMLValue(response, 'dataswitch');
      return {
        isEnabled: rawDataSwitch === '1',
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
      await this.apiClient.get('/api/net/plmn-list');
      return true;
    } catch (error) {
      console.error('Error triggering PLMN scan:', error);
      throw error;
    }
  }

  private normalizeAntennaModeValue(value?: string): string | undefined {
    if (!value) return undefined;

    const normalized = value.toString().trim().toLowerCase();
    const modeMap: Record<string, string> = {
      '0': 'auto',
      '1': 'external',
      '2': 'internal',
      'auto': 'auto',
      'internal': 'internal',
      'external': 'external',
      'auto/disable': 'auto',
      'internal/disable': 'internal',
      'external/disable': 'external',
      'enable': 'auto',
    };

    return modeMap[normalized];
  }

  async getAntennaMode(): Promise<string> {
    const candidates = [
      { path: '/api/device/antenna_set_type', tags: ['antennasettype', 'AntennaSetType', 'antenna_set_type'] },
      { path: '/api/device/antenna_type', tags: ['antennatype', 'AntennaType', 'antenna_type'] },
      { path: '/api/device/antenna_settings', tags: ['antenna_type', 'AntennaType', 'antenna_type'] },
      { path: '/api/device/antenna_status', tags: ['antenna_status', 'AntennaStatus'] },
    ];

    for (const candidate of candidates) {
      try {
        const response = await this.apiClient.get(candidate.path);
        for (const tag of candidate.tags) {
          const antennaValue = parseXMLValue(response, tag);
          const normalizedMode = this.normalizeAntennaModeValue(antennaValue);
          if (normalizedMode) {
            return normalizedMode;
          }
        }
      } catch (error) {
        console.error(`Error getting antenna mode from ${candidate.path}:`, error);
      }
    }

    return 'auto';
  }

  async setAntennaMode(mode: 'auto' | 'internal' | 'external'): Promise<boolean> {
    try {
      const modeMap: Record<string, string> = {
        'auto': '0',
        'internal': '2',
        'external': '1',
      };

      const modeValue = modeMap[mode];
      const payloads = [
        {
          path: '/api/device/antenna_settings',
          data: `<?xml version="1.0" encoding="UTF-8"?><request><antenna_type>${mode.toUpperCase()}</antenna_type></request>`,
        },
        {
          path: '/api/device/antenna_set_type',
          data: `<?xml version="1.0" encoding="UTF-8"?><request><antennasettype>${modeValue}</antennasettype></request>`,
        },
        {
          path: '/api/device/antenna_type',
          data: `<?xml version="1.0" encoding="UTF-8"?><request><antennatype>${modeValue}</antennatype></request>`,
        },
      ];

      for (const payload of payloads) {
        try {
          const response = await this.apiClient.post(payload.path, payload.data);
          if (!response.includes('<error>')) {
            return true;
          }
        } catch {
          // Try the next supported endpoint
        }
      }

      throw new Error('Antenna mode change not supported on this modem');
    } catch (error) {
      console.error('Error setting antenna mode:', error);
      throw error;
    }
  }

  async getNetworkMode(): Promise<string> {
    try {
      const response = await this.apiClient.get('/api/net/net-mode');

      return parseXMLValue(response, 'NetworkMode') || '00';
    } catch (error) {
      console.error('Error getting network mode:', error);
      return '00'; // Default to auto
    }
  }

  async setNetworkMode(mode: string): Promise<boolean> {
    try {
      const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <NetworkMode>${mode}</NetworkMode>
          <NetworkBand>3FFFFFFF</NetworkBand>
          <LTEBand>7FFFFFFFFFFFFFFF</LTEBand>
        </request>`;

      const response = await this.apiClient.post('/api/net/net-mode', data);

      const errorCode = parseXMLValue(response, 'code');
      if (errorCode && errorCode !== '0') {
        const err = new Error(`Failed to set network mode: error ${errorCode}`) as any;
        err.huaweiErrorCode = errorCode;
        throw err;
      }

      return true;
    } catch (error) {
      console.error('Error setting network mode:', error);
      throw error;
    }
  }

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
      const currentModeResponse = await this.apiClient.get('/api/net/net-mode');

      const errorCodeGet = parseXMLValue(currentModeResponse, 'code');
      if (errorCodeGet && errorCodeGet !== '0') {
        const err = new Error(`Failed to get net mode: error ${errorCodeGet}`) as any;
        err.huaweiErrorCode = errorCodeGet;
        throw err;
      }

      const currentMode = parseXMLValue(currentModeResponse, 'NetworkMode') || '00';

      const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <NetworkMode>${currentMode}</NetworkMode>
          <NetworkBand>${networkBand}</NetworkBand>
          <LTEBand>${lteBand}</LTEBand>
        </request>`;

      const response = await this.apiClient.post('/api/net/net-mode', data);

      const errorCodePost = parseXMLValue(response, 'code');
      if (errorCodePost && errorCodePost !== '0') {
        const err = new Error(`Failed to set band settings: error ${errorCodePost}`) as any;
        err.huaweiErrorCode = errorCodePost;
        throw err;
      }

      return true;
    } catch (error) {
      console.error('Error setting band settings:', error);
      throw error;
    }
  }

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
      return parseXMLValue(response, 'retrystatus') === '1';
    } catch (error) {
      console.error('Error getting auto network status:', error);
      return true;
    }
  }

  async setAutoNetwork(enable: boolean): Promise<boolean> {
    try {
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
      let sntpEnabled = false;
      try {
        const sntpResponse = await this.apiClient.get('/api/sntp/sntpswitch');
        const sntpValue = parseXMLValue(sntpResponse, 'SntpSwitch');
        sntpEnabled = sntpValue === '1';
      } catch {
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
      const pingResult = await this.diagnosisPing('google.com', 5000);

      const status = await this.getModemStatus();
      const signal = await this.getSignalInfo();

      const internetConnection = pingResult.success;
      const networkStatus = status.connectionStatus === '901' ? 'Connected' : 'Disconnected';
      const signalStrength = signal.rssi ? signal.rssi : 'Unknown';

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

  async clearTrafficHistory(): Promise<boolean> {
    try {
      const requestData = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<ClearTraffic>1</ClearTraffic>
</request>`;

      await this.apiClient.post('/api/monitoring/clear-traffic', requestData);
      return true;
    } catch (error) {
      console.error('Error clearing traffic history:', error);
      return false;
    }
  }

  // ============ Firmware Update Check ============

  async checkFirmwareUpdate(): Promise<FirmwareUpdateInfo> {
    // ponytail: single GET covers most modems; POST trigger + /status fallback added when needed
    try {
      const response = await this.apiClient.get('/api/online-update/check-new-version');

      const newVersion = parseXMLValue(response, 'NewVersion') ||
        parseXMLValue(response, 'newversion') ||
        parseXMLValue(response, 'version') || '';
      const curVersion = parseXMLValue(response, 'CurVersion') ||
        parseXMLValue(response, 'curversion') ||
        parseXMLValue(response, 'CurrentVersion') || '';
      const status = parseXMLValue(response, 'Status') || parseXMLValue(response, 'status') || '';
      const description = parseXMLValue(response, 'Desc') ||
        parseXMLValue(response, 'desc') ||
        parseXMLValue(response, 'Description') || '';

      const isAvailable = status === '1' || status === '2' || newVersion !== '';

      return {
        isUpdateAvailable: isAvailable,
        currentVersion: curVersion,
        newVersion,
        description,
        status,
      };
    } catch (error) {
      console.error('Error checking firmware update:', error);
      throw error;
    }
  }
}

