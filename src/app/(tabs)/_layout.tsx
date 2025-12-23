import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/i18n';

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Protect tabs - redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !credentials) {
      // Not authenticated, redirect to login
      router.replace('/login');
    }
  }, [isAuthenticated, credentials]);

  // Set Android navigation bar style based on theme
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Set navigation bar background color to match tab bar
      NavigationBar.setBackgroundColorAsync(colors.tabBar);
      // Set button style: dark buttons for light mode, light buttons for dark mode
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
    }
  }, [colors.tabBar, isDark]);

  // Don't render tabs if not authenticated
  if (!isAuthenticated || !credentials) {
    return null;
  }

  // Calculate bottom padding: use safe area inset for gesture nav, or minimum padding for 3-button nav
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabBarHeight = 52 + bottomPadding;

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
            height: tabBarHeight,
            paddingBottom: bottomPadding,
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
            title: t('tabs.home'),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="home" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="wifi"
          options={{
            title: t('tabs.wifi'),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="wifi" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="sms"
          options={{
            title: t('tabs.sms'),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="sms" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
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
