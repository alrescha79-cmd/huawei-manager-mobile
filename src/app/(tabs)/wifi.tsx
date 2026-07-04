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
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  Pressable,
  AppState,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, CardHeader, ThemedAlertHelper, DeviceDetailModal, SelectionModal, MeshGradientBackground, AnimatedScreen, ThemedSwitch, BouncingDots, RefreshIndicator, AdBanner, AdNative } from '@/components';
import { ConnectedDevicesList, BlockedDevicesList, GuestWiFiSettings, WiFiEditSettings, ParentalControlCard, WiFiSettingsSkeleton, ConnectedDevicesSkeleton, GuestWiFiSkeleton, ParentalControlSkeleton, wifiStyles as styles } from '@/components/wifi';
import { useAuthStore } from '@/stores/auth.store';
import { useWiFiStore } from '@/stores/wifi.store';
import { WiFiService } from '@/services/wifi.service';
import { formatMacAddress } from '@/utils/helpers';
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

const TIME_OPTIONS = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
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

          <Modal
            visible={parentalHook.showProfileModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={parentalHook.handleCloseProfileModal}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={{ width: 28 }} />
                <Text style={[typography.headline, { color: colors.text, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' }]}>
                  {parentalHook.editingProfile ? t('parentalControl.editProfile') : t('parentalControl.addProfile')}
                </Text>
                <TouchableOpacity onPress={parentalHook.handleCloseProfileModal}>
                  <MaterialIcons name="close" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
              >
                <ScrollView
                  style={styles.modalContentScroll}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>
                    {t('parentalControl.profileName')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginBottom: spacing.md }]}
                    value={parentalHook.profileName}
                    onChangeText={parentalHook.setProfileName}
                    placeholder={t('parentalControl.profileName')}
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>
                    {t('parentalControl.timeRange')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                    <TouchableOpacity
                      style={[styles.timePicker, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => parentalHook.setShowStartTimePicker(true)}
                    >
                      <MaterialIcons name="schedule" size={20} color={colors.primary} />
                      <Text style={[typography.body, { color: colors.text, marginLeft: 8, fontWeight: '600' }]}>
                        {parentalHook.profileStartTime}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <MaterialIcons name="arrow-forward" size={20} color={colors.textSecondary} style={{ marginHorizontal: spacing.md }} />

                    <TouchableOpacity
                      style={[styles.timePicker, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => parentalHook.setShowEndTimePicker(true)}
                    >
                      <MaterialIcons name="schedule" size={20} color={colors.primary} />
                      <Text style={[typography.body, { color: colors.text, marginLeft: 8, fontWeight: '600' }]}>
                        {parentalHook.profileEndTime}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <SelectionModal
                    visible={parentalHook.showStartTimePicker}
                    title={t('parentalControl.startTime')}
                    options={TIME_OPTIONS.map(time => ({ label: time, value: time }))}
                    selectedValue={parentalHook.profileStartTime}
                    onSelect={(val) => {
                      parentalHook.setProfileStartTime(val);
                      parentalHook.setShowStartTimePicker(false);
                    }}
                    onClose={() => parentalHook.setShowStartTimePicker(false)}
                  />

                  <SelectionModal
                    visible={parentalHook.showEndTimePicker}
                    title={t('parentalControl.endTime')}
                    options={TIME_OPTIONS.map(time => ({ label: time, value: time }))}
                    selectedValue={parentalHook.profileEndTime}
                    onSelect={(val) => {
                      parentalHook.setProfileEndTime(val);
                      parentalHook.setShowEndTimePicker(false);
                    }}
                    onClose={() => parentalHook.setShowEndTimePicker(false)}
                  />

                  <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>
                    {t('parentalControl.activeDays')}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    {[1, 2, 3, 4, 5, 6, 0].map(day => (
                      <TouchableOpacity
                        key={day}
                        onPress={() => parentalHook.toggleProfileDay(day)}
                        style={[
                          styles.dayButton,
                          {
                            backgroundColor: parentalHook.profileDays.includes(day) ? colors.primary : colors.card,
                            borderColor: parentalHook.profileDays.includes(day) ? colors.primary : colors.border,
                          }
                        ]}
                      >
                        <Text style={[typography.caption1, {
                          color: parentalHook.profileDays.includes(day) ? '#fff' : colors.text,
                          fontWeight: parentalHook.profileDays.includes(day) ? '600' : '400'
                        }]}>
                          {parentalHook.getDayName(day).substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>
                    {t('parentalControl.selectDevices')}
                  </Text>
                  {connectedDevices.length === 0 ? (
                    <View style={[styles.deviceSelectItem, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center' }]}>
                      <Text style={[typography.body, { color: colors.textSecondary }]}>
                        {t('wifi.noDevices')}
                      </Text>
                    </View>
                  ) : (
                    connectedDevices.map(device => (
                      <TouchableOpacity
                        key={device.macAddress}
                        onPress={() => parentalHook.toggleProfileDevice(device.macAddress)}
                        style={[
                          styles.deviceSelectItem,
                          {
                            backgroundColor: parentalHook.profileDevices.includes(device.macAddress) ? colors.primary + '15' : colors.card,
                            borderColor: parentalHook.profileDevices.includes(device.macAddress) ? colors.primary : colors.border,
                            marginBottom: 8,
                          }
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>
                            {device.hostName || 'Unknown Device'}
                          </Text>
                          <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                            {formatMacAddress(device.macAddress)}
                          </Text>
                        </View>
                        <MaterialIcons
                          name={parentalHook.profileDevices.includes(device.macAddress) ? 'check-circle' : 'radio-button-unchecked'}
                          size={24}
                          color={parentalHook.profileDevices.includes(device.macAddress) ? colors.primary : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    ))
                  )}

                  <View style={[styles.toggleRow, { marginTop: spacing.md, paddingVertical: spacing.sm }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body, { color: colors.text }]}>
                        {t('parentalControl.enabled')}
                      </Text>
                      <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                        {parentalHook.profileEnabled ? t('parentalControl.enabled') : t('parentalControl.disabled')}
                      </Text>
                    </View>
                    <ThemedSwitch
                      value={parentalHook.profileEnabled}
                      onValueChange={parentalHook.setProfileEnabled}
                    />
                  </View>
                </ScrollView>

                <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 }]}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.saveButtonFull,
                      { backgroundColor: colors.primary },
                      pressed && { opacity: 0.8 }
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      parentalHook.handleSaveProfile();
                    }}
                    disabled={parentalHook.isSavingProfile}
                  >
                    {parentalHook.isSavingProfile ? (
                      <BouncingDots size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[typography.body, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                        {t('common.save')}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>

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
