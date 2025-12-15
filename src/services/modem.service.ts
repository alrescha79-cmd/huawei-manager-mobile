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

      // Log raw XML response for debugging
      console.log('[RAW XML] Signal:', response.substring(0, 500));

      const signalInfo = {
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

      console.log('[Service] Signal Info:', signalInfo);
      return signalInfo;
    } catch (error) {
      console.error('Error getting signal info:', error);
      throw error;
    }
  }

  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const response = await this.apiClient.get('/api/net/current-plmn');

      const networkInfo = {
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

      console.log('[Service] Network Info:', networkInfo);
      return networkInfo;
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
      console.log('[RAW XML] Traffic Stats:', response.substring(0, 500));

      // Also fetch monthly stats from separate endpoint
      let monthDownload = 0;
      let monthUpload = 0;
      let monthDuration = 0;
      try {
        const monthResponse = await this.apiClient.get('/api/monitoring/month_statistics');
        console.log('[RAW XML] Month Stats:', monthResponse.substring(0, 500));

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
        monthDuration = safeParseInt(
          parseXMLValue(monthResponse, 'CurrentMonthDuration') ||
          parseXMLValue(monthResponse, 'MonthDuration')
        );
      } catch (monthError) {
        console.log('[API] Month statistics not available:', monthError);
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

      // Log raw XML response for debugging
      console.log('[RAW XML] Status:', response.substring(0, 500));

      const modemStatus = {
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

      console.log('[Service] Modem Status:', modemStatus);
      return modemStatus;
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
      console.log('[RAW XML] Device Info (for WAN):', response.substring(0, 500));

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
      console.log('[RAW XML] Mobile Data Switch:', response.substring(0, 500));

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
      console.log('[Service] Mobile data toggled:', enable);
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
      const response = await this.apiClient.get('/api/net/plmn-list');
      console.log('[Service] PLMN scan triggered:', response.substring(0, 200));
      return true;
    } catch (error) {
      console.error('Error triggering PLMN scan:', error);
      throw error;
    }
  }

  async getAntennaMode(): Promise<string> {
    try {
      const response = await this.apiClient.get('/api/device/antenna_type');
      console.log('[RAW XML] Antenna Type:', response.substring(0, 300));
      return parseXMLValue(response, 'antenna_type') || 'auto';
    } catch (error) {
      console.error('Error getting antenna mode:', error);
      return 'auto'; // Default to auto if endpoint not available
    }
  }

  async setAntennaMode(mode: 'auto' | 'internal' | 'external'): Promise<boolean> {
    try {
      // Map mode to API values: 0=auto, 1=internal, 2=external
      const modeMap: Record<string, string> = {
        'auto': '0',
        'internal': '1',
        'external': '2',
      };

      const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <antenna_type>${modeMap[mode]}</antenna_type>
        </request>`;

      await this.apiClient.post('/api/device/antenna_type', data);
      console.log('[Service] Antenna mode set to:', mode);
      return true;
    } catch (error) {
      console.error('Error setting antenna mode:', error);
      throw error;
    }
  }
}
