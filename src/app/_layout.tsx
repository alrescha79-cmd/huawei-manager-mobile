import { Stack } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Linking, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { useTheme } from '@/theme';
import { ThemedAlert, setAlertListener, ThemedAlertHelper } from '@/components';
import { useTranslation } from '@/i18n';
import { startRealtimeWidgetUpdates, stopRealtimeWidgetUpdates } from '@/widget';
import { isSessionLikelyValid } from '@/utils/storage';
import { requestNotificationPermissions } from '@/services/notification.service';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, Doto_700Bold } from '@expo-google-fonts/doto';

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

// Version comparison helper
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

    // Track app state for session management
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const [isRestoringSession, setIsRestoringSession] = useState(false);

    // Handle Android Navigation Bar Colors
    useEffect(() => {
        if (Platform.OS === 'android') {
            const configureNavBar = async () => {
                try {
                    // Only set button style - background color not supported with edge-to-edge
                    await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
                } catch (e) {
                    console.warn('Failed to configure navigation bar:', e);
                }
            };
            configureNavBar();
        }
    }, [isDark]);

    // Global alert state
    const [alertState, setAlertState] = useState<AlertState>({
        visible: false,
        title: '',
        message: '',
        buttons: [],
    });

    // Check for updates from GitHub releases
    const checkForUpdates = async () => {
        try {
            const response = await fetch(
                'https://api.github.com/repos/alrescha79-cmd/huawei-manager-mobile/releases/latest'
            );

            if (!response.ok) return;

            const data = await response.json();
            const latestVersion = data.tag_name?.replace(/^v/, '') || '';
            const currentVersion = Constants.expoConfig?.version || '1.0.0';

            // Check if update is available
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
            // Silently fail - don't interrupt user experience
        }
    };

    // Show star request alert once per version (after install/update)
    const STAR_ALERT_VERSION_KEY = 'star_alert_shown_version';
    const GITHUB_REPO_URL = 'https://github.com/alrescha79-cmd/huawei-manager-mobile';

    const checkAndShowStarRequest = async () => {
        try {
            const currentVersion = Constants.expoConfig?.version || '1.0.0';
            const shownVersion = await AsyncStorage.getItem(STAR_ALERT_VERSION_KEY);

            // Only show if this version hasn't been shown yet
            if (shownVersion !== currentVersion) {
                // Delay to show after app is fully loaded
                setTimeout(() => {
                    ThemedAlertHelper.alert(
                        t('alerts.enjoyingApp'),
                        t('alerts.starRequest'),
                        [
                            {
                                text: t('common.later'),
                                style: 'cancel',
                                onPress: async () => {
                                    // Don't save version - will ask again next time
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
                    // Save version after showing (won't show again for this version)
                    AsyncStorage.setItem(STAR_ALERT_VERSION_KEY, currentVersion);
                }, 2000); // 2 second delay
            }
        } catch (error) {
            // Silently fail
        }
    };

    useEffect(() => {
        const initializeApp = async () => {
            // Auto-detect device language on first install
            initializeLanguage();

            // Check for app updates
            checkForUpdates();

            // Request notification permissions
            requestNotificationPermissions();

            // Load auth credentials
            await loadCredentials();
            // Auto-login if credentials exist
            const credentials = useAuthStore.getState().credentials;
            if (credentials) {
                // Try quiet session restore first (faster, no WebView)
                const restored = await useAuthStore.getState().tryQuietSessionRestore();
                if (!restored) {
                    // Fall back to regular auto-login
                    await autoLogin();
                }

                // Show star request after successful login
                checkAndShowStarRequest();
            }
        };
        initializeApp();
    }, []);

    // Handle app state changes for session management
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            const previousState = appStateRef.current;
            appStateRef.current = nextAppState;

            // App came to foreground from background
            if (previousState.match(/inactive|background/) && nextAppState === 'active') {
                const { credentials, isAuthenticated } = useAuthStore.getState();

                if (credentials && isAuthenticated) {
                    // Try to quietly restore the session without showing WebView
                    setIsRestoringSession(true);
                    try {
                        const sessionValid = await isSessionLikelyValid();
                        if (sessionValid) {
                            // Just restart keep-alive, session should be fine
                            startSessionKeepAlive();
                        } else {
                            // Session might have expired, try quiet restore
                            await useAuthStore.getState().tryQuietSessionRestore();
                        }
                    } catch (error) {
                        // Silent fail - home screen will handle re-login if needed
                    } finally {
                        setIsRestoringSession(false);
                    }
                }
            }

            // App going to background
            if (nextAppState.match(/inactive|background/)) {
                // Stop session keep-alive to save battery
                stopSessionKeepAlive();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [startSessionKeepAlive, stopSessionKeepAlive]);

    // Set up global alert listener
    useEffect(() => {
        setAlertListener((config) => {
            setAlertState(config);
        });
    }, []);

    // Start realtime widget updates when app is active (Android only)
    useEffect(() => {
        if (Platform.OS !== 'android') return;

        let stopUpdates: (() => void) | null = null;

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                // App is in foreground - start realtime updates
                stopUpdates = startRealtimeWidgetUpdates();
            } else {
                // App is in background - stop updates
                if (stopUpdates) {
                    stopUpdates();
                    stopUpdates = null;
                }
                stopRealtimeWidgetUpdates();
            }
        };

        // Start updates immediately since app is launching
        stopUpdates = startRealtimeWidgetUpdates();

        // Listen for app state changes
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
            // Redirect to login if not authenticated
            router.replace('/login');
        } else if (isAuthenticated && !inAuthGroup) {
            // Redirect to home if authenticated
            router.replace('/(tabs)/home');
        }
    }, [isAuthenticated, segments]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: colors.background,
                    },
                    headerTintColor: colors.text,
                    headerShadowVisible: false,
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

            {/* Global Themed Alert */}
            <ThemedAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                buttons={alertState.buttons}
                onDismiss={dismissAlert}
            />
        </GestureHandlerRootView>
    );
}
