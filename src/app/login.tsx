import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, Input, Button, WebViewLogin, ThemedAlertHelper } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { networkService } from '@/services/network.service';
import { ModemAPIClient } from '@/services/api.service';
import { useTranslation } from '@/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { login, isLoading, error, setError, credentials, loadCredentials, isAutoLogging } = useAuthStore();
  const { t } = useTranslation();

  const [modemIp, setModemIp] = useState('192.168.8.1');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [showWebViewLogin, setShowWebViewLogin] = useState(false);
  const [isDirectLogging, setIsDirectLogging] = useState(false);
  const [showWebViewOption, setShowWebViewOption] = useState(false);
  const [isAutoLoginReady, setIsAutoLoginReady] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const initCredentials = async () => {
      await loadCredentials();
      setIsAutoLoginReady(true);
    };
    initCredentials();
  }, []);

  // Auto-fill form - NO WebView auto-trigger
  useEffect(() => {
    if (isAutoLoginReady && credentials) {
      setModemIp(credentials.modemIp || '192.168.8.1');
      setUsername(credentials.username || 'admin');
      setPassword(credentials.password || '');
      // WebView disabled - direct login via ModemAPIClient works
    }
  }, [isAutoLoginReady, credentials]);

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

    // Try direct API login with retries
    setIsDirectLogging(true);

    const apiClient = new ModemAPIClient(modemIp);
    let success = false;
    let lastError = null;

    // Retry up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Login Page] Attempt ${attempt}/3...`);
        success = await apiClient.login(username, password);

        if (success) {
          console.log('[Login Page] Direct login successful!');
          await login({
            modemIp,
            username,
            password,
          });
          setIsDirectLogging(false);
          router.replace('/(tabs)/home');
          return;
        }
      } catch (err: any) {
        lastError = err;
        console.log(`[Login Page] Attempt ${attempt} failed:`, err.message);
        // Wait a bit before retry
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    setIsDirectLogging(false);

    // If all retries fail, show WebView option
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

  // Handle reporting login issues via email or GitHub
  const handleReportIssue = async () => {
    // Build device info string
    const deviceString = `${Device.manufacturer || ''} ${Device.modelName || 'Unknown Device'}`.trim();
    const osString = `${Device.osName || 'Unknown OS'} ${Device.osVersion || ''}`;
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    const dateString = new Date().toLocaleDateString();

    const reportTemplate = `=== BUG REPORT / FEATURE REQUEST ===

📱 Device: ${deviceString}
📲 OS: ${osString}
📦 App Version: ${appVersion}
🔧 Modem IP: ${modemIp || 'Not set'}
📅 Date: ${dateString}

---

📝 Description (please fill in):
[Describe the issue you're experiencing. Include any error messages you see.]

🔄 Steps to Reproduce:
1. Open App
2. Enter credentials
3. [What happens next?]

---
`;

    const emailSubject = `[Huawei Manager] Login Issue - ${deviceString}`;
    const githubTitle = encodeURIComponent(`Login Issue - ${deviceString}`);
    const githubBody = encodeURIComponent(reportTemplate);
    const githubUrl = `https://github.com/alrescha79-cmd/huawei-manager-mobile/issues/new?title=${githubTitle}&body=${githubBody}`;

    // Show options dialog
    ThemedAlertHelper.alert(
      t('login.reportIssue'),
      t('login.reportIssueMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'GitHub Issue',
          onPress: () => {
            Linking.openURL(githubUrl).catch(() => {
              ThemedAlertHelper.alert(t('common.error'), 'Could not open GitHub');
            });
          }
        },
        {
          text: 'Email',
          onPress: async () => {
            const isAvailable = await MailComposer.isAvailableAsync();
            if (isAvailable) {
              await MailComposer.composeAsync({
                recipients: ['alrescha79@gmail.com'],
                subject: emailSubject,
                body: reportTemplate,
              });
            } else {
              // Fallback to mailto: link
              const mailtoUrl = `mailto:alrescha79@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(reportTemplate)}`;
              Linking.openURL(mailtoUrl).catch(() => {
                ThemedAlertHelper.alert(t('common.error'), 'Could not open email client');
              });
            }
          }
        }
      ]
    );
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

          {/* Having trouble? Report issue link */}
          <TouchableOpacity
            onPress={handleReportIssue}
            style={styles.reportIssueLink}
          >
            <MaterialIcons name="help-outline" size={16} color={colors.primary} />
            <Text style={[typography.caption1, { color: colors.primary, marginLeft: 4 }]}>
              {t('login.havingTrouble')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* WebView Login Modal */}
      <WebViewLogin
        modemIp={modemIp}
        username={username}
        password={password}
        visible={showWebViewLogin}
        onClose={() => setShowWebViewLogin(false)}
        onLoginSuccess={handleWebViewLoginSuccess}
        onTimeout={() => {
          // Reset auto-login state so user can login manually
          setShowWebViewLogin(false);
          setShowWebViewOption(true);
        }}
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
  reportIssueLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
