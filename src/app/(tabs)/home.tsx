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
import { Card, ThemedAlertHelper, WebViewLogin, BandSelectionModal, MonthlySettingsModal, MeshGradientBackground, AnimatedScreen, BouncingDots, RefreshIndicator, SignalPointingModal, AdBanner, AdNative } from '@/components';
import { QuickActionsCard, ConnectionStatusCard, SignalInfoCard, TrafficStatsCard, ConnectionStatusSkeleton, QuickActionsSkeleton, TrafficStatsSkeleton, homeStyles as styles, DiagnosisResultModal, SpeedTestModal, NoSignalModal } from '@/components/home';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { useThemeStore } from '@/stores/theme.store';
import { formatBytes, formatDuration, DurationUnits } from '@/utils/helpers';
import { useTranslation } from '@/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHomeAuth } from '@/hooks/home/useHomeAuth';
import { useHomeData } from '@/hooks/home/useHomeData';
import { useHomeActions } from '@/hooks/home/useHomeActions';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography, spacing, isDark, borderRadius } = useTheme();
  const { usageCardStyle, setUsageCardStyle, themeMode, setThemeMode, signalBubbleEnabled, setSignalBubbleEnabled } = useThemeStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

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
  const [showSpeedTestModal, setShowSpeedTestModal] = useState(false);
  const [showSignalPointingModal, setShowSignalPointingModal] = useState(false);

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
    modemService: null, 
    t,
    loadData: async () => { }, 
    loadBands: async () => { },
  });

  const homeData = useHomeData({ t, showReloginWebView });

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
        <RefreshIndicator refreshing={homeData.isRefreshing} />

        <ScrollView
          style={[styles.container, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[
            styles.content,
            { 
              paddingTop: 8 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0),
              paddingBottom: 110 + (insets.bottom > 0 ? insets.bottom : 16)
            }
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
               mobileDataEnabled={!!mobileDataStatus?.isEnabled}
               isTogglingData={homeActions.isTogglingData}
               isChangingIp={homeActions.isChangingIp}
               isRunningCheck={homeActions.isRunningCheck}
               deviceName={homeData.modemInfo?.deviceName}
               onOpenBandModal={() => setShowBandModal(true)}
               onChangeIp={homeActions.handleChangeIp}
               onToggleMobileData={homeActions.handleToggleMobileData}
               onSignalPointing={() => setShowSignalPointingModal(true)}
               onQuickCheck={homeActions.handleOneClickCheck}
               onSpeedtest={() => setShowSpeedTestModal(true)}
               onOpenMonthlySettings={() => setShowMonthlySettingsModal(true)}
               onToggleUsageStyle={() => setUsageCardStyle(usageCardStyle === 'split' ? 'compact' : 'split')}
               usageCardStyle={usageCardStyle}
               onToggleSignalBubble={() => setSignalBubbleEnabled(!signalBubbleEnabled)}
               onToggleTheme={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
               isSignalBubbleEnabled={signalBubbleEnabled}
               isDarkTheme={isDark}
               monthlySettings={monthlySettings}
             />
           )}

          <ConnectionStatusCard
            t={t}
            signalInfo={signalInfo}
            networkInfo={networkInfo}
            modemStatus={modemStatus}
            wanInfo={wanInfo}
            trafficStats={trafficStats}
            selectedBands={homeData.selectedBands}
          />

          <AdNative />

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
                />
          )}

          <AdBanner />

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

          <SpeedTestModal
            visible={showSpeedTestModal}
            onClose={() => setShowSpeedTestModal(false)}
          />

          <SignalPointingModal
            visible={showSignalPointingModal}
            onClose={() => setShowSignalPointingModal(false)}
          />

          <NoSignalModal
            visible={!hasValidData}
            onRetry={homeAuth.handleRetrySilent}
            isRetrying={homeAuth.isRetryingSilent}
          />
        </ScrollView>
      </MeshGradientBackground>
    </AnimatedScreen>
  );
}
