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

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { credentials, logout } = useAuthStore();
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

      // Log all data for debugging
      // console.log('=== Modem Data Update ===');
      // console.log('Signal Info:', JSON.stringify(signal, null, 2));
      // console.log('Network Info:', JSON.stringify(network, null, 2));
      // console.log('Traffic Stats:', JSON.stringify(traffic, null, 2));
      // console.log('Modem Status:', JSON.stringify(status, null, 2));
      // console.log('WAN Info:', JSON.stringify(wan, null, 2));
      // console.log('Mobile Data Status:', JSON.stringify(dataStatus, null, 2));
      // console.log('========================');

      setSignalInfo(signal);
      setNetworkInfo(network);
      setTrafficStats(traffic);
      setModemStatus(status);
      if (wan) setWanInfo(wan);
      if (dataStatus) setMobileDataStatus(dataStatus);

    } catch (error) {
      console.error('Error loading data:', error);
      ThemedAlertHelper.alert('Error', 'Failed to load modem data');
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
      ThemedAlertHelper.alert('Success', `Mobile data ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling mobile data:', error);
      ThemedAlertHelper.alert('Error', 'Failed to toggle mobile data');
    } finally {
      setIsTogglingData(false);
    }
  };

  const handleChangeIp = async () => {
    if (!modemService || isChangingIp) return;

    ThemedAlertHelper.alert(
      'Change IP Address',
      'This will trigger a PLMN network scan to get a new IP address. The process takes 30-60 seconds. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setIsChangingIp(true);

            // Show immediate feedback - the scan is being triggered
            ThemedAlertHelper.alert(
              'IP Change Started',
              'PLMN scan triggered. The modem will reconnect to the network. Please wait 30-60 seconds for the new IP.',
              [{ text: 'OK' }]
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
      'Re-Login Required',
      'Signal data is not available. You may need to log in again to the modem.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-Login',
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
              Re-Login
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Warning if no valid data */}
      {!hasValidData && (
        <Card style={{ marginBottom: spacing.md, backgroundColor: colors.error + '10', borderColor: colors.error, borderWidth: 1 }}>
          <Text style={[typography.headline, { color: colors.error, marginBottom: spacing.sm }]}>
            ⚠️ No Signal Data
          </Text>
          <Text style={[typography.body, { color: colors.text }]}>
            Unable to retrieve signal and status information from the modem.{'\n\n'}
            <Text style={{ fontWeight: 'bold' }}>Possible causes:</Text>{'\n'}
            • Not logged in to modem{'\n'}
            • Session expired{'\n'}
            • Modem not responding{'\n\n'}
            <Text style={{ fontWeight: 'bold' }}>Check logs for:</Text> [RAW XML] messages
          </Text>
          <TouchableOpacity
            onPress={handleReLogin}
            style={[styles.reLoginButtonLarge, { backgroundColor: colors.error }]}
          >
            <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
              Go to Login
            </Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Connection Status Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <CardHeader title="Connection Status" />

        <View style={styles.statusRow}>
          <View style={{ flex: 1 }}>
            <InfoRow
              label="Status"
              value={getConnectionStatusText(modemStatus?.connectionStatus)}
            />
            <InfoRow
              label="Network Type"
              value={getNetworkTypeText(
                networkInfo?.currentNetworkType || modemStatus?.currentNetworkType
              )}
            />
            <InfoRow
              label="ISP"
              value={
                networkInfo?.fullName ||
                networkInfo?.networkName ||
                networkInfo?.spnName ||
                'Unknown'
              }
            />
            <InfoRow
              label="IP WAN"
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
        <CardHeader title="Quick Controls" />

        {/* Mobile Data Toggle */}
        <View style={styles.controlRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>Mobile Data</Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              {mobileDataStatus?.dataswitch ? 'Enabled' : 'Disabled'}
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
              Force Change IP WAN
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
          <CardHeader title="Signal Strength" />

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
              {signalInfo.band && <InfoRow label="Band" value={signalInfo.band} />}
              {signalInfo.cellId && <InfoRow label="Cell ID" value={signalInfo.cellId} />}
            </View>
          )}
        </Card>
      ) : (
        <Card style={{ marginBottom: spacing.md }}>
          <CardHeader title="Signal Strength" />
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }]}>
            ⚠️ No signal data available{'\n'}
            Please check if you're logged in to the modem
          </Text>
        </Card>
      )}

      {/* Traffic Statistics Card */}
      {trafficStats && (
        <Card style={{ marginBottom: spacing.md }}>
          <CardHeader title="Traffic Statistics" />

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
                title="Session"
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
                title="Monthly"
                subtitle="This month"
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
              title="Total Usage"
              subtitle={`Duration: ${formatDuration(trafficStats.totalConnectTime)}`}
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
