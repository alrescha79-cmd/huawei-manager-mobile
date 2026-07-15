import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StatusBar,
  Platform,
  TextInput,
  TouchableOpacity,
  Keyboard,
  AppState,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, CardHeader, ThemedAlertHelper, MeshGradientBackground, AnimatedScreen, ThemedSwitch, BouncingDots, RefreshIndicator, AdBanner, AdNative } from '@/components';
import { ConnectedDevicesList, BlockedDevicesList, GuestWiFiSettings, WiFiEditSettings, ParentalControlCard, WiFiSettingsSkeleton, ConnectedDevicesSkeleton, GuestWiFiSkeleton, ParentalControlSkeleton, wifiStyles as styles, DeviceDetailModal, ParentalProfileModal } from '@/components/wifi';
import { useAuthStore } from '@/stores/auth.store';
import { useWiFiStore } from '@/stores/wifi.store';
import { WiFiService } from '@/services/wifi.service';
import { useTranslation } from '@/i18n';

import { useWiFiSettings } from '@/hooks/wifi/useWiFiSettings';
import { useGuestWiFi } from '@/hooks/wifi/useGuestWiFi';
import { useParentalControls } from '@/hooks/wifi/useParentalControls';
import { useWiFiDevices } from '@/hooks/wifi/useWiFiDevices';

const SECURITY_MODES = [
  { value: 'OPEN', labelKey: 'wifi.securityOpen' },
  { value: 'WPA2PSK', labelKey: 'wifi.securityWpa2' },
  { value: 'WPAPSKWPA2PSK', labelKey: 'wifi.securityWpaMixed' },
  { value: 'WPA3SAE', labelKey: 'wifi.securityWpa3' },
];

