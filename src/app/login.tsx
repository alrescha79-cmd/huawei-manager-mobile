import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';
import { Card, Input, Button } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { networkService } from '@/services/network.service';
import { ModemService } from '@/services/modem.service';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { login, isLoading, error, setError } = useAuthStore();

  const [modemIp, setModemIp] = useState('192.168.8.1');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  // Disable auto-detect on mount to prevent hanging
  // User can manually click "Detect IP" button instead
  // useEffect(() => {
  //   detectModemIP();
  // }, []);

  const detectModemIP = async () => {
    setIsDetecting(true);
    try {
      const isWiFi = await networkService.isConnectedToWiFi();
      
      if (!isWiFi) {
        Alert.alert(
          'WiFi Required',
          'Please connect to your Huawei modem WiFi network to continue.'
        );
        setIsDetecting(false);
        return;
      }

      const detectedIP = await networkService.detectGatewayIP();
      setModemIp(detectedIP);
    } catch (err) {
      console.error('Error detecting modem IP:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleLogin = async () => {
    setError(null);

    if (!modemIp || !username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      console.log('[Login] Attempting login to:', modemIp);
      const modemService = new ModemService(modemIp);
      const loginSuccess = await modemService.login(username, password);

      console.log('[Login] Login result:', loginSuccess);

      if (loginSuccess) {
        console.log('[Login] Saving credentials...');
        await login({
          modemIp,
          username,
          password,
        });

        console.log('[Login] Success! Redirecting to home...');
        Alert.alert('Success', 'Login successful!', [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/home'),
          },
        ]);
      } else {
        console.error('[Login] Login failed - invalid credentials');
        Alert.alert('Login Failed', 'Invalid username or password');
        setError('Invalid credentials');
      }
    } catch (err) {
      console.error('[Login] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      Alert.alert('Login Error', errorMessage);
      setError(errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="auto" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { marginBottom: spacing.xl }]}>
          <Text style={[typography.largeTitle, { color: colors.text, marginBottom: spacing.sm }]}>
            Huawei Manager
          </Text>
          <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
            Connect to your modem
          </Text>
        </View>

        <Card style={{ marginBottom: spacing.lg }}>
          <Input
            label="Modem IP Address"
            value={modemIp}
            onChangeText={setModemIp}
            placeholder="192.168.8.1"
            keyboardType="numeric"
            autoCapitalize="none"
            editable={!isDetecting}
          />

          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="admin"
            autoCapitalize="none"
            autoComplete="username"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
            showPasswordToggle
            autoCapitalize="none"
            autoComplete="password"
          />

          {error && (
            <Text style={[typography.caption1, { color: colors.error, marginBottom: spacing.md }]}>
              {error}
            </Text>
          )}

          <Button
            title="Login"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            style={{ marginBottom: spacing.sm }}
          />

          <Button
            title={isDetecting ? "Detecting..." : "Detect Modem IP"}
            onPress={detectModemIP}
            loading={isDetecting}
            disabled={isDetecting || isLoading}
            variant="secondary"
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center' }]}>
            Make sure you are connected to your{'\n'}Huawei modem WiFi network
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
});
