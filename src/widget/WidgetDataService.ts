import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WidgetData {
    currentDownloadRate: number;
    currentUploadRate: number;
    currentDownload: number;
    currentUpload: number;
    currentConnectTime: number;
    monthDownload: number;
    monthUpload: number;
    monthDuration: number;
    dayUsed: number;
    dayDuration: number;
    totalDownload: number;
    totalUpload: number;
    totalConnectTime: number;
    connectionStatus: string;
    networkType: string;
    signalStrength: string;
    lastUpdated: number;
    error?: string;
}

export interface SpeedData {
    currentDownloadRate: number;
    currentUploadRate: number;
    currentDownload: number;
    currentUpload: number;
}

const CACHE_KEY = 'widget_data_cache';
const DEFAULT_MODEM_IP = '192.168.8.1';

function parseXMLValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
}

function safeParseInt(value: string): number {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
}

async function getModemIp(): Promise<string> {
    try {
        const credentialsStr = await AsyncStorage.getItem('modem_credentials');
        if (credentialsStr) {
            const credentials = JSON.parse(credentialsStr);
            return credentials.modemIp || DEFAULT_MODEM_IP;
        }
    } catch {
        // Ignored - use default
    }
    return DEFAULT_MODEM_IP;
}

async function cacheWidgetData(data: WidgetData): Promise<void> {
    try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
    }
}

async function getCachedWidgetData(): Promise<WidgetData | null> {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch {
        // Ignored
    }
    return null;
}

