import AsyncStorage from '@react-native-async-storage/async-storage';

const MONTHLY_USAGE_HISTORY_KEY = 'monthly_usage_history';

export interface MonthlyUsageData {
    month: string; // Format: YYYY-MM
    download: number;
    upload: number;
    total: number;
}

export interface UsageHistory {
    months: MonthlyUsageData[];
}

/**
 * Get stored monthly usage history
 */
export async function getUsageHistory(): Promise<UsageHistory> {
    try {
        const data = await AsyncStorage.getItem(MONTHLY_USAGE_HISTORY_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error reading usage history:', error);
    }
    return { months: [] };
}

/**
 * Save monthly usage history
 */
export async function saveUsageHistory(history: UsageHistory): Promise<void> {
    try {
        await AsyncStorage.setItem(MONTHLY_USAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.log('Error saving usage history:', error);
    }
}

/**
 * Get current month key (YYYY-MM format)
 */
export function getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get last month key (YYYY-MM format)
 */
export function getLastMonthKey(): string {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Check if it's a new month and save previous month's data
 * Call this when app loads with current traffic stats
 */
export async function checkAndSaveMonthlyUsage(
    totalDownload: number,
    totalUpload: number,
    monthDownload: number,
    monthUpload: number
): Promise<void> {
    const history = await getUsageHistory();
    const currentMonth = getCurrentMonthKey();
    const lastMonth = getLastMonthKey();

    // Check if we already have last month's data
    const hasLastMonth = history.months.some(m => m.month === lastMonth);

    if (!hasLastMonth) {
        // Calculate last month's usage from total - current month
        const lastMonthDownload = Math.max(0, totalDownload - monthDownload);
        const lastMonthUpload = Math.max(0, totalUpload - monthUpload);

        if (lastMonthDownload > 0 || lastMonthUpload > 0) {
            history.months.push({
                month: lastMonth,
                download: lastMonthDownload,
                upload: lastMonthUpload,
                total: lastMonthDownload + lastMonthUpload,
            });

            // Keep only last 12 months
            if (history.months.length > 12) {
                history.months = history.months.slice(-12);
            }

            await saveUsageHistory(history);
        }
    }
}

/**
 * Get last month's usage data
 */
export async function getLastMonthUsage(
    totalDownload: number,
    totalUpload: number,
    monthDownload: number,
    monthUpload: number
): Promise<MonthlyUsageData | null> {
    const history = await getUsageHistory();
    const lastMonth = getLastMonthKey();

    // Try to find stored data first
    const storedData = history.months.find(m => m.month === lastMonth);
    if (storedData) {
        return storedData;
    }

    // Calculate from total - current month
    const lastMonthDownload = Math.max(0, totalDownload - monthDownload);
    const lastMonthUpload = Math.max(0, totalUpload - monthUpload);

    if (lastMonthDownload > 0 || lastMonthUpload > 0) {
        return {
            month: lastMonth,
            download: lastMonthDownload,
            upload: lastMonthUpload,
            total: lastMonthDownload + lastMonthUpload,
        };
    }

    return null;
}

/**
 * Format month key to display string (e.g., "Jan 2024")
 */
export function formatMonthKey(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
