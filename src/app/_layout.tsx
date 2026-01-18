import { Stack } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Linking, AppState, Platform, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { useTheme } from '@/theme';
import { ThemedAlert, setAlertListener, ThemedAlertHelper, AnimatedSplashScreen } from '@/components';
import { useTranslation } from '@/i18n';
import { startRealtimeWidgetUpdates, stopRealtimeWidgetUpdates } from '@/widget';
import { isSessionLikelyValid } from '@/utils/storage';
import { requestNotificationPermissions } from '@/services/notification.service';
import * as Notifications from 'expo-notifications';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, Doto_700Bold } from '@expo-google-fonts/doto';
import { KeyboardProvider } from 'react-native-keyboard-controller';

SplashScreen.preventAutoHideAsync();

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
}

const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
};

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Doto_700Bold,
    });
    const [appIsReady, setAppIsReady] = useState(false);

    const { colors, isDark } = useTheme();
    const {
        isAuthenticated,
        loadCredentials,
        autoLogin,
        tryQuietSessionRestore,
        startSessionKeepAlive,
        stopSessionKeepAlive
    } = useAuthStore();
    const { initializeLanguage } = useThemeStore();
    const { t } = useTranslation();
    const segments = useSegments();
    const router = useRouter();

    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const [isRestoringSession, setIsRestoringSession] = useState(false);
    const [authReady, setAuthReady] = useState(false);

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) {
            await SplashScreen.hideAsync();
            setAppIsReady(true);
        }
    }, [fontsLoaded]);

    useEffect(() => {
        if (fontsLoaded) {
            onLayoutRootView();
        }
    }, [fontsLoaded, onLayoutRootView]);

    useEffect(() => {
        if (Platform.OS === 'android') {
            const configureNavBar = async () => {
                try {
                    await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
                } catch (e) {
                    console.warn('Failed to configure navigation bar:', e);
                }
            };
            configureNavBar();
        }
    }, [isDark]);

    const [alertState, setAlertState] = useState<AlertState>({
        visible: false,
        title: '',
        message: '',
        buttons: [],
    });

    const checkForUpdates = async () => {
        try {
            const response = await fetch(
                'https://api.github.com/repos/alrescha79-cmd/huawei-manager-mobile/releases/latest'
            );

            if (!response.ok) return;

            const data = await response.json();
            const latestVersion = data.tag_name?.replace(/^v/, '') || '';
            const currentVersion = Constants.expoConfig?.version || '1.0.0';

            if (compareVersions(latestVersion, currentVersion) > 0) {
                const downloadUrl = data.html_url || 'https://github.com/alrescha79-cmd/huawei-manager-mobile/releases';

                ThemedAlertHelper.alert(
                    t('settings.updateAvailable') + ` v${latestVersion}`,
                    t('alerts.newVersionAvailable'),
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('settings.downloadUpdate'),
                            onPress: () => Linking.openURL(downloadUrl)
                        },
                    ]
                );
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    };

    const STAR_ALERT_VERSION_KEY = 'star_alert_shown_version';
    const GITHUB_REPO_URL = 'https://github.com/alrescha79-cmd/huawei-manager-mobile';

    const checkAndShowStarRequest = async () => {
        try {
            const currentVersion = Constants.expoConfig?.version || '1.0.0';
            const shownVersion = await AsyncStorage.getItem(STAR_ALERT_VERSION_KEY);

            if (shownVersion !== currentVersion) {
                setTimeout(() => {
                    ThemedAlertHelper.alert(
                        t('alerts.enjoyingApp'),
                        t('alerts.starRequest'),
                        [
                            {
                                text: t('common.later'),
                                style: 'cancel',
                                onPress: async () => {
                                }
                            },
                            {
                                text: '⭐ ' + t('alerts.giveStars'),
                                onPress: async () => {
                                    await AsyncStorage.setItem(STAR_ALERT_VERSION_KEY, currentVersion);
                                    Linking.openURL(GITHUB_REPO_URL);
                                }
                            },
                        ]
                    );
                    AsyncStorage.setItem(STAR_ALERT_VERSION_KEY, currentVersion);
                }, 5000);
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    };

    useEffect(() => {
        const initializeApp = async () => {
            initializeLanguage();
            checkForUpdates();
            requestNotificationPermissions();
            await loadCredentials();
            const credentials = useAuthStore.getState().credentials;
            if (credentials) {
                const result = await useAuthStore.getState().tryQuietSessionRestore();

                if (!result.success) {
                    if (result.error === 'unreachable') {
                        // Modem not reachable - show alert and proceed to app
                        setAlertState({
                            visible: true,
                            title: t('alerts.modemNotReachable'),
                            message: t('alerts.modemNotReachableMessage'),
                            buttons: [
                                { text: t('common.ok'), style: 'default' }
                            ]
                        });
                    } else {
                        // Auth failed but modem is reachable - try autoLogin
                        await autoLogin();
                    }
                }
                checkAndShowStarRequest();
            }
            setAuthReady(true);
        };
        initializeApp();
    }, []);

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

        return () => subscription.remove();
    }, [router]);

    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
        const rawData = response.notification.request.content.data;
        const data = rawData as { route?: string; url?: string; body?: { route?: string; url?: string } } | undefined;

        console.log('📱 Notification data received:', JSON.stringify(data, null, 2));

        let route = data?.route;
        let url = data?.url;

        if (!route && data?.body?.route) {
            route = data.body.route;
        }
        if (!url && data?.body?.url) {
            url = data.body.url;
        }

        if (route && typeof route === 'string') {
            console.log('📱 Navigating to route:', route);
            setTimeout(() => {
                router.push(route as any);
            }, 500);
            return;
        }

        if (url && typeof url === 'string') {
            console.log('📱 Opening URL:', url);
            Linking.openURL(url).catch(err => {
                console.log('Failed to open URL from notification:', err);
            });
        }
    };

    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            const previousState = appStateRef.current;
            appStateRef.current = nextAppState;

            if (previousState.match(/inactive|background/) && nextAppState === 'active') {
                const { credentials, isAuthenticated } = useAuthStore.getState();

                if (credentials && isAuthenticated) {
                    setIsRestoringSession(true);
                    try {
                        const sessionValid = await isSessionLikelyValid();
                        if (sessionValid) {
                            startSessionKeepAlive();
                        } else {
                            await useAuthStore.getState().tryQuietSessionRestore();
                        }
                    } catch (error) {
                    } finally {
                        setIsRestoringSession(false);
                    }
                }
            }

            if (nextAppState.match(/inactive|background/)) {
                stopSessionKeepAlive();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [startSessionKeepAlive, stopSessionKeepAlive]);

    useEffect(() => {
        setAlertListener((config) => {
            setAlertState(config);
        });
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'android') return;

        let stopUpdates: (() => void) | null = null;

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                stopUpdates = startRealtimeWidgetUpdates();
            } else {
                if (stopUpdates) {
                    stopUpdates();
                    stopUpdates = null;
                }
                stopRealtimeWidgetUpdates();
            }
        };

        stopUpdates = startRealtimeWidgetUpdates();

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
            if (stopUpdates) {
                stopUpdates();
            }
            stopRealtimeWidgetUpdates();
        };
    }, []);

    const dismissAlert = () => {
        setAlertState({ ...alertState, visible: false });
    };

    useEffect(() => {
        const inAuthGroup = segments[0] === '(tabs)';

        if (!isAuthenticated && inAuthGroup) {
            router.replace('/login');
        } else if (isAuthenticated && !inAuthGroup) {
            router.replace('/(tabs)/home');
        }
    }, [isAuthenticated, segments]);

    if (!fontsLoaded || !authReady) {
        return <AnimatedSplashScreen isLoading={true} />;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardProvider>
                <Stack
                    screenOptions={{
                        headerStyle: {
                            backgroundColor: colors.background,
                        },
                        headerTintColor: colors.text,
                        headerShadowVisible: false,
                        contentStyle: { backgroundColor: colors.background },
                        animation: 'fade',
                        animationDuration: 200,
                    }}
                >
                    <Stack.Screen
                        name="login"
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="(tabs)"
                        options={{
                            headerShown: false,
                        }}
                    />
                </Stack>

                <ThemedAlert
                    visible={alertState.visible}
                    title={alertState.title}
                    message={alertState.message}
                    buttons={alertState.buttons}
                    onDismiss={dismissAlert}
                />
            </KeyboardProvider>
        </GestureHandlerRootView>
    );
}