export default function WiFiScreen() {
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const { credentials } = useAuthStore();
  const insets = useSafeAreaInsets();
  const {
    connectedDevices,
    wifiSettings,
    setConnectedDevices,
    setWiFiSettings,
  } = useWiFiStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wifiService, setWiFiService] = useState<WiFiService | null>(null);

  const [parentalControlEnabled, setParentalControlEnabled] = useState(false);
  const [parentalProfiles, setParentalProfiles] = useState<any[]>([]);

  // Hook Initialization
  const wifiSettingsHook = useWiFiSettings({ wifiSettings, wifiService, t, handleRefresh });
  const guestWiFiHook = useGuestWiFi({ wifiService, t, handleRefresh });
  const parentalHook = useParentalControls({ 
    wifiService, 
    t, 
    handleRefresh, 
    parentalProfiles, 
    setParentalProfiles, 
    parentalControlEnabled, 
    setParentalControlEnabled 
  });
  const wifiDevicesHook = useWiFiDevices({ wifiService, t, handleRefresh });

  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new WiFiService(credentials.modemIp);
      setWiFiService(service);
      loadData(service);

      const intervalId = setInterval(() => {
        if (AppState.currentState === 'active') {
          loadDataSilent(service);
        }
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [credentials]);

  const loadData = async (service: WiFiService) => {
    try {
      setIsRefreshing(true);
      const [devices, settings, guestSettings, parentalEnabled, profiles] = await Promise.all([
        service.getConnectedDevices(),
        service.getWiFiSettings(),
        service.getGuestWiFiSettings(),
        service.getParentalControlEnabled(),
        service.getParentalControlProfiles(),
      ]);

      setConnectedDevices(devices);
      setWiFiSettings(settings);
      
      guestWiFiHook.setGuestWifiEnabled(guestSettings.enabled);
      guestWiFiHook.setGuestWifiSsid(guestSettings.ssid || '');
      guestWiFiHook.setGuestWifiPassword(guestSettings.password || '');
      guestWiFiHook.setGuestWifiSecurity(guestSettings.securityMode || 'OPEN');
      guestWiFiHook.setGuestWifiDuration(guestSettings.duration || '0');
      
      setParentalControlEnabled(parentalEnabled);
      setParentalProfiles(profiles);

      if (guestSettings.enabled) {
        const timeRemaining = await service.getGuestTimeRemaining();
        guestWiFiHook.setGuestTimeRemaining(timeRemaining.remainingSeconds);
        guestWiFiHook.setIsTimeRemainingActive(timeRemaining.isActive);
      }

      const blocked = await service.getBlockedDevices();
      wifiDevicesHook.setBlockedDevices(blocked);
    } catch (error) {
      console.error('Error loading WiFi data:', error);
      ThemedAlertHelper.alert('Error', 'Failed to load WiFi data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadDataSilent = async (service: WiFiService) => {
    try {
      const [devices, settings] = await Promise.all([
        service.getConnectedDevices(),
        service.getWiFiSettings(),
      ]);
      setConnectedDevices(devices);
      setWiFiSettings(settings);
    } catch (error) {
      console.error('Error in background update:', error);
    }
  };

  function handleRefresh() {
    if (wifiService) {
      wifiSettingsHook.resetFormInitialization();
      loadData(wifiService);
    }
  }

  const getSecurityModeLabel = (value: string) => {
    const mode = SECURITY_MODES.find(m => m.value === value);
    return mode ? t(mode.labelKey) : value;
  };

  return (
    <AnimatedScreen>
      <MeshGradientBackground>
        <RefreshIndicator refreshing={isRefreshing} />

        <ScrollView
          style={[styles.container, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[
            styles.content,
            { 
              paddingTop: 8 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0),
              paddingBottom: 110 + (insets.bottom > 0 ? insets.bottom : 16)
            }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="transparent"
              colors={['transparent']}
              progressBackgroundColor="transparent"
              progressViewOffset={-1000}
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.header} />

          {/* Show skeletons during initial load */}
          {!wifiSettings && isRefreshing && (
            <>
              <WiFiSettingsSkeleton />
              <ConnectedDevicesSkeleton />
              <GuestWiFiSkeleton />
              <ParentalControlSkeleton />
            </>
          )}

          {/* WiFi Settings Card */}
          {wifiSettings && (
            <Card style={{ marginBottom: spacing.md }}>
              <CardHeader title={t('wifi.wifiSettings')} />

              <View style={styles.toggleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: colors.primary + '15',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <MaterialIcons name="wifi" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>WiFi</Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                      {wifiSettings.wifiEnable ? t('wifi.enabled') : t('wifi.disabled')}
                    </Text>
                  </View>
                </View>
                <ThemedSwitch
                  value={wifiSettings.wifiEnable}
                  onValueChange={wifiSettingsHook.handleToggleWiFi}
                />
              </View>

              <GuestWiFiSettings
                t={t}
                guestWifiEnabled={guestWiFiHook.guestWifiEnabled}
                isTogglingGuest={guestWiFiHook.isTogglingGuest}
                guestWifiDuration={guestWiFiHook.guestWifiDuration}
                showGuestDurationDropdown={guestWiFiHook.showGuestDurationDropdown}
                guestTimeRemaining={guestWiFiHook.guestTimeRemaining}
                isTimeRemainingActive={guestWiFiHook.isTimeRemainingActive}
                isExtendingTime={guestWiFiHook.isExtendingTime}
                guestWifiSsid={guestWiFiHook.guestWifiSsid}
                guestWifiSecurity={guestWiFiHook.guestWifiSecurity}
                showGuestSecurityDropdown={guestWiFiHook.showGuestSecurityDropdown}
                guestWifiPassword={guestWiFiHook.guestWifiPassword}
                isSavingGuestSettings={guestWiFiHook.isSavingGuestSettings}
                onToggleGuestWiFi={guestWiFiHook.handleToggleGuestWiFi}
                onSetShowGuestDurationDropdown={guestWiFiHook.setShowGuestDurationDropdown}
                onSetGuestWifiDuration={guestWiFiHook.setGuestWifiDuration}
                onExtendGuestTime={guestWiFiHook.handleExtendGuestTime}
                onSetGuestWifiSsid={guestWiFiHook.setGuestWifiSsid}
                onSetShowGuestSecurityDropdown={guestWiFiHook.setShowGuestSecurityDropdown}
                onSetGuestWifiSecurity={guestWiFiHook.setGuestWifiSecurity}
                onSetGuestWifiPassword={guestWiFiHook.setGuestWifiPassword}
                onSaveGuestSettings={guestWiFiHook.handleSaveGuestSettings}
                formatTimeRemaining={guestWiFiHook.formatTimeRemaining}
              />

              <WiFiEditSettings
                t={t}
                isEditExpanded={wifiSettingsHook.isEditExpanded}
                formSsid={wifiSettingsHook.formSsid}
                formSecurityMode={wifiSettingsHook.formSecurityMode}
                formPassword={wifiSettingsHook.formPassword}
                showPassword={wifiSettingsHook.showPassword}
                showSecurityDropdown={wifiSettingsHook.showSecurityDropdown}
                hasChanges={wifiSettingsHook.hasChanges}
                isSaving={wifiSettingsHook.isSaving}
                onToggleExpanded={() => wifiSettingsHook.setIsEditExpanded(!wifiSettingsHook.isEditExpanded)}
                onSetFormSsid={wifiSettingsHook.setFormSsid}
                onSetFormSecurityMode={wifiSettingsHook.setFormSecurityMode}
                onSetFormPassword={wifiSettingsHook.setFormPassword}
                onToggleShowPassword={() => wifiSettingsHook.setShowPassword(!wifiSettingsHook.showPassword)}
                onSetShowSecurityDropdown={wifiSettingsHook.setShowSecurityDropdown}
                onSaveSettings={wifiSettingsHook.handleSaveSettings}
                getSecurityModeLabel={getSecurityModeLabel}
              />
            </Card>
          )}

          <AdNative />

          <ConnectedDevicesList
            t={t}
            devices={connectedDevices}
            onDevicePress={(device) => {
              wifiDevicesHook.setSelectedDevice(device);
              wifiDevicesHook.setShowDeviceDetailModal(true);
            }}
          />

          <BlockedDevicesList
            t={t}
            devices={wifiDevicesHook.blockedDevices}
            onDevicePress={(device) => {
              wifiDevicesHook.setSelectedDevice({
                id: device.macAddress,
                macAddress: device.macAddress,
                hostName: device.hostName,
                ipAddress: '-',
                associatedTime: '0',
                isBlock: true,
              });
              wifiDevicesHook.setShowDeviceDetailModal(true);
            }}
          />

          <ParentalControlCard
            t={t}
            parentalControlEnabled={parentalControlEnabled}
            isTogglingParental={parentalHook.isTogglingParental}
            isParentalExpanded={parentalHook.isParentalExpanded}
            parentalProfiles={parentalProfiles}
            onToggleParentalControl={parentalHook.handleToggleParentalControl}
            onToggleExpanded={() => parentalHook.setIsParentalExpanded(!parentalHook.isParentalExpanded)}
            onEditProfile={parentalHook.openEditProfileModal}
            onDeleteProfile={parentalHook.handleDeleteProfile}
            onAddProfile={parentalHook.openAddProfileModal}
            getDayName={parentalHook.getDayName}
          />

          <ParentalProfileModal
            visible={parentalHook.showProfileModal}
            onClose={parentalHook.handleCloseProfileModal}
            onSave={parentalHook.handleSaveProfile}
            editingProfile={parentalHook.editingProfile}
            profileName={parentalHook.profileName}
            setProfileName={parentalHook.setProfileName}
            profileStartTime={parentalHook.profileStartTime}
            setProfileStartTime={parentalHook.setProfileStartTime}
            profileEndTime={parentalHook.profileEndTime}
            setProfileEndTime={parentalHook.setProfileEndTime}
            profileDays={parentalHook.profileDays}
            toggleProfileDay={parentalHook.toggleProfileDay}
            profileDevices={parentalHook.profileDevices}
            toggleProfileDevice={parentalHook.toggleProfileDevice}
            profileEnabled={parentalHook.profileEnabled}
            setProfileEnabled={parentalHook.setProfileEnabled}
            isSavingProfile={parentalHook.isSavingProfile}
            connectedDevices={connectedDevices}
            getDayName={parentalHook.getDayName}
          />

          <AdBanner />

          <DeviceDetailModal
            visible={wifiDevicesHook.showDeviceDetailModal}
            onClose={() => {
              wifiDevicesHook.setShowDeviceDetailModal(false);
              wifiDevicesHook.setSelectedDevice(null);
            }}
            device={wifiDevicesHook.selectedDevice}
            onSaveName={wifiDevicesHook.handleSaveDeviceName}
            onBlock={wifiDevicesHook.handleBlockDevice}
            onUnblock={wifiDevicesHook.handleUnblockDevice}
          />
        </ScrollView>
      </MeshGradientBackground>
    </AnimatedScreen >
  );
}
