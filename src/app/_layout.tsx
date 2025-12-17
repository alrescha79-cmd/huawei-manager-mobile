import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { useTheme } from '@/theme';
import { ThemedAlert, setAlertListener, ThemedAlertHelper } from '@/components';
import { useTranslation } from '@/i18n';

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
  const { colors } = useTheme();
  const { isAuthenticated, loadCredentials, autoLogin } = useAuthStore();
  const { initializeLanguage } = useThemeStore();
  const { t } = useTranslation();
  const segments = useSegments();
  const router = useRouter();

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
      console.log('Update check failed:', error);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      // Auto-detect device language on first install
      initializeLanguage();

      // Check for app updates
      checkForUpdates();

      // Load auth credentials
      await loadCredentials();
      // Auto-login if credentials exist
      const credentials = useAuthStore.getState().credentials;
      if (credentials) {
        await autoLogin();
      }
    };
    initializeApp();
  }, []);

  // Set up global alert listener
  useEffect(() => {
    setAlertListener((config) => {
      setAlertState(config);
    });
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