export async function fetchSpeedData(): Promise<SpeedData> {
    const modemIp = await getModemIp();
    const baseURL = `http://${modemIp}`;

    try {
        const response = await axios.get(`${baseURL}/api/monitoring/traffic-statistics`, {
            timeout: 2000,
            headers: {
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = response.data;

        return {
            currentDownloadRate: safeParseInt(parseXMLValue(data, 'CurrentDownloadRate')),
            currentUploadRate: safeParseInt(parseXMLValue(data, 'CurrentUploadRate')),
            currentDownload: safeParseInt(parseXMLValue(data, 'CurrentDownload')),
            currentUpload: safeParseInt(parseXMLValue(data, 'CurrentUpload')),
        };
    } catch {
        return {
            currentDownloadRate: 0,
            currentUploadRate: 0,
            currentDownload: 0,
            currentUpload: 0,
        };
    }
}

export async function fetchWidgetData(): Promise<WidgetData> {
    const modemIp = await getModemIp();
    const baseURL = `http://${modemIp}`;
    const timeout = 5000;

    try {
        const trafficResponse = await axios.get(`${baseURL}/api/monitoring/traffic-statistics`, {
            timeout,
            headers: {
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const trafficData = trafficResponse.data;

        let monthDownload = 0;
        let monthUpload = 0;
        let monthDuration = 0;
        let dayUsed = 0;
        let dayDuration = 0;
        try {
            const monthResponse = await axios.get(`${baseURL}/api/monitoring/month_statistics`, {
                timeout,
                headers: {
                    'Accept': '*/*',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const monthData = monthResponse.data;
            
            monthDownload = safeParseInt(
                parseXMLValue(monthData, 'CurrentMonthDownload') ||
                parseXMLValue(monthData, 'monthDownload') ||
                parseXMLValue(monthData, 'MonthDownload')
            );
            monthUpload = safeParseInt(
                parseXMLValue(monthData, 'CurrentMonthUpload') ||
                parseXMLValue(monthData, 'monthUpload') ||
                parseXMLValue(monthData, 'MonthUpload')
            );
            
            monthDuration = safeParseInt(
                parseXMLValue(monthData, 'CurrentMonthDuration') ||
                parseXMLValue(monthData, 'monthDuration') ||
                parseXMLValue(monthData, 'MonthDuration')
            );
            
            dayUsed = safeParseInt(
                parseXMLValue(monthData, 'CurrentDayUsed') ||
                parseXMLValue(monthData, 'dayUsed') ||
                parseXMLValue(monthData, 'DayUsed')
            );
            
            dayDuration = safeParseInt(
                parseXMLValue(monthData, 'CurrentDayDuration') ||
                parseXMLValue(monthData, 'dayDuration') ||
                parseXMLValue(monthData, 'DayDuration')
            );
        } catch {
            // Monthly stats not available
        }

        let connectionStatus = 'Unknown';
        let networkType = '';
        let signalStrength = '0';
        try {
            const statusResponse = await axios.get(`${baseURL}/api/monitoring/status`, {
                timeout,
                headers: {
                    'Accept': '*/*',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const statusData = statusResponse.data;
            connectionStatus = parseXMLValue(statusData, 'ConnectionStatus');
            networkType = parseXMLValue(statusData, 'CurrentNetworkType');
            signalStrength = parseXMLValue(statusData, 'SignalIcon') || parseXMLValue(statusData, 'SignalStrength');
        } catch {
            // Status not available
        }

        const widgetData: WidgetData = {
            currentDownloadRate: safeParseInt(parseXMLValue(trafficData, 'CurrentDownloadRate')),
            currentUploadRate: safeParseInt(parseXMLValue(trafficData, 'CurrentUploadRate')),
            currentDownload: safeParseInt(parseXMLValue(trafficData, 'CurrentDownload')),
            currentUpload: safeParseInt(parseXMLValue(trafficData, 'CurrentUpload')),
            currentConnectTime: safeParseInt(parseXMLValue(trafficData, 'CurrentConnectTime')),
            monthDownload,
            monthUpload,
            monthDuration,
            dayUsed,
            dayDuration,
            totalDownload: safeParseInt(parseXMLValue(trafficData, 'TotalDownload')),
            totalUpload: safeParseInt(parseXMLValue(trafficData, 'TotalUpload')),
            totalConnectTime: safeParseInt(parseXMLValue(trafficData, 'TotalConnectTime')),
            connectionStatus,
            networkType,
            signalStrength,
            lastUpdated: Date.now(),
        };

        await cacheWidgetData(widgetData);

        return widgetData;
    } catch (error: any) {
        const cachedData = await getCachedWidgetData();
        if (cachedData) {
            return {
                ...cachedData,
                error: 'No connection to modem',
            };
        }

        return {
            currentDownloadRate: 0,
            currentUploadRate: 0,
            currentDownload: 0,
            currentUpload: 0,
            currentConnectTime: 0,
            monthDownload: 0,
            monthUpload: 0,
            monthDuration: 0,
            dayUsed: 0,
            dayDuration: 0,
            totalDownload: 0,
            totalUpload: 0,
            totalConnectTime: 0,
            connectionStatus: 'Disconnected',
            networkType: '',
            signalStrength: '0',
            lastUpdated: Date.now(),
            error: 'No connection to modem',
        };
    }
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';

    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

    return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getNetworkTypeName(networkType: string): string {
    const types: Record<string, string> = {
        '0': 'No Service',
        '1': 'GSM',
        '2': 'GPRS',
        '3': 'EDGE',
        '4': 'WCDMA',
        '5': 'HSDPA',
        '6': 'HSUPA',
        '7': 'HSPA',
        '8': 'TDSCDMA',
        '9': 'HSPA+',
        '10': 'EVDO Rev 0',
        '11': 'EVDO Rev A',
        '12': 'EVDO Rev B',
        '13': '1xRTT',
        '14': 'UMB',
        '15': '1xEVDV',
        '16': '3xRTT',
        '17': 'HSPA+64QAM',
        '18': 'HSPA+MIMO',
        '19': 'LTE',
        '41': '3G',
        '44': 'HSPA',
        '45': 'HSPA+',
        '46': 'DC-HSPA+',
        '101': 'LTE',
    };
    return types[networkType] || networkType || 'Unknown';
}

export function getConnectionStatusName(status: string): string {
    const statuses: Record<string, string> = {
        '900': 'Connecting',
        '901': 'Connected',
        '902': 'Disconnected',
        '903': 'Disconnecting',
        '904': 'Connection Failed',
    };
    return statuses[status] || status || 'Unknown';
}
