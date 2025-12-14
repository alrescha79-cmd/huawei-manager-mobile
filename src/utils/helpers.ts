export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatBitsPerSecond = (bps: number): string => {
  if (bps === 0) return '0 bps';

  const k = 1000;
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];

  const i = Math.floor(Math.log(bps) / Math.log(k));

  return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export const getSignalStrength = (rssi: string | number): string => {
  const rssiNum = typeof rssi === 'string' ? parseInt(rssi) : rssi;
  
  if (rssiNum >= -65) return 'Excellent';
  if (rssiNum >= -75) return 'Good';
  if (rssiNum >= -85) return 'Fair';
  if (rssiNum >= -95) return 'Poor';
  return 'Very Poor';
};

export const getSignalIcon = (rssi: string | number): number => {
  const rssiNum = typeof rssi === 'string' ? parseInt(rssi) : rssi;
  
  if (rssiNum >= -65) return 5;
  if (rssiNum >= -75) return 4;
  if (rssiNum >= -85) return 3;
  if (rssiNum >= -95) return 2;
  if (rssiNum >= -105) return 1;
  return 0;
};

export const parseXMLValue = (xml: string, tag: string): string => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1] : '';
};

export const formatMacAddress = (mac: string): string => {
  return mac.toUpperCase().match(/.{1,2}/g)?.join(':') || mac;
};

export const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part);
    return num >= 0 && num <= 255;
  });
};

// Decode Huawei modem status codes
export const getConnectionStatusText = (code: string | undefined): string => {
  if (!code) return 'Unknown';
  
  const statusMap: Record<string, string> = {
    '901': 'Connected',
    '902': 'Disconnected', 
    '903': 'Connecting',
    '904': 'Disconnecting',
    '905': 'Connection Failed',
  };
  
  return statusMap[code] || `Status ${code}`;
};

export const getNetworkTypeText = (code: string | undefined): string => {
  if (!code) return 'Unknown';
  
  const typeMap: Record<string, string> = {
    '0': 'No Service',
    '1': 'GSM',
    '2': 'GPRS',
    '3': 'EDGE',
    '4': 'WCDMA',
    '5': 'HSDPA',
    '6': 'HSUPA',
    '7': 'HSPA',
    '8': 'TD-SCDMA',
    '9': 'HSPA+',
    '10': 'EV-DO rev. 0',
    '11': 'EV-DO rev. A',
    '12': 'EV-DO rev. B',
    '13': '1xRTT',
    '14': 'UMB',
    '15': '1xEVDV',
    '16': '3xRTT',
    '17': 'HSPA+ 64QAM',
    '18': 'HSPA+ MIMO',
    '19': 'LTE',
    '41': 'UMTS',
    '44': 'HSPA',
    '45': 'HSPA+',
    '46': 'DC-HSPA+',
    '64': 'HSPA',
    '65': 'HSPA+',
    '101': 'LTE',
  };
  
  return typeMap[code] || code;
};

export const getSimStatusText = (code: string | undefined): string => {
  if (!code) return 'Unknown';
  
  const simMap: Record<string, string> = {
    '0': 'Invalid SIM',
    '1': 'Valid SIM',
    '2': 'Invalid CS',
    '3': 'Invalid PS',
    '4': 'Invalid CS and PS',
    '5': 'ROM SIM',
    '240': 'No SIM',
    '255': 'No SIM',
  };
  
  return simMap[code] || `SIM ${code}`;
};

export const getRoamingStatusText = (code: string | undefined): string => {
  if (!code) return 'Unknown';
  
  const roamingMap: Record<string, string> = {
    '0': 'Home Network',
    '1': 'Roaming',
  };
  
  return roamingMap[code] || code;
};
