import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Card, InfoRow, SignalBar, SignalMeter, DataPieChart, SpeedGauge } from '@/components';
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
  getSimStatusText,
  getRoamingStatusText,
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
    setSignalInfo,
    setNetworkInfo,
    setTrafficStats,
    setModemStatus,
  } = useModemStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modemService, setModemService] = useState<ModemService | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Auto-refresh interval (every 3 seconds for realtime updates)
  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new ModemService(credentials.modemIp);
      setModemService(service);

      // Initial load
      loadData(service);

      // Setup auto-refresh interval
      const intervalId = setInterval(() => {
        loadDataSilent(service);
      }, 3000); // Update every 3 seconds

      return () => clearInterval(intervalId);
    }
  }, [credentials]);

  const loadData = async (service: ModemService) => {
    try {
      setIsRefreshing(true);

      const [signal, network, traffic, status] = await Promise.all([
        service.getSignalInfo(),
        service.getNetworkInfo(),
        service.getTrafficStats(),
        service.getModemStatus(),
      ]);

      // Log all data for debugging
      console.log('=== Modem Data Update ===');
      console.log('Signal Info:', JSON.stringify(signal, null, 2));
      console.log('Network Info:', JSON.stringify(network, null, 2));
      console.log('Traffic Stats:', JSON.stringify(traffic, null, 2));
      console.log('Modem Status:', JSON.stringify(status, null, 2));
      console.log('========================');

      setSignalInfo(signal);
      setNetworkInfo(network);
      setTrafficStats(traffic);
      setModemStatus(status);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load modem data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Silent background refresh without showing loading indicator
  const loadDataSilent = async (service: ModemService) => {
    try {
      const [signal, network, traffic, status] = await Promise.all([
        service.getSignalInfo(),
        service.getNetworkInfo(),
        service.getTrafficStats(),
        service.getModemStatus(),
      ]);

      // Log background updates (lighter logging)
      console.log('[Background Update]', new Date().toLocaleTimeString(), {
        connectionStatus: status?.connectionStatus,
        networkType: network?.currentNetworkType,
        operator: network?.networkName,
        downloadSpeed: traffic?.currentDownloadRate,
        uploadSpeed: traffic?.currentUploadRate,
      });

      setSignalInfo(signal);
      setNetworkInfo(network);
      setTrafficStats(traffic);
      setModemStatus(status);
      setLastUpdate(new Date());
    } catch (error) {
      // Silent fail for background updates
      console.error('Error in background update:', error);
    }
  };

  const handleRefresh = () => {
    if (modemService) {
      loadData(modemService);
    }
  };

  const handleReLogin = () => {
    Alert.alert(
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
      contentContainerStyle={[styles.content, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View>
          {lastUpdate && (
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              Updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          )}
        </View>
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
        <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
          Connection Status
        </Text>

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
              label="Operator"
              value={
                networkInfo?.fullName ||
                networkInfo?.networkName ||
                networkInfo?.spnName ||
                'Unknown'
              }
            />
            <InfoRow
              label="SIM Status"
              value={getSimStatusText(modemStatus?.simStatus)}
            />
            {modemStatus?.roamingStatus && (
              <InfoRow
                label="Roaming"
                value={getRoamingStatusText(modemStatus.roamingStatus)}
              />
            )}
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

      {/* Signal Strength Card */}
      {signalInfo && (signalInfo.rssi || signalInfo.rsrp) ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
            Signal Strength
          </Text>

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
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
            Signal Strength
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }]}>
            ⚠️ No signal data available{'\n'}
            Please check if you're logged in to the modem
          </Text>
        </Card>
      )}

      {/* Traffic Statistics Card */}
      {trafficStats && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
            Traffic Statistics
          </Text>

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
});
