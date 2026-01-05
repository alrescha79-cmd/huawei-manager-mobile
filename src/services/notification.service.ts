import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const EXPO_PUSH_TOKEN_KEY = 'expo_push_token';
const LAST_DAILY_USAGE_NOTIFY_KEY = 'last_daily_usage_notify_date';
const LAST_MONTHLY_USAGE_NOTIFY_KEY = 'last_monthly_usage_notify_date';
const LAST_SESSION_DURATION_KEY = 'last_session_duration';
const LAST_IP_CHANGE_TIME_KEY = 'last_ip_change_time';

// Cooldown to prevent duplicate notifications (in-memory, resets on app restart)
let lastDailyNotifyTimestamp = 0;
let lastMonthlyNotifyTimestamp = 0;
let lastIpChangeNotifyTimestamp = 0;
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Notification settings interface
export interface NotificationSettings {
    dailyUsageEnabled: boolean;
    monthlyUsageEnabled: boolean;
    ipChangeEnabled: boolean;
}

// Default notification settings
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    dailyUsageEnabled: true,
    monthlyUsageEnabled: true,
    ipChangeEnabled: true,
};

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ============================================================================
// NOTIFICATION SETTINGS STORAGE
// ============================================================================

export async function getNotificationSettings(): Promise<NotificationSettings> {
    try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (stored) {
            return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(stored) };
        }
        return DEFAULT_NOTIFICATION_SETTINGS;
    } catch {
        return DEFAULT_NOTIFICATION_SETTINGS;
    }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
        await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving notification settings:', error);
    }
}

// ============================================================================
// EXPO PUSH TOKEN (for remote notifications)
// ============================================================================

/**
 * Register for push notifications and get Expo Push Token
 * Token is stored locally and logged to console for easy copying
 */
async function registerForPushNotifications(): Promise<string | null> {
    try {
        // Get project ID from Constants
        const Constants = require('expo-constants').default;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ||
            Constants.easConfig?.projectId;

        if (!projectId) {
            console.log('No Expo project ID found - push notifications require EAS setup');
            return null;
        }

        const token = await Notifications.getExpoPushTokenAsync({ projectId });
        const pushToken = token.data;

        // Store token locally
        await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, pushToken);

        // Log for easy copying during development
        console.log('===========================================');
        console.log('📱 EXPO PUSH TOKEN:');
        console.log(pushToken);
        console.log('===========================================');

        // Subscribe to 'all_users' topic for broadcast notifications
        await Notifications.setNotificationChannelAsync?.('app-updates', {
            name: 'App Updates',
            importance: Notifications.AndroidImportance.HIGH,
        });

        console.log('📱 Subscribed to all_users topic for broadcast notifications');

        return pushToken;
    } catch (error) {
        console.log('Failed to get push token:', error);
        return null;
    }
}

/**
 * Get stored Expo Push Token
 */
export async function getExpoPushToken(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
    } catch {
        return null;
    }
}

// ============================================================================
// NOTIFICATION PERMISSIONS
// ============================================================================

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

    // Configure notification channels for Android
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

        // Channel for app updates
        await Notifications.setNotificationChannelAsync('app-updates', {
            name: 'App Updates',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6C63FF',
        });
    }

    // Register for push notifications and get token
    await registerForPushNotifications();

    return true;
}

// ============================================================================
// SEND NOTIFICATION
// ============================================================================

export async function sendLocalNotification(
    title: string,
    body: string,
    channelId: string = 'usage-alerts',
    data?: { route?: string; url?: string;[key: string]: any }
): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: true,
            data: data || {},
        },
        trigger: null,
    });
}

// ============================================================================
// DAILY USAGE NOTIFICATION
// ============================================================================

export async function checkDailyUsageNotification(
    dayUsed: number,
    dataLimit: number,
    monthThreshold: number,
    translations: { title: string; body: (used: string, limit: string) => string }
): Promise<void> {
    const settings = await getNotificationSettings();
    if (!settings.dailyUsageEnabled) return;

    // Cooldown check to prevent duplicate notifications
    const now = Date.now();
    if (now - lastDailyNotifyTimestamp < NOTIFICATION_COOLDOWN_MS) return;

    const daysInMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0
    ).getDate();

    const dailyAllowanceBytes = (dataLimit * 1024 * 1024 * 1024) / daysInMonth;
    const notifyThresholdBytes = dailyAllowanceBytes * (monthThreshold / 100);

    const today = new Date().toDateString();
    const lastNotifyDate = await AsyncStorage.getItem(LAST_DAILY_USAGE_NOTIFY_KEY);

    if (dayUsed >= notifyThresholdBytes && lastNotifyDate !== today) {
        const usedGB = (dayUsed / (1024 * 1024 * 1024)).toFixed(2);
        const thresholdGB = (notifyThresholdBytes / (1024 * 1024 * 1024)).toFixed(2);

        await sendLocalNotification(
            translations.title,
            translations.body(usedGB, thresholdGB),
            'usage-alerts'
        );

        lastDailyNotifyTimestamp = now;
        await AsyncStorage.setItem(LAST_DAILY_USAGE_NOTIFY_KEY, today);
    }
}

// ============================================================================
// MONTHLY USAGE NOTIFICATION
// ============================================================================

