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
  uptime?: number;
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
  dlbandwidth: string;
  ulbandwidth: string;
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
  shortName: string;
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
  monthDuration: number;
  dayUsed: number;
  dayDuration: number;
}

export interface ConnectedDevice {
  macAddress: string;
  ipAddress: string;
  hostName: string;
  id: string;
  associatedTime: string;
  isBlock: boolean;
}

/**
 * WiFi security mode
 */
export enum WifiAuthMode {
  OPEN = 'OPEN',
  SHARED = 'SHARED',
  WPA_PSK = 'WPA-PSK',
  WPA2_PSK = 'WPA2-PSK',
  WPA_WPA2_PSK = 'WPA/WPA2-PSK',
  WPA_ENTERPRISE = 'WPA',
  WPA2_ENTERPRISE = 'WPA2',
}

/**
 * WiFi encryption mode
 */
export enum WifiEncryptionMode {
  NONE = 'NONE',
  WEP = 'WEP',
  TKIP = 'TKIP',
  AES = 'AES',
  TKIP_AES = 'TKIPAES',
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
  encryptionMode?: string;
}

export interface SMSMessage {
  index: string;
  phone: string;
  content: string;
  date: string;
  smstat: string;
  boxType: number; // 1 = inbox (received), 2 = outbox (sent)
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

export interface WanInfo {
  wanIPAddress: string;
  uptime: number;
  primaryDns: string;
  secondaryDns: string;
}

export interface MobileDataStatus {
  dataswitch: boolean;
}

// Network Settings Types
export interface MobileNetworkSettings {
  mobileData: boolean;
  dataRoaming: boolean;
  autoSelectNetwork: boolean;
}

export interface APNProfile {
  id: string;
  name: string;
  apn: string;
  username: string;
  password: string;
  authType: 'none' | 'pap' | 'chap' | 'pap_chap';
  ipType: 'ipv4' | 'ipv6' | 'ipv4v6';
  isDefault: boolean;
  readOnly: boolean;
}

export interface EthernetSettings {
  connectionMode: 'auto' | 'lan_only' | 'pppoe' | 'dynamic_ip' | 'pppoe_dynamic';
  status: EthernetStatus;
}

export interface EthernetStatus {
  connected: boolean;
  ipAddress: string;
  gateway: string;
  netmask: string;
  dns1: string;
  dns2: string;
  macAddress: string;
}

export interface PPPoEProfile {
  id: string;
  name: string;
  username: string;
  password: string;
  serviceName: string;
  mtu: number;
  isDefault: boolean;
}

export interface DynamicIPProfile {
  id: string;
  name: string;
  hostname: string;
  mtu: number;
  isDefault: boolean;
}

// Time Settings Types
export interface TimeSettings {
  currentTime: string;
  sntpEnabled: boolean;
  ntpServer: string;
  ntpServerBackup: string;
  timezone: string;
}

// Parental Control Types
export interface ParentalControlSettings {
  enabled: boolean;
  profiles: ParentalControlProfile[];
}

export interface ParentalControlProfile {
  id: string;
  name: string;
  deviceMacs: string[];
  startTime: string;
  endTime: string;
  activeDays: number[];
  enabled: boolean;
}

// DHCP Settings Types
export interface DHCPSettings {
  dhcpIPAddress: string;
  dhcpLanNetmask: string;
  dhcpStatus: boolean;
  dhcpStartIPAddress: string;
  dhcpEndIPAddress: string;
  dhcpLeaseTime: number;
  dnsStatus: boolean;
  primaryDns: string;
  secondaryDns: string;
}

// Monthly Data Usage Settings
export interface MonthlyDataSettings {
  enabled: boolean;
  startDay: number;
  dataLimit: number;
  dataLimitUnit: 'MB' | 'GB';
  monthThreshold: number;
  trafficMaxLimit: number;
}

