import dayjs from 'dayjs';

/**
 * Format time as relative string (e.g., "5m ago", "2h ago")
 */
export function formatTimeAgo(dateStr: string): string {
    const messageDate = dayjs(dateStr);
    const now = dayjs();
    const diffMinutes = now.diff(messageDate, 'minute');
    const diffHours = now.diff(messageDate, 'hour');
    const diffDays = now.diff(messageDate, 'day');

    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.format('MMM D');
}

/**
 * Format seconds as time remaining string (e.g., "1h 30m")
 */
export function formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * Format MAC address for display (XX:XX:XX:XX:XX:XX)
 */
export function formatMacAddress(mac: string): string {
    if (!mac) return '';
    if (mac.includes(':')) return mac.toUpperCase();
    return mac.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
}

/**
 * Get signal quality category based on value and thresholds
 */
export function getSignalQuality(
    value: number,
    thresholds: { excellent: number; good: number; fair: number; poor: number },
    reverseScale: boolean
): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    if (value === undefined || value === null || isNaN(value)) return 'unknown';

    if (reverseScale) {
        if (value >= thresholds.excellent) return 'excellent';
        if (value >= thresholds.good) return 'good';
        if (value >= thresholds.fair) return 'fair';
        return 'poor';
    } else {
        if (value >= thresholds.excellent) return 'excellent';
        if (value >= thresholds.good) return 'good';
        if (value >= thresholds.fair) return 'fair';
        return 'poor';
    }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(
    seconds: number,
    units: { days: string; hours: string; minutes: string; seconds: string }
): string {
    if (!seconds || seconds <= 0) return `0${units.seconds}`;

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}${units.days}`);
    if (hours > 0) parts.push(`${hours}${units.hours}`);
    if (minutes > 0) parts.push(`${minutes}${units.minutes}`);
    if (secs > 0 && days === 0) parts.push(`${secs}${units.seconds}`);

    return parts.join(' ') || `0${units.seconds}`;
}
