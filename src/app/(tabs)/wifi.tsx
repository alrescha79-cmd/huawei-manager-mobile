import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  KeyboardAvoidingView,
  Keyboard,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader, InfoRow, Button, ThemedAlertHelper, DeviceDetailModal, SelectionModal, MeshGradientBackground, AnimatedScreen, ThemedSwitch, BouncingDots } from '@/components';
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

// Time options for time picker (every 30 minutes)
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
  const {
    connectedDevices,
    wifiSettings,
    setConnectedDevices,
    setWiFiSettings,
  } = useWiFiStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wifiService, setWiFiService] = useState<WiFiService | null>(null);


  // Form state
  const [formSsid, setFormSsid] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSecurityMode, setFormSecurityMode] = useState('WPA2PSK');
  const [showSecurityDropdown, setShowSecurityDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Guest WiFi state
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

  // Parental Control state
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

  // Parental Control Profile Modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileStartTime, setProfileStartTime] = useState('08:00');
  const [profileEndTime, setProfileEndTime] = useState('22:00');
  const [profileDays, setProfileDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [profileDevices, setProfileDevices] = useState<string[]>([]);
  const [profileEnabled, setProfileEnabled] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  // Initial values for tracking changes
  const [initialProfileValues, setInitialProfileValues] = useState<{
    name: string;
    startTime: string;
    endTime: string;
    days: number[];
    devices: string[];
    enabled: boolean;
  } | null>(null);

  // Collapse state for edit form
  const [isEditExpanded, setIsEditExpanded] = useState(false);

  // Blocked devices state
  const [blockedDevices, setBlockedDevices] = useState<{ macAddress: string; hostName: string }[]>([]);
  const [isUnblocking, setIsUnblocking] = useState<string | null>(null);

  // Device detail modal state
  const [selectedDevice, setSelectedDevice] = useState<ConnectedDevice | null>(null);
  const [showDeviceDetailModal, setShowDeviceDetailModal] = useState(false);

  // Initialize form when settings load (only first time)
  const isFormInitialized = React.useRef(false);

  useEffect(() => {
    // Only initialize form once when wifiSettings first loads
    // This prevents resetting user edits during auto-refresh
    if (wifiSettings && !isFormInitialized.current) {
      setFormSsid(wifiSettings.ssid || '');
      setFormPassword(wifiSettings.password || '');
      setFormSecurityMode(wifiSettings.securityMode || 'WPA2PSK');
      isFormInitialized.current = true;
    }
  }, [wifiSettings]);

  // Check if form has changes
  const hasChanges = useMemo(() => {
    if (!wifiSettings) return false;
    return (
      formSsid !== (wifiSettings.ssid || '') ||
      formPassword !== (wifiSettings.password || '') ||
      formSecurityMode !== (wifiSettings.securityMode || 'WPA2PSK')
    );
  }, [formSsid, formPassword, formSecurityMode, wifiSettings]);

  // Auto-refresh connected devices every 5 seconds
  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new WiFiService(credentials.modemIp);
      setWiFiService(service);

      // Initial load
      loadData(service);

      // Setup auto-refresh for connected devices
      const intervalId = setInterval(() => {
        loadDataSilent(service);
      }, 5000); // Update every 5 seconds

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

      // Fetch guest time remaining if enabled
      if (guestSettings.enabled) {
        const timeRemaining = await service.getGuestTimeRemaining();
        setGuestTimeRemaining(timeRemaining.remainingSeconds);
        setIsTimeRemainingActive(timeRemaining.isActive);
      }

      // Fetch blocked devices
      const blocked = await service.getBlockedDevices();
      setBlockedDevices(blocked);

    } catch (error) {
      console.error('Error loading WiFi data:', error);
      ThemedAlertHelper.alert('Error', 'Failed to load WiFi data');
    } finally {
      setIsRefreshing(false);
    }
  };


  // Silent background refresh
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
      // Reset form initialization flag so form can be updated from API
      isFormInitialized.current = false;
      loadData(wifiService);
    }
  };

  const handleToggleWiFi = async (enabled: boolean) => {
    if (!wifiService) {
      return;
    }

    // Show confirmation alert when turning OFF WiFi
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

      // If we're turning OFF WiFi and got an error, it's likely due to connection loss
      // The command probably succeeded but we lost connection before getting response
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
      // Refresh to get new time remaining
      const timeRemaining = await wifiService.getGuestTimeRemaining();
      setGuestTimeRemaining(timeRemaining.remainingSeconds);
      ThemedAlertHelper.alert(t('common.success'), t('wifi.timeExtended'));
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('wifi.failedExtendTime'));
    } finally {
      setIsExtendingTime(false);
    }
  };

  // Countdown timer effect for guest WiFi
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

  // Helper function to format seconds to days, hours, minutes, seconds
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
      // Refresh blocked devices list
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

    setIsSaving(true);
    try {
      await wifiService.setWiFiSettings({
        ssid: formSsid,
        password: formPassword,
        securityMode: formSecurityMode,
      });
      ThemedAlertHelper.alert(t('common.success'), t('wifi.settingsSaved'));
      handleRefresh();
    } catch (error) {
      console.error('[WiFi UI] setWiFiSettings error:', error);
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedSaveWifi'));
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

  // Parental Control Handlers
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

  // Check if profile has changes
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

  // Handle profile modal close with confirmation
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
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header} />

          {/* WiFi Settings Card */}
          {wifiSettings && (
            <Card style={{ marginBottom: spacing.md }}>
              <CardHeader title={t('wifi.wifiSettings')} />

              {/* WiFi Enable Toggle */}
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

              {/* Guest WiFi Toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text }]}>{t('wifi.guestWifi')}</Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {guestWifiEnabled ? t('wifi.enabled') : t('wifi.disabled')}
                  </Text>
                </View>
                {isTogglingGuest ? (
                  <BouncingDots size="medium" color={colors.primary} />
                ) : (
                  <ThemedSwitch
                    value={guestWifiEnabled}
                    onValueChange={handleToggleGuestWiFi}
                  />
                )}
              </View>

              {/* Guest WiFi Extended Settings - Only shown when enabled */}
              {guestWifiEnabled && (
                <View style={{ marginTop: spacing.md, paddingLeft: spacing.md }}>
                  {/* Duration Dropdown */}
                  <View style={styles.formGroup}>
                    <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                      {t('wifi.duration')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setShowGuestDurationDropdown(!showGuestDurationDropdown)}
                    >
                      <Text style={[typography.body, { color: colors.text }]}>
                        {guestWifiDuration === '0' ? t('wifi.durationUnlimited') :
                          guestWifiDuration === '24' ? t('wifi.duration1Day') :
                            guestWifiDuration === '4' ? t('wifi.duration4Hours') : t('wifi.durationUnlimited')}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {showGuestDurationDropdown && (
                      <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {[
                          { value: '0', label: t('wifi.durationUnlimited') },
                          { value: '24', label: t('wifi.duration1Day') },
                          { value: '4', label: t('wifi.duration4Hours') },
                        ].map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[styles.dropdownItem, guestWifiDuration === option.value && { backgroundColor: colors.primary + '20' }]}
                            onPress={() => {
                              setGuestWifiDuration(option.value);
                              setShowGuestDurationDropdown(false);
                            }}
                          >
                            <Text style={[typography.body, { color: guestWifiDuration === option.value ? colors.primary : colors.text }]}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Time Remaining - Only shown when duration is not unlimited */}
                  {guestWifiDuration !== '0' && isTimeRemainingActive && (
                    <View style={[styles.formGroup, { backgroundColor: colors.card, padding: spacing.md, borderRadius: 8, marginTop: spacing.sm }]}>
                      <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                        {t('wifi.timeRemaining')}
                      </Text>
                      <Text style={[typography.body, { color: colors.primary, fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold' }]}>
                        {formatTimeRemaining(guestTimeRemaining)}
                      </Text>
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: colors.success,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                          borderRadius: 6,
                          marginTop: spacing.sm,
                          opacity: isExtendingTime ? 0.6 : 1,
                        }}
                        onPress={handleExtendGuestTime}
                        disabled={isExtendingTime}
                      >
                        {isExtendingTime ? (
                          <BouncingDots size="small" color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons name="add" size={18} color="#fff" />
                            <Text style={[typography.caption1, { color: '#fff', marginLeft: 4, fontWeight: '600' }]}>
                              {t('wifi.extend30Min')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* WiFi Name */}
                  <View style={styles.formGroup}>
                    <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                      {t('wifi.guestSsid')}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={guestWifiSsid}
                      onChangeText={setGuestWifiSsid}
                      placeholder={t('wifi.enterSsid')}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  {/* Security Dropdown */}
                  <View style={styles.formGroup}>
                    <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                      {t('wifi.security')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setShowGuestSecurityDropdown(!showGuestSecurityDropdown)}
                    >
                      <Text style={[typography.body, { color: colors.text }]}>
                        {guestWifiSecurity === 'OPEN' ? t('wifi.securityOpen') : t('wifi.securityEncrypted')}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {showGuestSecurityDropdown && (
                      <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {[
                          { value: 'OPEN', label: t('wifi.securityOpen') },
                          { value: 'WPA2-PSK', label: t('wifi.securityEncrypted') },
                        ].map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[styles.dropdownItem, guestWifiSecurity === option.value && { backgroundColor: colors.primary + '20' }]}
                            onPress={() => {
                              setGuestWifiSecurity(option.value);
                              setShowGuestSecurityDropdown(false);
                            }}
                          >
                            <Text style={[typography.body, { color: guestWifiSecurity === option.value ? colors.primary : colors.text }]}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Password - Only shown when security is not OPEN */}
                  {guestWifiSecurity !== 'OPEN' && (
                    <View style={styles.formGroup}>
                      <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                        {t('wifi.password')}
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={guestWifiPassword}
                        onChangeText={setGuestWifiPassword}
                        placeholder={t('wifi.enterPassword')}
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry
                      />
                    </View>
                  )}

                  {/* Save Button */}
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      { backgroundColor: colors.primary },
                      isSavingGuestSettings && { opacity: 0.6 }
                    ]}
                    onPress={handleSaveGuestSettings}
                    disabled={isSavingGuestSettings}
                  >
                    {isSavingGuestSettings ? (
                      <BouncingDots size="small" color="#fff" />
                    ) : (
                      <Text style={[typography.body, { color: '#fff', fontWeight: '600' }]}>{t('common.save')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Separator */}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

              {/* Edit WiFi Settings - Collapsible Header */}
              <TouchableOpacity
                style={[styles.collapseHeader, { borderColor: colors.border }]}
                onPress={() => setIsEditExpanded(!isEditExpanded)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    {t('wifi.editSettings')}
                  </Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {t('wifi.editSettingsHint')}
                  </Text>
                </View>
                <MaterialIcons
                  name={isEditExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Collapsible Content */}
              {isEditExpanded && (
                <View style={{ marginTop: spacing.md }}>

                  {/* SSID Input */}
                  <View style={styles.formGroup}>
                    <Text style={[typography.subheadline, { color: colors.textSecondary, marginBottom: 6 }]}>
                      {t('wifi.wifiName')}
                    </Text>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text
                      }]}
                      value={formSsid}
                      onChangeText={setFormSsid}
                      placeholder={t('wifi.wifiNamePlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  {/* Security Mode Dropdown - DISABLED (encryption not supported yet) */}
                  <View style={[styles.formGroup, { opacity: 0.5 }]}>
                    <Text style={[typography.subheadline, { color: colors.textSecondary, marginBottom: 6 }]}>
                      {t('wifi.securityMode')}
                    </Text>
                    <View
                      style={[styles.dropdown, {
                        backgroundColor: colors.card,
                        borderColor: colors.border
                      }]}
                    >
                      <Text style={[typography.body, { color: colors.text }]}>
                        {getSecurityModeLabel(formSecurityMode)}
                      </Text>
                      <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
                    </View>
                    <TouchableOpacity onPress={() => Linking.openURL(`http://${credentials?.modemIp || '192.168.8.1'}`)}>
                      <Text style={[typography.caption1, { color: colors.primary, marginTop: 4, fontStyle: 'italic' }]}>
                        {t('wifi.useWebInterface')} →
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Password Input - DISABLED (encryption not supported yet) */}
                  {formSecurityMode !== 'OPEN' && (
                    <View style={[styles.formGroup, { opacity: 0.5 }]}>
                      <Text style={[typography.subheadline, { color: colors.textSecondary, marginBottom: 6 }]}>
                        {t('wifi.password')}
                      </Text>
                      <View style={{ position: 'relative' }}>
                        <TextInput
                          style={[styles.input, {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            color: colors.text,
                            paddingRight: 48
                          }]}
                          value={formPassword}
                          editable={false}
                          placeholder="********"
                          placeholderTextColor={colors.textSecondary}
                          secureTextEntry={true}
                        />
                        <View
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: 0,
                            bottom: 0,
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <MaterialIcons
                            name="lock"
                            size={22}
                            color={colors.textSecondary}
                          />
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => Linking.openURL(`http://${credentials?.modemIp || '192.168.8.1'}`)}>
                        <Text style={[typography.caption1, { color: colors.primary, marginTop: 4, fontStyle: 'italic' }]}>
                          {t('wifi.useWebInterface')} →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Save Button */}
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      {
                        backgroundColor: hasChanges ? colors.primary : colors.border,
                        opacity: hasChanges && !isSaving ? 1 : 0.6
                      }
                    ]}
                    onPress={handleSaveSettings}
                    disabled={!hasChanges || isSaving}
                  >
                    {isSaving ? (
                      <BouncingDots size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                        {t('wifi.saveChanges')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          )}

          {/* Connected Devices Card */}
          <Card>
            <CardHeader title={`${t('wifi.connectedDevices')} (${connectedDevices.length})`} />

            {connectedDevices.length === 0 ? (
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }]}>
                {t('wifi.noDevices')}
              </Text>
            ) : (
              connectedDevices.map((device, index) => (
                <TouchableOpacity
                  key={device.macAddress}
                  style={[
                    styles.deviceItem,
                    {
                      borderBottomWidth: index < connectedDevices.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      paddingBottom: spacing.md,
                      marginBottom: index < connectedDevices.length - 1 ? spacing.md : 0,
                    },
                  ]}
                  onPress={() => {
                    setSelectedDevice(device);
                    setShowDeviceDetailModal(true);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: 4 }]}>
                      {device.hostName || 'Unknown Device'}
                    </Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                      IP: {device.ipAddress}
                    </Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                      MAC: {formatMacAddress(device.macAddress)}
                    </Text>
                  </View>

                  <Button
                    title={t('wifi.blockDevice')}
                    variant="danger"
                    onPress={() => handleBlockDevice(device.macAddress, device.hostName)}
                    style={styles.kickButton}
                  />
                </TouchableOpacity>
              ))
            )}
          </Card>

          {/* Blocked Devices Card - Only show if there are blocked devices */}
          {blockedDevices.length > 0 && (
            <Card style={{ marginTop: spacing.md }}>
              <CardHeader title={t('wifi.blockedDevices')} />
              {blockedDevices.map((device, index) => (
                <View
                  key={device.macAddress + index}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: spacing.sm,
                    borderBottomWidth: index < blockedDevices.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.error + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.sm,
                    }}>
                      <MaterialIcons name="block" size={20} color={colors.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>
                        {device.hostName || t('wifi.unknownDevice')}
                      </Text>
                      <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                        {device.macAddress}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.success,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: 6,
                      opacity: isUnblocking === device.macAddress ? 0.6 : 1,
                    }}
                    onPress={() => handleUnblockDevice(device.macAddress)}
                    disabled={isUnblocking === device.macAddress}
                  >
                    {isUnblocking === device.macAddress ? (
                      <BouncingDots size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4 }}>{t('wifi.unblock')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          )}

          {/* Parental Control Card */}
          <Card style={{ marginTop: spacing.md }}>
            <CardHeader title={t('parentalControl.title')} />

            {/* Enable/Disable Switch */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text }]}>{t('parentalControl.title')}</Text>
                <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                  {t('parentalControl.enableHint')}
                </Text>
              </View>
              {isTogglingParental ? (
                <BouncingDots size="medium" color={colors.primary} />
              ) : (
                <ThemedSwitch
                  value={parentalControlEnabled}
                  onValueChange={handleToggleParentalControl}
                />
              )}
            </View>

            {/* Separator */}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

            {/* Profiles Section - Collapsible */}
            <TouchableOpacity
              style={[styles.collapseHeader, { borderColor: colors.border }]}
              onPress={() => setIsParentalExpanded(!isParentalExpanded)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  {t('parentalControl.profiles')}
                </Text>
                <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                  {parentalProfiles.length > 0
                    ? `${parentalProfiles.length} ${t('parentalControl.profiles').toLowerCase()}`
                    : t('parentalControl.noProfiles')}
                </Text>
              </View>
              <MaterialIcons
                name={isParentalExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {isParentalExpanded && (
              <View style={{ marginTop: spacing.md }}>
                {parentalProfiles.length === 0 ? (
                  <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md }]}>
                    {t('parentalControl.noProfiles')}
                  </Text>
                ) : (
                  parentalProfiles.map((profile, index) => (
                    <TouchableOpacity
                      key={profile.id}
                      onPress={() => openEditProfileModal(profile)}
                      style={[
                        styles.deviceItem,
                        {
                          borderBottomWidth: index < parentalProfiles.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          paddingBottom: spacing.md,
                          marginBottom: index < parentalProfiles.length - 1 ? spacing.md : 0,
                          backgroundColor: profile.enabled ? colors.primary + '10' : 'transparent',
                          padding: spacing.sm,
                          borderRadius: 8,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: 4 }]}>
                          {profile.name}
                        </Text>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                          {t('parentalControl.timeRange')}: {profile.startTime} - {profile.endTime}
                        </Text>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                          {t('parentalControl.activeDays')}: {profile.activeDays.map(d => getDayName(d).substring(0, 3)).join(', ')}
                        </Text>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                          {profile.deviceMacs.length} {t('parentalControl.selectDevices').toLowerCase()}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id, profile.name); }}
                          style={{ padding: 4 }}
                        >
                          <MaterialIcons name="delete" size={20} color={colors.error} />
                        </TouchableOpacity>
                        <MaterialIcons
                          name={profile.enabled ? 'check-circle' : 'radio-button-unchecked'}
                          size={24}
                          color={profile.enabled ? colors.success : colors.textSecondary}
                        />
                      </View>
                    </TouchableOpacity>
                  ))
                )}

                {/* Add Profile Button */}
                <Button
                  title={t('parentalControl.addProfile')}
                  onPress={openAddProfileModal}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            )}
          </Card>

          <Modal
            visible={showProfileModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleCloseProfileModal}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16 }]}>
              <View style={[styles.modalHeader, {
                borderBottomColor: colors.border,
                // Header styling updated to match new pattern
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

                  {/* Time Range */}
                  <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>
                    {t('parentalControl.timeRange')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                    {/* Start Time Picker */}
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

                    {/* End Time Picker */}
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


                  {/* Active Days */}
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

                  {/* Select Devices */}
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

                  {/* Enabled Switch */}
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

                {/* Footer Button - Inside KeyboardAvoidingView */}
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
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kickButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  collapseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalContentScroll: {
    flex: 1,
    padding: 20,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  timePickerDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  timePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  saveButtonFull: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
