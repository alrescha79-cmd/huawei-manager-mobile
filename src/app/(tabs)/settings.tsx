import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';
import { Card, CardHeader, Button, InfoRow, ThemedAlertHelper, BandSelectionModal, PageSheetModal, MonthlySettingsModal } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { useThemeStore } from '@/stores/theme.store';
import { ModemService } from '@/services/modem.service';
import { NetworkSettingsService } from '@/services/network.settings.service';
import { useTranslation } from '@/i18n';

const ANTENNA_MODES = [
  { value: 'auto', labelKey: 'settings.antennaAuto', icon: 'settings-input-antenna' as const },
  { value: 'internal', labelKey: 'settings.antennaInternal', icon: 'wifi' as const },
  { value: 'external', labelKey: 'settings.antennaExternal', icon: 'router' as const },
];

const NETWORK_MODES = [
  { value: '00', labelKey: 'settings.networkAuto' },
  { value: '03', labelKey: 'settings.network4gOnly' },
  { value: '02', labelKey: 'settings.network3gOnly' },
  { value: '01', labelKey: 'settings.network2gOnly' },
  { value: '0302', labelKey: 'settings.network4g3g' },
];

// LTE Band definitions - Comprehensive FDD and TDD bands
const LTE_BANDS = [
  // === FDD Bands ===
  { bit: 0, name: 'B1', freq: '2100 MHz', region: 'Global' },
  { bit: 1, name: 'B2', freq: '1900 MHz', region: 'Americas' },
  { bit: 2, name: 'B3', freq: '1800 MHz', region: 'Global' },
  { bit: 3, name: 'B4', freq: '1700/2100 MHz', region: 'Americas' },
  { bit: 4, name: 'B5', freq: '850 MHz', region: 'Americas/Asia' },
  { bit: 6, name: 'B7', freq: '2600 MHz', region: 'Global' },
  { bit: 7, name: 'B8', freq: '900 MHz', region: 'Europe/Asia' },
  { bit: 11, name: 'B12', freq: '700 MHz', region: 'Americas' },
  { bit: 12, name: 'B13', freq: '700 MHz', region: 'Americas' },
  { bit: 16, name: 'B17', freq: '700 MHz', region: 'Americas' },
  { bit: 17, name: 'B18', freq: '850 MHz', region: 'Japan' },
  { bit: 18, name: 'B19', freq: '850 MHz', region: 'Japan' },
  { bit: 19, name: 'B20', freq: '800 MHz', region: 'Europe' },
  { bit: 20, name: 'B21', freq: '1500 MHz', region: 'Japan' },
  { bit: 24, name: 'B25', freq: '1900 MHz', region: 'Americas' },
  { bit: 25, name: 'B26', freq: '850 MHz', region: 'Americas' },
  { bit: 27, name: 'B28', freq: '700 MHz', region: 'Asia Pacific' },
  { bit: 28, name: 'B29', freq: '700 MHz SDL', region: 'Americas' },
  { bit: 29, name: 'B30', freq: '2300 MHz', region: 'Americas' },
  { bit: 31, name: 'B32', freq: '1500 MHz SDL', region: 'Europe' },
  { bit: 65, name: 'B66', freq: '1700/2100 MHz', region: 'Americas' },
  { bit: 70, name: 'B71', freq: '600 MHz', region: 'Americas' },
  // === TDD Bands ===
  { bit: 33, name: 'B34', freq: '2010 MHz TDD', region: 'China' },
  { bit: 37, name: 'B38', freq: '2600 MHz TDD', region: 'Global' },
  { bit: 38, name: 'B39', freq: '1900 MHz TDD', region: 'China' },
  { bit: 39, name: 'B40', freq: '2300 MHz TDD', region: 'Global' },
  { bit: 40, name: 'B41', freq: '2500 MHz TDD', region: 'Global' },
  { bit: 41, name: 'B42', freq: '3500 MHz TDD', region: 'Global' },
  { bit: 42, name: 'B43', freq: '3700 MHz TDD', region: 'Global' },
  { bit: 45, name: 'B46', freq: '5200 MHz LAA', region: 'Global' },
  { bit: 47, name: 'B48', freq: '3600 MHz CBRS', region: 'Americas' },
];

// NTP Servers
const NTP_SERVERS = [
  'pool.ntp.org',
  'time.google.com',
  'time.cloudflare.com',
  'time.windows.com',
  'time.apple.com',
  'ntp.ubuntu.com',
];

// Timezones
const TIMEZONES = [
  'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6', 'UTC-5',
  'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3',
  'UTC+4', 'UTC+5', 'UTC+5:30', 'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10',
  'UTC+11', 'UTC+12',
];

// Ethernet connection modes
const ETHERNET_MODES = [
  { value: 'auto', labelKey: 'networkSettings.modeAuto' },
  { value: 'lan_only', labelKey: 'networkSettings.modeLanOnly' },
  { value: 'pppoe', labelKey: 'networkSettings.modePppoe' },
  { value: 'dynamic_ip', labelKey: 'networkSettings.modeDynamicIp' },
  { value: 'pppoe_dynamic', labelKey: 'networkSettings.modePppoeDynamic' },
];


