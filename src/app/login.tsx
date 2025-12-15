import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';
import { Card, Input, Button, WebViewLogin, ThemedAlertHelper } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { networkService } from '@/services/network.service';
import { ModemAPIClient } from '@/services/api.service';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { login, isLoading, error, setError } = useAuthStore();

  const [modemIp, setModemIp] = useState('192.168.8.1');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [showWebViewLogin, setShowWebViewLogin] = useState(false);
  const [isDirectLogging, setIsDirectLogging] = useState(false);
  const [showWebViewOption, setShowWebViewOption] = useState(false);

  const detectModemIP = async () => {
    setIsDetecting(true);
    try {
      const isWiFi = await networkService.isConnectedToWiFi();

      if (!isWiFi) {
        ThemedAlertHelper.alert(
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

  // Try direct API login first, fallback to WebView
  const handleLoginPress = async () => {
    setError(null);
    setShowWebViewOption(false);

    if (!modemIp) {
      ThemedAlertHelper.alert('Error', 'Please enter modem IP address');
      return;
    }

    // Try direct API login first
    setIsDirectLogging(true);

    try {
      const apiClient = new ModemAPIClient(modemIp);
      const success = await apiClient.login(username, password);

      if (success) {
        await login({
          modemIp,
          username,
          password,
        });
        router.replace('/(tabs)/home');
        return;
      }
    } catch (err) {
      // Direct login failed - continue to show WebView option
    } finally {
      setIsDirectLogging(false);
    }

    // If direct login fails, show WebView option
    setShowWebViewOption(true);
    ThemedAlertHelper.alert(
      'Direct Login Failed',
      'Unable to login directly. Would you like to try via Web Interface?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Web Login', onPress: () => setShowWebViewLogin(true) }
      ]
    );
  };

  // Handle successful login from WebView
  const handleWebViewLoginSuccess = async () => {
    setShowWebViewLogin(false);

    try {
      // Save credentials
      await login({
        modemIp,
        username,
        password,
      });

      // Credentials saved, redirecting to home
      ThemedAlertHelper.alert('Success', 'Login successful!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/home'),
        },
      ]);
    } catch (err) {
      console.error('[Login] Error saving credentials:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      ThemedAlertHelper.alert('Error', errorMessage);
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
            label="Username (optional)"
            value={username}
            onChangeText={setUsername}
            placeholder="admin"
            autoCapitalize="none"
            autoComplete="username"
          />

          <Input
            label="Password (optional)"
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
            title={isDirectLogging ? "Logging in..." : "Login"}
            onPress={handleLoginPress}
            loading={isDirectLogging || isLoading}
            disabled={isDirectLogging || isLoading}
            style={{ marginBottom: spacing.sm }}
          />

          {showWebViewOption && (
            <Button
              title="Use Web Interface Instead"
              onPress={() => setShowWebViewLogin(true)}
              variant="secondary"
              style={{ marginBottom: spacing.sm }}
            />
          )}

          <Button
            title={isDetecting ? "Detecting..." : "Detect Modem IP"}
            onPress={detectModemIP}
            loading={isDetecting}
            disabled={isDetecting || isLoading || isDirectLogging}
            variant="secondary"
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center' }]}>
            Will try direct login first.{'\n'}If it fails, web interface will be available.
          </Text>
          {/* app version */}
          <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center' }]}>
            App Version: {Constants.expoConfig?.version || '1.0.0'}
          </Text>
        </View>
      </ScrollView>

      {/* WebView Login Modal */}
      <WebViewLogin
        modemIp={modemIp}
        visible={showWebViewLogin}
        onClose={() => setShowWebViewLogin(false)}
        onLoginSuccess={handleWebViewLoginSuccess}
      />
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
