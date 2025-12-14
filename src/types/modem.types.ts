export interface ModemCredentials {
  modemIp: string;
  username: string;
  password: string;
  lastLogin?: number;
}

export interface ModemInfo {
  deviceName: string;
  serialNumber: string;
  imei: string;
  imsi: string;
  iccid: string;
  msisdn: string;
  hardwareVersion: string;
  softwareVersion: string;
  webUIVersion: string;
  macAddress1: string;
  macAddress2: string;
  productFamily: string;
  classify: string;
  supportMode: string;
  workMode: string;
}

export interface SignalInfo {
  rssi: string;
  rsrp: string;
  rsrq: string;
  sinr: string;
  rscp: string;
  ecio: string;
  mode: string;
  pci: string;
  cellId: string;
  band: string;
}

export interface NetworkInfo {
  state: string;
  registerState: string;
  roamingState: string;
  serviceStatus: string;
  serviceDomain: string;
  currentNetworkType: string;
  currentServiceDomain: string;
  psState: string;
  networkName: string;
  spnName: string;
  fullName: string;
}

export interface TrafficStats {
  currentConnectTime: number;
  currentUpload: number;
  currentDownload: number;
  currentDownloadRate: number;
  currentUploadRate: number;
  totalUpload: number;
  totalDownload: number;
  totalConnectTime: number;
  monthDownload: number;
  monthUpload: number;
}

export interface ConnectedDevice {
  macAddress: string;
  ipAddress: string;
  hostName: string;
  id: string;
  associatedTime: string;
  isBlock: boolean;
}

export interface WiFiSettings {
  ssid: string;
  password: string;
  wifiEnable: boolean;
  channel: string;
  band: string;
  maxAssoc: string;
  wifiMode: string;
  securityMode: string;
}

export interface SMSMessage {
  index: string;
  phone: string;
  content: string;
  date: string;
  smstat: string; // 0: unread, 1: read, 2: draft, 3: sent
}

export interface SMSCount {
  localUnread: number;
  localInbox: number;
  localOutbox: number;
  localDraft: number;
  simUnread: number;
  simInbox: number;
  simOutbox: number;
  simDraft: number;
  newMsg: number;
  localDeleted: number;
  simDeleted: number;
  localMax: number;
  simMax: number;
}

export interface BandInfo {
  band: string;
  bandwidth: string;
  earfcn: string;
}

export interface ModemStatus {
  connectionStatus: string;
  signalIcon: string;
  currentNetworkType: string;
  currentServiceDomain: string;
  roamingStatus: string;
  batteryStatus: string;
  batteryLevel: string;
  batteryPercent: string;
  simStatus: string;
  wifiConnectionStatus: string;
  signalStrength: string;
}
