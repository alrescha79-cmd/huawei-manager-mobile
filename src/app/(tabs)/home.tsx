import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, ThemedAlertHelper, WebViewLogin, BandSelectionModal, MonthlySettingsModal, DiagnosisResultModal, SpeedtestModal, MeshGradientBackground, AnimatedScreen, BouncingDots, ModernRefreshIndicator, SignalPointingModal, AdBanner, AdNative } from '@/components';
import { QuickActionsCard, ConnectionStatusCard, SignalInfoCard, TrafficStatsCard, ConnectionStatusSkeleton, QuickActionsSkeleton, TrafficStatsSkeleton, homeStyles as styles } from '@/components/home';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { useThemeStore } from '@/stores/theme.store';
import { formatBytes, formatDuration, DurationUnits } from '@/utils/helpers';
import { useTranslation } from '@/i18n';

// Custom Hooks
import { useHomeAuth } from '@/hooks/home/useHomeAuth';
import { useHomeData } from '@/hooks/home/useHomeData';
import { useHomeActions } from '@/hooks/home/useHomeActions';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { usageCardStyle } = useThemeStore();
  const { t } = useTranslation();

  const {
    credentials,
    logout,
    login,
    sessionExpired: authSessionExpired,
    isRelogging,
    setRelogging,
    clearSessionExpired,
    tryQuietSessionRestore
  } = useAuthStore();

  const {
    signalInfo,
    networkInfo,
    trafficStats,
    modemStatus,
    wanInfo,
    mobileDataStatus,
    monthlySettings,
    setMobileDataStatus,
  } = useModemStore();

  const durationUnits: DurationUnits = {
    days: t('common.days'),
    hours: t('common.hours'),
    minutes: t('common.minutes'),
    seconds: t('common.seconds'),
  };

  const [showBandModal, setShowBandModal] = useState(false);
  const [showMonthlySettingsModal, setShowMonthlySettingsModal] = useState(false);
  const [showSpeedtestModal, setShowSpeedtestModal] = useState(false);
  const [showSignalPointingModal, setShowSignalPointingModal] = useState(false);

  // Hook Initialization
  const {
    showReloginWebView,
    setShowReloginWebView,
    isRetryingSilent,
    handleReLogin,
    handleRetrySilent,
    handleReloginSuccess,
  } = useHomeAuth({
    credentials,
    logout,
    login,
    sessionExpired: authSessionExpired,
    setRelogging,
    clearSessionExpired,
    tryQuietSessionRestore,
    modemService: null, // Will be updated by useHomeData if needed, but we can pass it down. 
    // Wait! Let's just pass modemService from useHomeData to useHomeAuth!
    t,
    loadData: async () => { }, // mock initially
    loadBands: async () => { },
  });

  const homeData = useHomeData({ t, showReloginWebView });

  // Re-bind the correct modemService to useHomeAuth functions
  const homeAuth = useHomeAuth({
    credentials,
    logout,
    login,
    sessionExpired: authSessionExpired,
    setRelogging,
    clearSessionExpired,
    tryQuietSessionRestore,
    modemService: homeData.modemService,
    t,
    loadData: homeData.loadData,
    loadBands: homeData.loadBands,
  });

  const homeActions = useHomeActions({
    modemService: homeData.modemService,
    t,
    mobileDataStatus,
    setMobileDataStatus,
    loadData: homeData.loadData,
    loadMonthlySettings: homeData.loadMonthlySettings,
    setLastClearedDate: homeData.setLastClearedDate,
    setPreviousTotalTraffic: homeData.setPreviousTotalTraffic,
  });

  const hasValidData = !!(
    (signalInfo?.rssi && signalInfo.rssi !== '') ||
    (modemStatus?.connectionStatus && modemStatus.connectionStatus !== '')
  );

  return (
    <AnimatedScreen>
      <MeshGradientBackground>
        <ModernRefreshIndicator refreshing={homeData.isRefreshing} />

        <ScrollView
          style={[styles.container, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[
            styles.content,
            { paddingTop: 8 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={homeData.isRefreshing}
              onRefresh={homeData.handleRefresh}
              tintColor="transparent"
              colors={['transparent']}
              progressBackgroundColor="transparent"
              progressViewOffset={-1000}
            />
          }
        >
          <View style={styles.header}>
            {!hasValidData && (
              <TouchableOpacity
                onPress={homeAuth.handleReLogin}
                style={[styles.reLoginButton, { backgroundColor: colors.error }]}
              >
                <Text style={[typography.caption1, { color: '#FFFFFF' }]}>
                  {t('home.reLogin')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!hasValidData && (
            <Card style={{ marginBottom: spacing.md, backgroundColor: colors.error + '10', borderColor: colors.error, borderWidth: 1 }}>
              <Text style={[typography.headline, { color: colors.error, marginBottom: spacing.sm, textAlign: 'center' }]}>
                <MaterialIcons name="warning" size={24} color={colors.error} /> {t('alerts.noSignalData')}
              </Text>
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
              <Text style={[typography.body, { color: colors.text }]}>
                {t('alerts.noSignalMessage')}{'\n\n'}
                <Text style={{ fontWeight: 'bold' }}>{t('alerts.possibleCauses')}</Text>{'\n'}
                • {t('alerts.notLoggedIn')}{'\n'}
                • {t('alerts.sessionExpired')}{'\n'}
                • {t('alerts.modemNotResponding')}
              </Text>

              <TouchableOpacity
                onPress={homeAuth.handleRetrySilent}
                disabled={homeAuth.isRetryingSilent}
                style={[styles.reLoginButtonLarge, {
                  backgroundColor: colors.primary,
                  marginTop: spacing.md,
                  opacity: homeAuth.isRetryingSilent ? 0.7 : 1
                }]}
              >
                {homeAuth.isRetryingSilent ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <BouncingDots size="small" color="#FFFFFF" />
                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600', marginLeft: 8 }]}>
                      {t('common.retrying')}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                      {t('common.retryConnection')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Card>
          )}

          {!signalInfo && homeData.isRefreshing && (
            <>
              <ConnectionStatusSkeleton />
              <QuickActionsSkeleton />
              <TrafficStatsSkeleton />
            </>
          )}

          {signalInfo && (
            <QuickActionsCard
              t={t}
              selectedBands={homeData.selectedBands}
              wanIpAddress={wanInfo?.wanIPAddress}
              mobileDataEnabled={!!mobileDataStatus?.dataswitch}
              isTogglingData={homeActions.isTogglingData}
              isChangingIp={homeActions.isChangingIp}
              isRunningCheck={homeActions.isRunningCheck}
              onOpenBandModal={() => setShowBandModal(true)}
              onChangeIp={homeActions.handleChangeIp}
              onToggleMobileData={homeActions.handleToggleMobileData}
              onSignalPointing={() => setShowSignalPointingModal(true)}
              onQuickCheck={homeActions.handleOneClickCheck}
              onSpeedtest={() => setShowSpeedtestModal(true)}
            />
          )}

          <ConnectionStatusCard
            t={t}
            signalInfo={signalInfo}
            networkInfo={networkInfo}
            modemStatus={modemStatus}
            wanInfo={wanInfo}
            trafficStats={trafficStats}
          />

          <AdBanner />

          <SignalInfoCard
            t={t}
            signalInfo={signalInfo}
            modemStatus={modemStatus}
          />

          {trafficStats && (
            <TrafficStatsCard
              t={t}
              trafficStats={trafficStats}
              monthlySettings={monthlySettings}
              usageCardStyle={usageCardStyle}
              durationUnits={durationUnits}
              lastClearedDate={homeData.lastClearedDate}
              isClearingHistory={homeActions.isClearingHistory}
              onClearHistory={homeActions.handleClearHistory}
              onOpenMonthlySettings={() => setShowMonthlySettingsModal(true)}
            />
          )}

          <AdNative />

          <WebViewLogin
            modemIp={credentials?.modemIp || '192.168.8.1'}
            username={credentials?.username || 'admin'}
            password={credentials?.password || ''}
            visible={homeAuth.showReloginWebView}
            hidden={true}
            onClose={() => {
              homeAuth.setShowReloginWebView(false);
              if (authSessionExpired) {
                ThemedAlertHelper.alert(t('common.error'), t('alerts.sessionExpired'));
              }
            }}
            onLoginSuccess={homeAuth.handleReloginSuccess}
            onTimeout={async () => {
              homeAuth.setShowReloginWebView(false);
              useAuthStore.getState().requestRelogin();
              await logout();
              router.replace('/login');
            }}
          />

          <BandSelectionModal
            visible={showBandModal}
            onClose={() => setShowBandModal(false)}
            modemService={homeData.modemService}
            onSaved={() => {
              if (homeData.modemService) homeData.loadBands(homeData.modemService);
            }}
          />

          <MonthlySettingsModal
            visible={showMonthlySettingsModal}
            onClose={() => setShowMonthlySettingsModal(false)}
            onSave={homeActions.handleSaveMonthlySettings}
            initialSettings={monthlySettings || undefined}
          />

          <DiagnosisResultModal
            visible={homeActions.showDiagnosisModal}
            onClose={() => homeActions.setShowDiagnosisModal(false)}
            title={homeActions.diagnosisTitle}
            results={homeActions.diagnosisResults}
            summary={homeActions.diagnosisSummary}
          />

          <SpeedtestModal
            visible={showSpeedtestModal}
            onClose={() => setShowSpeedtestModal(false)}
          />

          <SignalPointingModal
            visible={showSignalPointingModal}
            onClose={() => setShowSignalPointingModal(false)}
          />
        </ScrollView>
      </MeshGradientBackground>
    </AnimatedScreen>
  );
}
