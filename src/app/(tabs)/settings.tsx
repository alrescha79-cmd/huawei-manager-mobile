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
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';
import { Card, CardHeader, Button, InfoRow, ThemedAlertHelper } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { useThemeStore } from '@/stores/theme.store';
import { ModemService } from '@/services/modem.service';
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

// LTE Band definitions (common bands)
const LTE_BANDS = [
  { bit: 0, name: 'B1', freq: '2100 MHz' },
  { bit: 2, name: 'B3', freq: '1800 MHz' },
  { bit: 4, name: 'B5', freq: '850 MHz' },
  { bit: 6, name: 'B7', freq: '2600 MHz' },
  { bit: 7, name: 'B8', freq: '900 MHz' },
  { bit: 19, name: 'B20', freq: '800 MHz' },
  { bit: 27, name: 'B28', freq: '700 MHz' },
  { bit: 37, name: 'B38', freq: '2600 MHz TDD' },
  { bit: 39, name: 'B40', freq: '2300 MHz TDD' },
  { bit: 40, name: 'B41', freq: '2500 MHz TDD' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { credentials, logout, login } = useAuthStore();
  const { modemInfo, setModemInfo } = useModemStore();
  const { themeMode, setThemeMode, language, setLanguage } = useThemeStore();
  const { t } = useTranslation();

  const [modemService, setModemService] = useState<ModemService | null>(null);
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

  // Modem settings form state
  const [modemIp, setModemIp] = useState(credentials?.modemIp || '192.168.8.1');
  const [modemUsername, setModemUsername] = useState(credentials?.username || 'admin');
  const [modemPassword, setModemPassword] = useState(credentials?.password || '');
  const [isModemSettingsExpanded, setIsModemSettingsExpanded] = useState(false);
  const [isSavingModem, setIsSavingModem] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if credentials have changed
  const hasCredentialsChanges =
    modemIp !== (credentials?.modemIp || '192.168.8.1') ||
    modemUsername !== (credentials?.username || 'admin') ||
    modemPassword !== (credentials?.password || '');

  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new ModemService(credentials.modemIp);
      setModemService(service);
      loadModemInfo(service);
      loadAntennaMode(service);
      loadNetworkMode(service);
    }
  }, [credentials]);

  const loadModemInfo = async (service: ModemService) => {
    try {
      const info = await service.getModemInfo();
      setModemInfo(info);
    } catch (error) {
      console.error('Error loading modem info:', error);
    }
  };

  const loadAntennaMode = async (service: ModemService) => {
    try {
      const mode = await service.getAntennaMode();
      // Map API values to our values
      const modeMap: Record<string, string> = {
        '0': 'auto',
        '1': 'internal',
        '2': 'external',
      };
      setAntennaMode(modeMap[mode] || mode);
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
          <CardHeader title={t('settings.modemInfo')} />

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
        <CardHeader title={t('settings.systemSettings')} />

        {/* Antenna Settings */}
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>{t('settings.antennaMode')}</Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              {t('settings.selectAntenna')}
            </Text>
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

        {/* Network Mode Settings */}
        <View style={[styles.settingRow, { marginTop: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>{t('settings.networkType')}</Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              {t('settings.selectNetwork')}
            </Text>
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

        {/* LTE Band Selection */}
        <View style={[styles.settingRow, { marginTop: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>{t('settings.lteBands')}</Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              {selectedBands.length === LTE_BANDS.length ? t('settings.allBands') : `${selectedBands.length} ${t('settings.bandsSelected')}`}
            </Text>
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
      </Card>

      {/* App Settings Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <CardHeader title={t('settings.appSettings')} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>
              {t('settings.theme')}
            </Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              {themeMode === 'system' ? t('settings.themeSystem') : themeMode === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
            </Text>
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
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>
              {t('settings.language')}
            </Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              {language === 'id' ? t('settings.languageId') : t('settings.languageEn')}
            </Text>
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
        <CardHeader title={t('settings.modemControl')} />

        <InfoRow label={t('settings.modemIp')} value={credentials?.modemIp || t('common.unknown')} />

        {/* Collapsible Edit Credentials Section */}
        <TouchableOpacity
          style={[styles.collapseHeader, { marginTop: spacing.sm }]}
          onPress={() => setIsModemSettingsExpanded(!isModemSettingsExpanded)}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
              {t('settings.editCredentials')}
            </Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              {t('settings.credentialsHint')}
            </Text>
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
        <CardHeader title={t('settings.about')} />

        <InfoRow label={t('settings.appVersion')} value={Constants.expoConfig?.version || '1.0.0'} />

        {/* Developer with GitHub link */}
        <View style={[styles.settingRow, { marginBottom: spacing.sm }]}>
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

        <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
          © 2025 Anggun Caksono
        </Text>
      </Card>

      {/* Band Selection Modal */}
      <Modal
        visible={showBandModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBandModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowBandModal(false)}>
              <Text style={[typography.body, { color: colors.primary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[typography.headline, { color: colors.text }]}>{t('settings.lteBands')}</Text>
            <TouchableOpacity onPress={saveBandSettings} disabled={isSavingBands}>
              {isSavingBands ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.md, textAlign: 'center' }]}>
              {t('settings.selectBands')}
            </Text>

            {/* Select All / Deselect All */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md, gap: spacing.sm }}>
              <TouchableOpacity
                style={[styles.selectAllButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => setSelectedBands(LTE_BANDS.map(b => b.bit))}
              >
                <Text style={[typography.caption1, { color: colors.primary }]}>{t('settings.selectAll')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectAllButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setSelectedBands([])}
              >
                <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('settings.deselectAll')}</Text>
              </TouchableOpacity>
            </View>

            {/* Band List */}
            {LTE_BANDS.map((band) => (
              <TouchableOpacity
                key={band.bit}
                style={[styles.bandItem, {
                  backgroundColor: selectedBands.includes(band.bit) ? colors.primary + '15' : colors.card,
                  borderColor: selectedBands.includes(band.bit) ? colors.primary : colors.border
                }]}
                onPress={() => toggleBand(band.bit)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    {band.name}
                  </Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {band.freq}
                  </Text>
                </View>
                <MaterialIcons
                  name={selectedBands.includes(band.bit) ? 'check-circle' : 'radio-button-unchecked'}
                  size={24}
                  color={selectedBands.includes(band.bit) ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
});
