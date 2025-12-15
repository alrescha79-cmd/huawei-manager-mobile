import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';

// Status bar header component for Android
const StatusBarHeader = () => {
  const { colors } = useTheme();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

  return (
    <View style={{
      height: statusBarHeight,
      backgroundColor: colors.primary
    }} />
  );
};

// Tab icon component using Material Icons
const TabIcon = ({ name, color, focused }: { name: string; color: string; focused: boolean }) => {
  // Material Icons mapping
  const iconNames: { [key: string]: keyof typeof MaterialIcons.glyphMap } = {
    home: 'home',
    wifi: 'wifi',
    sms: 'message',
    settings: 'settings',
  };

  const iconName = iconNames[name] || 'circle';

  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <MaterialIcons
        name={iconName}
        size={focused ? 26 : 24}
        color={color}
      />
    </View>
  );
};

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { isAuthenticated, credentials } = useAuthStore();

  // Protect tabs - redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !credentials) {
      // Not authenticated, redirect to login
      router.replace('/login');
    }
  }, [isAuthenticated, credentials]);

  // Don't render tabs if not authenticated
  if (!isAuthenticated || !credentials) {
    return null;
  }

  return (
    <>
      <StatusBarHeader />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          headerShown: false, // Hide headers for fullscreen
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="home" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="wifi"
          options={{
            title: 'WiFi',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="wifi" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="sms"
          options={{
            title: 'SMS',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="sms" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="settings" color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
});
