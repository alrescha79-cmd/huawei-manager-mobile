import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for notification tracking
const LAST_USAGE_NOTIFY_DATE_KEY = 'last_usage_notify_date';
const LAST_SESSION_DURATION_KEY = 'last_session_duration';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permissions
 * @returns true if permission granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
        console.log('Notifications only work on physical devices');
        return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Notification permission not granted');
        return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('usage-alerts', {
            name: 'Usage Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B6B',
        });

        await Notifications.setNotificationChannelAsync('ip-change', {
            name: 'IP Change',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250],
            lightColor: '#4ECDC4',
        });
    }

    return true;
}

/**
 * Send a local notification
 */
export async function sendLocalNotification(
    title: string,
    body: string,
    channelId: string = 'usage-alerts'
): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: true,
        },
        trigger: null, // Send immediately
    });
}

/**
 * Check and send daily usage notification if threshold reached
 * @param dayUsed - Current daily usage in bytes
 * @param dataLimit - Monthly data limit in GB
 * @param monthThreshold - Threshold percentage (e.g., 90 for 90%)
 * @param translations - Translated notification strings
 */
export async function checkDailyUsageNotification(
    dayUsed: number,
    dataLimit: number,
    monthThreshold: number,
    translations: { title: string; body: (used: string, limit: string) => string }
): Promise<void> {
    // Calculate daily allowance and threshold
    const daysInMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0
    ).getDate();

    const dailyAllowanceBytes = (dataLimit * 1024 * 1024 * 1024) / daysInMonth;
    const notifyThresholdBytes = dailyAllowanceBytes * (monthThreshold / 100);

    // Check if already notified today
    const today = new Date().toDateString();
    const lastNotifyDate = await AsyncStorage.getItem(LAST_USAGE_NOTIFY_DATE_KEY);

    if (dayUsed >= notifyThresholdBytes && lastNotifyDate !== today) {
        // Convert to readable format
        const usedGB = (dayUsed / (1024 * 1024 * 1024)).toFixed(2);
        const thresholdGB = (notifyThresholdBytes / (1024 * 1024 * 1024)).toFixed(2);

        await sendLocalNotification(
            translations.title,
            translations.body(usedGB, thresholdGB),
            'usage-alerts'
        );

        // Mark as notified today
        await AsyncStorage.setItem(LAST_USAGE_NOTIFY_DATE_KEY, today);
    }
}

/**
 * Check and send IP change notification
 * @param currentSessionDuration - Current session duration in seconds
 * @param translations - Translated notification strings
 */
export async function checkIPChangeNotification(
    currentSessionDuration: number,
    translations: { title: string; body: string }
): Promise<void> {
    const lastDuration = await AsyncStorage.getItem(LAST_SESSION_DURATION_KEY);
    const previousDuration = lastDuration ? parseInt(lastDuration, 10) : 0;

    // If current duration is less than previous and previous was > 60 seconds,
    // it likely means the connection was reset (new IP)
    if (currentSessionDuration < previousDuration && previousDuration > 60) {
        await sendLocalNotification(
            translations.title,
            translations.body,
            'ip-change'
        );
    }

    // Save current duration for next comparison
    await AsyncStorage.setItem(
        LAST_SESSION_DURATION_KEY,
        currentSessionDuration.toString()
    );
}

/**
 * Reset notification tracking (call on logout or when needed)
 */
export async function resetNotificationTracking(): Promise<void> {
    await AsyncStorage.removeItem(LAST_USAGE_NOTIFY_DATE_KEY);
    await AsyncStorage.removeItem(LAST_SESSION_DURATION_KEY);
}
