import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { useTheme } from '@/theme';
import { Card, InfoRow, Button } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useWiFiStore } from '@/stores/wifi.store';
import { WiFiService } from '@/services/wifi.service';
import { formatMacAddress } from '@/utils/helpers';

export default function WiFiScreen() {
  const { colors, typography, spacing } = useTheme();
  const { credentials } = useAuthStore();
  const { 
    connectedDevices, 
    wifiSettings,
    setConnectedDevices,
    setWiFiSettings,
  } = useWiFiStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wifiService, setWiFiService] = useState<WiFiService | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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

      const [devices, settings] = await Promise.all([
        service.getConnectedDevices(),
        service.getWiFiSettings(),
      ]);

      setConnectedDevices(devices);
      setWiFiSettings(settings);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading WiFi data:', error);
      Alert.alert('Error', 'Failed to load WiFi data');
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
      setLastUpdate(new Date());
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
      Alert.alert('Success', `WiFi ${enabled ? 'enabled' : 'disabled'}`);
      handleRefresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle WiFi');
    }
  };

  const handleKickDevice = async (macAddress: string, hostName: string) => {
    if (!wifiService) return;

    Alert.alert(
      'Kick Device',
      `Are you sure you want to disconnect ${hostName || macAddress}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Kick',
          style: 'destructive',
          onPress: async () => {
            try {
              await wifiService.kickDevice(macAddress);
              Alert.alert('Success', 'Device disconnected');
              handleRefresh();
            } catch (error) {
              Alert.alert('Error', 'Failed to kick device');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>
          WiFi
        </Text>
        {lastUpdate && (
          <Text style={[typography.caption1, { color: colors.textSecondary }]}>
            Updated: {lastUpdate.toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* WiFi Settings Card */}
      {wifiSettings && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
            WiFi Settings
          </Text>

          <View style={styles.toggleRow}>
            <Text style={[typography.body, { color: colors.text }]}>
              WiFi Enabled
            </Text>
            <Switch
              value={wifiSettings.wifiEnable}
              onValueChange={handleToggleWiFi}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>

          <InfoRow label="SSID" value={wifiSettings.ssid} />
          <InfoRow label="Channel" value={wifiSettings.channel} />
          <InfoRow label="Band" value={wifiSettings.band === '1' ? '2.4 GHz' : '5 GHz'} />
          <InfoRow label="Security" value={wifiSettings.securityMode} />
          <InfoRow label="Max Devices" value={wifiSettings.maxAssoc} />
        </Card>
      )}

      {/* Connected Devices Card */}
      <Card>
        <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
          Connected Devices ({connectedDevices.length})
        </Text>

        {connectedDevices.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }]}>
            No devices connected
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
                title="Kick"
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
});
