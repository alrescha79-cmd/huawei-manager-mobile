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
import { useTranslation } from '@/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { login, isLoading, error, setError } = useAuthStore();
  const { t } = useTranslation();

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
          t('login.wifiRequired'),
          t('login.wifiRequiredMessage')
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
      ThemedAlertHelper.alert(t('common.error'), t('login.enterModemIp'));
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
      t('login.directLoginFailed'),
      t('login.directLoginFailedMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('login.openWebLogin'), onPress: () => setShowWebViewLogin(true) }
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
      ThemedAlertHelper.alert(t('common.success'), t('login.loginSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => router.replace('/(tabs)/home'),
        },
      ]);
    } catch (err) {
      console.error('[Login] Error saving credentials:', err);
      const errorMessage = err instanceof Error ? err.message : t('login.loginFailed');
      ThemedAlertHelper.alert(t('common.error'), errorMessage);
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
            {t('login.title')}
          </Text>
          <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
            {t('login.subtitle')}
          </Text>
        </View>

        <Card style={{ marginBottom: spacing.lg }}>
          <Input
            label={t('login.modemIp')}
            value={modemIp}
            onChangeText={setModemIp}
            placeholder={t('login.modemIpPlaceholder')}
            keyboardType="numeric"
            autoCapitalize="none"
            editable={!isDetecting}
          />

          <Input
            label={t('login.usernameOptional')}
            value={username}
            onChangeText={setUsername}
            placeholder={t('login.usernamePlaceholder')}
            autoCapitalize="none"
            autoComplete="username"
          />

          <Input
            label={t('login.passwordOptional')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('login.passwordPlaceholder')}
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
            title={isDirectLogging ? t('login.loggingIn') : t('login.loginButton')}
            onPress={handleLoginPress}
            loading={isDirectLogging || isLoading}
            disabled={isDirectLogging || isLoading}
            style={{ marginBottom: spacing.sm }}
          />

          {showWebViewOption && (
            <Button
              title={t('login.webViewOption')}
              onPress={() => setShowWebViewLogin(true)}
              variant="secondary"
              style={{ marginBottom: spacing.sm }}
            />
          )}

          <Button
            title={isDetecting ? t('login.detecting') : t('login.detectModemIp')}
            onPress={detectModemIP}
            loading={isDetecting}
            disabled={isDetecting || isLoading || isDirectLogging}
            variant="secondary"
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center' }]}>
            {t('login.directLoginNote')}{'\n'}{t('login.webFallbackNote')}
          </Text>
          {/* app version */}
          <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center' }]}>
            {t('login.appVersion')}: {Constants.expoConfig?.version || '1.0.0'}
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
