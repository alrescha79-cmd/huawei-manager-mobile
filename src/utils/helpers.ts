export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 Bytes';

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

export interface DurationUnits {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

// Default units (English short form)
const defaultUnits: DurationUnits = {
  days: 'd',
  hours: 'h',
  minutes: 'm',
  seconds: 's',
};

export const formatDuration = (seconds: number, units: DurationUnits = defaultUnits): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}${units.days} ${hours}${units.hours} ${minutes}${units.minutes}`;
  } else if (hours > 0) {
    return `${hours}${units.hours} ${minutes}${units.minutes}`;
  } else if (minutes > 0) {
    return `${minutes}${units.minutes} ${secs}${units.seconds}`;
  } else {
    return `${secs}${units.seconds}`;
  }
};

const parseSignalValue = (value: string | number | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'number') return value;

  const cleanValue = value.replace(/>=/g, '').replace(/dBm?/gi, '').replace(/dB/gi, '').trim();
  const parsed = parseInt(cleanValue);

  return isNaN(parsed) ? null : parsed;
};

export const getSignalStrength = (rssi: string | number | undefined, rsrp?: string | number): string => {
  let rssiNum = parseSignalValue(rssi);

  if (rssiNum === null && rsrp) {
    rssiNum = parseSignalValue(rsrp);
  }

  if (rssiNum === null) return 'unknown';

  if (rssiNum >= -65) return 'excellent';
  if (rssiNum >= -75) return 'good';
  if (rssiNum >= -85) return 'fair';
  if (rssiNum >= -95) return 'poor';
  return 'veryPoor';
};

export const getSignalIcon = (rssi: string | number | undefined, rsrp?: string | number): number => {
  let rssiNum = parseSignalValue(rssi);

  if (rssiNum === null && rsrp) {
    rssiNum = parseSignalValue(rsrp);
  }

  if (rssiNum === null) return 0;

  if (rssiNum >= -65) return 5;
  if (rssiNum >= -75) return 4;
  if (rssiNum >= -85) return 3;
  if (rssiNum >= -95) return 2;
  if (rssiNum >= -105) return 1;
  return 0;
};

export const getSignalIconFromModemStatus = (signalIcon: string | undefined): number => {
  if (!signalIcon) return 0;
  const parsed = parseInt(signalIcon);
  if (isNaN(parsed)) return 0;
  return Math.max(0, Math.min(5, parsed));
};

export const getSignalStrengthFromIcon = (signalIcon: number): string => {
  if (signalIcon >= 5) return 'excellent';
  if (signalIcon >= 4) return 'good';
  if (signalIcon >= 3) return 'fair';
  if (signalIcon >= 2) return 'poor';
  return 'veryPoor';
};

const decodeHtmlEntities = (text: string): string => {
  const entities: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&#40;': '(',
    '&#41;': ')',
    '&nbsp;': ' ',
  };

  // First replace known entities
  let result = text.replace(/&[a-zA-Z0-9#]+;/g, (match) => entities[match] || match);

  // Then handle any remaining numeric entities (&#NN;)
  result = result.replace(/&#(\d+);/g, (match, num) => {
    const code = parseInt(num, 10);
    return String.fromCharCode(code);
  });

  return result;
};

export const parseXMLValue = (xml: string, tag: string): string => {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(regex);
  const value = match ? match[1].trim() : '';
  return decodeHtmlEntities(value);
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

export const getConnectionStatusText = (code: string | undefined): string => {
  if (!code) return 'unknown';

  const statusMap: Record<string, string> = {
    '901': 'connected',
    '902': 'disconnected',
    '903': 'connecting',
    '904': 'disconnecting',
    '905': 'connectionFailed',
  };

  return statusMap[code] || 'unknown';
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

export const getLteBandInfo = (band: string | undefined): string => {
  if (!band) return '-';

  const bandMap: Record<string, string> = {
    // ===== 2G GSM Bands =====
    'GSM850': 'GSM 850 MHz',
    'GSM900': 'GSM 900 MHz',
    'EGSM900': 'E-GSM 900 MHz',
    'DCS1800': 'DCS 1800 MHz',
    'PCS1900': 'PCS 1900 MHz',
    'GSM1800': 'GSM 1800 MHz',
    'GSM1900': 'GSM 1900 MHz',

    // ===== 3G WCDMA/UMTS Bands =====
    // Band I (2100 MHz) - Common global
    'WCDMA_I': 'WCDMA B1 - 2100 MHz',
    'WCDMA1': 'WCDMA B1 - 2100 MHz',
    'UMTS1': 'UMTS B1 - 2100 MHz',
    // Band II (1900 MHz) - Americas
    'WCDMA_II': 'WCDMA B2 - 1900 MHz',
    'WCDMA2': 'WCDMA B2 - 1900 MHz',
    // Band IV (1700/2100 MHz AWS) - Americas
    'WCDMA_IV': 'WCDMA B4 - 1700/2100 MHz',
    'WCDMA4': 'WCDMA B4 - 1700/2100 MHz',
    // Band V (850 MHz) - Americas, Asia
    'WCDMA_V': 'WCDMA B5 - 850 MHz',
    'WCDMA5': 'WCDMA B5 - 850 MHz',
    // Band VIII (900 MHz) - Europe, Asia
    'WCDMA_VIII': 'WCDMA B8 - 900 MHz',
    'WCDMA8': 'WCDMA B8 - 900 MHz',

    // ===== 4G LTE FDD Bands =====
    // Band 1 (2100 MHz) - Global
    'B1': 'LTE B1 - 2100 MHz',
    'LTE1': 'LTE B1 - 2100 MHz',
    '1': 'LTE B1 - 2100 MHz',
    // Band 2 (1900 MHz) - Americas
    'B2': 'LTE B2 - 1900 MHz',
    'LTE2': 'LTE B2 - 1900 MHz',
    '2': 'LTE B2 - 1900 MHz',
    // Band 3 (1800 MHz) - Global (Indonesia: Telkomsel, XL, Indosat)
    'B3': 'LTE B3 - 1800 MHz',
    'LTE3': 'LTE B3 - 1800 MHz',
    '3': 'LTE B3 - 1800 MHz',
    // Band 4 (1700/2100 MHz AWS) - Americas
    'B4': 'LTE B4 - 1700/2100 MHz',
    'LTE4': 'LTE B4 - 1700/2100 MHz',
    '4': 'LTE B4 - 1700/2100 MHz',
    // Band 5 (850 MHz) - Americas, Asia (Indonesia: Smartfren)
    'B5': 'LTE B5 - 850 MHz',
    'LTE5': 'LTE B5 - 850 MHz',
    '5': 'LTE B5 - 850 MHz',
    // Band 7 (2600 MHz) - Global
    'B7': 'LTE B7 - 2600 MHz',
    'LTE7': 'LTE B7 - 2600 MHz',
    '7': 'LTE B7 - 2600 MHz',
    // Band 8 (900 MHz) - Europe, Asia (Indonesia: Telkomsel, XL, Indosat, 3)
    'B8': 'LTE B8 - 900 MHz',
    'LTE8': 'LTE B8 - 900 MHz',
    '8': 'LTE B8 - 900 MHz',
    // Band 12 (700 MHz) - Americas
    'B12': 'LTE B12 - 700 MHz',
    'LTE12': 'LTE B12 - 700 MHz',
    '12': 'LTE B12 - 700 MHz',
    // Band 13 (700 MHz) - Americas
    'B13': 'LTE B13 - 700 MHz',
    'LTE13': 'LTE B13 - 700 MHz',
    '13': 'LTE B13 - 700 MHz',
    // Band 17 (700 MHz) - Americas
    'B17': 'LTE B17 - 700 MHz',
    'LTE17': 'LTE B17 - 700 MHz',
    '17': 'LTE B17 - 700 MHz',
    // Band 18 (850 MHz) - Japan
    'B18': 'LTE B18 - 850 MHz',
    'LTE18': 'LTE B18 - 850 MHz',
    '18': 'LTE B18 - 850 MHz',
    // Band 19 (850 MHz) - Japan
    'B19': 'LTE B19 - 850 MHz',
    'LTE19': 'LTE B19 - 850 MHz',
    '19': 'LTE B19 - 850 MHz',
    // Band 20 (800 MHz) - Europe
    'B20': 'LTE B20 - 800 MHz',
    'LTE20': 'LTE B20 - 800 MHz',
    '20': 'LTE B20 - 800 MHz',
    // Band 21 (1500 MHz) - Japan
    'B21': 'LTE B21 - 1500 MHz',
    'LTE21': 'LTE B21 - 1500 MHz',
    '21': 'LTE B21 - 1500 MHz',
    // Band 25 (1900 MHz) - Americas
    'B25': 'LTE B25 - 1900 MHz',
    'LTE25': 'LTE B25 - 1900 MHz',
    '25': 'LTE B25 - 1900 MHz',
    // Band 26 (850 MHz) - Americas
    'B26': 'LTE B26 - 850 MHz',
    'LTE26': 'LTE B26 - 850 MHz',
    '26': 'LTE B26 - 850 MHz',
    // Band 28 (700 MHz) - Asia Pacific, Europe
    'B28': 'LTE B28 - 700 MHz',
    'LTE28': 'LTE B28 - 700 MHz',
    '28': 'LTE B28 - 700 MHz',
    // Band 29 (700 MHz) - Americas (SDL)
    'B29': 'LTE B29 - 700 MHz',
    'LTE29': 'LTE B29 - 700 MHz',
    '29': 'LTE B29 - 700 MHz',
    // Band 30 (2300 MHz) - Americas
    'B30': 'LTE B30 - 2300 MHz',
    'LTE30': 'LTE B30 - 2300 MHz',
    '30': 'LTE B30 - 2300 MHz',
    // Band 32 (1500 MHz) - Europe (SDL)
    'B32': 'LTE B32 - 1500 MHz',
    'LTE32': 'LTE B32 - 1500 MHz',
    '32': 'LTE B32 - 1500 MHz',
    // Band 66 (1700/2100 MHz AWS-3) - Americas
    'B66': 'LTE B66 - 1700/2100 MHz',
    'LTE66': 'LTE B66 - 1700/2100 MHz',
    '66': 'LTE B66 - 1700/2100 MHz',
    // Band 71 (600 MHz) - Americas
    'B71': 'LTE B71 - 600 MHz',
    'LTE71': 'LTE B71 - 600 MHz',
    '71': 'LTE B71 - 600 MHz',

    // ===== 4G LTE TDD Bands =====
    // Band 34 (2010 MHz) - China
    'B34': 'LTE B34 TDD - 2010 MHz',
    'LTE34': 'LTE B34 TDD - 2010 MHz',
    '34': 'LTE B34 TDD - 2010 MHz',
    // Band 38 (2600 MHz) - Global
    'B38': 'LTE B38 TDD - 2600 MHz',
    'LTE38': 'LTE B38 TDD - 2600 MHz',
    '38': 'LTE B38 TDD - 2600 MHz',
    // Band 39 (1900 MHz) - China
    'B39': 'LTE B39 TDD - 1900 MHz',
    'LTE39': 'LTE B39 TDD - 1900 MHz',
    '39': 'LTE B39 TDD - 1900 MHz',
    // Band 40 (2300 MHz) - Global (Indonesia: Telkomsel, XL)
    'B40': 'LTE B40 TDD - 2300 MHz',
    'LTE40': 'LTE B40 TDD - 2300 MHz',
    '40': 'LTE B40 TDD - 2300 MHz',
    // Band 41 (2500 MHz) - Global (China, US)
    'B41': 'LTE B41 TDD - 2500 MHz',
    'LTE41': 'LTE B41 TDD - 2500 MHz',
    '41': 'LTE B41 TDD - 2500 MHz',
    // Band 42 (3500 MHz) - Global
    'B42': 'LTE B42 TDD - 3500 MHz',
    'LTE42': 'LTE B42 TDD - 3500 MHz',
    '42': 'LTE B42 TDD - 3500 MHz',
    // Band 43 (3700 MHz) - Global
    'B43': 'LTE B43 TDD - 3700 MHz',
    'LTE43': 'LTE B43 TDD - 3700 MHz',
    '43': 'LTE B43 TDD - 3700 MHz',
    // Band 46 (5200 MHz LAA) - Global
    'B46': 'LTE B46 LAA - 5200 MHz',
    'LTE46': 'LTE B46 LAA - 5200 MHz',
    '46': 'LTE B46 LAA - 5200 MHz',
    // Band 48 (3600 MHz CBRS) - Americas
    'B48': 'LTE B48 CBRS - 3600 MHz',
    'LTE48': 'LTE B48 CBRS - 3600 MHz',
    '48': 'LTE B48 CBRS - 3600 MHz',

    // ===== 5G NR FR1 (Sub-6 GHz) Bands =====
    // n1 (2100 MHz) - Global
    'n1': '5G n1 - 2100 MHz',
    'NR1': '5G n1 - 2100 MHz',
    // n2 (1900 MHz) - Americas
    'n2': '5G n2 - 1900 MHz',
    'NR2': '5G n2 - 1900 MHz',
    // n3 (1800 MHz) - Global
    'n3': '5G n3 - 1800 MHz',
    'NR3': '5G n3 - 1800 MHz',
    // n5 (850 MHz) - Americas
    'n5': '5G n5 - 850 MHz',
    'NR5': '5G n5 - 850 MHz',
    // n7 (2600 MHz) - Europe
    'n7': '5G n7 - 2600 MHz',
    'NR7': '5G n7 - 2600 MHz',
    // n8 (900 MHz) - Europe, Asia
    'n8': '5G n8 - 900 MHz',
    'NR8': '5G n8 - 900 MHz',
    // n12 (700 MHz) - Americas
    'n12': '5G n12 - 700 MHz',
    'NR12': '5G n12 - 700 MHz',
    // n20 (800 MHz) - Europe
    'n20': '5G n20 - 800 MHz',
    'NR20': '5G n20 - 800 MHz',
    // n25 (1900 MHz) - Americas
    'n25': '5G n25 - 1900 MHz',
    'NR25': '5G n25 - 1900 MHz',
    // n28 (700 MHz) - Asia Pacific
    'n28': '5G n28 - 700 MHz',
    'NR28': '5G n28 - 700 MHz',
    // n38 (2600 MHz TDD) - Europe, Asia
    'n38': '5G n38 TDD - 2600 MHz',
    'NR38': '5G n38 TDD - 2600 MHz',
    // n40 (2300 MHz) - China, India
    'n40': '5G n40 - 2300 MHz',
    'NR40': '5G n40 - 2300 MHz',
    // n41 (2500 MHz) - Global
    'n41': '5G n41 TDD - 2500 MHz',
    'NR41': '5G n41 TDD - 2500 MHz',
    // n66 (1700/2100 MHz AWS) - Americas
    'n66': '5G n66 - 1700/2100 MHz',
    'NR66': '5G n66 - 1700/2100 MHz',
    // n71 (600 MHz) - Americas
    'n71': '5G n71 - 600 MHz',
    'NR71': '5G n71 - 600 MHz',
    // n77 (3700 MHz) - Global (C-Band)
    'n77': '5G n77 TDD - 3700 MHz',
    'NR77': '5G n77 TDD - 3700 MHz',
    // n78 (3500 MHz) - Global (C-Band)
    'n78': '5G n78 TDD - 3500 MHz',
    'NR78': '5G n78 TDD - 3500 MHz',
    // n79 (4700 MHz) - Japan, China
    'n79': '5G n79 TDD - 4700 MHz',
    'NR79': '5G n79 TDD - 4700 MHz',

    // ===== 5G NR FR2 (mmWave) Bands =====
    // n257 (28 GHz) - Global
    'n257': '5G n257 mmWave - 28 GHz',
    'NR257': '5G n257 mmWave - 28 GHz',
    // n258 (26 GHz) - Global
    'n258': '5G n258 mmWave - 26 GHz',
    'NR258': '5G n258 mmWave - 26 GHz',
    // n260 (39 GHz) - Americas
    'n260': '5G n260 mmWave - 39 GHz',
    'NR260': '5G n260 mmWave - 39 GHz',
    // n261 (28 GHz) - Americas
    'n261': '5G n261 mmWave - 28 GHz',
    'NR261': '5G n261 mmWave - 28 GHz',
  };

  if (bandMap[band]) return bandMap[band];

  const upperBand = band.toUpperCase();
  if (bandMap[upperBand]) return bandMap[upperBand];

  const lteMatch = band.match(/(?:LTE\s*)?B?(\d+)/i);
  if (lteMatch) {
    const bandNum = lteMatch[1];
    if (bandMap[bandNum]) return bandMap[bandNum];
    if (bandMap['B' + bandNum]) return bandMap['B' + bandNum];
    return `LTE B${bandNum}`;
  }

  const nrMatch = band.match(/(?:5G\s*|NR\s*)?n(\d+)/i);
  if (nrMatch) {
    const nrBandNum = 'n' + nrMatch[1];
    if (bandMap[nrBandNum]) return bandMap[nrBandNum];
    return `5G ${nrBandNum}`;
  }

  return band;
};
