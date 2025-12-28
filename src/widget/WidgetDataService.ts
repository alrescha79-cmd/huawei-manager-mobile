import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WidgetData {
    // Speed data (realtime)
    currentDownloadRate: number;
    currentUploadRate: number;
    // Session data
    currentDownload: number;
    currentUpload: number;
    currentConnectTime: number;
    // Monthly data
    monthDownload: number;
    monthUpload: number;
    monthDuration: number;
    // Daily data
    dayUsed: number;
    dayDuration: number;
    // Total data
    totalDownload: number;
    totalUpload: number;
    totalConnectTime: number;
    // Connection info
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

// Parse XML value helper
function parseXMLValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
}

// Safe parseInt with fallback
function safeParseInt(value: string): number {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
}

// Get modem IP from stored credentials
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

// Cache widget data for offline access
async function cacheWidgetData(data: WidgetData): Promise<void> {
    try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
        // Ignored - caching is optional
    }
}

// Get cached widget data
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

/**
 * Fetch ONLY speed data - fast, for realtime updates
 * Only fetches traffic-statistics endpoint (fastest)
 * 
 * IMPORTANT: This endpoint does NOT require authentication!
 * The modem allows read access to traffic statistics without login.
 */
export async function fetchSpeedData(): Promise<SpeedData> {
    const modemIp = await getModemIp();
    const baseURL = `http://${modemIp}`;

    try {
        // No authentication needed - traffic-statistics is public
        const response = await axios.get(`${baseURL}/api/monitoring/traffic-statistics`, {
            timeout: 2000, // Fast timeout for realtime
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

/**
 * Fetch ALL widget data - slower, for full updates
 * Fetches multiple endpoints
 * 
 * IMPORTANT: These endpoints do NOT require authentication!
 * The modem allows read access to monitoring data without login:
 * - /api/monitoring/traffic-statistics (speeds, session, total traffic)
 * - /api/monitoring/month_statistics (monthly and daily usage)
 * - /api/monitoring/status (connection status, network type, signal)
 */
export async function fetchWidgetData(): Promise<WidgetData> {
    const modemIp = await getModemIp();
    const baseURL = `http://${modemIp}`;
    const timeout = 5000;

    try {
        // Fetch traffic statistics (NO LOGIN REQUIRED)
        const trafficResponse = await axios.get(`${baseURL}/api/monitoring/traffic-statistics`, {
            timeout,
            headers: {
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const trafficData = trafficResponse.data;

        // Fetch monthly statistics
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
            
            // Monthly download/upload
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
            
            // Monthly duration
            monthDuration = safeParseInt(
                parseXMLValue(monthData, 'CurrentMonthDuration') ||
                parseXMLValue(monthData, 'monthDuration') ||
                parseXMLValue(monthData, 'MonthDuration')
            );
            
            // Daily usage (combined download + upload)
            dayUsed = safeParseInt(
                parseXMLValue(monthData, 'CurrentDayUsed') ||
                parseXMLValue(monthData, 'dayUsed') ||
                parseXMLValue(monthData, 'DayUsed')
            );
            
            // Daily duration
            dayDuration = safeParseInt(
                parseXMLValue(monthData, 'CurrentDayDuration') ||
                parseXMLValue(monthData, 'dayDuration') ||
                parseXMLValue(monthData, 'DayDuration')
            );
        } catch {
            // Monthly stats not available
        }

        // Fetch modem status
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
            // Speed data
            currentDownloadRate: safeParseInt(parseXMLValue(trafficData, 'CurrentDownloadRate')),
            currentUploadRate: safeParseInt(parseXMLValue(trafficData, 'CurrentUploadRate')),
            // Session data
            currentDownload: safeParseInt(parseXMLValue(trafficData, 'CurrentDownload')),
            currentUpload: safeParseInt(parseXMLValue(trafficData, 'CurrentUpload')),
            currentConnectTime: safeParseInt(parseXMLValue(trafficData, 'CurrentConnectTime')),
            // Monthly data
            monthDownload,
            monthUpload,
            monthDuration,
            // Daily data
            dayUsed,
            dayDuration,
            // Total data
            totalDownload: safeParseInt(parseXMLValue(trafficData, 'TotalDownload')),
            totalUpload: safeParseInt(parseXMLValue(trafficData, 'TotalUpload')),
            totalConnectTime: safeParseInt(parseXMLValue(trafficData, 'TotalConnectTime')),
            // Connection info
            connectionStatus,
            networkType,
            signalStrength,
            lastUpdated: Date.now(),
        };

        // Cache for offline access
        await cacheWidgetData(widgetData);

        return widgetData;
    } catch (error: any) {
        // Return cached data with error flag
        const cachedData = await getCachedWidgetData();
        if (cachedData) {
            return {
                ...cachedData,
                error: 'No connection to modem',
            };
        }

        // Return empty data with error
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

// Format bytes to human readable string
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format speed (bytes per second) to human readable string
export function formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';

    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

    return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Get network type display name
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

// Get connection status display name  
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
