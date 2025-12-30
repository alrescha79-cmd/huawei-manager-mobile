import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
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
        translucent={false}
      />
    </>
  );
};

// Tab icon component using Material Icons
const TabIcon = ({ name, color, focused }: { name: string; color: string; focused: boolean }) => {
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
    </View>
  );
};

export default function TabLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isAuthenticated, credentials } = useAuthStore();
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
});
