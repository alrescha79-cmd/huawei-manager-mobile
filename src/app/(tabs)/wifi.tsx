import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Switch,
  StatusBar,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader, InfoRow, Button, ThemedAlertHelper } from '@/components';
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

  // Guest WiFi state
  const [guestWifiEnabled, setGuestWifiEnabled] = useState(false);
  const [isTogglingGuest, setIsTogglingGuest] = useState(false);

  // Collapse state for edit form
  const [isEditExpanded, setIsEditExpanded] = useState(false);

  // Initialize form when settings load
  useEffect(() => {
    if (wifiSettings) {
      setFormSsid(wifiSettings.ssid || '');
      setFormPassword(wifiSettings.password || '');
      setFormSecurityMode(wifiSettings.securityMode || 'WPA2PSK');
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

      const [devices, settings, guestSettings] = await Promise.all([
        service.getConnectedDevices(),
        service.getWiFiSettings(),
        service.getGuestWiFiSettings(),
      ]);

      setConnectedDevices(devices);
      setWiFiSettings(settings);
      setGuestWifiEnabled(guestSettings.enabled);

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
      loadData(wifiService);
    }
  };

  const handleToggleWiFi = async (enabled: boolean) => {
    if (!wifiService) return;

    try {
      await wifiService.toggleWiFi(enabled);
      ThemedAlertHelper.alert(t('common.success'), enabled ? t('wifi.wifiEnabled') : t('wifi.wifiDisabled'));
      handleRefresh();
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedToggleWifi'));
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

  const handleSaveSettings = async () => {
    if (!wifiService || !hasChanges || isSaving) return;

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
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedSaveWifi'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleKickDevice = async (macAddress: string, hostName: string) => {
    if (!wifiService) return;

    ThemedAlertHelper.alert(
      t('wifi.kickDevice'),
      `${t('wifi.kickConfirm')} ${hostName || macAddress}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.kick'),
          style: 'destructive',
          onPress: async () => {
            try {
              await wifiService.kickDevice(macAddress);
              ThemedAlertHelper.alert(t('common.success'), t('wifi.deviceDisconnected'));
              handleRefresh();
            } catch (error) {
              ThemedAlertHelper.alert(t('common.error'), t('alerts.failedKickDevice'));
            }
          },
        },
      ]
    );
  };

  const getSecurityModeLabel = (value: string) => {
    const mode = SECURITY_MODES.find(m => m.value === value);
    return mode ? t(mode.labelKey) : value;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: 8 }]}
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
            <Switch
              value={wifiSettings.wifiEnable}
              onValueChange={handleToggleWiFi}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={wifiSettings.wifiEnable ? colors.primary : colors.textSecondary}
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
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Switch
                value={guestWifiEnabled}
                onValueChange={handleToggleGuestWiFi}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={guestWifiEnabled ? colors.primary : colors.textSecondary}
              />
            )}
          </View>

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

              {/* Security Mode Dropdown */}
              <View style={styles.formGroup}>
                <Text style={[typography.subheadline, { color: colors.textSecondary, marginBottom: 6 }]}>
                  {t('wifi.securityMode')}
                </Text>
                <TouchableOpacity
                  style={[styles.dropdown, {
                    backgroundColor: colors.card,
                    borderColor: colors.border
                  }]}
                  onPress={() => setShowSecurityDropdown(!showSecurityDropdown)}
                >
                  <Text style={[typography.body, { color: colors.text }]}>
                    {getSecurityModeLabel(formSecurityMode)}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>▼</Text>
                </TouchableOpacity>

                {showSecurityDropdown && (
                  <View style={[styles.dropdownMenu, {
                    backgroundColor: colors.card,
                    borderColor: colors.border
                  }]}>
                    {SECURITY_MODES.map((mode) => (
                      <TouchableOpacity
                        key={mode.value}
                        style={[styles.dropdownItem, {
                          backgroundColor: formSecurityMode === mode.value ? colors.primary + '20' : 'transparent'
                        }]}
                        onPress={() => {
                          setFormSecurityMode(mode.value);
                          setShowSecurityDropdown(false);
                        }}
                      >
                        <Text style={[typography.body, {
                          color: formSecurityMode === mode.value ? colors.primary : colors.text
                        }]}>
                          {t(mode.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Password Input */}
              {formSecurityMode !== 'OPEN' && (
                <View style={styles.formGroup}>
                  <Text style={[typography.subheadline, { color: colors.textSecondary, marginBottom: 6 }]}>
                    {t('wifi.password')}
                  </Text>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text
                    }]}
                    value={formPassword}
                    onChangeText={setFormPassword}
                    placeholder={t('wifi.passwordPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                  />
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
                  <ActivityIndicator color="#FFFFFF" />
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
            <View
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
                title={t('common.kick')}
                variant="danger"
                onPress={() => handleKickDevice(device.macAddress, device.hostName)}
                style={styles.kickButton}
              />
            </View>
          ))
        )}
      </Card>
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
});
