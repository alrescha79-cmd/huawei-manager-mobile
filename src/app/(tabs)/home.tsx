import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader, CollapsibleCard, InfoRow, SignalBar, SignalMeter, SpeedGauge, ThemedAlertHelper, WebViewLogin, BandSelectionModal, getSelectedBandsDisplay, UsageCard, SignalCard, MonthlySettingsModal, DiagnosisResultModal } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { ModemService } from '@/services/modem.service';
import {
  formatBytes,
  formatBitsPerSecond,
  formatDuration,
  DurationUnits,
  getSignalIcon,
  getSignalStrength,
  getConnectionStatusText,
  getNetworkTypeText,
  getLteBandInfo,
} from '@/utils/helpers';
import { useTranslation } from '@/i18n';

// Helper to determine signal quality based on thresholds
const getSignalQuality = (
  value: number,
  thresholds: { excellent: number; good: number; fair: number; poor: number },
  reverseScale: boolean
): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' => {
  if (isNaN(value)) return 'unknown';

  if (reverseScale) {
    // Higher value is better (e.g., RSSI: -60 is better than -90)
    if (value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.fair) return 'fair';
    return 'poor';
  } else {
    // Higher value is better in normal scale (e.g., SINR: 20 is better than 5)
    if (value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.fair) return 'fair';
    return 'poor';
  }
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { credentials, logout, login } = useAuthStore();
  const { t } = useTranslation();

  // Duration units for i18n-aware formatting
  const durationUnits: DurationUnits = {
    days: t('common.days'),
    hours: t('common.hours'),
    minutes: t('common.minutes'),
    seconds: t('common.seconds'),
  };

  const {
    signalInfo,
    networkInfo,
    trafficStats,
    modemStatus,
    wanInfo,
    mobileDataStatus,
    monthlySettings,
    setSignalInfo,
    setNetworkInfo,
    setTrafficStats,
    setModemStatus,
    setWanInfo,
    setMobileDataStatus,
    setMonthlySettings,
  } = useModemStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modemService, setModemService] = useState<ModemService | null>(null);

  const [isTogglingData, setIsTogglingData] = useState(false);
  const [isChangingIp, setIsChangingIp] = useState(false);
  const [showReloginWebView, setShowReloginWebView] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [reloginAttempts, setReloginAttempts] = useState(0);
  const [selectedBands, setSelectedBands] = useState<string[]>([]);
  const [showBandModal, setShowBandModal] = useState(false);
  const [showMonthlySettingsModal, setShowMonthlySettingsModal] = useState(false);
  const [isRunningDiagnosis, setIsRunningDiagnosis] = useState(false);
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  // Diagnosis result modal state
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagnosisTitle, setDiagnosisTitle] = useState('');
  const [diagnosisResults, setDiagnosisResults] = useState<{ label: string; success: boolean; value?: string }[]>([]);
  const [diagnosisSummary, setDiagnosisSummary] = useState('');

  // Auto-refresh interval (fast for speed, slower for other data)
  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new ModemService(credentials.modemIp);
      setModemService(service);

      // Initial load
      loadData(service);
      loadBands(service);
      loadMonthlySettings(service);

      // Fast refresh for traffic/speed data only (every 1 second)
      const fastIntervalId = setInterval(() => {
        loadTrafficOnly(service);
      }, 1000); // Speed updates every 1 second

      // Slower refresh for all other data (every 5 seconds)
      const slowIntervalId = setInterval(() => {
        loadDataSilent(service);
      }, 5000); // Full data every 5 seconds

      return () => {
        clearInterval(fastIntervalId);
        clearInterval(slowIntervalId);
      };
    }
  }, [credentials]);

  const loadData = async (service: ModemService) => {
    try {
      setIsRefreshing(true);

      const [signal, network, traffic, status, wan, dataStatus] = await Promise.all([
        service.getSignalInfo(),
        service.getNetworkInfo(),
        service.getTrafficStats(),
        service.getModemStatus(),
        service.getWanInfo().catch(() => null),
        service.getMobileDataStatus().catch(() => null),
      ]);

      setSignalInfo(signal);
      setNetworkInfo(network);
      setTrafficStats(traffic);
      setModemStatus(status);
      if (wan) setWanInfo(wan);
      if (dataStatus) setMobileDataStatus(dataStatus);

      // Check if data is empty (session expired returns empty values)
      const isDataEmpty = !signal?.rsrp && !signal?.rssi && !status?.connectionStatus;

      if (isDataEmpty && credentials && reloginAttempts < 3 && !showReloginWebView) {
        setSessionExpired(true);
        setShowReloginWebView(true);
        setReloginAttempts(prev => prev + 1);
      } else if (!isDataEmpty) {
        // Session is valid, reset expired state
        setSessionExpired(false);
        setReloginAttempts(0);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);

      // Check if this is a session/auth error (no valid data means session expired)
      const errorMessage = error?.message || '';
      const isSessionError = errorMessage.includes('125003') ||
        errorMessage.includes('session') ||
        errorMessage.includes('login') ||
        !signalInfo; // No signal data might indicate session issue

      if (isSessionError && credentials && reloginAttempts < 3) {
        // Session expired, trigger silent re-login via WebView
        setSessionExpired(true);
        setShowReloginWebView(true);
        setReloginAttempts(prev => prev + 1);
      } else {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.failedLoadModemData'));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Silent background refresh without showing loading indicator
  const loadDataSilent = async (service: ModemService) => {
    try {
      const [signal, network, traffic, status, wan, dataStatus] = await Promise.all([
        service.getSignalInfo(),
        service.getNetworkInfo(),
        service.getTrafficStats(),
        service.getModemStatus(),
        service.getWanInfo().catch(() => null),
        service.getMobileDataStatus().catch(() => null),
      ]);

      // Log background updates (lighter logging)
      // Background update successful

      setSignalInfo(signal);
      setNetworkInfo(network);
      setTrafficStats(traffic);
      setModemStatus(status);
      if (wan) setWanInfo(wan);
      if (dataStatus) setMobileDataStatus(dataStatus);

      // Check if data is empty (session expired returns empty values)
      const isDataEmpty = !signal?.rsrp && !signal?.rssi && !status?.connectionStatus;

      if (isDataEmpty && credentials && reloginAttempts < 3 && !showReloginWebView) {
        setSessionExpired(true);
        setShowReloginWebView(true);
        setReloginAttempts(prev => prev + 1);
      } else if (!isDataEmpty) {
        // Session is valid
        setSessionExpired(false);
        setReloginAttempts(0);
      }

    } catch (error: any) {
      // Check if session expired in background
      const errorMessage = error?.message || '';
      const isSessionError = errorMessage.includes('125003') ||
        errorMessage.includes('session') ||
        !signalInfo;

      if (isSessionError && credentials && reloginAttempts < 3 && !showReloginWebView) {
        setSessionExpired(true);
        setShowReloginWebView(true);
        setReloginAttempts(prev => prev + 1);
      }
    }
  };

  // Fast traffic-only refresh for realtime speed display
  const loadTrafficOnly = async (service: ModemService) => {
    try {
      const traffic = await service.getTrafficStats();
      setTrafficStats(traffic);
    } catch (error) {
      // Silent fail
    }
  };

  const handleRefresh = () => {
    if (modemService) {
      loadData(modemService);
      loadBands(modemService);
      loadMonthlySettings(modemService);
    }
  };

  const loadBands = async (service: ModemService) => {
    try {
      const bands = await service.getBandSettings();
      if (bands && bands.lteBand) {
        const bandNames = getSelectedBandsDisplay(bands.lteBand);
        setSelectedBands(bandNames.length > 0 ? bandNames : [t('common.all')]);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const loadMonthlySettings = async (service: ModemService) => {
    try {
      const settings = await service.getMonthlyDataSettings();
      setMonthlySettings(settings);
    } catch (error) {
      // Silent fail
    }
  };

  const handleSaveMonthlySettings = async (settings: {
    enabled: boolean;
    startDay: number;
    dataLimit: number;
    dataLimitUnit: 'MB' | 'GB';
    monthThreshold: number;
  }) => {
    if (!modemService) return;

    try {
      await modemService.setMonthlyDataSettings(settings);
      ThemedAlertHelper.alert(t('common.success'), t('home.monthlySettingsSaved'));
      // Reload settings
      loadMonthlySettings(modemService);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('home.failedSaveMonthlySettings'));
      throw error;
    }
  };

  // Handle successful re-login from WebView
  const handleReloginSuccess = async () => {
    setShowReloginWebView(false);
    setSessionExpired(false);

    // Re-save credentials with new timestamp
    if (credentials) {
      await login({
        modemIp: credentials.modemIp,
        username: credentials.username,
        password: credentials.password,
      });
    }

    // Reload data after successful re-login
    if (modemService) {
      loadData(modemService);
    }
  };

  const handleToggleMobileData = async () => {
    if (!modemService || isTogglingData) return;

    const newState = !mobileDataStatus?.dataswitch;
    setIsTogglingData(true);
    try {
      await modemService.toggleMobileData(newState);
      // Refresh data after toggle
      const dataStatus = await modemService.getMobileDataStatus();
      setMobileDataStatus(dataStatus);
      ThemedAlertHelper.alert(t('common.success'), newState ? t('home.dataEnabled') : t('home.dataDisabled'));
    } catch (error) {
      console.error('Error toggling mobile data:', error);
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedToggleData'));
    } finally {
      setIsTogglingData(false);
    }
  };

  const handleChangeIp = async () => {
    if (!modemService || isChangingIp) return;

    ThemedAlertHelper.alert(
      t('alerts.changeIpTitle'),
      t('alerts.changeIpMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue'),
          onPress: async () => {
            setIsChangingIp(true);

            // Show immediate feedback - the scan is being triggered
            ThemedAlertHelper.alert(
              t('alerts.ipChangeStartedTitle'),
              t('alerts.ipChangeStartedMessage'),
              [{ text: t('common.ok') }]
            );

            // Fire and forget - don't wait for response as PLMN scan takes 30-60s
            modemService.triggerPlmnScan().catch((error) => {
              // This error is expected due to timeout during reconnection
              // Expected timeout during PLMN scan
            });

            // Keep loading state for 10 seconds then allow retry
            setTimeout(() => {
              setIsChangingIp(false);
            }, 10000);

            // Refresh data after 45 seconds to get new IP
            setTimeout(() => {
              if (modemService) {
                // Refresh data to get new IP
                loadData(modemService);
              }
            }, 45000);
          },
        },
      ]
    );
  };

  const handleDiagnosis = async () => {
    if (!modemService || isRunningDiagnosis) return;

    setIsRunningDiagnosis(true);
    try {
      // Try google.com first
      let result = await modemService.diagnosisPing('google.com', 5000);

      // If google.com fails, try 1.1.1.1 as fallback
      if (!result.success) {
        result = await modemService.diagnosisPing('1.1.1.1', 4000);
      }

      // Show result in modal
      setDiagnosisTitle(t('home.diagnosisResult'));
      setDiagnosisResults([
        { label: `Ping ${result.host}`, success: result.success },
      ]);
      setDiagnosisSummary(result.success ? t('home.connectionOk') || 'Connection is working!' : t('home.connectionFailed') || 'Could not reach server');
      setShowDiagnosisModal(true);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), 'Diagnosis failed');
    } finally {
      setIsRunningDiagnosis(false);
    }
  };

  const handleOneClickCheck = async () => {
    if (!modemService || isRunningCheck) return;

    setIsRunningCheck(true);
    try {
      const result = await modemService.oneClickCheck();

      // Show result in modal
      setDiagnosisTitle(t('home.oneClickCheckResult'));
      setDiagnosisResults([
        { label: t('home.internetConnection'), success: result.internetConnection },
        { label: t('home.dnsResolution'), success: result.dnsResolution },
        { label: t('home.status'), success: result.networkStatus === 'Connected', value: result.networkStatus },
        { label: t('home.signalStrength'), success: true, value: result.signalStrength },
      ]);
      setDiagnosisSummary(t(`home.${result.summaryKey}`));
      setShowDiagnosisModal(true);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), 'Check failed');
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handleReLogin = () => {
    ThemedAlertHelper.alert(
      t('home.reLogin'),
      t('home.checkLogin'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('home.reLogin'),
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  // Check if we have any valid signal or status data
  const hasValidData = !!(
    (signalInfo?.rssi && signalInfo.rssi !== '') ||
    (modemStatus?.connectionStatus && modemStatus.connectionStatus !== '')
  );

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
      <View style={styles.header}>
        {!hasValidData && (
          <TouchableOpacity
            onPress={handleReLogin}
            style={[styles.reLoginButton, { backgroundColor: colors.error }]}
          >
            <Text style={[typography.caption1, { color: '#FFFFFF' }]}>
              {t('home.reLogin')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Warning if no valid data */}
      {!hasValidData && (
        <Card style={{ marginBottom: spacing.md, backgroundColor: colors.error + '10', borderColor: colors.error, borderWidth: 1 }}>
          <Text style={[typography.headline, { color: colors.error, marginBottom: spacing.sm, textAlign: 'center' }]}>
            <MaterialIcons name="warning" size={24} color={colors.error} /> {t('alerts.noSignalData')}
          </Text>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
          <Text style={[typography.body, { color: colors.text }]}>
            {t('alerts.noSignalMessage')}{'\n\n'}
            <Text style={{ fontWeight: 'bold' }}>{t('alerts.possibleCauses')}</Text>{'\n'}
            • {t('alerts.notLoggedIn')}{'\n'}
            • {t('alerts.sessionExpired')}{'\n'}
            • {t('alerts.modemNotResponding')}
          </Text>
          <TouchableOpacity
            onPress={handleReLogin}
            style={[styles.reLoginButtonLarge, { backgroundColor: colors.error }]}
          >
            <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
              {t('common.goToLogin')}
            </Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Connection Status Card */}
      <CollapsibleCard title={t('home.connectionStatus')}>
        <View style={styles.statusRow}>
          <View style={{ flex: 1 }}>
            <InfoRow
              label={t('home.connectionStatus')}
              value={getConnectionStatusText(modemStatus?.connectionStatus)}
            />
            <InfoRow
              label={t('home.networkType')}
              value={getNetworkTypeText(
                networkInfo?.currentNetworkType || modemStatus?.currentNetworkType
              )}
            />
            <InfoRow
              label={t('home.operator')}
              value={
                networkInfo?.fullName ||
                networkInfo?.networkName ||
                networkInfo?.spnName ||
                t('common.unknown')
              }
            />
            <InfoRow
              label={t('home.ipAddress')}
              value={wanInfo?.wanIPAddress || 'Fetching...'}
            />
            <InfoRow
              label={t('home.band')}
              value={getLteBandInfo(signalInfo?.band)}
            />
            <View style={[styles.infoRowCustom, { marginBottom: spacing.sm }]}>
              <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
                {t('home.width')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {signalInfo?.dlbandwidth || signalInfo?.ulbandwidth ? (
                  <>
                    <MaterialIcons name="arrow-downward" size={14} color={colors.success} />
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginRight: 8 }]}>
                      {signalInfo.dlbandwidth || '-'}
                    </Text>
                    <MaterialIcons name="arrow-upward" size={14} color={colors.primary} />
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                      {signalInfo.ulbandwidth || '-'}
                    </Text>
                  </>
                ) : (
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>-</Text>
                )}
              </View>
            </View>
          </View>

          {signalInfo && (
            <View style={styles.signalContainer}>
              <SignalBar
                strength={getSignalIcon(signalInfo.rssi)}
                label={getSignalStrength(signalInfo.rssi)}
              />
            </View>
          )}
        </View>
      </CollapsibleCard>

      {/* Control Buttons Card */}
      <CollapsibleCard title={t('home.actions')}>
        {/* Mobile Data Toggle */}
        <View style={styles.controlRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>{t('home.mobileData')}</Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              {mobileDataStatus?.dataswitch ? t('wifi.enabled') : t('wifi.disabled')}
            </Text>
          </View>
          {isTogglingData ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={mobileDataStatus?.dataswitch ?? false}
              onValueChange={handleToggleMobileData}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={mobileDataStatus?.dataswitch ? colors.primary : colors.textSecondary}
            />
          )}
        </View>

        {/* LTE Band Selection */}
        <TouchableOpacity
          style={[styles.controlRow, { marginTop: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md }]}
          onPress={() => setShowBandModal(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>{t('home.lteBandSelection')}</Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]} numberOfLines={1}>
              {selectedBands.length > 0 ? selectedBands.join(', ') : t('common.loading')}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

        {/* Change IP Button */}
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.primary }]}
          onPress={handleChangeIp}
          disabled={isChangingIp}
        >
          {isChangingIp ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
              {t('home.changeIp')}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
          {t('home.plmnScanHint')}
        </Text>

        {/* Modern Quick Action Buttons */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
          {/* Diagnosis Button */}
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
            onPress={handleDiagnosis}
            disabled={isRunningDiagnosis}
          >
            {isRunningDiagnosis ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <MaterialIcons name="network-check" size={20} color={colors.primary} />
                <Text style={[typography.caption1, { color: colors.text, fontWeight: '600', marginLeft: spacing.xs }]}>
                  {t('home.diagnosis')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* One Click Check Button */}
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
            onPress={handleOneClickCheck}
            disabled={isRunningCheck}
          >
            {isRunningCheck ? (
              <ActivityIndicator color={colors.success} size="small" />
            ) : (
              <>
                <MaterialIcons name="speed" size={20} color={colors.success} />
                <Text style={[typography.caption1, { color: colors.text, fontWeight: '600', marginLeft: spacing.xs }]}>
                  {t('home.oneClickCheck')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </CollapsibleCard>

      {/* Signal Strength Card */}
      {signalInfo && (signalInfo.rssi || signalInfo.rsrp) ? (
        <CollapsibleCard title={t('home.signalInfo')}>
          <SignalCard
            title={t('home.signalStrength')}
            badge={getSignalStrength(signalInfo.rssi)}
            color="blue"
            icon="signal-cellular-alt"
            metrics={[
              ...(signalInfo.rssi ? [{
                label: 'RSSI',
                value: signalInfo.rssi,
                unit: 'dBm',
                quality: getSignalQuality(parseFloat(signalInfo.rssi), { excellent: -65, good: -75, fair: -85, poor: -95 }, true),
              }] : []),
              ...(signalInfo.rsrp ? [{
                label: 'RSRP',
                value: signalInfo.rsrp,
                unit: 'dBm',
                quality: getSignalQuality(parseFloat(signalInfo.rsrp), { excellent: -80, good: -90, fair: -100, poor: -110 }, true),
              }] : []),
              ...(signalInfo.rsrq ? [{
                label: 'RSRQ',
                value: signalInfo.rsrq,
                unit: 'dB',
                quality: getSignalQuality(parseFloat(signalInfo.rsrq), { excellent: -5, good: -9, fair: -12, poor: -15 }, true),
              }] : []),
              ...(signalInfo.sinr ? [{
                label: 'SINR',
                value: signalInfo.sinr,
                unit: 'dB',
                quality: getSignalQuality(parseFloat(signalInfo.sinr), { excellent: 20, good: 13, fair: 6, poor: 0 }, false),
              }] : []),
            ]}
            band={signalInfo.band ? getLteBandInfo(signalInfo.band) : undefined}
            cellId={signalInfo.cellId}
          />
        </CollapsibleCard>
      ) : (
        <CollapsibleCard title={t('home.signalInfo')}>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }]}>
            ⚠️ {t('home.noSignalAvailable')}{'\n'}
            {t('home.checkLogin')}
          </Text>
        </CollapsibleCard>
      )}

      {/* Traffic Statistics Card */}
      {trafficStats && (
        <Card style={{ marginBottom: spacing.md }}>
          {/* Header with gear icon - centered title */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.text, textAlign: 'center' }]}>{t('home.trafficStats')}</Text>
            <TouchableOpacity onPress={() => setShowMonthlySettingsModal(true)} style={{ position: 'absolute', right: 0 }}>
              <MaterialIcons name="data-saver-on" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Divider below header */}
          <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.md }} />

          {/* Speed Gauge */}
          <SpeedGauge
            downloadSpeed={trafficStats.currentDownloadRate}
            uploadSpeed={trafficStats.currentUploadRate}
          />

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

          {/* Daily Usage Card - API returns combined download+upload as CurrentDayUsed */}
          <UsageCard
            title={t('home.dailyUsage')}
            badge={formatDuration(trafficStats.dayDuration, durationUnits)}
            download={trafficStats.dayUsed}
            upload={0}
            color="amber"
            icon="today"
            totalOnly={true}
          />

          {/* Current Session Card */}
          <UsageCard
            title={t('home.currentSession')}
            badge={formatDuration(trafficStats.currentConnectTime, durationUnits)}
            download={trafficStats.currentDownload}
            upload={trafficStats.currentUpload}
            color="cyan"
            icon="schedule"
          />

          {/* Monthly Usage Card with Progress Bar */}
          <View>
            <UsageCard
              title={t('home.monthlyUsage')}
              badge={new Date().toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
              download={trafficStats.monthDownload}
              upload={trafficStats.monthUpload}
              color="emerald"
              icon="calendar-month"
            />
            {/* Progress bar when monthly limit is enabled */}
            {monthlySettings?.enabled && monthlySettings.dataLimit > 0 && (
              <View style={{ marginTop: -4, marginBottom: spacing.md, paddingHorizontal: 4 }}>
                {(() => {
                  const totalUsed = trafficStats.monthDownload + trafficStats.monthUpload;
                  const limitBytes = monthlySettings.dataLimit * (monthlySettings.dataLimitUnit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024);
                  const percentage = Math.min((totalUsed / limitBytes) * 100, 100);

                  // Gradient color based on percentage: green < 50%, yellow 50-80%, red > 80%
                  let barColor = '#22C55E'; // Green
                  let textColor = colors.text;
                  if (percentage >= 80) {
                    barColor = '#EF4444'; // Red
                    textColor = '#EF4444';
                  } else if (percentage >= 50) {
                    barColor = '#F59E0B'; // Yellow/Amber
                    textColor = '#F59E0B';
                  }

                  return (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                          {t('home.usageProgress')}
                        </Text>
                        <Text style={[typography.caption1, { color: textColor, fontWeight: '600' }]}>
                          {percentage.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
                        <View
                          style={{
                            height: '100%',
                            width: `${percentage}%`,
                            backgroundColor: barColor,
                            borderRadius: 4,
                          }}
                        />
                      </View>
                      <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 4, textAlign: 'right' }]}>
                        {formatBytes(totalUsed)} / {monthlySettings.dataLimit} {monthlySettings.dataLimitUnit}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}
          </View>

          {/* Total Traffic Card */}
          <UsageCard
            title={t('home.totalUsage')}
            badge={formatDuration(trafficStats.totalConnectTime, durationUnits)}
            download={trafficStats.totalDownload}
            upload={trafficStats.totalUpload}
            color="amber"
            icon="data-usage"
          />
        </Card>
      )}

      {/* Hidden WebView for auto re-login when session expires */}
      <WebViewLogin
        modemIp={credentials?.modemIp || '192.168.8.1'}
        username={credentials?.username || 'admin'}
        password={credentials?.password || ''}
        visible={showReloginWebView}
        hidden={true}
        onClose={() => {
          setShowReloginWebView(false);
          // If user cancels re-login, show error
          if (sessionExpired) {
            ThemedAlertHelper.alert(t('common.error'), t('alerts.sessionExpired'));
          }
        }}
        onLoginSuccess={handleReloginSuccess}
        onTimeout={async () => {
          // Session re-login timed out, redirect to login screen
          setShowReloginWebView(false);
          setSessionExpired(true);
          await logout();
          router.replace('/login');
        }}
      />

      {/* LTE Band Selection Modal */}
      <BandSelectionModal
        visible={showBandModal}
        onClose={() => setShowBandModal(false)}
        modemService={modemService}
        onSaved={() => {
          if (modemService) loadBands(modemService);
        }}
      />

      {/* Monthly Usage Settings Modal */}
      <MonthlySettingsModal
        visible={showMonthlySettingsModal}
        onClose={() => setShowMonthlySettingsModal(false)}
        onSave={handleSaveMonthlySettings}
        initialSettings={monthlySettings || undefined}
      />

      {/* Diagnosis Result Modal */}
      <DiagnosisResultModal
        visible={showDiagnosisModal}
        onClose={() => setShowDiagnosisModal(false)}
        title={diagnosisTitle}
        results={diagnosisResults}
        summary={diagnosisSummary}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reLoginButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reLoginButtonLarge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalContainer: {
    marginLeft: 16,
  },
  trafficSection: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    padding: 12,
  },
  trafficHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trafficRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  trafficItem: {
    flex: 1,
    alignItems: 'center',
  },
  dataUsageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dataUsageItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalUsageContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  controlButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRowCustom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
