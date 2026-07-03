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
import { ThemedAlert, setAlertListener, ThemedAlertHelper, AnimatedSplashScreen, AdblockAlertModal, ChangelogModal, ChangelogHelper } from '@/components';
import { useTranslation } from '@/i18n';
import { startRealtimeWidgetUpdates, stopRealtimeWidgetUpdates } from '@/widget';
import { isSessionLikelyValid } from '@/utils/storage';
import { requestNotificationPermissions } from '@/services/notification.service';
import * as Notifications from 'expo-notifications';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, Doto_700Bold } from '@expo-google-fonts/doto';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { initAdMob, showAppOpenAd } from '@/services/ad.service';


// const getFcmToken = async () => {
//   try {
//     const deviceToken = await Notifications.getDevicePushTokenAsync();
//     console.log("🔥 FCM REGISTRATION TOKEN ANDROID:");
//     console.log(deviceToken.data);
//   } catch (error) {
//     console.error("Gagal mengambil token:", error);
//   }
// };
// getFcmToken();

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
    const backgroundTimeRef = useRef<number>(0);
    const lastAppOpenShowTimeRef = useRef<number>(0);
    const [isRestoringSession, setIsRestoringSession] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const pendingNotificationRoute = useRef<string | null>(null);
    const pendingNotificationUrl = useRef<string | null>(null);

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
            const currentVersion = Constants.expoConfig?.version || '1.1.50';

            if (compareVersions(latestVersion, currentVersion) > 0) {
                ThemedAlertHelper.alert(
                    t('settings.updateAvailable') + ` v${latestVersion}`,
                    t('alerts.newVersionAvailable'),
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('settings.downloadUpdate'),
                            onPress: () => router.push('/settings/update')
                        },
                    ]
                );
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    };

    const CHANGELOG_SHOWN_VERSION_KEY = 'changelog_shown_version';

    const checkAndShowChangelog = async () => {
        try {
            const currentVersion = Constants.expoConfig?.version || '1.1.50';
            const shownVersion = await AsyncStorage.getItem(CHANGELOG_SHOWN_VERSION_KEY);

            if (shownVersion !== currentVersion) {
                setTimeout(() => {
                    ChangelogHelper.show();
                    AsyncStorage.setItem(CHANGELOG_SHOWN_VERSION_KEY, currentVersion);
                }, 3000);
            }
        } catch (error) {
            console.error('Error checking for changelog:', error);
        }
    };

    useEffect(() => {
        const initializeApp = async () => {
            initAdMob();
            initializeLanguage();
            // simulasi changelog
            // await AsyncStorage.removeItem('changelog_shown_version');

            checkForUpdates();
            requestNotificationPermissions();
            await loadCredentials();
            const credentials = useAuthStore.getState().credentials;
            if (credentials) {
                // Auto-migrate legacy credentials to multi-profile store on app update
                try {
                    const { useModemProfileStore } = await import('@/stores/modemProfile.store');
                    await useModemProfileStore.getState().ensureProfile({
                        modemIp: credentials.modemIp,
                        username: credentials.username,
                        password: credentials.password,
                    });
                } catch (err) {
                    console.error('Failed to auto-migrate legacy profile:', err);
                }

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
                checkAndShowChangelog();
            } else {
                checkAndShowChangelog();
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

        if (authReady) {
            if (route && typeof route === 'string') {
                console.log('📱 Navigating to route immediately:', route);
                router.push(route as any);
            } else if (url && typeof url === 'string') {
                console.log('📱 Opening URL immediately:', url);
                Linking.openURL(url).catch(err => {
                    console.log('Failed to open URL from notification:', err);
                });
            }
        } else {
            if (route && typeof route === 'string') {
                console.log('📱 Queued notification route:', route);
                pendingNotificationRoute.current = route;
            } else if (url && typeof url === 'string') {
                console.log('📱 Queued notification URL:', url);
                pendingNotificationUrl.current = url;
            }
        }
    };

    useEffect(() => {
        if (authReady) {
            if (pendingNotificationRoute.current) {
                const route = pendingNotificationRoute.current;
                pendingNotificationRoute.current = null;
                console.log('📱 Executing queued notification route:', route);
                setTimeout(() => {
                    router.push(route as any);
                }, 800);
            } else if (pendingNotificationUrl.current) {
                const url = pendingNotificationUrl.current;
                pendingNotificationUrl.current = null;
                console.log('📱 Executing queued notification URL:', url);
                setTimeout(() => {
                    Linking.openURL(url).catch(err => {
                        console.log('Failed to open URL from notification:', err);
                    });
                }, 800);
            }
        }
    }, [authReady, router]);

    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            const previousState = appStateRef.current;
            appStateRef.current = nextAppState;

            if (previousState.match(/inactive|background/) && nextAppState === 'active') {
                const now = Date.now();
                const timeInBackground = now - backgroundTimeRef.current;
                const timeSinceLastAd = now - lastAppOpenShowTimeRef.current;

                if (backgroundTimeRef.current > 0 && timeInBackground > 15000 && timeSinceLastAd > 60000) {
                    lastAppOpenShowTimeRef.current = now;
                    showAppOpenAd();
                }

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
                backgroundTimeRef.current = Date.now();
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
        if (!fontsLoaded || !authReady) return;

        const inAuthGroup = segments[0] === '(tabs)';

        if (!isAuthenticated && inAuthGroup) {
            router.replace('/login');
        } else if (isAuthenticated && !inAuthGroup) {
            router.replace('/(tabs)/home');
        }
    }, [isAuthenticated, segments, fontsLoaded, authReady]);

    if (!fontsLoaded || !authReady) {
        return <AnimatedSplashScreen isLoading={true} />;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardProvider>
                <Stack
                    screenOptions={{
                        headerShown: false,
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
                        name="index"
                        options={{
                            headerShown: false,
                        }}
                    />
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

                <AdblockAlertModal />
                <ChangelogModal />
            </KeyboardProvider>
        </GestureHandlerRootView>
    );
}
