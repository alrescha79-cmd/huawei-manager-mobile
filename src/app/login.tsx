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
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, Input, Button, WebViewLogin, ThemedAlertHelper, PageSheetModal } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useModemProfileStore } from '@/stores/modemProfile.store';
import { getModemProfilePassword } from '@/utils/storage';
import { networkService } from '@/services/network.service';
import { ModemAPIClient } from '@/services/api.service';
import { useTranslation } from '@/i18n';
import { ModemProfile } from '@/types';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { login, isLoading, error, setError, credentials, loadCredentials } = useAuthStore();
  const { profiles, loadProfiles, addProfile, ensureProfile } = useModemProfileStore();
  const { t } = useTranslation();

  const [modemIp, setModemIp] = useState('192.168.8.1');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [showWebViewLogin, setShowWebViewLogin] = useState(false);
  const [isDirectLogging, setIsDirectLogging] = useState(false);
  const [showWebViewOption, setShowWebViewOption] = useState(false);
  const [isAutoLoginReady, setIsAutoLoginReady] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const initCredentials = async () => {
      await loadCredentials();
      await loadProfiles();
      setIsAutoLoginReady(true);
    };
    initCredentials();
  }, []);

  useEffect(() => {
    if (isAutoLoginReady && credentials) {
      // Pre-select active profile if any
      const active = profiles.find((p) => p.isActive);
      if (active) {
        setSelectedProfileId(active.id);
      }
      setModemIp(credentials.modemIp || '192.168.8.1');
      setUsername(credentials.username || 'admin');
      setPassword(credentials.password || '');
    }
  }, [isAutoLoginReady, credentials]);

  const selectProfile = async (profile: ModemProfile) => {
    setSelectedProfileId(profile.id);
    setModemIp(profile.modemIp);
    setUsername(profile.username);
    const pwd = await getModemProfilePassword(profile.id);
    setPassword(pwd);
    setError(null);
    setShowWebViewOption(false);
  };

  const handleSaveProfile = async () => {
    if (!newProfileName.trim()) {
      ThemedAlertHelper.alert(t('common.error'), t('settings.profileName') + ' ' + t('common.error').toLowerCase());
      return;
    }
    if (profiles.length >= 5) {
      ThemedAlertHelper.alert(t('common.error'), t('settings.profileLimitReached'));
      return;
    }
    setIsSavingProfile(true);
    const result = await addProfile({
      name: newProfileName.trim(),
      modemIp,
      username,
      password,
    });
    setIsSavingProfile(false);
    if (result) {
      setNewProfileName('');
      setShowAddProfile(false);
      setSelectedProfileId(result.id);
    }
  };

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

  const handleLoginPress = async () => {
    setError(null);
    setShowWebViewOption(false);

    if (!modemIp) {
      ThemedAlertHelper.alert(t('common.error'), t('login.enterModemIp'));
      return;
    }

    setIsDirectLogging(true);

    const apiClient = new ModemAPIClient(modemIp);
    let success = false;
    let lastError = null;

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
          // Auto-save profile with default name if this modem IP is not yet saved
          await ensureProfile({ modemIp, username, password });
          setIsDirectLogging(false);
          router.replace('/(tabs)/home');
          return;
        }
      } catch (err: any) {
        lastError = err;
        console.log(`[Login Page] Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    setIsDirectLogging(false);

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

  const handleWebViewLoginSuccess = async () => {
    setShowWebViewLogin(false);

    try {
      await login({
        modemIp,
        username,
        password,
      });
      // Auto-save profile with default name if this modem IP is not yet saved
      await ensureProfile({ modemIp, username, password });

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

  const handleReportIssue = async () => {
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
                recipients: ['anggun@cakson.my.id'],
                subject: emailSubject,
                body: reportTemplate,
              });
            } else {
              const mailtoUrl = `mailto:anggun@cakson.my.id?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(reportTemplate)}`;
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

        {/* Profile Selector */}
        {profiles.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <View style={styles.profileSectionHeader}>
              <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>
                {t('settings.modemProfiles')}
              </Text>
              {profiles.length < 5 && (
                <TouchableOpacity
                  onPress={() => setShowAddProfile(true)}
                  style={[styles.addProfileBtn, { borderColor: colors.primary }]}
                >
                  <MaterialIcons name="add" size={16} color={colors.primary} />
                  <Text style={[typography.caption1, { color: colors.primary, marginLeft: 2 }]}>
                    {t('settings.addProfile')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {profiles.map((profile) => {
                  const isSelected = selectedProfileId === profile.id;
                  return (
                    <TouchableOpacity
                      key={profile.id}
                      onPress={() => selectProfile(profile)}
                      style={[
                        styles.profileChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="router"
                        size={14}
                        color={isSelected ? '#ffffff' : colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          typography.caption1,
                          {
                            color: isSelected ? '#ffffff' : colors.text,
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {profile.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {profiles.length === 0 && (
          <TouchableOpacity
            onPress={() => setShowAddProfile(true)}
            style={[
              styles.emptyProfileBtn,
              { borderColor: colors.border, backgroundColor: colors.card, borderRadius: borderRadius.md },
            ]}
          >
            <MaterialIcons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[typography.caption1, { color: colors.primary, marginLeft: 6 }]}>
              {t('settings.addProfile')}
            </Text>
          </TouchableOpacity>
        )}

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
          <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center' }]}>
            {t('login.appVersion')}: {Constants.expoConfig?.version || '1.0.0'}
          </Text>

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

      <WebViewLogin
        modemIp={modemIp}
        username={username}
        password={password}
        visible={showWebViewLogin}
        onClose={() => setShowWebViewLogin(false)}
        onLoginSuccess={handleWebViewLoginSuccess}
        onTimeout={() => {
          setShowWebViewLogin(false);
          setShowWebViewOption(true);
        }}
      />

      {/* Add Profile Modal */}
      <PageSheetModal
        visible={showAddProfile}
        onClose={() => { setShowAddProfile(false); setNewProfileName(''); }}
        title={t('settings.addProfileTitle')}
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}>
          <Input
            label={t('settings.profileName')}
            value={newProfileName}
            onChangeText={setNewProfileName}
            placeholder={t('settings.profileNamePlaceholder')}
            autoCapitalize="words"
          />
          <Text style={[{ color: '#888', fontSize: 12 }]}>
            IP: {modemIp} · User: {username}
          </Text>
          <Button
            title={isSavingProfile ? t('common.saving') : t('common.save')}
            onPress={handleSaveProfile}
            loading={isSavingProfile}
            disabled={isSavingProfile || !newProfileName.trim()}
          />
        </View>
      </PageSheetModal>
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
  profileSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    minWidth: 90,
    maxWidth: 140,
  },
  emptyProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 10,
    marginBottom: 12,
  },
});
