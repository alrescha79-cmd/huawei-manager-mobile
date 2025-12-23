import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/i18n';

// Status bar header component for Android
const StatusBarHeader = () => {
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />
      <View style={{
        height: statusBarHeight,
        backgroundColor: colors.background
      }} />
    </>
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

  // Note: Navigation bar styling in edge-to-edge mode is handled automatically by the system

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
