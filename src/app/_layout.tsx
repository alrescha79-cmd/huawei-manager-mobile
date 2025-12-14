import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const { colors } = useTheme();
  const { isAuthenticated, loadCredentials } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadCredentials();
  }, []);

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
    </GestureHandlerRootView>
  );
}
