import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { useSMSStore } from '@/stores/sms.store';
import { useWiFiStore } from '@/stores/wifi.store';
import { useThemeStore } from '@/stores/theme.store';
import { useTranslation } from '@/i18n';
import { CustomTabBar } from '@/components';

const StatusBarHeader = () => {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={true}
      />
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

const TabIcon = ({ name, color, focused, badge }: { name: string; color: string; focused: boolean; badge?: number }) => {
  const { colors } = useTheme();
  const iconNames: { [key: string]: keyof typeof MaterialIcons.glyphMap } = {
    home: 'home',
    wifi: 'wifi',
    sms: 'message',
    settings: 'settings',
  };

  const iconName = iconNames[name] || 'circle';
  const accentColor = colors.primary;

  const badgeBgColor = focused ? '#FFFFFF' : accentColor;
  const badgeTextColor = focused ? accentColor : '#FFFFFF';

  return (
    <View style={styles.iconContainer}>
      <MaterialIcons
        name={iconName}
        size={focused ? 26 : 24}
        color={color}
      />
      {badge !== undefined && badge > 0 && (
        <View 
          style={[
            styles.badge, 
            { 
              backgroundColor: badgeBgColor,
              borderWidth: focused ? 1 : 0,
              borderColor: accentColor,
            }
          ]}
        >
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>
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
  const segments = useSegments();
  const { isAuthenticated, credentials } = useAuthStore();
  const { smsCount } = useSMSStore();
  const { connectedDevices } = useWiFiStore();
  const { badgesEnabled } = useThemeStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const currentTab = segments[segments.length - 1];
  const tabs = ['home', 'wifi', 'sms', 'settings'];

  useEffect(() => {
    if (!isAuthenticated || !credentials) {
      router.replace('/login');
    }
  }, [isAuthenticated, credentials]);

  if (!isAuthenticated || !credentials) {
    return null;
  }

  const handleSwipeLeft = () => {
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex >= 0 && currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1];
      router.navigate(`/(tabs)/${nextTab}`);
    }
  };

  const handleSwipeRight = () => {
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex > 0) {
      const prevTab = tabs[currentIndex - 1];
      router.navigate(`/(tabs)/${prevTab}`);
    }
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-30, 30])
    .onEnd((event) => {
      if (event.velocityX < -500 || event.translationX < -100) {
        runOnJS(handleSwipeLeft)();
      } else if (event.velocityX > 500 || event.translationX > 100) {
        runOnJS(handleSwipeRight)();
      }
    });

  return (
    <>
      <StatusBarHeader />
      <GestureDetector gesture={swipeGesture}>
        <View style={{ flex: 1 }}>
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
        </View>
      </GestureDetector>
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
