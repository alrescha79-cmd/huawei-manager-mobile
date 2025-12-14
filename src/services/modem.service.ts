import { ModemAPIClient } from './api.service';
import { 
  ModemInfo, 
  SignalInfo, 
  NetworkInfo, 
  TrafficStats,
  ModemStatus 
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
      const response = await this.apiClient.get('/api/monitoring/traffic-statistics');
      
      return {
        currentConnectTime: parseInt(parseXMLValue(response, 'CurrentConnectTime')),
        currentUpload: parseInt(parseXMLValue(response, 'CurrentUpload')),
        currentDownload: parseInt(parseXMLValue(response, 'CurrentDownload')),
        currentDownloadRate: parseInt(parseXMLValue(response, 'CurrentDownloadRate')),
        currentUploadRate: parseInt(parseXMLValue(response, 'CurrentUploadRate')),
        totalUpload: parseInt(parseXMLValue(response, 'TotalUpload')),
        totalDownload: parseInt(parseXMLValue(response, 'TotalDownload')),
        totalConnectTime: parseInt(parseXMLValue(response, 'TotalConnectTime')),
        monthDownload: parseInt(parseXMLValue(response, 'MonthDownload')),
        monthUpload: parseInt(parseXMLValue(response, 'MonthUpload')),
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
}
