import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme';
import { ThemedAlert, setAlertListener } from '@/components';

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

export default function RootLayout() {
  const { colors } = useTheme();
  const { isAuthenticated, loadCredentials, autoLogin } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Global alert state
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  useEffect(() => {
    const initializeAuth = async () => {
      await loadCredentials();
      // Auto-login if credentials exist
      const credentials = useAuthStore.getState().credentials;
      if (credentials) {
        await autoLogin();
      }
    };
    initializeAuth();
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
