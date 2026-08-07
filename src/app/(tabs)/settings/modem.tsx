import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { ModemService } from '@/services/modem.service';
import { useTranslation } from '@/i18n';
import {
  ToastHelper,
  SelectionModal,
  MeshGradientBackground,
  BouncingDots,
  AnimatedScreen,
  AdNative,
} from '@/components';
import { SettingsSection, SettingsItem, PageHeader } from '@/components/settings';
import { showInterstitial } from '@/services/ad.service';

const ANTENNA_MODES = [
  { value: 'auto', labelKey: 'settings.antennaAuto', icon: 'settings-input-antenna' as const },
  { value: 'internal', labelKey: 'settings.antennaInternal', icon: 'wifi' as const },
  { value: 'external', labelKey: 'settings.antennaExternal', icon: 'router' as const },
];

export default function ModemSettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { credentials } = useAuthStore();
  const { modemInfo, setModemInfo } = useModemStore();

  const [modemService, setModemService] = useState<ModemService | null>(null);
  const [antennaMode, setAntennaMode] = useState('auto');
  const [showAntennaModal, setShowAntennaModal] = useState(false);
  const [isChangingAntenna, setIsChangingAntenna] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingFirmware, setIsCheckingFirmware] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new ModemService(credentials.modemIp);
      setModemService(service);
      loadModemInfo(service);
      loadAntennaMode(service);
    }
  }, [credentials]);

  const loadModemInfo = async (service: ModemService) => {
    try {
      setIsLoading(true);
      const info = await service.getModemInfo();
      setModemInfo(info);
    } catch (error) {
      console.error('Error loading modem info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAntennaMode = async (service: ModemService) => {
    try {
      const mode = await service.getAntennaMode();
      if (mode === 'auto' || mode === 'internal' || mode === 'external') {
        setAntennaMode(mode);
      } else {
        setAntennaMode('auto');
      }
    } catch (error) {
      console.error('Error loading antenna mode:', error);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(' ');
  };

  const maskSensitive = (value?: string): string => {
    if (!value) return '-';
    if (value.length <= 6) return value;
    return value.slice(0, 3) + '******' + value.slice(-2);
  };

  const displaySensitive = (key: string, value?: string): string => {
    return revealed[key] ? value || '-' : maskSensitive(value);
  };

  const toggleReveal = (key: string) => {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSensitiveItem = (key: string, title: string, value?: string) => (
    <SettingsItem
      title={title}
      value={displaySensitive(key, value)}
      showChevron={false}
      rightElement={
        value ? (
          <View style={styles.sensitiveActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.primary + '15' }]}
              onPress={() => toggleReveal(key)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={revealed[key] ? 'visibility' : 'visibility-off'}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.primary + '15' }]}
              onPress={() => copyToClipboard(value)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="content-copy" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : undefined
      }
    />
  );

  const copyToClipboard = async (value?: string) => {
    if (!value) return;
    try {
      await Clipboard.setStringAsync(value);
      ToastHelper.success(t('settings.copied'));
    } catch {}
  };

  const handleCheckFirmware = async () => {
    if (!modemService || isCheckingFirmware) return;

    setIsCheckingFirmware(true);
    try {
      const updateInfo = await modemService.checkFirmwareUpdate();
      if (updateInfo.isUpdateAvailable) {
        ToastHelper.info(`${t('settings.newVersion')}: ${updateInfo.newVersion}`);
      } else {
        ToastHelper.success(t('settings.firmwareUpToDate'));
      }
    } catch {
      ToastHelper.error(t('alerts.failedCheckFirmware'));
    } finally {
      setIsCheckingFirmware(false);
    }
  };

  const handleAntennaChange = async (mode: 'auto' | 'internal' | 'external') => {
    if (!modemService || isChangingAntenna) return;

    const changed = mode !== antennaMode;

    setIsChangingAntenna(true);
    try {
      await modemService.setAntennaMode(mode);
      setAntennaMode(mode);
      ToastHelper.success(t('settings.antennaModeChanged'));
      if (changed) {
        showInterstitial(() => {});
      }
    } catch {
      ToastHelper.error(t('alerts.failedChangeAntenna'));
    } finally {
      setIsChangingAntenna(false);
    }
  };

  return (
    <AnimatedScreen noAnimation>
      <MeshGradientBackground>
        <PageHeader title={t('settings.modemInfo')} showBackButton />
        <ScrollView
          style={[styles.container, { backgroundColor: 'transparent' }]}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
        >
          <SettingsSection title={t('settings.deviceInfo')}>
            {isLoading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <BouncingDots size="medium" color={colors.primary} />
              </View>
            ) : (
              <>
                <SettingsItem
                  title={t('settings.deviceName')}
                  value={modemInfo?.deviceName}
                  showChevron={false}
                />
                <SettingsItem
                  title={t('settings.uptime')}
                  value={modemInfo?.uptime ? formatUptime(modemInfo.uptime) : '-'}
                  showChevron={false}
                />
                <SettingsItem
                  title={t('settings.serialNumber')}
                  value={modemInfo?.serialNumber}
                  showChevron={false}
                />
                {renderSensitiveItem('msisdn', t('settings.phoneNumber'), modemInfo?.msisdn)}
                {renderSensitiveItem('imei', t('settings.imei'), modemInfo?.imei)}
                {renderSensitiveItem('imsi', t('settings.imsi'), modemInfo?.imsi)}
                <SettingsItem
                  title={t('settings.hardwareVersion')}
                  value={modemInfo?.hardwareVersion}
                  showChevron={false}
                />
                <SettingsItem
                  title={t('settings.softwareVersion')}
                  value={modemInfo?.softwareVersion}
                  showChevron={false}
                />
                <SettingsItem
                  title={t('settings.webUiVersion')}
                  value={modemInfo?.webUIVersion}
                  showChevron={false}
                />
                <SettingsItem
                  title={t('settings.checkFirmwareUpdate')}
                  onPress={handleCheckFirmware}
                  rightElement={
                    isCheckingFirmware ? (
                      <BouncingDots size="small" color={colors.primary} />
                    ) : undefined
                  }
                  isLast
                />
              </>
            )}
          </SettingsSection>

          <View style={{ paddingHorizontal: 16 }}>
            <AdNative />
          </View>

          <SettingsSection title={t('settings.antennaSettings')}>
            <SettingsItem
              title={t('settings.antennaSettings')}
              value={t(
                ANTENNA_MODES.find((m) => m.value === antennaMode)?.labelKey ||
                  'settings.antennaAuto'
              )}
              onPress={() => setShowAntennaModal(true)}
              isLast
              rightElement={
                isChangingAntenna ? <BouncingDots size="small" color={colors.primary} /> : undefined
              }
            />
          </SettingsSection>

          <SelectionModal
            visible={showAntennaModal}
            title={t('settings.antennaSettings')}
            options={ANTENNA_MODES.map((mode) => ({
              label: t(mode.labelKey),
              value: mode.value,
            }))}
            selectedValue={antennaMode}
            onSelect={(val) => {
              setShowAntennaModal(false);
              handleAntennaChange(val);
            }}
            onClose={() => setShowAntennaModal(false)}
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
  sensitiveActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
