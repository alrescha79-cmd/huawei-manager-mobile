import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { useSMSStore } from '@/stores/sms.store';
import { useWiFiStore } from '@/stores/wifi.store';
import { useThemeStore } from '@/stores/theme.store';
import { useTranslation } from '@/i18n';
import { CustomTabBar } from '@/components';

// Status bar header component for Android
const StatusBarHeader = () => {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={true}
      />
      {/* Solid background behind status bar to prevent content overlap */}
      {Platform.OS === 'android' && (
        <View
          style={{
            height: StatusBar.currentHeight || 24,
            backgroundColor: colors.background,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
        />
      )}
    </>
  );
};

// Tab icon component using Material Icons with optional badge
const TabIcon = ({ name, color, focused, badge }: { name: string; color: string; focused: boolean; badge?: number }) => {
  const { colors } = useTheme();
  const iconNames: { [key: string]: keyof typeof MaterialIcons.glyphMap } = {
    home: 'home',
    wifi: 'wifi',
    sms: 'message',
    settings: 'settings',
  };

  const iconName = iconNames[name] || 'circle';

  return (
    <View style={styles.iconContainer}>
      <MaterialIcons
        name={iconName}
        size={focused ? 26 : 24}
        color={color}
      />
      {badge !== undefined && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.notification }]}>
          <Text style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function TabLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isAuthenticated, credentials } = useAuthStore();
  const { smsCount } = useSMSStore();
  const { connectedDevices } = useWiFiStore();
  const { badgesEnabled } = useThemeStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isAuthenticated || !credentials) {
      router.replace('/login');
    }
  }, [isAuthenticated, credentials]);

  if (!isAuthenticated || !credentials) {
    return null;
  }

  return (
    <>
      <StatusBarHeader />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        // @ts-ignore: sceneContainerStyle is valid for BottomTabNavigator but missing in Expo Router types
        sceneContainerStyle={{ backgroundColor: colors.background }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
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
              <TabIcon name="wifi" color={color} focused={focused} badge={badgesEnabled ? connectedDevices.length : undefined} />
            ),
          }}
        />
        <Tabs.Screen
          name="sms"
          options={{
            title: t('tabs.sms'),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="sms" color={color} focused={focused} badge={badgesEnabled ? smsCount?.localUnread : undefined} />
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
