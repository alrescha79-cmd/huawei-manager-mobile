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
const LAST_SMS_COUNT_KEY = 'last_sms_count';

let lastDailyNotifyTimestamp = 0;
let lastMonthlyNotifyTimestamp = 0;
let lastIpChangeNotifyTimestamp = 0;
let lastSmsNotifyTimestamp = 0;
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;

export interface NotificationSettings {
    dailyUsageEnabled: boolean;
    monthlyUsageEnabled: boolean;
    ipChangeEnabled: boolean;
    smsEnabled: boolean;
    badgesEnabled: boolean;
    preReleaseUpdateEnabled: boolean;
    clearHistoryReminderEnabled: boolean;
    clearHistoryReminderDay: number; // 1-31
    clearHistoryReminderHour: number; // 0-23
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    dailyUsageEnabled: true,
    monthlyUsageEnabled: true,
    ipChangeEnabled: true,
    smsEnabled: true,
    badgesEnabled: true,
    preReleaseUpdateEnabled: false,
    clearHistoryReminderEnabled: true,
    clearHistoryReminderDay: 31,
    clearHistoryReminderHour: 18,
};

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
 * Also subscribes to FCM topic all_users for broadcast via FCM HTTP v1
 */
async function registerForPushNotifications(): Promise<string | null> {
    try {
        const Constants = require('expo-constants').default;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ||
            Constants.easConfig?.projectId;

        if (!projectId) {
            console.log('No Expo project ID found - push notifications require EAS setup');
            return null;
        }

        const token = await Notifications.getExpoPushTokenAsync({ projectId });
        const pushToken = token.data;

        await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, pushToken);

        // Log for easy copying during development
        console.log('===========================================');
        console.log('EXPO PUSH TOKEN:');
        console.log(pushToken);
        console.log('===========================================');

        // Subscribe to FCM topic all_users for broadcast via FCM HTTP v1
        // ponytail: uses @react-native-firebase/messaging, requires prebuild. Upgrade path: if removing firebase, fallback to IID API or Expo topic.
        try {
            const messaging = require('@react-native-firebase/messaging').default;
            await messaging().subscribeToTopic('all_users');
            console.log('Subscribed to FCM topic all_users via firebase messaging');
        } catch (fcmError) {
            console.warn('FCM topic subscribe failed, trying Expo topic fallback:', fcmError);
            // Fallback: Expo topic subscription (legacy, doesn't support FCM broadcast but keep for compat)
            try {
                const response = await fetch(
                    `https://exp.host/--/api/v2/projects/${projectId}/topics/all_users/subscribe`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: pushToken }),
                    }
                );
                if (response.ok) {
                    console.log('Subscribed to Expo topic all_users (fallback)');
                } else {
                    console.warn('Expo topic subscription response:', response.status);
                }
            } catch (topicError) {
                console.warn('Failed to subscribe to Expo topic:', topicError);
            }
        }

        // Also log FCM token for debugging
        try {
            const deviceToken = await Notifications.getDevicePushTokenAsync();
            console.log('FCM Device Token:', deviceToken.data);
        } catch {}

        return pushToken;
    } catch (error) {
        console.log('Failed to get push token:', error);
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

        await Notifications.setNotificationChannelAsync('app-updates', {
            name: 'App Updates',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6C63FF',
        });

        await Notifications.setNotificationChannelAsync('clear-history-reminder', {
            name: 'Clear History Reminder',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250],
            lightColor: '#4ECDC4',
        });

        await Notifications.setNotificationChannelAsync('sms-alerts', {
            name: 'SMS Alerts',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250],
            lightColor: '#4ECDC4',
        });

        await Notifications.setNotificationChannelAsync('debug-reminder', {
            name: 'Debug Mode Reminder',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250],
            lightColor: '#4ECDC4',
        });

        await Notifications.setNotificationChannelAsync('inactivity-reminder', {
            name: 'Inactivity Reminder',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250],
            lightColor: '#4ECDC4',
        });
    }

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
        trigger: { channelId },
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
        lastDailyNotifyTimestamp = now;
        await AsyncStorage.setItem(LAST_DAILY_USAGE_NOTIFY_KEY, today);

        const usedGB = (dayUsed / (1024 * 1024 * 1024)).toFixed(2);
        const thresholdGB = (notifyThresholdBytes / (1024 * 1024 * 1024)).toFixed(2);

        await sendLocalNotification(
            translations.title,
            translations.body(usedGB, thresholdGB),
            'usage-alerts'
        );
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

    const now = Date.now();
    if (now - lastMonthlyNotifyTimestamp < NOTIFICATION_COOLDOWN_MS) return;

    const limitBytes = dataLimit * 1024 * 1024 * 1024;
    const notifyThresholdBytes = limitBytes * (monthThreshold / 100);

    const thisMonth = `${new Date().getFullYear()}-${new Date().getMonth()}`;
    const lastNotifyMonth = await AsyncStorage.getItem(LAST_MONTHLY_USAGE_NOTIFY_KEY);

    if (monthUsed >= notifyThresholdBytes && lastNotifyMonth !== thisMonth) {
        lastMonthlyNotifyTimestamp = now;
        await AsyncStorage.setItem(LAST_MONTHLY_USAGE_NOTIFY_KEY, thisMonth);

        const usedGB = (monthUsed / (1024 * 1024 * 1024)).toFixed(2);
        const limitGB = dataLimit.toFixed(0);

        await sendLocalNotification(
            translations.title,
            translations.body(usedGB, limitGB),
            'usage-alerts'
        );
    }
}

// ============================================================================
// IP CHANGE NOTIFICATION
// ============================================================================

