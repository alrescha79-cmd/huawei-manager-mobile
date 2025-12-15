import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Card, Button, InfoRow } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { useThemeStore } from '@/stores/theme.store';
import { ModemService } from '@/services/modem.service';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { credentials, logout } = useAuthStore();
  const { modemInfo, setModemInfo } = useModemStore();
  const { themeMode, setThemeMode } = useThemeStore();

  const [modemService, setModemService] = useState<ModemService | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new ModemService(credentials.modemIp);
      setModemService(service);
      loadModemInfo(service);
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

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
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
    Alert.alert(
      'Reboot Modem',
      'Are you sure you want to reboot the modem? This will disconnect all devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reboot',
          style: 'destructive',
          onPress: async () => {
            if (!modemService) return;

            setIsLoading(true);
            try {
              await modemService.reboot();
              Alert.alert('Success', 'Modem is rebooting. This may take a few minutes.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reboot modem');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16 }]}
    >

      {/* Modem Info Card */}
      {modemInfo && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
            Modem Information
          </Text>

          <InfoRow label="Device" value={modemInfo.deviceName} />
          <InfoRow label="Serial Number" value={modemInfo.serialNumber} />
          <InfoRow label="IMEI" value={modemInfo.imei} />
          <InfoRow label="Hardware Version" value={modemInfo.hardwareVersion} />
          <InfoRow label="Software Version" value={modemInfo.softwareVersion} />
          {modemInfo.macAddress1 && (
            <InfoRow label="MAC Address" value={modemInfo.macAddress1} />
          )}
        </Card>
      )}

      {/* App Settings Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
          App Settings
        </Text>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>
              Dark Mode
            </Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              {themeMode === 'system' ? 'Follow System' : themeMode === 'dark' ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
              const currentIndex = modes.indexOf(themeMode);
              const nextMode = modes[(currentIndex + 1) % modes.length];
              setThemeMode(nextMode);
            }}
            style={[styles.themeButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[typography.caption1, { color: '#FFFFFF' }]}>
              Change
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Modem Control Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
          Modem Control
        </Text>

        <Button
          title="Reboot Modem"
          onPress={handleReboot}
          variant="danger"
          loading={isLoading}
          disabled={isLoading}
        />
      </Card>

      {/* Connection Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
          Connection
        </Text>

        <InfoRow label="Modem IP" value={credentials?.modemIp || 'Unknown'} />
        <InfoRow label="Username" value={credentials?.username || 'Unknown'} />

        <View style={{ marginTop: spacing.md }}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="secondary"
          />
        </View>
      </Card>

      {/* About Card */}
      <Card>
        <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
          About
        </Text>

        <InfoRow label="App Version" value="1.0.0" />
        <InfoRow label="Developer" value="Anggun Caksono" />

        <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
          © 2025 Anggun Caksono
        </Text>
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