export default function SettingsScreen() {
  const router = useRouter();
  const { openBandModal } = useLocalSearchParams<{ openBandModal?: string }>();
  const { colors, typography, spacing } = useTheme();
  const { credentials, logout, login } = useAuthStore();
  const { modemInfo, monthlySettings, setModemInfo, setMonthlySettings } = useModemStore();
  const { themeMode, setThemeMode, language, setLanguage } = useThemeStore();
  const { t } = useTranslation();

  const [modemService, setModemService] = useState<ModemService | null>(null);
  const [networkSettingsService, setNetworkSettingsService] = useState<NetworkSettingsService | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [antennaMode, setAntennaMode] = useState('auto');
  const [showAntennaDropdown, setShowAntennaDropdown] = useState(false);
  const [isChangingAntenna, setIsChangingAntenna] = useState(false);

  // Network mode state
  const [networkMode, setNetworkMode] = useState('00');
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);

  // Band selection state
  const [showBandModal, setShowBandModal] = useState(false);
  const [selectedBands, setSelectedBands] = useState<number[]>([]);
  const [isSavingBands, setIsSavingBands] = useState(false);

  const [modemIp, setModemIp] = useState(credentials?.modemIp || '192.168.8.1');
  const [modemUsername, setModemUsername] = useState(credentials?.username || 'admin');
  const [modemPassword, setModemPassword] = useState(credentials?.password || '');
  const [isModemSettingsExpanded, setIsModemSettingsExpanded] = useState(false);
  const [isSavingModem, setIsSavingModem] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Update check state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<{
    hasUpdate: boolean;
    latestVersion: string;
    downloadUrl: string;
  } | null>(null);

  // Mobile Network state
  const [mobileDataEnabled, setMobileDataEnabled] = useState(false);
  const [dataRoamingEnabled, setDataRoamingEnabled] = useState(false);
  const [autoNetworkEnabled, setAutoNetworkEnabled] = useState(true);
  const [isTogglingMobileData, setIsTogglingMobileData] = useState(false);
  const [isTogglingRoaming, setIsTogglingRoaming] = useState(false);
  const [isTogglingAutoNetwork, setIsTogglingAutoNetwork] = useState(false);

  // Time Settings state
  const [currentTime, setCurrentTime] = useState('');
  const [sntpEnabled, setSntpEnabled] = useState(true);
  const [ntpServer, setNtpServer] = useState('pool.ntp.org');
  const [ntpServerBackup, setNtpServerBackup] = useState('time.google.com');
  const [timezone, setTimezone] = useState('UTC+7');
  const [showNtpDropdown, setShowNtpDropdown] = useState(false);
  const [showNtpBackupDropdown, setShowNtpBackupDropdown] = useState(false);
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [isTogglingSntp, setIsTogglingSntp] = useState(false);

  // Ethernet state
  const [ethernetMode, setEthernetMode] = useState<'auto' | 'lan_only' | 'pppoe' | 'dynamic_ip' | 'pppoe_dynamic'>('auto');
  const [showEthernetDropdown, setShowEthernetDropdown] = useState(false);
  const [isChangingEthernet, setIsChangingEthernet] = useState(false);
  const [ethernetStatus, setEthernetStatus] = useState({
    connected: false,
    ipAddress: '',
    gateway: '',
    netmask: '',
    dns1: '',
    dns2: '',
    macAddress: '',
  });

  // APN Profile state
  const [apnProfiles, setApnProfiles] = useState<{
    id: string;
    name: string;
    apn: string;
    username: string;
    password: string;
    authType: 'none' | 'pap' | 'chap' | 'pap_chap';
    ipType: 'ipv4' | 'ipv6' | 'ipv4v6';
    isDefault: boolean;
  }[]>([]);
  const [activeApnProfileId, setActiveApnProfileId] = useState<string>('');
  const [isApnExpanded, setIsApnExpanded] = useState(false);
  const [isMobileNetworkExpanded, setIsMobileNetworkExpanded] = useState(false);
  const [isEthernetExpanded, setIsEthernetExpanded] = useState(false);
  const [isDhcpExpanded, setIsDhcpExpanded] = useState(false);

  // DHCP state
  const [dhcpSettings, setDhcpSettings] = useState({
    dhcpIPAddress: '192.168.8.1',
    dhcpLanNetmask: '255.255.255.0',
    dhcpStatus: true,
    dhcpStartIPAddress: '192.168.8.100',
    dhcpEndIPAddress: '192.168.8.200',
    dhcpLeaseTime: 86400,
    dnsStatus: true,
    primaryDns: '',
    secondaryDns: '',
  });
  const [isTogglingDhcp, setIsTogglingDhcp] = useState(false);
  const [isSavingDhcp, setIsSavingDhcp] = useState(false);
  const [showLeaseTimeDropdown, setShowLeaseTimeDropdown] = useState(false);
  const [showApnModal, setShowApnModal] = useState(false);
  const [editingApn, setEditingApn] = useState<string | null>(null);
  const [apnName, setApnName] = useState('');
  const [apnApn, setApnApn] = useState('');
  const [apnUsername, setApnUsername] = useState('');
  const [apnPassword, setApnPassword] = useState('');
  const [apnAuthType, setApnAuthType] = useState<'none' | 'pap' | 'chap' | 'pap_chap'>('none');
  const [apnIpType, setApnIpType] = useState<'ipv4' | 'ipv6' | 'ipv4v6'>('ipv4');
  const [apnIsDefault, setApnIsDefault] = useState(false);
  const [isSavingApn, setIsSavingApn] = useState(false);
  const [showApnAuthDropdown, setShowApnAuthDropdown] = useState(false);
  const [showApnIpDropdown, setShowApnIpDropdown] = useState(false);

  // Monthly quota/limit settings modal visibility
  const [showMonthlySettingsModal, setShowMonthlySettingsModal] = useState(false);


  // Check if credentials have changed
  const hasCredentialsChanges =
    modemIp !== (credentials?.modemIp || '192.168.8.1') ||
    modemUsername !== (credentials?.username || 'admin') ||
    modemPassword !== (credentials?.password || '');



  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new ModemService(credentials.modemIp);
      const netService = new NetworkSettingsService(credentials.modemIp);
      setModemService(service);
      setNetworkSettingsService(netService);
      loadModemInfo(service);
      loadAntennaMode(service);
      loadNetworkMode(service);
      loadMobileNetworkSettings(service);
      loadTimeSettings(service);
      loadEthernetSettings(netService);
      loadApnProfiles(netService);
      loadDHCPSettings(netService);
      // Load monthly quota settings
      service.getMonthlyDataSettings().then(settings => {
        if (settings) {
          setMonthlySettings({
            enabled: settings.enabled,
            startDay: settings.startDay,
            dataLimit: settings.dataLimit,
            dataLimitUnit: settings.dataLimitUnit,
            monthThreshold: settings.monthThreshold,
          });
        }
      }).catch(() => { });
    }
  }, [credentials]);

  // Time update interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (modemService) {
        modemService.getCurrentTime().then(time => setCurrentTime(time)).catch(() => { });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [modemService]);

  // Auto-open band modal if navigated with openBandModal parameter
  useEffect(() => {
    if (openBandModal === 'true') {
      setShowBandModal(true);
      // Clear the parameter by replacing route
      router.replace('/settings');
    }
  }, [openBandModal]);

  const loadModemInfo = async (service: ModemService) => {
    try {
      const info = await service.getModemInfo();
      setModemInfo(info);
    } catch (error) {
      console.error('Error loading modem info:', error);
    }
  };

  const loadMobileNetworkSettings = async (service: ModemService) => {
    try {
      const [mobileData, roaming, autoNetwork] = await Promise.all([
        service.getMobileDataStatus(),
        service.getDataRoamingStatus(),
        service.getAutoNetworkStatus(),
      ]);
      setMobileDataEnabled(mobileData.dataswitch);
      setDataRoamingEnabled(roaming);
      setAutoNetworkEnabled(autoNetwork);
    } catch (error) {
      console.error('Error loading mobile network settings:', error);
    }
  };

  const loadTimeSettings = async (service: ModemService) => {
    try {
      const settings = await service.getTimeSettings();
      setCurrentTime(settings.currentTime);
      setSntpEnabled(settings.sntpEnabled);
      setNtpServer(settings.ntpServer);
      setNtpServerBackup(settings.ntpServerBackup);
      setTimezone(settings.timezone);
    } catch (error) {
      console.error('Error loading time settings:', error);
    }
  };

  const loadEthernetSettings = async (service: NetworkSettingsService) => {
    try {
      const settings = await service.getEthernetSettings();
      setEthernetMode(settings.connectionMode);
      setEthernetStatus(settings.status);
    } catch (error) {
      console.error('Error loading ethernet settings:', error);
    }
  };

  const handleEthernetModeChange = async (mode: typeof ethernetMode) => {
    if (!networkSettingsService || isChangingEthernet) return;
    setIsChangingEthernet(true);
    setShowEthernetDropdown(false);
    try {
      await networkSettingsService.setEthernetConnectionMode(mode);
      setEthernetMode(mode);
      // Refresh status after mode change
      const settings = await networkSettingsService.getEthernetSettings();
      setEthernetStatus(settings.status);
      ThemedAlertHelper.alert(t('common.success'), t('networkSettings.profileSaved'));
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('common.error'));
    } finally {
      setIsChangingEthernet(false);
    }
  };

  const loadDHCPSettings = async (service: NetworkSettingsService) => {
    try {
      const settings = await service.getDHCPSettings();
      setDhcpSettings(settings);
    } catch (error) {
      console.error('Error loading DHCP settings:', error);
    }
  };

  const handleDHCPToggle = async (enabled: boolean) => {
    if (!networkSettingsService || isTogglingDhcp) return;
    setIsTogglingDhcp(true);
    try {
      await networkSettingsService.toggleDHCPServer(enabled);
      setDhcpSettings(prev => ({ ...prev, dhcpStatus: enabled }));
      ThemedAlertHelper.alert(t('common.success'), t('networkSettings.dhcpSaved'));
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('networkSettings.failedSaveDhcp'));
    } finally {
      setIsTogglingDhcp(false);
    }
  };

  const handleDHCPLeaseTimeChange = async (leaseTime: number) => {
    if (!networkSettingsService) return;
    setShowLeaseTimeDropdown(false);
    setIsSavingDhcp(true);
    try {
      await networkSettingsService.setDHCPSettings({ dhcpLeaseTime: leaseTime });
      setDhcpSettings(prev => ({ ...prev, dhcpLeaseTime: leaseTime }));
      ThemedAlertHelper.alert(t('common.success'), t('networkSettings.dhcpSaved'));
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('networkSettings.failedSaveDhcp'));
    } finally {
      setIsSavingDhcp(false);
    }
  };

  const handleSaveDHCPSettings = async () => {
    if (!networkSettingsService || isSavingDhcp) return;
    setIsSavingDhcp(true);
    try {
      await networkSettingsService.setDHCPSettings(dhcpSettings);
      ThemedAlertHelper.alert(t('common.success'), t('networkSettings.dhcpSaved'));
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('networkSettings.failedSaveDhcp'));
    } finally {
      setIsSavingDhcp(false);
    }
  };

  const getLeaseTimeLabel = (seconds: number): string => {
    if (seconds <= 3600) return t('networkSettings.leaseTime1Hour');
    if (seconds <= 43200) return t('networkSettings.leaseTime12Hours');
    if (seconds <= 86400) return t('networkSettings.leaseTime1Day');
    return t('networkSettings.leaseTime1Week');
  };

  const loadApnProfiles = async (service: NetworkSettingsService) => {
    try {
      const profiles = await service.getAPNProfiles();
      const activeId = await service.getActiveAPNProfile();
      setActiveApnProfileId(activeId);

      // Mark the active profile as default based on CurrentProfile from API
      const updatedProfiles = profiles.map(p => ({
        ...p,
        isDefault: p.id === activeId,
      }));
      setApnProfiles(updatedProfiles);
    } catch (error) {
      console.error('Error loading APN profiles:', error);
    }
  };

  const openAddApnModal = () => {
    setEditingApn(null);
    setApnName('');
    setApnApn('');
    setApnUsername('');
    setApnPassword('');
    setApnAuthType('none');
    setApnIpType('ipv4');
    setApnIsDefault(false);
    setShowApnModal(true);
  };

  const openEditApnModal = (profile: typeof apnProfiles[0]) => {
    setEditingApn(profile.id);
    setApnName(profile.name);
    setApnApn(profile.apn);
    setApnUsername(profile.username);
    setApnPassword(profile.password);
    setApnAuthType(profile.authType);
    setApnIpType(profile.ipType);
    setApnIsDefault(profile.isDefault);
    setShowApnModal(true);
  };

  const handleSaveApnProfile = async () => {
    if (!networkSettingsService || isSavingApn) return;

    if (!apnName.trim() || !apnApn.trim()) {
      ThemedAlertHelper.alert(t('common.error'), t('networkSettings.apnRequired'));
      return;
    }

    setIsSavingApn(true);
    try {
      const profileData = {
        name: apnName.trim(),
        apn: apnApn.trim(),
        username: apnUsername,
        password: apnPassword,
        authType: apnAuthType,
        ipType: apnIpType,
        isDefault: apnIsDefault,
      };

      if (editingApn) {
        await networkSettingsService.updateAPNProfile({ id: editingApn, ...profileData });
      } else {
        await networkSettingsService.createAPNProfile(profileData);
      }

      // Close modal first to prevent UI issues
      setShowApnModal(false);
      ThemedAlertHelper.alert(t('common.success'), t('networkSettings.apnSaved'));

      // Add delay before refreshing to allow modem to stabilize
      setTimeout(async () => {
        try {
          await loadApnProfiles(networkSettingsService);
        } catch (refreshError) {
          console.log('Refresh after APN save failed, will retry on next load');
        }
      }, 2000);
    } catch (error: any) {
      console.error('Error saving APN profile:', error);
      const errorMessage = error?.message || t('common.error');
      ThemedAlertHelper.alert(t('common.error'), errorMessage);
    } finally {
      setIsSavingApn(false);
    }
  };

  const handleDeleteApnProfile = (profileId: string, profileName: string) => {
    ThemedAlertHelper.alert(
      t('networkSettings.deleteProfile'),
      t('networkSettings.deleteProfileConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await networkSettingsService?.deleteAPNProfile(profileId);
              ThemedAlertHelper.alert(t('common.success'), t('networkSettings.profileDeleted'));
              if (networkSettingsService) await loadApnProfiles(networkSettingsService);
            } catch (error) {
              ThemedAlertHelper.alert(t('common.error'), t('common.error'));
            }
          },
        },
      ]
    );
  };

  const handleSetDefaultApn = async (profileId: string) => {
    if (!networkSettingsService) return;
    try {
      await networkSettingsService.setActiveAPNProfile(profileId);
      ThemedAlertHelper.alert(t('common.success'), t('networkSettings.profileSaved'));
      await loadApnProfiles(networkSettingsService);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('common.error'));
    }
  };


  const loadAntennaMode = async (service: ModemService) => {
    try {
      const mode = await service.getAntennaMode();
      // getAntennaMode already returns 'auto', 'internal', or 'external'
      // No need to re-map
      if (mode === 'auto' || mode === 'internal' || mode === 'external') {
        setAntennaMode(mode);
      } else {
        setAntennaMode('auto');
      }
    } catch (error) {
      console.error('Error loading antenna mode:', error);
    }
  };

  const handleAntennaChange = async (mode: 'auto' | 'internal' | 'external') => {
    if (!modemService || isChangingAntenna) return;

    setIsChangingAntenna(true);
    setShowAntennaDropdown(false);
    try {
      await modemService.setAntennaMode(mode);
      setAntennaMode(mode);
      ThemedAlertHelper.alert(t('common.success'), t('settings.antennaModeChanged'));
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedChangeAntenna'));
    } finally {
      setIsChangingAntenna(false);
    }
  };

  const loadNetworkMode = async (service: ModemService) => {
    try {
      const mode = await service.getNetworkMode();
      setNetworkMode(mode);

      // Also load band settings
      const bandSettings = await service.getBandSettings();
      const lteBandHex = bandSettings.lteBand;
      const selectedBits = hexToBandBits(lteBandHex);
      setSelectedBands(selectedBits);
    } catch (error) {
      console.error('Error loading network mode:', error);
    }
  };

  const handleNetworkModeChange = async (mode: string) => {
    if (!modemService || isChangingNetwork) return;

    setIsChangingNetwork(true);
    setShowNetworkDropdown(false);
    try {
      await modemService.setNetworkMode(mode);
      setNetworkMode(mode);
      ThemedAlertHelper.alert(t('common.success'), t('settings.networkModeChanged'));
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedChangeNetwork'));
    } finally {
      setIsChangingNetwork(false);
    }
  };

  // Mobile Network Handlers
  const handleToggleMobileData = async (enabled: boolean) => {
    if (!modemService || isTogglingMobileData) return;
    setIsTogglingMobileData(true);
    try {
      await modemService.toggleMobileData(enabled);
      setMobileDataEnabled(enabled);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedToggleData'));
    } finally {
      setIsTogglingMobileData(false);
    }
  };

  const handleToggleDataRoaming = async (enabled: boolean) => {
    if (!modemService || isTogglingRoaming) return;
    setIsTogglingRoaming(true);
    try {
      await modemService.setDataRoaming(enabled);
      setDataRoamingEnabled(enabled);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedChangeNetwork'));
    } finally {
      setIsTogglingRoaming(false);
    }
  };

  const handleToggleAutoNetwork = async (enabled: boolean) => {
    if (!modemService || isTogglingAutoNetwork) return;
    setIsTogglingAutoNetwork(true);
    try {
      await modemService.setAutoNetwork(enabled);
      setAutoNetworkEnabled(enabled);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedChangeNetwork'));
    } finally {
      setIsTogglingAutoNetwork(false);
    }
  };

  // Time Settings Handlers
  const handleToggleSntp = async (enabled: boolean) => {
    if (!modemService || isTogglingSntp) return;
    setIsTogglingSntp(true);
    try {
      await modemService.setTimeSettings({ sntpEnabled: enabled });
      setSntpEnabled(enabled);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('common.error'));
    } finally {
      setIsTogglingSntp(false);
    }
  };

  const handleNtpServerChange = async (server: string) => {
    if (!modemService) return;
    setShowNtpDropdown(false);
    try {
      await modemService.setTimeSettings({ ntpServer: server });
      setNtpServer(server);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('common.error'));
    }
  };

  const handleNtpBackupChange = async (server: string) => {
    if (!modemService) return;
    setShowNtpBackupDropdown(false);
    try {
      await modemService.setTimeSettings({ ntpServerBackup: server });
      setNtpServerBackup(server);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('common.error'));
    }
  };

  const handleTimezoneChange = async (tz: string) => {
    if (!modemService) return;
    setShowTimezoneDropdown(false);
    try {
      await modemService.setTimeSettings({ timezone: tz });
      setTimezone(tz);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('common.error'));
    }
  };

  const hexToBandBits = (hex: string): number[] => {
    try {
      const bigInt = BigInt('0x' + hex);
      const bits: number[] = [];
      LTE_BANDS.forEach(band => {
        if ((bigInt >> BigInt(band.bit)) & BigInt(1)) {
          bits.push(band.bit);
        }
      });
      return bits;
    } catch {
      return LTE_BANDS.map(b => b.bit); // All bands if parse fails
    }
  };

  const bandBitsToHex = (bits: number[]): string => {
    let value = BigInt(0);
    bits.forEach(bit => {
      value |= BigInt(1) << BigInt(bit);
    });
    return value.toString(16).toUpperCase().padStart(16, '0');
  };

  const toggleBand = (bit: number) => {
    setSelectedBands(prev =>
      prev.includes(bit)
        ? prev.filter(b => b !== bit)
        : [...prev, bit]
    );
  };

  const saveBandSettings = async () => {
    if (!modemService || isSavingBands) return;

    if (selectedBands.length === 0) {
      ThemedAlertHelper.alert(t('common.error'), t('settings.selectAtLeastOneBand'));
      return;
    }

    setIsSavingBands(true);
    try {
      const lteBandHex = bandBitsToHex(selectedBands);
      await modemService.setBandSettings('3FFFFFFF', lteBandHex);
      setShowBandModal(false);
      ThemedAlertHelper.alert(t('common.success'), t('settings.bandSettingsSaved'));
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedSaveBands'));
    } finally {
      setIsSavingBands(false);
    }
  };

  const handleLogout = async () => {
    ThemedAlertHelper.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (modemService) {
                await modemService.logout();
              }
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              // Continue with logout even if API call fails
              await logout();
              router.replace('/login');
            }
          },
        },
      ]
    );
  };

  const handleReboot = async () => {
    ThemedAlertHelper.alert(
      t('settings.rebootModem'),
      t('settings.rebootConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.rebootModem'),
          style: 'destructive',
          onPress: async () => {
            if (!modemService) return;

            setIsLoading(true);
            try {
              await modemService.reboot();
              ThemedAlertHelper.alert(t('common.success'), t('settings.rebootSuccess'));
            } catch (error) {
              ThemedAlertHelper.alert(t('common.error'), t('alerts.failedReboot'));
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenGitHub = () => {
    Linking.openURL('https://github.com/alrescha79-cmd');
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light': return 'light-mode';
      case 'dark': return 'dark-mode';
      default: return 'brightness-auto';
    }
  };

  const getAntennaModeLabel = () => {
    const mode = ANTENNA_MODES.find(m => m.value === antennaMode);
    return mode ? t(mode.labelKey) : antennaMode;
  };

  const handleSaveModemSettings = async () => {
    if (!modemIp) {
      ThemedAlertHelper.alert(t('common.error'), t('settings.enterModemIp'));
      return;
    }

    setIsSavingModem(true);
    try {
      await login({
        modemIp,
        username: modemUsername,
        password: modemPassword,
      });
      ThemedAlertHelper.alert(t('common.success'), t('settings.modemSettingsSaved'));
      setIsModemSettingsExpanded(false);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedSaveModemSettings'));
    } finally {
      setIsSavingModem(false);
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateResult(null);

    try {
      const response = await fetch(
        'https://api.github.com/repos/alrescha79-cmd/huawei-manager-mobile/releases/latest'
      );

      if (!response.ok) {
        throw new Error('Failed to fetch release info');
      }

      const data = await response.json();
      const latestVersion = data.tag_name?.replace(/^v/, '') || '';
      const currentVersion = Constants.expoConfig?.version || '1.0.0';

      // Compare versions
      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

      setUpdateResult({
        hasUpdate,
        latestVersion,
        downloadUrl: data.html_url || 'https://github.com/alrescha79-cmd/huawei-manager-mobile/releases',
      });

      // Auto-hide "app is up to date" message after 3 seconds
      if (!hasUpdate) {
        setTimeout(() => {
          setUpdateResult(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      ThemedAlertHelper.alert(t('common.error'), t('settings.updateCheckFailed'));
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Version comparison helper (returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal)
  const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: 8 }]}
    >
      {/* Spacer for consistent gap with other tabs */}
      <View style={{ height: 8 }} />

      {/* Modem Info Card */}
      {modemInfo && (
        <Card style={{ marginBottom: spacing.md }}>
          <CardHeader title={t('settings.modemInfo')} icon="router" />

          <InfoRow label={t('settings.device')} value={modemInfo.deviceName} />
          <InfoRow label={t('settings.serialNumber')} value={modemInfo.serialNumber} />
          <InfoRow label={t('settings.imei')} value={modemInfo.imei} />
          <InfoRow label={t('settings.hardwareVersion')} value={modemInfo.hardwareVersion} />
          <InfoRow label={t('settings.softwareVersion')} value={modemInfo.softwareVersion} />
          {modemInfo.macAddress1 && (
            <InfoRow label={t('settings.macAddress')} value={modemInfo.macAddress1} />
          )}
        </Card>
      )}

      {/* System Settings Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <CardHeader title={t('settings.systemSettings')} icon="settings" />

        {/* Antenna Settings */}
        <View style={styles.settingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="settings-input-antenna" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>{t('settings.antennaMode')}</Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                {t('settings.selectAntenna')}
              </Text>
            </View>
          </View>
          {isChangingAntenna ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <TouchableOpacity
              style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowAntennaDropdown(!showAntennaDropdown)}
            >
              <MaterialIcons
                name={ANTENNA_MODES.find(m => m.value === antennaMode)?.icon || 'settings-input-antenna'}
                size={18}
                color={colors.primary}
              />
              <Text style={[typography.body, { color: colors.text, marginLeft: 6 }]}>
                {getAntennaModeLabel()}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {showAntennaDropdown && (
          <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {ANTENNA_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.value}
                style={[styles.dropdownItem, {
                  backgroundColor: antennaMode === mode.value ? colors.primary + '20' : 'transparent'
                }]}
                onPress={() => handleAntennaChange(mode.value as 'auto' | 'internal' | 'external')}
              >
                <MaterialIcons
                  name={mode.icon}
                  size={20}
                  color={antennaMode === mode.value ? colors.primary : colors.text}
                />
                <Text style={[typography.body, {
                  color: antennaMode === mode.value ? colors.primary : colors.text,
                  marginLeft: 10
                }]}>
                  {t(mode.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Active Antenna Status */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: spacing.sm,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          backgroundColor: antennaMode === 'internal' ? colors.success + '15' :
            antennaMode === 'external' ? colors.warning + '15' : colors.primary + '15',
          borderRadius: 8,
        }}>
          <MaterialIcons
            name={antennaMode === 'internal' ? 'router' : antennaMode === 'external' ? 'settings-input-antenna' : 'tune'}
            size={16}
            color={antennaMode === 'internal' ? colors.success :
              antennaMode === 'external' ? colors.warning : colors.primary}
          />
          <Text style={[typography.caption1, {
            color: colors.textSecondary,
            marginLeft: 6
          }]}>
            {t('settings.activeAntenna')}: {' '}
            <Text style={{
              fontWeight: '600',
              color: antennaMode === 'internal' ? colors.success :
                antennaMode === 'external' ? colors.warning : colors.primary
            }}>
              {getAntennaModeLabel()}
            </Text>
          </Text>
        </View>

        {/* Separator */}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

        {/* Time Settings Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <MaterialIcons name="schedule" size={18} color={colors.primary} />
          <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: 8 }]}>
            {t('timeSettings.title')}
          </Text>
        </View>

        {/* Current Time */}
        <View style={styles.settingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="access-time-filled" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[typography.body, { color: colors.text }]}>{t('timeSettings.currentTime')}</Text>
          </View>
          <Text style={[typography.caption1, { color: colors.primary, fontFamily: 'monospace' }]}>
            {currentTime ? new Date(currentTime).toLocaleString() : '--:--:--'}
          </Text>
        </View>

        {/* SNTP Switch */}
        <View style={styles.settingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="cloud-sync" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>{t('timeSettings.sntp')}</Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                {t('timeSettings.sntpHint')}
              </Text>
            </View>
          </View>
          {isTogglingSntp ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={sntpEnabled}
              onValueChange={handleToggleSntp}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={sntpEnabled ? colors.primary : colors.textSecondary}
            />
          )}
        </View>

        {/* NTP Settings - only show when SNTP is enabled */}
        {sntpEnabled && (
          <>
            {/* NTP Server */}
            <View style={[styles.settingRow, { marginTop: spacing.sm }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="dns" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[typography.body, { color: colors.text }]}>{t('timeSettings.ntpServer')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowNtpDropdown(!showNtpDropdown)}
              >
                <Text style={[typography.body, { color: colors.text }]}>{ntpServer}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {showNtpDropdown && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {NTP_SERVERS.map((server) => (
                  <TouchableOpacity
                    key={server}
                    style={[styles.dropdownItem, {
                      backgroundColor: ntpServer === server ? colors.primary + '20' : 'transparent'
                    }]}
                    onPress={() => handleNtpServerChange(server)}
                  >
                    <Text style={[typography.body, {
                      color: ntpServer === server ? colors.primary : colors.text
                    }]}>
                      {server}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* NTP Server Backup */}
            <View style={[styles.settingRow, { marginTop: spacing.sm }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="backup" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[typography.body, { color: colors.text }]}>{t('timeSettings.ntpServerBackup')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowNtpBackupDropdown(!showNtpBackupDropdown)}
              >
                <Text style={[typography.body, { color: colors.text }]}>{ntpServerBackup}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {showNtpBackupDropdown && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {NTP_SERVERS.map((server) => (
                  <TouchableOpacity
                    key={server}
                    style={[styles.dropdownItem, {
                      backgroundColor: ntpServerBackup === server ? colors.primary + '20' : 'transparent'
                    }]}
                    onPress={() => handleNtpBackupChange(server)}
                  >
                    <Text style={[typography.body, {
                      color: ntpServerBackup === server ? colors.primary : colors.text
                    }]}>
                      {server}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Timezone */}
            <View style={[styles.settingRow, { marginTop: spacing.sm }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="public" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[typography.body, { color: colors.text }]}>{t('timeSettings.timeZone')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
              >
                <Text style={[typography.body, { color: colors.text }]}>{timezone}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {showTimezoneDropdown && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: 200 }]}>
                <ScrollView nestedScrollEnabled>
                  {TIMEZONES.map((tz) => (
                    <TouchableOpacity
                      key={tz}
                      style={[styles.dropdownItem, {
                        backgroundColor: timezone === tz ? colors.primary + '20' : 'transparent'
                      }]}
                      onPress={() => handleTimezoneChange(tz)}
                    >
                      <Text style={[typography.body, {
                        color: timezone === tz ? colors.primary : colors.text
                      }]}>
                        {tz}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </Card>

      {/* Network Settings Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <CardHeader title={t('networkSettings.title')} icon="cell-tower" />

        {/* Mobile Network Section - Collapsible */}
        <TouchableOpacity
          style={styles.collapseHeader}
          onPress={() => setIsMobileNetworkExpanded(!isMobileNetworkExpanded)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="smartphone" size={18} color={colors.primary} />
            <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: 8 }]}>
              {t('networkSettings.mobileNetwork')}
            </Text>
          </View>
          <MaterialIcons
            name={isMobileNetworkExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {isMobileNetworkExpanded && (
          <View style={{ paddingTop: spacing.sm }}>

            {/* Mobile Data Switch */}
            <View style={styles.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="mobiledata-off" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text }]}>{t('networkSettings.mobileData')}</Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {t('networkSettings.mobileDataHint')}
                  </Text>
                </View>
              </View>
              {isTogglingMobileData ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  value={mobileDataEnabled}
                  onValueChange={handleToggleMobileData}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={mobileDataEnabled ? colors.primary : colors.textSecondary}
                />
              )}
            </View>

            {/* Data Roaming Switch */}
            <View style={styles.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="r-mobiledata" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text }]}>{t('networkSettings.dataRoaming')}</Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {t('networkSettings.dataRoamingHint')}
                  </Text>
                </View>
              </View>
              {isTogglingRoaming ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  value={dataRoamingEnabled}
                  onValueChange={handleToggleDataRoaming}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={dataRoamingEnabled ? colors.primary : colors.textSecondary}
                />
              )}
            </View>

            {/* Auto Select Network Switch */}
            <View style={styles.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="autorenew" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text }]}>{t('networkSettings.autoSelectNetwork')}</Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {t('networkSettings.autoSelectNetworkHint')}
                  </Text>
                </View>
              </View>
              {isTogglingAutoNetwork ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  value={autoNetworkEnabled}
                  onValueChange={handleToggleAutoNetwork}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={autoNetworkEnabled ? colors.primary : colors.textSecondary}
                />
              )}
            </View>

            {/* Network Mode Settings */}
            <View style={[styles.settingRow, { marginTop: spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="signal-cellular-alt" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text }]}>{t('settings.networkType')}</Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {t('settings.selectNetwork')}
                  </Text>
                </View>
              </View>
              {isChangingNetwork ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <TouchableOpacity
                  style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowNetworkDropdown(!showNetworkDropdown)}
                >
                  <MaterialIcons name="signal-cellular-alt" size={18} color={colors.primary} />
                  <Text style={[typography.body, { color: colors.text, marginLeft: 6 }]}>
                    {(() => { const mode = NETWORK_MODES.find(m => m.value === networkMode); return mode ? t(mode.labelKey) : t('settings.networkAuto'); })()}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {showNetworkDropdown && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {NETWORK_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    style={[styles.dropdownItem, {
                      backgroundColor: networkMode === mode.value ? colors.primary + '20' : 'transparent'
                    }]}
                    onPress={() => handleNetworkModeChange(mode.value)}
                  >
                    <MaterialIcons
                      name="signal-cellular-alt"
                      size={20}
                      color={networkMode === mode.value ? colors.primary : colors.text}
                    />
                    <Text style={[typography.body, {
                      color: networkMode === mode.value ? colors.primary : colors.text,
                      marginLeft: 10
                    }]}>
                      {t(mode.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Monthly Quota Settings */}
            <View style={[styles.settingRow, { marginTop: spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="data-usage" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text }]}>{t('networkSettings.monthlyQuota')}</Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {monthlySettings.enabled
                      ? `${monthlySettings.dataLimit} ${monthlySettings.dataLimitUnit}`
                      : t('networkSettings.notSet')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowMonthlySettingsModal(true)}
              >
                <MaterialIcons name="speed" size={18} color={colors.primary} />
                <Text style={[typography.body, { color: colors.text, marginLeft: 6 }]}>
                  {t('networkSettings.configure')}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* APN Profile Section */}
        <View style={{ marginTop: spacing.md }}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setIsApnExpanded(!isApnExpanded)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="sim-card" size={20} color={colors.primary} />
              <Text style={[typography.body, { color: colors.text, marginLeft: 8, fontWeight: '600' }]}>
                {t('networkSettings.apnProfiles')}
              </Text>
              <Text style={[typography.caption1, { color: colors.textSecondary, marginLeft: 8 }]}>
                ({apnProfiles.length})
              </Text>
            </View>
            <MaterialIcons
              name={isApnExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {isApnExpanded && (
            <View style={{ paddingVertical: spacing.sm }}>
              {apnProfiles.length === 0 ? (
                <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md }]}>
                  {t('networkSettings.noProfiles')}
                </Text>
              ) : (
                apnProfiles.map((profile, index) => (
                  <TouchableOpacity
                    key={profile.id}
                    onPress={() => openEditApnModal(profile)}
                    style={[
                      styles.profileItem,
                      {
                        backgroundColor: profile.isDefault ? colors.primary + '15' : colors.card,
                        borderColor: profile.isDefault ? colors.primary : colors.border,
                        marginBottom: index < apnProfiles.length - 1 ? 8 : 0,
                      }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                          {profile.name}
                        </Text>
                        {profile.isDefault && (
                          <View style={{ backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                            <Text style={[typography.caption2, { color: '#fff' }]}>{t('networkSettings.default')}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                        APN: {profile.apn}
                      </Text>
                      <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                        {profile.authType.toUpperCase()} • {profile.ipType.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {profile.isDefault ? (
                        <MaterialIcons name="star" size={20} color={colors.warning} />
                      ) : (
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); handleSetDefaultApn(profile.id); }}
                          style={{ padding: 4 }}
                        >
                          <MaterialIcons name="star-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); handleDeleteApnProfile(profile.id, profile.name); }}
                        style={{ padding: 4 }}
                      >
                        <MaterialIcons name="delete" size={20} color={colors.error} />
                      </TouchableOpacity>
                      <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                ))
              )}

              <Button
                title={t('networkSettings.addProfile')}
                onPress={openAddApnModal}
                style={{ marginTop: spacing.md }}
              />
            </View>
          )}
        </View>

        {/* LTE Band Selection */}
        <View style={[styles.settingRow, { marginTop: spacing.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="settings-input-antenna" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>{t('settings.lteBands')}</Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                {selectedBands.length === LTE_BANDS.length ? t('settings.allBands') : `${selectedBands.length} ${t('settings.bandsSelected')}`}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowBandModal(true)}
          >
            <MaterialIcons name="tune" size={18} color={colors.primary} />
            <Text style={[typography.body, { color: colors.text, marginLeft: 6 }]}>
              {t('settings.configureBands')}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Separator */}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

        {/* Ethernet Section - Collapsible */}
        <TouchableOpacity
          style={styles.collapseHeader}
          onPress={() => setIsEthernetExpanded(!isEthernetExpanded)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="cable" size={18} color={colors.primary} />
            <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: 8 }]}>
              {t('networkSettings.ethernet')}
            </Text>
          </View>
          <MaterialIcons
            name={isEthernetExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {isEthernetExpanded && (
          <View style={{ paddingTop: spacing.sm }}>
            {/* Connection Mode */}
            <View style={styles.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="settings-ethernet" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text }]}>{t('networkSettings.connectionMode')}</Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {t('networkSettings.connectionModeHint')}
                  </Text>
                </View>
              </View>
              {isChangingEthernet ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <TouchableOpacity
                  style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowEthernetDropdown(!showEthernetDropdown)}
                >
                  <MaterialIcons name="settings-ethernet" size={18} color={colors.primary} />
                  <Text style={[typography.body, { color: colors.text, marginLeft: 6 }]}>
                    {(() => { const mode = ETHERNET_MODES.find(m => m.value === ethernetMode); return mode ? t(mode.labelKey) : t('networkSettings.modeAuto'); })()}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {showEthernetDropdown && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {ETHERNET_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    style={[styles.dropdownItem, {
                      backgroundColor: ethernetMode === mode.value ? colors.primary + '20' : 'transparent'
                    }]}
                    onPress={() => handleEthernetModeChange(mode.value as typeof ethernetMode)}
                  >
                    <MaterialIcons
                      name="settings-ethernet"
                      size={20}
                      color={ethernetMode === mode.value ? colors.primary : colors.text}
                    />
                    <Text style={[typography.body, {
                      color: ethernetMode === mode.value ? colors.primary : colors.text,
                      marginLeft: 10
                    }]}>
                      {t(mode.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Ethernet Status */}
            <View style={[styles.settingRow, { marginTop: spacing.md }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text }]}>{t('networkSettings.ethernetStatus')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: ethernetStatus.connected ? colors.success : colors.error,
                }} />
                <Text style={[typography.body, { color: ethernetStatus.connected ? colors.success : colors.error }]}>
                  {ethernetStatus.connected ? t('networkSettings.connected') : t('networkSettings.disconnected')}
                </Text>
              </View>
            </View>

            {ethernetStatus.connected && (
              <View style={{ marginTop: spacing.sm, paddingLeft: spacing.md }}>
                {ethernetStatus.ipAddress && (
                  <InfoRow label={t('networkSettings.ipAddress')} value={ethernetStatus.ipAddress} />
                )}
                {ethernetStatus.gateway && (
                  <InfoRow label={t('networkSettings.gateway')} value={ethernetStatus.gateway} />
                )}
                {ethernetStatus.netmask && (
                  <InfoRow label={t('networkSettings.netmask')} value={ethernetStatus.netmask} />
                )}
                {ethernetStatus.dns1 && (
                  <InfoRow label={t('networkSettings.dns')} value={`${ethernetStatus.dns1}${ethernetStatus.dns2 ? ', ' + ethernetStatus.dns2 : ''}`} />
                )}
                {ethernetStatus.macAddress && (
                  <InfoRow label={t('networkSettings.macAddress')} value={ethernetStatus.macAddress} />
                )}
              </View>
            )}
          </View>
        )}

        {/* DHCP Settings Section - Collapsible */}
        <TouchableOpacity
          style={styles.collapseHeader}
          onPress={() => setIsDhcpExpanded(!isDhcpExpanded)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="router" size={18} color={colors.primary} />
            <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: 8 }]}>
              {t('networkSettings.dhcpSettings')}
            </Text>
          </View>
          <MaterialIcons
            name={isDhcpExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {isDhcpExpanded && (
          <View style={{ paddingTop: spacing.sm }}>
            {/* LAN IP Address - 4 Octet Inputs */}
            <View style={styles.settingRow}>
              <Text style={[typography.body, { color: colors.text }]}>{t('networkSettings.lanIpAddress')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {dhcpSettings.dhcpIPAddress.split('.').map((octet, index) => (
                  <React.Fragment key={index}>
                    <TextInput
                      style={[styles.octetInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={octet}
                      onChangeText={(text) => {
                        const octets = dhcpSettings.dhcpIPAddress.split('.');
                        octets[index] = text.replace(/[^0-9]/g, '').slice(0, 3);
                        setDhcpSettings(prev => ({ ...prev, dhcpIPAddress: octets.join('.') }));
                      }}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                    {index < 3 && <Text style={[typography.body, { color: colors.textSecondary, marginHorizontal: 4 }]}>.</Text>}
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* DHCP Server Toggle */}
            <View style={[styles.settingRow, { marginTop: spacing.md }]}>
              <Text style={[typography.body, { color: colors.text }]}>{t('networkSettings.dhcpServer')}</Text>
              {isTogglingDhcp ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  value={dhcpSettings.dhcpStatus}
                  onValueChange={handleDHCPToggle}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={dhcpSettings.dhcpStatus ? colors.primary : colors.textSecondary}
                />
              )}
            </View>

            {/* Show IP Range and Lease Time only when DHCP is ON */}
            {dhcpSettings.dhcpStatus && (
              <>
                {/* DHCP IP Range - Shows prefix + editable last octet */}
                <View style={[styles.settingRow, { marginTop: spacing.md }]}>
                  <Text style={[typography.body, { color: colors.text }]}>{t('networkSettings.dhcpIpRange')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Show base prefix from LAN IP */}
                    <Text style={[typography.body, { color: colors.textSecondary }]}>
                      {dhcpSettings.dhcpIPAddress.split('.').slice(0, 3).join('.')}.
                    </Text>
                    <TextInput
                      style={[styles.octetInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={dhcpSettings.dhcpStartIPAddress.split('.').pop() || '100'}
                      onChangeText={(text) => {
                        const base = dhcpSettings.dhcpIPAddress.split('.').slice(0, 3).join('.');
                        const num = text.replace(/[^0-9]/g, '').slice(0, 3);
                        setDhcpSettings(prev => ({ ...prev, dhcpStartIPAddress: `${base}.${num}` }));
                      }}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                    <Text style={[typography.body, { color: colors.textSecondary, marginHorizontal: 8 }]}>-</Text>
                    <TextInput
                      style={[styles.octetInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={dhcpSettings.dhcpEndIPAddress.split('.').pop() || '200'}
                      onChangeText={(text) => {
                        const base = dhcpSettings.dhcpIPAddress.split('.').slice(0, 3).join('.');
                        const num = text.replace(/[^0-9]/g, '').slice(0, 3);
                        setDhcpSettings(prev => ({ ...prev, dhcpEndIPAddress: `${base}.${num}` }));
                      }}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                </View>

                {/* DHCP Lease Time Dropdown */}
                <View style={[styles.settingRow, { marginTop: spacing.md }]}>
                  <Text style={[typography.body, { color: colors.text }]}>{t('networkSettings.dhcpLeaseTime')}</Text>
                  <TouchableOpacity
                    style={[styles.leaseDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowLeaseTimeDropdown(!showLeaseTimeDropdown)}
                    disabled={isSavingDhcp}
                  >
                    <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                      {getLeaseTimeLabel(dhcpSettings.dhcpLeaseTime)}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {showLeaseTimeDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {[
                      { value: 3600, labelKey: 'networkSettings.leaseTime1Hour' },
                      { value: 43200, labelKey: 'networkSettings.leaseTime12Hours' },
                      { value: 86400, labelKey: 'networkSettings.leaseTime1Day' },
                      { value: 604800, labelKey: 'networkSettings.leaseTime1Week' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.dropdownItem, {
                          backgroundColor: dhcpSettings.dhcpLeaseTime === option.value ? colors.primary + '20' : 'transparent'
                        }]}
                        onPress={() => handleDHCPLeaseTimeChange(option.value)}
                      >
                        <Text style={[typography.body, {
                          color: dhcpSettings.dhcpLeaseTime === option.value ? colors.primary : colors.text,
                        }]}>
                          {t(option.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.primary, marginTop: spacing.lg }]}
                  onPress={handleSaveDHCPSettings}
                  disabled={isSavingDhcp}
                >
                  {isSavingDhcp ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                      {t('common.save')}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </Card>

      {/* App Settings Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <CardHeader title={t('settings.appSettings')} icon="tune" />

        <View style={styles.settingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="palette" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>
                {t('settings.theme')}
              </Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                {themeMode === 'system' ? t('settings.themeSystem') : themeMode === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
              </Text>
            </View>
          </View>
          <View style={styles.themeButtons}>
            <TouchableOpacity
              onPress={() => setThemeMode('light')}
              style={[
                styles.themeIconButton,
                {
                  backgroundColor: themeMode === 'light' ? colors.primary : colors.card,
                  borderColor: colors.border
                }
              ]}
            >
              <MaterialIcons
                name="light-mode"
                size={20}
                color={themeMode === 'light' ? '#FFFFFF' : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setThemeMode('dark')}
              style={[
                styles.themeIconButton,
                {
                  backgroundColor: themeMode === 'dark' ? colors.primary : colors.card,
                  borderColor: colors.border
                }
              ]}
            >
              <MaterialIcons
                name="dark-mode"
                size={20}
                color={themeMode === 'dark' ? '#FFFFFF' : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setThemeMode('system')}
              style={[
                styles.themeIconButton,
                {
                  backgroundColor: themeMode === 'system' ? colors.primary : colors.card,
                  borderColor: colors.border
                }
              ]}
            >
              <MaterialIcons
                name="brightness-auto"
                size={20}
                color={themeMode === 'system' ? '#FFFFFF' : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Setting */}
        <View style={[styles.settingRow, { marginTop: spacing.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="translate" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>
                {t('settings.language')}
              </Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                {language === 'id' ? t('settings.languageId') : t('settings.languageEn')}
              </Text>
            </View>
          </View>
          <View style={styles.themeButtons}>
            <TouchableOpacity
              onPress={() => setLanguage('en')}
              style={[
                styles.langButton,
                {
                  backgroundColor: language === 'en' ? colors.primary : colors.card,
                  borderColor: colors.border
                }
              ]}
            >
              <Text style={[
                typography.caption1,
                {
                  color: language === 'en' ? '#FFFFFF' : colors.textSecondary,
                  fontWeight: '600'
                }
              ]}>
                EN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLanguage('id')}
              style={[
                styles.langButton,
                {
                  backgroundColor: language === 'id' ? colors.primary : colors.card,
                  borderColor: colors.border
                }
              ]}
            >
              <Text style={[
                typography.caption1,
                {
                  color: language === 'id' ? '#FFFFFF' : colors.textSecondary,
                  fontWeight: '600'
                }
              ]}>
                ID
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      {/* Modem Control*/}
      <Card style={{ marginBottom: spacing.md }}>
        <CardHeader title={t('settings.modemControl')} icon="admin-panel-settings" />

        <InfoRow label={t('settings.modemIp')} value={credentials?.modemIp || t('common.unknown')} icon={<MaterialIcons name="router" size={18} color={colors.textSecondary} />} />

        {/* Collapsible Edit Credentials Section */}
        <TouchableOpacity
          style={[styles.collapseHeader, { marginTop: spacing.sm }]}
          onPress={() => setIsModemSettingsExpanded(!isModemSettingsExpanded)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="edit" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                {t('settings.editCredentials')}
              </Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                {t('settings.credentialsHint')}
              </Text>
            </View>
          </View>
          <MaterialIcons
            name={isModemSettingsExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {isModemSettingsExpanded && (
          <View style={{ marginTop: spacing.md }}>
            {/* Modem IP Input */}
            <View style={styles.formGroup}>
              <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
                {t('settings.modemIpLabel')}
              </Text>
              <View style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialIcons name="router" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[typography.body, { color: colors.text, flex: 1, marginLeft: 8, padding: 0 }]}
                  value={modemIp}
                  onChangeText={setModemIp}
                  placeholder="192.168.8.1"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Username Input */}
            <View style={styles.formGroup}>
              <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
                {t('settings.usernameLabel')}
              </Text>
              <View style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialIcons name="person" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[typography.body, { color: colors.text, flex: 1, marginLeft: 8, padding: 0 }]}
                  value={modemUsername}
                  onChangeText={setModemUsername}
                  placeholder="admin"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.formGroup}>
              <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
                {t('settings.passwordLabel')}
              </Text>
              <View style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialIcons name="lock" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[typography.body, { color: colors.text, flex: 1, marginLeft: 8, padding: 0 }]}
                  value={modemPassword}
                  onChangeText={setModemPassword}
                  placeholder={t('settings.enterPassword')}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Save Button */}
            <Button
              title={t('settings.saveCredentials')}
              onPress={handleSaveModemSettings}
              variant="primary"
              loading={isSavingModem}
              disabled={!hasCredentialsChanges || isSavingModem}
            />
          </View>
        )}

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

        <View style={{ gap: spacing.sm }}>
          <Button
            title={t('settings.rebootModem')}
            onPress={handleReboot}
            variant="danger"
            loading={isLoading}
            disabled={isLoading}
          />
          <Button
            title={t('settings.logout')}
            onPress={handleLogout}
            variant="secondary"
          />
        </View>
      </Card>

      {/* About Card */}
      <Card>
        <CardHeader title={t('settings.about')} icon="info" />

        <InfoRow label={t('settings.appVersion')} value={Constants.expoConfig?.version || '1.0.0'} icon={<MaterialIcons name="apps" size={18} color={colors.textSecondary} />} />

        {/* Check for Updates */}
        <View style={[styles.settingRow, { marginTop: spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="update" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
              {t('settings.checkUpdate')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: colors.primary }]}
            onPress={handleCheckUpdate}
            disabled={isCheckingUpdate}
          >
            {isCheckingUpdate ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
                <Text style={[typography.caption1, { color: '#FFFFFF', marginLeft: 4 }]}>
                  {t('settings.checkNow')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Update Result */}
        {updateResult && (
          <View style={[styles.updateResult, {
            backgroundColor: updateResult.hasUpdate ? colors.warning + '20' : colors.success + '20',
            borderColor: updateResult.hasUpdate ? colors.warning : colors.success,
          }]}>
            {updateResult.hasUpdate ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                  <MaterialIcons name="new-releases" size={20} color={colors.warning} />
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: spacing.xs }]}>
                    {t('settings.updateAvailable')} v{updateResult.latestVersion}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => Linking.openURL(updateResult.downloadUrl)}
                >
                  <Text style={[typography.body, { color: colors.primary }]}>
                    {t('settings.downloadUpdate')}
                  </Text>
                  <MaterialIcons name="open-in-new" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="check-circle" size={20} color={colors.success} />
                <Text style={[typography.body, { color: colors.text, marginLeft: spacing.xs }]}>
                  {t('settings.appUpToDate')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Developer with GitHub link */}
        <View style={[styles.settingRow, { marginBottom: spacing.sm, marginTop: spacing.md }]}>
          <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
            {t('settings.developer')}
          </Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={handleOpenGitHub}
          >
            <Text style={[typography.body, { color: colors.primary, fontWeight: '600', marginRight: 4 }]}>
              Anggun Caksono
            </Text>
            <MaterialIcons name="open-in-new" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Bug Report Button */}
        <TouchableOpacity
          style={[styles.settingRow, { marginTop: spacing.sm }]}
          onPress={() => Linking.openURL('https://github.com/alrescha79-cmd/huawei-manager-mobile/issues/new?template=bug_report.md')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name="bug-report" size={18} color={colors.error} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>
                {t('settings.bugReport')}
              </Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                {t('settings.bugReportHint')}
              </Text>
            </View>
          </View>
          <MaterialIcons name="open-in-new" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
          © 2025 Anggun Caksono
        </Text>
      </Card>

      {/* APN Profile Modal */}
      <Modal
        visible={showApnModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowApnModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, {
            borderBottomColor: colors.border,
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16
          }]}>
            <TouchableOpacity onPress={() => setShowApnModal(false)}>
              <Text style={[typography.body, { color: colors.primary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
              {editingApn ? t('networkSettings.editProfile') : t('networkSettings.addProfile')}
            </Text>
            <TouchableOpacity onPress={handleSaveApnProfile} disabled={isSavingApn}>
              {isSavingApn ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Profile Name */}
            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
              {t('networkSettings.profileName')}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginBottom: spacing.md }]}
              value={apnName}
              onChangeText={setApnName}
              placeholder={t('networkSettings.profileName')}
              placeholderTextColor={colors.textSecondary}
            />

            {/* APN */}
            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
              APN
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginBottom: spacing.md }]}
              value={apnApn}
              onChangeText={setApnApn}
              placeholder="internet"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />

            {/* Username */}
            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
              {t('networkSettings.apnUsername')}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginBottom: spacing.md }]}
              value={apnUsername}
              onChangeText={setApnUsername}
              placeholder={t('networkSettings.apnUsername')}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />

            {/* Password */}
            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
              {t('networkSettings.apnPassword')}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginBottom: spacing.md }]}
              value={apnPassword}
              onChangeText={setApnPassword}
              placeholder={t('networkSettings.apnPassword')}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />

            {/* Auth Type */}
            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
              {t('networkSettings.authType')}
            </Text>
            <TouchableOpacity
              style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: showApnAuthDropdown ? 0 : spacing.md }]}
              onPress={() => { setShowApnAuthDropdown(!showApnAuthDropdown); setShowApnIpDropdown(false); }}
            >
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                {apnAuthType.toUpperCase()}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {showApnAuthDropdown && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: spacing.md }]}>
                {(['none', 'pap', 'chap', 'pap_chap'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.dropdownItem, {
                      backgroundColor: apnAuthType === type ? colors.primary + '20' : 'transparent'
                    }]}
                    onPress={() => { setApnAuthType(type); setShowApnAuthDropdown(false); }}
                  >
                    <Text style={[typography.body, {
                      color: apnAuthType === type ? colors.primary : colors.text
                    }]}>
                      {type.toUpperCase().replace('_', '/')}
                    </Text>
                    {apnAuthType === type && (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* IP Type */}
            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
              {t('networkSettings.ipType')}
            </Text>
            <TouchableOpacity
              style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: showApnIpDropdown ? 0 : spacing.md }]}
              onPress={() => { setShowApnIpDropdown(!showApnIpDropdown); setShowApnAuthDropdown(false); }}
            >
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                {apnIpType.toUpperCase()}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {showApnIpDropdown && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: spacing.md }]}>
                {(['ipv4', 'ipv6', 'ipv4v6'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.dropdownItem, {
                      backgroundColor: apnIpType === type ? colors.primary + '20' : 'transparent'
                    }]}
                    onPress={() => { setApnIpType(type); setShowApnIpDropdown(false); }}
                  >
                    <Text style={[typography.body, {
                      color: apnIpType === type ? colors.primary : colors.text
                    }]}>
                      {type.toUpperCase()}
                    </Text>
                    {apnIpType === type && (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Set as Default */}
            <View style={[styles.settingRow, { marginTop: spacing.sm }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text }]}>
                  {t('networkSettings.setAsDefault')}
                </Text>
                <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                  {t('networkSettings.setAsDefaultHint')}
                </Text>
              </View>
              <Switch
                value={apnIsDefault}
                onValueChange={setApnIsDefault}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={apnIsDefault ? colors.primary : colors.textSecondary}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Band Selection Modal */}
      <BandSelectionModal
        visible={showBandModal}
        onClose={() => setShowBandModal(false)}
        modemService={modemService}
      />

      {/* Monthly Quota Settings Modal */}
      <MonthlySettingsModal
        visible={showMonthlySettingsModal}
        onClose={() => setShowMonthlySettingsModal(false)}
        onSave={async (settings) => {
          if (!modemService) return;
          try {
            await modemService.setMonthlyDataSettings(settings);
            setMonthlySettings(settings);
            setShowMonthlySettingsModal(false);
            ThemedAlertHelper.alert(t('common.success'), t('home.monthlySettingsSaved'));
          } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('home.failedSaveMonthlySettings'));
            throw error;
          }
        }}
        initialSettings={monthlySettings}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeIconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  bandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  collapseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  formGroup: {
    marginBottom: 12,
  },
  textInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  updateResult: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  ipInput: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    minWidth: 120,
    textAlign: 'right',
  },
  octetInput: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 14,
    width: 50,
    textAlign: 'center',
  },
  leaseDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 140,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
});
