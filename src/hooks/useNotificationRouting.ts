import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/auth.store';
import { ToastHelper } from '@/components';
import { useTranslation } from '@/i18n';

/**
 * Wires notification response handling: routes notifications to screens or
 * the webview, queues routes until the app is ready, shows the clear-history
 * reminder toast, and bridges FCM data-only foreground messages to local
 * notifications.
 */
export function useNotificationRouting(authReady: boolean) {
    const router = useRouter();
    const { t } = useTranslation();

    const pendingNotificationRoute = useRef<string | null>(null);
    const pendingNotificationUrl = useRef<string | null>(null);
    const pendingClearHistoryReminderToast = useRef<boolean>(false);

    const maybeShowClearHistoryToast = async () => {
        const { isAuthenticated, credentials } = useAuthStore.getState();
        if (!isAuthenticated || !credentials) {
            setTimeout(() => {
                ToastHelper.warning(t('notifications.clearHistoryReminderNeedLogin'));
            }, 1000);
            return;
        }
        // Already cleared this month → no toast
        const now = new Date();
        const lastCleared = await AsyncStorage.getItem('lastClearedTrafficDate');
        if (lastCleared) {
            const cleared = new Date(lastCleared);
            if (cleared.getMonth() === now.getMonth() && cleared.getFullYear() === now.getFullYear()) {
                return;
            }
        }
        // Already shown for this reminder cycle → no spam
        const CLEAR_HISTORY_TOAST_SHOWN_KEY = 'clearHistoryReminderToastShown';
        const alreadyShown = await AsyncStorage.getItem(CLEAR_HISTORY_TOAST_SHOWN_KEY);
        const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
        if (alreadyShown === monthKey) return;
        await AsyncStorage.setItem(CLEAR_HISTORY_TOAST_SHOWN_KEY, monthKey);
        setTimeout(() => {
            ToastHelper.info(t('notifications.clearHistoryReminderBody'));
        }, 1000);
    };

    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
        const rawData = response.notification.request.content.data;
        const notificationTitle = response.notification.request.content.title;
        const data = rawData as { route?: string; url?: string; type?: string; body?: { route?: string; url?: string } } | undefined;

        let route = data?.route;
        let url = data?.url;
        const notificationType = data?.type;

        if (!route && data?.body?.route) {
            route = data.body.route;
        }
        if (!url && data?.body?.url) {
            url = data.body.url;
        }

        const openWebView = (targetUrl: string) => {
            router.push({ pathname: '/webview', params: { url: targetUrl, title: notificationTitle || 'Link' } });
        };

        // Handle clear-history-reminder: show toast if not logged in, or remind once if history not cleared
        if (authReady) {
            if (route && typeof route === 'string') {
                router.push(route as any);
                if (notificationType === 'clear-history-reminder') {
                    maybeShowClearHistoryToast();
                }
            } else if (url && typeof url === 'string') {
                openWebView(url);
            }
        } else {
            if (route && typeof route === 'string') {
                pendingNotificationRoute.current = route;
                if (notificationType === 'clear-history-reminder') {
                    pendingClearHistoryReminderToast.current = true;
                }
            } else if (url && typeof url === 'string') {
                pendingNotificationUrl.current = url;
            }
        }
    };

    useEffect(() => {
        const getInitialNotification = async () => {
            const lastResponse = await Notifications.getLastNotificationResponseAsync();
            if (lastResponse) {
                handleNotificationResponse(lastResponse);
            }
        };
        getInitialNotification();

        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            handleNotificationResponse(response);
        });

        // FCM foreground message listener (for topic messages)
        let fcmUnsubscribe: (() => void) | null = null;
        try {
            const messaging = require('@react-native-firebase/messaging').default;
            fcmUnsubscribe = messaging().onMessage(async (remoteMessage: any) => {
                console.log('FCM foreground message:', remoteMessage);
                // FCM data messages with notification payload are auto-displayed by system
                // For data-only messages, show local notification
                if (remoteMessage?.data && !remoteMessage?.notification) {
                    const { title, body, route, url } = remoteMessage.data;
                    if (title && body) {
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: title as string,
                                body: body as string,
                                data: { route, url, ...remoteMessage.data },
                                sound: true,
                            },
                            trigger: null,
                        });
                    }
                }
            });
        } catch (e) {
            console.log('FCM onMessage not available:', e);
        }

        return () => {
            subscription.remove();
            if (fcmUnsubscribe) fcmUnsubscribe();
        };
    }, [router]);

    useEffect(() => {
        if (authReady) {
            if (pendingNotificationRoute.current) {
                const route = pendingNotificationRoute.current;
                pendingNotificationRoute.current = null;

                setTimeout(() => {
                    router.push(route as any);
                }, 800);
            } else if (pendingNotificationUrl.current) {
                const url = pendingNotificationUrl.current;
                pendingNotificationUrl.current = null;

                setTimeout(() => {
                    router.push({ pathname: '/webview', params: { url, title: 'Link' } });
                }, 800);
            }

            // Handle pending clear-history-reminder toast
            if (pendingClearHistoryReminderToast.current) {
                pendingClearHistoryReminderToast.current = null;
                maybeShowClearHistoryToast();
            }
        }
    }, [authReady, router]);
}