export async function checkIPChangeNotification(
    currentSessionDuration: number,
    translations: { title: string; body: (timeAgo: string) => string }
): Promise<string | null> {
    const settings = await getNotificationSettings();
    if (!settings.ipChangeEnabled) return null;

    const now = Date.now();
    if (now - lastIpChangeNotifyTimestamp < NOTIFICATION_COOLDOWN_MS) {
        await AsyncStorage.setItem(
            LAST_SESSION_DURATION_KEY,
            currentSessionDuration.toString()
        );
        return null;
    }

    const lastDuration = await AsyncStorage.getItem(LAST_SESSION_DURATION_KEY);
    const previousDuration = lastDuration ? parseInt(lastDuration, 10) : 0;
    let ipChanged = false;
    let durationResult: string | null = null;

    if (currentSessionDuration < previousDuration && previousDuration > 60) {
        lastIpChangeNotifyTimestamp = now;
        await AsyncStorage.setItem(LAST_IP_CHANGE_TIME_KEY, now.toString());

        const currentMinutes = Math.floor(currentSessionDuration / 60);
        const currentHours = Math.floor(currentMinutes / 60);
        const remainingMinutes = currentMinutes % 60;

        let durationText: string;
        if (currentMinutes <= 0) durationText = '0';
        else if (currentHours > 0) {
            durationText = remainingMinutes > 0
                ? `${currentHours}h ${remainingMinutes}m`
                : `${currentHours}h`;
        } else {
            durationText = `${currentMinutes}m`;
        }

        await sendLocalNotification(
            translations.title,
            translations.body(durationText),
            'ip-change'
        );
        ipChanged = true;
        durationResult = durationText;
    }

    await AsyncStorage.setItem(
        LAST_SESSION_DURATION_KEY,
        currentSessionDuration.toString()
    );

    return durationResult;
}

// ============================================================================
// SMS NOTIFICATION
// ============================================================================

export async function checkNewSMSNotification(
    currentUnreadCount: number,
    translations: { title: string; body: (count: number) => string }
): Promise<void> {
    const settings = await getNotificationSettings();
    if (!settings.smsEnabled) return;

    const now = Date.now();
    if (now - lastSmsNotifyTimestamp < NOTIFICATION_COOLDOWN_MS) return;

    const lastCountStr = await AsyncStorage.getItem(LAST_SMS_COUNT_KEY);
    const lastCount = lastCountStr ? parseInt(lastCountStr, 10) : 0;

    if (currentUnreadCount > lastCount && currentUnreadCount > 0) {
        lastSmsNotifyTimestamp = now;
        await AsyncStorage.setItem(LAST_SMS_COUNT_KEY, currentUnreadCount.toString());

        const newCount = currentUnreadCount - lastCount;
        await sendLocalNotification(
            translations.title,
            translations.body(newCount),
            'sms-alerts',
            { route: '/sms' }
        );
    } else {
        await AsyncStorage.setItem(LAST_SMS_COUNT_KEY, currentUnreadCount.toString());
    }
}

// ============================================================================
// DEBUG MODE REMINDER NOTIFICATION
// ============================================================================

const LAST_ACTIVE_TIME_KEY = 'last_active_time';

export async function sendDebugModeReminder(translations: {
    title: string;
    body: string;
}): Promise<void> {
    await sendLocalNotification(
        translations.title,
        translations.body,
        'debug-reminder',
        { route: '/(tabs)/settings' }
    );
}

// ============================================================================
// INACTIVITY REMINDER NOTIFICATION
// ============================================================================

export async function saveLastActiveTime(): Promise<void> {
    await AsyncStorage.setItem(LAST_ACTIVE_TIME_KEY, Date.now().toString());
}

// ============================================================================
// CLEAR HISTORY REMINDER NOTIFICATION
// ============================================================================

const CLEAR_HISTORY_REMINDER_ID = 'clear-history-reminder';

/**
 * Get next scheduled date for clear history reminder
 * Clamps day to month length (e.g., day 31 in Feb → 28/29)
 */
export function getNextClearHistoryReminderDate(day: number, hour: number): Date {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Get days in current month
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(day, daysInCurrentMonth);

    // Create candidate date for current month
    const candidate = new Date(year, month, clampedDay, hour, 0, 0, 0);

    // If candidate is in the past, roll to next month
    if (candidate <= now) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
        const nextClampedDay = Math.min(day, daysInNextMonth);
        return new Date(nextYear, nextMonth, nextClampedDay, hour, 0, 0, 0);
    }

    return candidate;
}

/**
 * Schedule or cancel clear history reminder based on settings
 */
export async function scheduleClearHistoryReminder(
    settings: NotificationSettings,
    translations: { title: string; body: string }
): Promise<void> {
    // Cancel existing first
    await cancelClearHistoryReminder();

    if (!settings.clearHistoryReminderEnabled) {
        return;
    }

    const nextDate = getNextClearHistoryReminderDate(
        settings.clearHistoryReminderDay,
        settings.clearHistoryReminderHour
    );

    await Notifications.scheduleNotificationAsync({
        identifier: CLEAR_HISTORY_REMINDER_ID,
        content: {
            title: translations.title,
            body: translations.body,
            sound: true,
            data: {
                route: '/(tabs)/home',
                type: 'clear-history-reminder',
            },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: CLEAR_HISTORY_REMINDER_ID,
            date: nextDate,
        },
    });
}

/**
 * Cancel scheduled clear history reminder
 */
export async function cancelClearHistoryReminder(): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(CLEAR_HISTORY_REMINDER_ID);
    } catch {
        // Ignore if not found
    }
}

/**
 * Sync clear history reminder with current settings and translations
 * Call on app start, settings change, and language change
 */
export async function syncClearHistoryReminder(translations: {
    title: string;
    body: string;
}): Promise<void> {
    const settings = await getNotificationSettings();
    await scheduleClearHistoryReminder(settings, translations);
}
