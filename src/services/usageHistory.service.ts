import AsyncStorage from '@react-native-async-storage/async-storage';

const MONTHLY_USAGE_HISTORY_KEY = 'monthly_usage_history';

export interface MonthlyUsageData {
    month: string;
    download: number;
    upload: number;
    total: number;
}

export interface UsageHistory {
    months: MonthlyUsageData[];
}

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

export async function saveUsageHistory(history: UsageHistory): Promise<void> {
    try {
        await AsyncStorage.setItem(MONTHLY_USAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.log('Error saving usage history:', error);
    }
}

export function getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getLastMonthKey(): string {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function checkAndSaveMonthlyUsage(
    totalDownload: number,
    totalUpload: number,
    monthDownload: number,
    monthUpload: number
): Promise<void> {
    const history = await getUsageHistory();
    const currentMonth = getCurrentMonthKey();
    const lastMonth = getLastMonthKey();

    // Calculate last month usage from total - current month
    const lastMonthDownload = Math.max(0, totalDownload - monthDownload);
    const lastMonthUpload = Math.max(0, totalUpload - monthUpload);

    // Only proceed if we have meaningful data
    if (lastMonthDownload <= 0 && lastMonthUpload <= 0) {
        return;
    }

    const existingIndex = history.months.findIndex(m => m.month === lastMonth);
    const newData: MonthlyUsageData = {
        month: lastMonth,
        download: lastMonthDownload,
        upload: lastMonthUpload,
        total: lastMonthDownload + lastMonthUpload,
    };

    if (existingIndex >= 0) {
        // Update existing entry if the new calculated value is different
        // This handles cases where totalDownload/totalUpload grew
        if (history.months[existingIndex].total !== newData.total) {
            history.months[existingIndex] = newData;
            await saveUsageHistory(history);
        }
    } else {
        // Add new entry for last month
        history.months.push(newData);

        // Keep only last 12 months
        if (history.months.length > 12) {
            history.months = history.months.slice(-12);
        }

        await saveUsageHistory(history);
    }
}

export async function getLastMonthUsage(
    totalDownload: number,
    totalUpload: number,
    monthDownload: number,
    monthUpload: number
): Promise<MonthlyUsageData | null> {
    const history = await getUsageHistory();
    const lastMonth = getLastMonthKey();

    const storedData = history.months.find(m => m.month === lastMonth);
    if (storedData) {
        return storedData;
    }

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

export function formatMonthKey(monthKey: string, locale: string = 'en-US'): string {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
}
