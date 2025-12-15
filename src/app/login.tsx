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

export default function LoginScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { login, isLoading, error, setError } = useAuthStore();

  const [modemIp, setModemIp] = useState('192.168.8.1');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [showWebViewLogin, setShowWebViewLogin] = useState(false);

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

  // Open WebView for login
  const handleLoginPress = () => {
    setError(null);

    if (!modemIp) {
      ThemedAlertHelper.alert('Error', 'Please enter modem IP address');
      return;
    }

    console.log('[Login] Opening WebView login for:', modemIp);
    setShowWebViewLogin(true);
  };

  // Handle successful login from WebView
  const handleWebViewLoginSuccess = async () => {
    console.log('[Login] WebView login successful!');
    setShowWebViewLogin(false);

    try {
      // Save credentials
      await login({
        modemIp,
        username,
        password,
      });

      console.log('[Login] Credentials saved, redirecting to home...');
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
            title="Login via Web Interface"
            onPress={handleLoginPress}
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
            Login will open in a web browser.{'\n'}Make sure you are connected to modem WiFi.
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
