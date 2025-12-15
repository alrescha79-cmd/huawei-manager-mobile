import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader, InfoRow, SignalBar, SignalMeter, DataPieChart, SpeedGauge, ThemedAlertHelper } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { ModemService } from '@/services/modem.service';
import {
  formatBytes,
  formatBitsPerSecond,
  formatDuration,
  getSignalIcon,
  getSignalStrength,
  getConnectionStatusText,
  getNetworkTypeText,
  getLteBandInfo,
} from '@/utils/helpers';
import { useTranslation } from '@/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { credentials, logout } = useAuthStore();
  const { t } = useTranslation();
  const {
    signalInfo,
    networkInfo,
    trafficStats,
    modemStatus,
    wanInfo,
    mobileDataStatus,
    setSignalInfo,
    setNetworkInfo,
    setTrafficStats,
    setModemStatus,
    setWanInfo,
    setMobileDataStatus,
  } = useModemStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modemService, setModemService] = useState<ModemService | null>(null);

  const [isTogglingData, setIsTogglingData] = useState(false);
  const [isChangingIp, setIsChangingIp] = useState(false);

  // Auto-refresh interval (fast for speed, slower for other data)
  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new ModemService(credentials.modemIp);
      setModemService(service);

      // Initial load
      loadData(service);

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

    } catch (error) {
      console.error('Error loading data:', error);
      ThemedAlertHelper.alert(t('common.error'), t('alerts.failedLoadModemData'));
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

    } catch (error) {
      // Silent fail for background updates
      console.error('Error in background update:', error);
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
          <Text style={[typography.headline, { color: colors.error, marginBottom: spacing.sm }]}>
            ⚠️ {t('alerts.noSignalData')}
          </Text>
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
      <Card style={{ marginBottom: spacing.md }}>
        <CardHeader title={t('home.connectionStatus')} />

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
              label="Band"
              value={getLteBandInfo(signalInfo?.band)}
            />
            {/* WIDTH with icons */}
            <View style={[styles.infoRowCustom, { marginBottom: spacing.sm }]}>
              <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
                Width
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
      </Card>

      {/* Control Buttons Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <CardHeader title={t('home.actions')} />

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
          Triggers PLMN scan to get a new IP address
        </Text>
      </Card>

      {/* Signal Strength Card */}
      {signalInfo && (signalInfo.rssi || signalInfo.rsrp) ? (
        <Card style={{ marginBottom: spacing.md }}>
          <CardHeader title={t('home.signalInfo')} />

          {signalInfo.rssi && (
            <SignalMeter
              label="RSSI"
              value={signalInfo.rssi}
              unit="dBm"
              min={-110}
              max={-50}
              thresholds={{ excellent: -65, good: -75, fair: -85, poor: -95 }}
              reverseScale={true}
            />
          )}
          {signalInfo.rsrp && (
            <SignalMeter
              label="RSRP"
              value={signalInfo.rsrp}
              unit="dBm"
              min={-140}
              max={-70}
              thresholds={{ excellent: -80, good: -90, fair: -100, poor: -110 }}
              reverseScale={true}
            />
          )}
          {signalInfo.rsrq && (
            <SignalMeter
              label="RSRQ"
              value={signalInfo.rsrq}
              unit="dB"
              min={-20}
              max={-3}
              thresholds={{ excellent: -5, good: -9, fair: -12, poor: -15 }}
              reverseScale={true}
            />
          )}
          {signalInfo.sinr && (
            <SignalMeter
              label="SINR"
              value={signalInfo.sinr}
              unit="dB"
              min={-5}
              max={30}
              thresholds={{ excellent: 20, good: 13, fair: 6, poor: 0 }}
              reverseScale={false}
            />
          )}

          {/* Additional Info */}
          {(signalInfo.band || signalInfo.cellId) && (
            <View style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
              {signalInfo.band && <InfoRow label={t('home.band')} value={signalInfo.band} />}
              {signalInfo.cellId && <InfoRow label={t('home.cellId')} value={signalInfo.cellId} />}
            </View>
          )}
        </Card>
      ) : (
        <Card style={{ marginBottom: spacing.md }}>
          <CardHeader title={t('home.signalInfo')} />
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }]}>
            ⚠️ {t('home.noSignalAvailable')}{'\n'}
            {t('home.checkLogin')}
          </Text>
        </Card>
      )}

      {/* Traffic Statistics Card */}
      {trafficStats && (
        <Card style={{ marginBottom: spacing.md }}>
          <CardHeader title={t('home.trafficStats')} />

          {/* Speed Gauge */}
          <SpeedGauge
            downloadSpeed={trafficStats.currentDownloadRate}
            uploadSpeed={trafficStats.currentUploadRate}
          />

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

          {/* Data Usage Grid - 2 columns */}
          <View style={styles.dataUsageGrid}>
            {/* Current Session */}
            <View style={styles.dataUsageItem}>
              <DataPieChart
                title={t('home.currentSession')}
                subtitle={formatDuration(trafficStats.currentConnectTime)}
                download={trafficStats.currentDownload}
                upload={trafficStats.currentUpload}
                formatValue={formatBytes}
                compact
              />
            </View>

            {/* Monthly */}
            <View style={styles.dataUsageItem}>
              <DataPieChart
                title={t('home.monthlyUsage')}
                download={trafficStats.monthDownload}
                upload={trafficStats.monthUpload}
                formatValue={formatBytes}
                compact
              />
            </View>
          </View>

          {/* Total Usage - centered below */}
          <View style={styles.totalUsageContainer}>
            <DataPieChart
              title={t('home.trafficStats')}
              subtitle={formatDuration(trafficStats.totalConnectTime)}
              download={trafficStats.totalDownload}
              upload={trafficStats.totalUpload}
              formatValue={formatBytes}
            />
          </View>
        </Card>
      )}
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
  infoRowCustom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
