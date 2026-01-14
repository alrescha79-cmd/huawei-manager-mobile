import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader, InfoRow, Button, ThemedAlertHelper, DeviceDetailModal, SelectionModal, MeshGradientBackground, AnimatedScreen, ThemedSwitch, BouncingDots, ModernRefreshIndicator, KeyboardAnimatedView } from '@/components';
import { ConnectedDevicesList, BlockedDevicesList, GuestWiFiSettings, WiFiEditSettings, ParentalControlCard, WiFiSettingsSkeleton, ConnectedDevicesSkeleton, GuestWiFiSkeleton, ParentalControlSkeleton, wifiStyles as styles } from '@/components/wifi';
import { ConnectedDevice } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { useWiFiStore } from '@/stores/wifi.store';
import { WiFiService } from '@/services/wifi.service';
import { formatMacAddress } from '@/utils/helpers';
import { useTranslation } from '@/i18n';

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
  const { colors, typography, spacing, isDark } = useTheme();
  const { t } = useTranslation();
  const { credentials } = useAuthStore();
  const {
    connectedDevices,
    wifiSettings,
    setConnectedDevices,
    setWiFiSettings,
  } = useWiFiStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [wifiService, setWiFiService] = useState<WiFiService | null>(null);


  const [formSsid, setFormSsid] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSecurityMode, setFormSecurityMode] = useState('WPA2PSK');
  const [showSecurityDropdown, setShowSecurityDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [guestWifiEnabled, setGuestWifiEnabled] = useState(false);
  const [isTogglingGuest, setIsTogglingGuest] = useState(false);
  const [guestWifiSsid, setGuestWifiSsid] = useState('');
  const [guestWifiPassword, setGuestWifiPassword] = useState('');
  const [guestWifiSecurity, setGuestWifiSecurity] = useState('OPEN');
  const [guestWifiDuration, setGuestWifiDuration] = useState('0');
  const [isSavingGuestSettings, setIsSavingGuestSettings] = useState(false);
  const [showGuestSecurityDropdown, setShowGuestSecurityDropdown] = useState(false);
  const [showGuestDurationDropdown, setShowGuestDurationDropdown] = useState(false);
  const [guestTimeRemaining, setGuestTimeRemaining] = useState(0);
  const [isTimeRemainingActive, setIsTimeRemainingActive] = useState(false);
  const [isExtendingTime, setIsExtendingTime] = useState(false);

  const [parentalControlEnabled, setParentalControlEnabled] = useState(false);
  const [isTogglingParental, setIsTogglingParental] = useState(false);
  const [parentalProfiles, setParentalProfiles] = useState<{
    id: string;
    name: string;
    deviceMacs: string[];
    startTime: string;
    endTime: string;
    activeDays: number[];
    enabled: boolean;
  }[]>([]);
  const [isParentalExpanded, setIsParentalExpanded] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileStartTime, setProfileStartTime] = useState('08:00');
  const [profileEndTime, setProfileEndTime] = useState('22:00');
  const [profileDays, setProfileDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [profileDevices, setProfileDevices] = useState<string[]>([]);
  const [profileEnabled, setProfileEnabled] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [initialProfileValues, setInitialProfileValues] = useState<{
    name: string;
    startTime: string;
    endTime: string;
    days: number[];
    devices: string[];
    enabled: boolean;
  } | null>(null);

  const [isEditExpanded, setIsEditExpanded] = useState(false);

  const [blockedDevices, setBlockedDevices] = useState<{ macAddress: string; hostName: string }[]>([]);
  const [isUnblocking, setIsUnblocking] = useState<string | null>(null);

  const [selectedDevice, setSelectedDevice] = useState<ConnectedDevice | null>(null);
  const [showDeviceDetailModal, setShowDeviceDetailModal] = useState(false);

  const isFormInitialized = React.useRef(false);

  useEffect(() => {
    if (wifiSettings && !isFormInitialized.current) {
      setFormSsid(wifiSettings.ssid || '');
      setFormPassword(wifiSettings.password || '');
      setFormSecurityMode(wifiSettings.securityMode || 'WPA2PSK');
      isFormInitialized.current = true;
    }
  }, [wifiSettings]);

  const hasChanges = useMemo(() => {
    if (!wifiSettings) return false;
    return (
      formSsid !== (wifiSettings.ssid || '') ||
      formPassword !== (wifiSettings.password || '') ||
      formSecurityMode !== (wifiSettings.securityMode || 'WPA2PSK')
    );
  }, [formSsid, formPassword, formSecurityMode, wifiSettings]);

  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new WiFiService(credentials.modemIp);
      setWiFiService(service);

      loadData(service);

      const intervalId = setInterval(() => {
        loadDataSilent(service);
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
      setGuestWifiEnabled(guestSettings.enabled);
      setGuestWifiSsid(guestSettings.ssid || '');
      setGuestWifiPassword(guestSettings.password || '');
      setGuestWifiSecurity(guestSettings.securityMode || 'OPEN');
      setGuestWifiDuration(guestSettings.duration || '0');
      setParentalControlEnabled(parentalEnabled);
      setParentalProfiles(profiles);

      if (guestSettings.enabled) {
        const timeRemaining = await service.getGuestTimeRemaining();
        setGuestTimeRemaining(timeRemaining.remainingSeconds);
        setIsTimeRemainingActive(timeRemaining.isActive);
      }

      const blocked = await service.getBlockedDevices();
      setBlockedDevices(blocked);

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

  const handleRefresh = () => {
    if (wifiService) {
      isFormInitialized.current = false;
      loadData(wifiService);
    }
  };

  const handleToggleWiFi = async (enabled: boolean) => {
    if (!wifiService) {
      return;
    }

    if (!enabled) {
      ThemedAlertHelper.alert(
        t('wifi.disableWifiTitle'),
        t('wifi.disableWifiWarning'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async () => {
              await performToggleWiFi(enabled);
            },
          },
        ]
      );
    } else {
      await performToggleWiFi(enabled);
    }
  };

  const performToggleWiFi = async (enabled: boolean) => {
    if (!wifiService) return;

    try {
      await wifiService.toggleWiFi(enabled);
      ThemedAlertHelper.alert(t('common.success'), enabled ? t('wifi.wifiEnabled') : t('wifi.wifiDisabled'));
      handleRefresh();
    } catch (error) {
      console.error('[WiFi] toggleWiFi error:', error);

      if (!enabled) {
        ThemedAlertHelper.alert(
          t('common.success'),
          t('wifi.wifiDisabledConnectionLost')
        );
      } else {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.failedToggleWifi'));
      }
    }
  };

  const handleToggleGuestWiFi = async (enabled: boolean) => {
    if (!wifiService || isTogglingGuest) return;

    setIsTogglingGuest(true);
    try {
      await wifiService.toggleGuestWiFi(enabled);
      setGuestWifiEnabled(enabled);
      ThemedAlertHelper.alert(t('common.success'), enabled ? t('wifi.guestWifiEnabled') : t('wifi.guestWifiDisabled'));
      // Refresh data to update time remaining display
      if (enabled) {
        setTimeout(() => handleRefresh(), 500);
      }
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedToggleGuestWifi'));
    } finally {
      setIsTogglingGuest(false);
    }
  };

  const handleSaveGuestSettings = async () => {
    if (!wifiService || isSavingGuestSettings) return;

    setIsSavingGuestSettings(true);
    try {
      await wifiService.updateGuestWiFiSettings({
        enabled: guestWifiEnabled,
        ssid: guestWifiSsid,
        password: guestWifiPassword,
        securityMode: guestWifiSecurity,
        duration: guestWifiDuration,
      });
      ThemedAlertHelper.alert(t('common.success'), t('wifi.guestSettingsSaved'));
      handleRefresh();
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedSaveGuestWifi'));
    } finally {
      setIsSavingGuestSettings(false);
    }
  };

  const handleExtendGuestTime = async () => {
    if (!wifiService || isExtendingTime) return;

    setIsExtendingTime(true);
    try {
      await wifiService.extendGuestWiFiTime();
      const timeRemaining = await wifiService.getGuestTimeRemaining();
      setGuestTimeRemaining(timeRemaining.remainingSeconds);
      ThemedAlertHelper.alert(t('common.success'), t('wifi.timeExtended'));
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('wifi.failedExtendTime'));
    } finally {
      setIsExtendingTime(false);
    }
  };

  useEffect(() => {
    if (!guestWifiEnabled || !isTimeRemainingActive || guestTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setGuestTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [guestWifiEnabled, isTimeRemainingActive]);

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '00d 00h 00m 00s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days.toString().padStart(2, '0')}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleUnblockDevice = async (macAddress: string) => {
    if (!wifiService || isUnblocking) return;

    setIsUnblocking(macAddress);
    try {
      await wifiService.unblockDevice(macAddress);
      ThemedAlertHelper.alert(t('common.success'), t('wifi.deviceUnblocked'));
      const blocked = await wifiService.getBlockedDevices();
      setBlockedDevices(blocked);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('wifi.failedUnblockDevice'));
    } finally {
      setIsUnblocking(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!wifiService || !hasChanges || isSaving) {
      return;
    }

    const isPasswordChange = formPassword.length >= 8 && formPassword !== (wifiSettings?.password || '');

    if (isPasswordChange) {
      ThemedAlertHelper.alert(
        t('wifi.passwordChangeWarning'),
        t('wifi.passwordChangeMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('wifi.changePassword'),
            style: 'destructive',
            onPress: () => doSaveSettings(true),
          },
        ]
      );
    } else {
      doSaveSettings(false);
    }
  };

  const doSaveSettings = async (isPasswordChange: boolean) => {
    setIsSaving(true);
    try {
      await wifiService!.setWiFiSettings({
        ssid: formSsid,
        password: formPassword,
        securityMode: formSecurityMode,
      });

      if (isPasswordChange) {
        ThemedAlertHelper.alert(
          t('common.success'),
          t('wifi.passwordChangeSuccess')
        );
      } else {
        ThemedAlertHelper.alert(t('common.success'), t('wifi.settingsSaved'));
        handleRefresh();
      }
    } catch (error: any) {
      console.error('[WiFi UI] setWiFiSettings error:', error);

      const errorMessage = error?.message || '';
      if (isPasswordChange && (
        errorMessage.includes('Network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Failed to fetch')
      )) {
        ThemedAlertHelper.alert(
          t('wifi.passwordChanged'),
          t('wifi.reconnectWithNewPassword')
        );
      } else {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.failedSaveWifi'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlockDevice = async (macAddress: string, hostName: string) => {
    if (!wifiService) return;

    ThemedAlertHelper.alert(
      t('wifi.blockDevice'),
      `${t('wifi.blockConfirm')} ${hostName || macAddress}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('wifi.blockDevice'),
          style: 'destructive',
          onPress: async () => {
            try {
              await wifiService.kickDevice(macAddress);
              ThemedAlertHelper.alert(t('common.success'), t('wifi.deviceBlocked'));
              handleRefresh();
            } catch (error) {
              ThemedAlertHelper.alert(t('common.error'), t('alerts.failedKickDevice'));
            }
          },
        },
      ]
    );
  };

  const handleSaveDeviceName = async (deviceId: string, newName: string) => {
    if (!wifiService) return;

    try {
      await wifiService.changeDeviceName(deviceId, newName);
      ThemedAlertHelper.alert(t('common.success'), t('wifi.deviceNameSaved'));
      handleRefresh();
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('wifi.failedSaveDeviceName'));
      throw error;
    }
  };

  const getSecurityModeLabel = (value: string) => {
    const mode = SECURITY_MODES.find(m => m.value === value);
    return mode ? t(mode.labelKey) : value;
  };

  const handleToggleParentalControl = async (enabled: boolean) => {
    if (!wifiService || isTogglingParental) return;
    setIsTogglingParental(true);
    try {
      await wifiService.toggleParentalControl(enabled);
      setParentalControlEnabled(enabled);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('common.error'));
    } finally {
      setIsTogglingParental(false);
    }
  };

  const getDayName = (day: number): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return t(`parentalControl.${days[day]}`);
  };

  const openAddProfileModal = () => {
    setEditingProfile(null);
    setProfileName('');
    setProfileStartTime('08:00');
    setProfileEndTime('22:00');
    setProfileDays([1, 2, 3, 4, 5]);
    setProfileDevices([]);
    setProfileEnabled(true);
    setInitialProfileValues({
      name: '',
      startTime: '08:00',
      endTime: '22:00',
      days: [1, 2, 3, 4, 5],
      devices: [],
      enabled: true,
    });
    setShowProfileModal(true);
  };

  const openEditProfileModal = (profile: typeof parentalProfiles[0]) => {
    setEditingProfile(profile.id);
    setProfileName(profile.name);
    setProfileStartTime(profile.startTime);
    setProfileEndTime(profile.endTime);
    setProfileDays([...profile.activeDays]);
    setProfileDevices([...profile.deviceMacs]);
    setProfileEnabled(profile.enabled);
    setInitialProfileValues({
      name: profile.name,
      startTime: profile.startTime,
      endTime: profile.endTime,
      days: [...profile.activeDays],
      devices: [...profile.deviceMacs],
      enabled: profile.enabled,
    });
    setShowProfileModal(true);
  };

  const hasProfileChanges = () => {
    if (!initialProfileValues) return false;
    const daysChanged = JSON.stringify([...profileDays].sort()) !== JSON.stringify([...initialProfileValues.days].sort());
    const devicesChanged = JSON.stringify([...profileDevices].sort()) !== JSON.stringify([...initialProfileValues.devices].sort());
    return (
      profileName !== initialProfileValues.name ||
      profileStartTime !== initialProfileValues.startTime ||
      profileEndTime !== initialProfileValues.endTime ||
      daysChanged ||
      devicesChanged ||
      profileEnabled !== initialProfileValues.enabled
    );
  };

  const handleCloseProfileModal = () => {
    if (hasProfileChanges()) {
      ThemedAlertHelper.alert(
        t('common.unsavedChanges'),
        t('common.discardChangesMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.discard'), style: 'destructive', onPress: () => setShowProfileModal(false) }
        ]
      );
    } else {
      setShowProfileModal(false);
    }
  };

  const toggleProfileDay = (day: number) => {
    setProfileDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const toggleProfileDevice = (mac: string) => {
    setProfileDevices(prev =>
      prev.includes(mac)
        ? prev.filter(m => m !== mac)
        : [...prev, mac]
    );
  };

  const handleSaveProfile = async () => {
    if (!wifiService || isSavingProfile) return;

    if (!profileName.trim()) {
      ThemedAlertHelper.alert(t('common.error'), t('parentalControl.profileName'));
      return;
    }

    if (profileDays.length === 0) {
      ThemedAlertHelper.alert(t('common.error'), t('parentalControl.selectAtLeastOneDay'));
      return;
    }

    setIsSavingProfile(true);
    try {
      const profileData = {
        name: profileName.trim(),
        deviceMacs: profileDevices,
        startTime: profileStartTime,
        endTime: profileEndTime,
        activeDays: profileDays,
        enabled: profileEnabled,
      };

      if (editingProfile) {
        await wifiService.updateParentalControlProfile({ id: editingProfile, ...profileData });
      } else {
        await wifiService.createParentalControlProfile(profileData);
      }

      ThemedAlertHelper.alert(t('common.success'), t('parentalControl.profileSaved'));
      setShowProfileModal(false);
      handleRefresh();
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('common.error'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteProfile = (profileId: string, profileName: string) => {
    ThemedAlertHelper.alert(
      t('parentalControl.deleteProfile'),
      t('parentalControl.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await wifiService?.deleteParentalControlProfile(profileId);
              ThemedAlertHelper.alert(t('common.success'), t('parentalControl.profileDeleted'));
              handleRefresh();
            } catch (error) {
              ThemedAlertHelper.alert(t('common.error'), t('common.error'));
            }
          },
        },
      ]
    );
  };


  return (
    <AnimatedScreen>
      <MeshGradientBackground>
        {/*Refresh Indicator - shows when refreshing */}
        <ModernRefreshIndicator refreshing={isRefreshing} />

        <ScrollView
          style={[styles.container, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[
            styles.content,
            { paddingTop: 8 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) }
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
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text }]}>WiFi</Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {wifiSettings.wifiEnable ? t('wifi.enabled') : t('wifi.disabled')}
                  </Text>
                </View>
                <ThemedSwitch
                  value={wifiSettings.wifiEnable}
                  onValueChange={handleToggleWiFi}
                />
              </View>

              <GuestWiFiSettings
                t={t}
                guestWifiEnabled={guestWifiEnabled}
                isTogglingGuest={isTogglingGuest}
                guestWifiDuration={guestWifiDuration}
                showGuestDurationDropdown={showGuestDurationDropdown}
                guestTimeRemaining={guestTimeRemaining}
                isTimeRemainingActive={isTimeRemainingActive}
                isExtendingTime={isExtendingTime}
                guestWifiSsid={guestWifiSsid}
                guestWifiSecurity={guestWifiSecurity}
                showGuestSecurityDropdown={showGuestSecurityDropdown}
                guestWifiPassword={guestWifiPassword}
                isSavingGuestSettings={isSavingGuestSettings}
                onToggleGuestWiFi={handleToggleGuestWiFi}
                onSetShowGuestDurationDropdown={setShowGuestDurationDropdown}
                onSetGuestWifiDuration={setGuestWifiDuration}
                onExtendGuestTime={handleExtendGuestTime}
                onSetGuestWifiSsid={setGuestWifiSsid}
                onSetShowGuestSecurityDropdown={setShowGuestSecurityDropdown}
                onSetGuestWifiSecurity={setGuestWifiSecurity}
                onSetGuestWifiPassword={setGuestWifiPassword}
                onSaveGuestSettings={handleSaveGuestSettings}
                formatTimeRemaining={formatTimeRemaining}
              />

              <WiFiEditSettings
                t={t}
                isEditExpanded={isEditExpanded}
                formSsid={formSsid}
                formSecurityMode={formSecurityMode}
                formPassword={formPassword}
                showPassword={showPassword}
                showSecurityDropdown={showSecurityDropdown}
                hasChanges={hasChanges}
                isSaving={isSaving}
                onToggleExpanded={() => setIsEditExpanded(!isEditExpanded)}
                onSetFormSsid={setFormSsid}
                onSetFormSecurityMode={setFormSecurityMode}
                onSetFormPassword={setFormPassword}
                onToggleShowPassword={() => setShowPassword(!showPassword)}
                onSetShowSecurityDropdown={setShowSecurityDropdown}
                onSaveSettings={handleSaveSettings}
                getSecurityModeLabel={getSecurityModeLabel}
              />
            </Card>
          )}

          <ConnectedDevicesList
            t={t}
            devices={connectedDevices}
            onDevicePress={(device) => {
              setSelectedDevice(device);
              setShowDeviceDetailModal(true);
            }}
            onBlockDevice={handleBlockDevice}
          />

          <BlockedDevicesList
            t={t}
            devices={blockedDevices}
            unblockingMac={isUnblocking}
            onUnblock={handleUnblockDevice}
          />

          <ParentalControlCard
            t={t}
            parentalControlEnabled={parentalControlEnabled}
            isTogglingParental={isTogglingParental}
            isParentalExpanded={isParentalExpanded}
            parentalProfiles={parentalProfiles}
            onToggleParentalControl={handleToggleParentalControl}
            onToggleExpanded={() => setIsParentalExpanded(!isParentalExpanded)}
            onEditProfile={openEditProfileModal}
            onDeleteProfile={handleDeleteProfile}
            onAddProfile={openAddProfileModal}
            getDayName={getDayName}
          />

          <Modal
            visible={showProfileModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleCloseProfileModal}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16 }]}>
              <View style={[styles.modalHeader, {
                borderBottomColor: colors.border,
              }]}>
                <Text style={[typography.headline, { color: colors.text, fontSize: 18, fontWeight: 'bold' }]}>
                  {editingProfile ? t('parentalControl.editProfile') : t('parentalControl.addProfile')}
                </Text>
                <TouchableOpacity onPress={handleCloseProfileModal}>
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
                  {/* Profile Name */}
                  <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>
                    {t('parentalControl.profileName')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginBottom: spacing.md }]}
                    value={profileName}
                    onChangeText={setProfileName}
                    placeholder={t('parentalControl.profileName')}
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>
                    {t('parentalControl.timeRange')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                    <TouchableOpacity
                      style={[styles.timePicker, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <MaterialIcons name="schedule" size={20} color={colors.primary} />
                      <Text style={[typography.body, { color: colors.text, marginLeft: 8, fontWeight: '600' }]}>
                        {profileStartTime}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <Text style={[typography.title3, { color: colors.textSecondary, marginHorizontal: spacing.md }]}>→</Text>

                    <TouchableOpacity
                      style={[styles.timePicker, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <MaterialIcons name="schedule" size={20} color={colors.primary} />
                      <Text style={[typography.body, { color: colors.text, marginLeft: 8, fontWeight: '600' }]}>
                        {profileEndTime}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <SelectionModal
                    visible={showStartTimePicker}
                    title={t('parentalControl.startTime')}
                    options={TIME_OPTIONS.map(time => ({ label: time, value: time }))}
                    selectedValue={profileStartTime}
                    onSelect={(val) => {
                      setProfileStartTime(val);
                      setShowStartTimePicker(false);
                    }}
                    onClose={() => setShowStartTimePicker(false)}
                  />

                  <SelectionModal
                    visible={showEndTimePicker}
                    title={t('parentalControl.endTime')}
                    options={TIME_OPTIONS.map(time => ({ label: time, value: time }))}
                    selectedValue={profileEndTime}
                    onSelect={(val) => {
                      setProfileEndTime(val);
                      setShowEndTimePicker(false);
                    }}
                    onClose={() => setShowEndTimePicker(false)}
                  />


                  <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>
                    {t('parentalControl.activeDays')}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    {[0, 1, 2, 3, 4, 5, 6].map(day => (
                      <TouchableOpacity
                        key={day}
                        onPress={() => toggleProfileDay(day)}
                        style={[
                          styles.dayButton,
                          {
                            backgroundColor: profileDays.includes(day) ? colors.primary : colors.card,
                            borderColor: profileDays.includes(day) ? colors.primary : colors.border,
                          }
                        ]}
                      >
                        <Text style={[typography.caption1, {
                          color: profileDays.includes(day) ? '#fff' : colors.text,
                          fontWeight: profileDays.includes(day) ? '600' : '400'
                        }]}>
                          {getDayName(day).substring(0, 3)}
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
                        onPress={() => toggleProfileDevice(device.macAddress)}
                        style={[
                          styles.deviceSelectItem,
                          {
                            backgroundColor: profileDevices.includes(device.macAddress) ? colors.primary + '15' : colors.card,
                            borderColor: profileDevices.includes(device.macAddress) ? colors.primary : colors.border,
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
                          name={profileDevices.includes(device.macAddress) ? 'check-circle' : 'radio-button-unchecked'}
                          size={24}
                          color={profileDevices.includes(device.macAddress) ? colors.primary : colors.textSecondary}
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
                        {profileEnabled ? t('parentalControl.enabled') : t('parentalControl.disabled')}
                      </Text>
                    </View>
                    <ThemedSwitch
                      value={profileEnabled}
                      onValueChange={setProfileEnabled}
                    />
                  </View>
                </ScrollView>

                <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.saveButtonFull,
                      { backgroundColor: hasProfileChanges() ? colors.primary : colors.textSecondary },
                      pressed && { opacity: 0.8 }
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      if (hasProfileChanges()) {
                        handleSaveProfile();
                      } else {
                        setShowProfileModal(false);
                      }
                    }}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <BouncingDots size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[typography.body, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                        {hasProfileChanges() ? t('common.save') : t('common.cancel')}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </KeyboardAvoidingView>

            </View>
          </Modal>

          {/* Device Detail Modal */}
          <DeviceDetailModal
            visible={showDeviceDetailModal}
            onClose={() => {
              setShowDeviceDetailModal(false);
              setSelectedDevice(null);
            }}
            device={selectedDevice}
            onSaveName={handleSaveDeviceName}
            onBlock={handleBlockDevice}
          />
        </ScrollView>
      </MeshGradientBackground>
    </AnimatedScreen >
  );
}
