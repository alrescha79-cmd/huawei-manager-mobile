import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { isAuthenticated, credentials } = useAuthStore();

  // Protect tabs - redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !credentials) {
      console.log('[TabLayout] Not authenticated, redirecting to login...');
      router.replace('/login');
    }
  }, [isAuthenticated, credentials]);

  // Don't render tabs if not authenticated
  if (!isAuthenticated || !credentials) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="wifi"
        options={{
          title: 'WiFi',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="wifi" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sms"
        options={{
          title: 'SMS',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="sms" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple icon component using emoji
const TabIcon = ({ name, color, size }: { name: string; color: string; size: number }) => {
  const icons: { [key: string]: string } = {
    home: '🏠',
    wifi: '📶',
    sms: '💬',
    settings: '⚙️',
  };

  return (
    <Text style={{ fontSize: size, opacity: color === '#8E8E93' ? 0.5 : 1 }}>
      {icons[name]}
    </Text>
  );
};
