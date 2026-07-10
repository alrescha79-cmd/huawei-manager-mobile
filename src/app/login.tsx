import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, Input, Button, WebViewLogin, PageSheetModal } from '@/components';
import { useTranslation } from '@/i18n';
import { useLogin } from '@/hooks/useLogin';

export default function LoginScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { t } = useTranslation();

  const {
    modemIp, setModemIp, username, setUsername, password, setPassword,
    error, isLoading, isDetecting, isDirectLogging,
    showWebViewLogin, setShowWebViewLogin, showWebViewOption,
    profiles, selectedProfileId, showAddProfile, setShowAddProfile,
    newProfileName, setNewProfileName, isSavingProfile,
    selectProfile, handleSaveProfile, detectModemIP,
    handleLoginPress, handleWebViewLoginSuccess, handleReportIssue,
  } = useLogin({ t });

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
