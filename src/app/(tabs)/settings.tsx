import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, Button, InfoRow } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { useThemeStore } from '@/stores/theme.store';
import { ModemService } from '@/services/modem.service';

const ANTENNA_MODES = [
  { value: 'auto', label: 'Auto', icon: 'settings-input-antenna' as const },
  { value: 'internal', label: 'Internal', icon: 'wifi' as const },
  { value: 'external', label: 'External', icon: 'router' as const },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { credentials, logout } = useAuthStore();
  const { modemInfo, setModemInfo } = useModemStore();
  const { themeMode, setThemeMode } = useThemeStore();

  const [modemService, setModemService] = useState<ModemService | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [antennaMode, setAntennaMode] = useState('auto');
  const [showAntennaDropdown, setShowAntennaDropdown] = useState(false);
  const [isChangingAntenna, setIsChangingAntenna] = useState(false);

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
      Alert.alert('Success', `Antenna mode changed to ${mode}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to change antenna mode');
    } finally {
      setIsChangingAntenna(false);
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
    return ANTENNA_MODES.find(m => m.value === antennaMode)?.label || antennaMode;
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

      {/* System Settings Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
          System Settings
        </Text>

        {/* Antenna Settings */}
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>Antenna Mode</Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              Select antenna type
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
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Card>

      {/* App Settings Card */}
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.md }]}>
          App Settings
        </Text>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>
              Theme
            </Text>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              {themeMode === 'system' ? 'Follow System' : themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
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

        {/* Developer with GitHub link */}
        <View style={[styles.settingRow, { marginBottom: spacing.sm }]}>
          <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
            Developer
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
});