export async function checkMonthlyUsageNotification(
    monthUsed: number,
    dataLimit: number,
    monthThreshold: number,
    translations: { title: string; body: (used: string, limit: string) => string }
): Promise<void> {
    const settings = await getNotificationSettings();
    if (!settings.monthlyUsageEnabled) return;

    // Cooldown check to prevent duplicate notifications
    const now = Date.now();
    if (now - lastMonthlyNotifyTimestamp < NOTIFICATION_COOLDOWN_MS) return;

    const limitBytes = dataLimit * 1024 * 1024 * 1024;
    const notifyThresholdBytes = limitBytes * (monthThreshold / 100);

    const thisMonth = `${new Date().getFullYear()}-${new Date().getMonth()}`;
    const lastNotifyMonth = await AsyncStorage.getItem(LAST_MONTHLY_USAGE_NOTIFY_KEY);

    if (monthUsed >= notifyThresholdBytes && lastNotifyMonth !== thisMonth) {
        const usedGB = (monthUsed / (1024 * 1024 * 1024)).toFixed(2);
        const limitGB = dataLimit.toFixed(0);

        await sendLocalNotification(
            translations.title,
            translations.body(usedGB, limitGB),
            'usage-alerts'
        );

        lastMonthlyNotifyTimestamp = now;
        await AsyncStorage.setItem(LAST_MONTHLY_USAGE_NOTIFY_KEY, thisMonth);
    }
}

// ============================================================================
// IP CHANGE NOTIFICATION
// ============================================================================

export async function getLastIpChangeTime(): Promise<number | null> {
    try {
        const time = await AsyncStorage.getItem(LAST_IP_CHANGE_TIME_KEY);
        return time ? parseInt(time, 10) : null;
    } catch {
        return null;
    }
}

export async function checkIPChangeNotification(
    currentSessionDuration: number,
    translations: { title: string; body: (timeAgo: string) => string }
): Promise<void> {
    const settings = await getNotificationSettings();
    if (!settings.ipChangeEnabled) return;

    // Cooldown check to prevent duplicate notifications
    const now = Date.now();
    if (now - lastIpChangeNotifyTimestamp < NOTIFICATION_COOLDOWN_MS) {
        // Still update session duration even during cooldown
        await AsyncStorage.setItem(
            LAST_SESSION_DURATION_KEY,
            currentSessionDuration.toString()
        );
        return;
    }

    const lastDuration = await AsyncStorage.getItem(LAST_SESSION_DURATION_KEY);
    const previousDuration = lastDuration ? parseInt(lastDuration, 10) : 0;

    if (currentSessionDuration < previousDuration && previousDuration > 60) {
        await AsyncStorage.setItem(LAST_IP_CHANGE_TIME_KEY, now.toString());

        // Format previous session duration for notification body
        const prevMinutes = Math.floor(previousDuration / 60);
        const prevHours = Math.floor(prevMinutes / 60);
        const remainingMinutes = prevMinutes % 60;

        let durationText: string;
        if (prevHours > 0) {
            durationText = remainingMinutes > 0
                ? `${prevHours}h ${remainingMinutes}m`
                : `${prevHours}h`;
        } else {
            durationText = `${prevMinutes}m`;
        }

        await sendLocalNotification(
            translations.title,
            translations.body(durationText),
            'ip-change'
        );

        lastIpChangeNotifyTimestamp = now;
    }

    await AsyncStorage.setItem(
        LAST_SESSION_DURATION_KEY,
        currentSessionDuration.toString()
    );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatTimeAgo(timestamp: number, translations: {
    minutesAgo: string;
    hoursAgo: string;
    justNow: string;
}): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) {
        return translations.justNow;
    } else if (diffMinutes < 60) {
        return translations.minutesAgo.replace('{{minutes}}', diffMinutes.toString());
    } else {
        return translations.hoursAgo.replace('{{hours}}', diffHours.toString());
    }
}

export async function resetNotificationTracking(): Promise<void> {
    await AsyncStorage.removeItem(LAST_DAILY_USAGE_NOTIFY_KEY);
    await AsyncStorage.removeItem(LAST_MONTHLY_USAGE_NOTIFY_KEY);
    await AsyncStorage.removeItem(LAST_SESSION_DURATION_KEY);
    await AsyncStorage.removeItem(LAST_IP_CHANGE_TIME_KEY);
}

// ============================================================================
// DEBUG MODE REMINDER NOTIFICATION
// ============================================================================

const LAST_ACTIVE_TIME_KEY = 'last_active_time';
const INACTIVITY_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export async function sendDebugModeReminder(translations: {
    title: string;
    body: string;
}): Promise<void> {
    await sendLocalNotification(
        translations.title,
        translations.body,
        'debug-reminder',
        { route: '/(tabs)/settings' } // Navigate to settings when tapped
    );
}

// ============================================================================
// INACTIVITY REMINDER NOTIFICATION
// ============================================================================

export async function saveLastActiveTime(): Promise<void> {
    await AsyncStorage.setItem(LAST_ACTIVE_TIME_KEY, Date.now().toString());
}

export async function getLastActiveTime(): Promise<number | null> {
    const value = await AsyncStorage.getItem(LAST_ACTIVE_TIME_KEY);
    return value ? parseInt(value, 10) : null;
}

export async function checkInactivityReminder(translations: {
    title: string;
    body: string;
}): Promise<boolean> {
    const lastActive = await getLastActiveTime();

    if (!lastActive) {
        // First time, just save current time
        await saveLastActiveTime();
        return false;
    }

    const timeSinceActive = Date.now() - lastActive;

    if (timeSinceActive >= INACTIVITY_THRESHOLD_MS) {
        await sendLocalNotification(
            translations.title,
            translations.body,
            'inactivity-reminder',
            { route: '/(tabs)/home' } // Navigate to home when tapped
        );
        return true;
    }

    return false;
}
