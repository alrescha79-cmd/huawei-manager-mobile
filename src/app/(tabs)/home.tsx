import React, { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, ThemedAlertHelper, WebViewLogin, BandSelectionModal, getSelectedBandsDisplay, MonthlySettingsModal, DiagnosisResultModal, SpeedtestModal, MeshGradientBackground, AnimatedScreen, BouncingDots, ModernRefreshIndicator, CustomRefreshScrollView } from '@/components';
import { QuickActionsCard, ConnectionStatusCard, NoDataWarningCard, SignalInfoCard, TrafficStatsCard, ConnectionStatusSkeleton, QuickActionsSkeleton, TrafficStatsSkeleton, homeStyles as styles } from '@/components/home';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { useThemeStore } from '@/stores/theme.store';
import { ModemService } from '@/services/modem.service';
import { formatBytes, formatDuration, DurationUnits } from '@/utils/helpers';
import { useTranslation } from '@/i18n';
import { checkDailyUsageNotification, checkMonthlyUsageNotification, checkIPChangeNotification, sendDebugModeReminder, saveLastActiveTime } from '@/services/notification.service';
import { useDebugStore } from '@/stores/debug.store';
import { useSMSStore } from '@/stores/sms.store';
import { useWiFiStore } from '@/stores/wifi.store';
import { SMSService } from '@/services/sms.service';
import { WiFiService } from '@/services/wifi.service';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography, spacing, isDark } = useTheme();
  const { usageCardStyle } = useThemeStore();
  const {
    credentials,
    logout,
    login,
    sessionExpired: authSessionExpired,
    isRelogging,
    setRelogging,
    clearSessionExpired,
    requestRelogin,
    tryQuietSessionRestore
  } = useAuthStore();
  const { t } = useTranslation();

  const durationUnits: DurationUnits = {
    days: t('common.days'),
    hours: t('common.hours'),
    minutes: t('common.minutes'),
    seconds: t('common.seconds'),
  };

  const {
    signalInfo,
    networkInfo,
    trafficStats,
    modemStatus,
    wanInfo,
    mobileDataStatus,
    monthlySettings,
    isUsingCache,
    setSignalInfo,
    setNetworkInfo,
    setTrafficStats,
    setModemStatus,
    setWanInfo,
    setMobileDataStatus,
    setMonthlySettings,
    loadFromCache,
  } = useModemStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [modemService, setModemService] = useState<ModemService | null>(null);

  const [isTogglingData, setIsTogglingData] = useState(false);
  const [isChangingIp, setIsChangingIp] = useState(false);
  const [showReloginWebView, setShowReloginWebView] = useState(false);
  const [isBackgroundLogging, setIsBackgroundLogging] = useState(false);
  const [reloginAttempts, setReloginAttempts] = useState(0);
  const [selectedBands, setSelectedBands] = useState<string[]>([]);
  const [showBandModal, setShowBandModal] = useState(false);
  const [showMonthlySettingsModal, setShowMonthlySettingsModal] = useState(false);
  const [isRunningDiagnosis, setIsRunningDiagnosis] = useState(false);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isRetryingSilent, setIsRetryingSilent] = useState(false);

  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagnosisTitle, setDiagnosisTitle] = useState('');
  const [diagnosisResults, setDiagnosisResults] = useState<{ label: string; success: boolean; value?: string }[]>([]);
  const [diagnosisSummary, setDiagnosisSummary] = useState('');

  const [showSpeedtestModal, setShowSpeedtestModal] = useState(false);

  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [lastClearedDate, setLastClearedDate] = useState<string | null>(null);
  const [previousTotalTraffic, setPreviousTotalTraffic] = useState<number>(0);

  useEffect(() => {
    const loadLastClearedDate = async () => {
      try {
        const date = await AsyncStorage.getItem('lastClearedTrafficDate');
        if (date) setLastClearedDate(date);

        const prevTotal = await AsyncStorage.getItem('previousTotalTraffic');
        if (prevTotal) setPreviousTotalTraffic(parseInt(prevTotal));
      } catch (error) {
      }
    };
    loadLastClearedDate();
  }, []);

  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new ModemService(credentials.modemIp);
      setModemService(service);

      const initializeData = async () => {
        const hasCachedData = await loadFromCache();

        loadData(service);
        loadBands(service);
        loadMonthlySettings(service);

        try {
          const smsService = new SMSService(credentials.modemIp);
          const isSupported = await smsService.isSMSSupported();
          if (isSupported) {
            const smsCount = await smsService.getSMSCount();
            useSMSStore.getState().setSMSCount(smsCount);
          }
        } catch (e) {
          console.error('Failed to load SMS count:', e);
        }

        try {
          const wifiService = new WiFiService(credentials.modemIp);
          const devices = await wifiService.getConnectedDevices();
          useWiFiStore.getState().setConnectedDevices(devices);
        } catch (e) {
          console.error('Failed to load WiFi devices:', e);
        }
      };

      initializeData();
      const checkDebugReminder = async () => {
        const debugStore = useDebugStore.getState();
        if (debugStore.debugEnabled) {
          await sendDebugModeReminder({
            title: t('notifications.debugModeReminderTitle'),
            body: t('notifications.debugModeReminderBody'),
          });
        }
        await saveLastActiveTime();
      };
      checkDebugReminder();

      const fastIntervalId = setInterval(() => {
        loadTrafficOnly(service);
      }, 1000);

      const slowIntervalId = setInterval(() => {
        loadDataSilent(service);
      }, 5000);

      return () => {
        clearInterval(fastIntervalId);
        clearInterval(slowIntervalId);
      };
    }
  }, [credentials]);

  useEffect(() => {
    if (!isRelogging && modemService) {
      loadData(modemService);
      loadBands(modemService);
    }
  }, [isRelogging]);

  const loadData = async (service: ModemService) => {
    try {
      setIsRefreshing(true);

      const [signal, network, traffic, status, wan, dataStatus] = await Promise.all([
        service.getSignalInfo(),
        service.getNetworkInfo(),
        service.getTrafficStats(),
        service.getModemStatus(),
        service.getWanInfo().catch(() => null),
        service.getMobileDataStatus().catch(() => null),
      ]);

      setSignalInfo(signal);
      setNetworkInfo(network);
      setTrafficStats(traffic);
      setModemStatus(status);
      if (wan) setWanInfo(wan);
      if (dataStatus) setMobileDataStatus(dataStatus);

      const currentTotal = traffic.totalDownload + traffic.totalUpload;
      if (previousTotalTraffic > 1024 * 1024 * 100 && currentTotal < previousTotalTraffic * 0.1) {
        const now = new Date().toISOString();
        await AsyncStorage.setItem('lastClearedTrafficDate', now);
        setLastClearedDate(now);
      }

      if (currentTotal > 1024 * 1024) {
        setPreviousTotalTraffic(currentTotal);
        await AsyncStorage.setItem('previousTotalTraffic', currentTotal.toString());
      }

      if (traffic && monthlySettings?.enabled) {
        const dataLimitInGB = monthlySettings.dataLimitUnit === 'GB'
          ? monthlySettings.dataLimit
          : monthlySettings.dataLimit / 1024;

        checkDailyUsageNotification(
          traffic.dayUsed || 0,
          dataLimitInGB,
          monthlySettings.monthThreshold,
          {
            title: t('notifications.dailyUsageTitle'),
            body: (used, limit) => t('notifications.dailyUsageBody', { used, limit }),
          }
        );

        checkMonthlyUsageNotification(
          traffic.monthDownload + traffic.monthUpload,
          dataLimitInGB,
          monthlySettings.monthThreshold,
          {
            title: t('notifications.monthlyUsageTitle'),
            body: (used, limit) => t('notifications.monthlyUsageBody', { used, limit }),
          }
        );

        checkIPChangeNotification(traffic.currentConnectTime || 0, {
          title: t('notifications.ipChangeTitle'),
          body: (duration) => duration === '0'
            ? t('notifications.ipChangeBodyJustNow')
            : t('notifications.ipChangeBody', { duration }),
        });
      }

      const isDataEmpty = !signal?.rsrp && !signal?.rssi && !status?.connectionStatus;

      if (isDataEmpty && credentials && reloginAttempts < 3 && !showReloginWebView) {
        requestRelogin();
        setReloginAttempts(prev => prev + 1);
      } else if (!isDataEmpty) {
        clearSessionExpired();
        setReloginAttempts(0);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);

      const errorMessage = error?.message || '';
      const isSessionError = errorMessage.includes('125003') ||
        errorMessage.includes('session') ||
        errorMessage.includes('login') ||
        !signalInfo;


      if (isSessionError && credentials && reloginAttempts < 3 && !showReloginWebView) {
        requestRelogin();
        setReloginAttempts(prev => prev + 1);
      } else {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.failedLoadModemData'));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadDataSilent = async (service: ModemService) => {
    try {
      const [signal, network, traffic, status, wan, dataStatus] = await Promise.all([
        service.getSignalInfo(),
        service.getNetworkInfo(),
        service.getTrafficStats(),
        service.getModemStatus(),
        service.getWanInfo().catch(() => null),
        service.getMobileDataStatus().catch(() => null),
      ]);


      setSignalInfo(signal);
      setNetworkInfo(network);
      setTrafficStats(traffic);
      setModemStatus(status);
      if (wan) setWanInfo(wan);
      if (dataStatus) setMobileDataStatus(dataStatus);

      const isDataEmpty = !signal?.rsrp && !signal?.rssi && !status?.connectionStatus;

      if (isDataEmpty && credentials && reloginAttempts < 3 && !showReloginWebView) {
        requestRelogin();
        setReloginAttempts(prev => prev + 1);
      } else if (!isDataEmpty) {
        clearSessionExpired();
        setReloginAttempts(0);
      }

    } catch (error: any) {
      const errorMessage = error?.message || '';
      const isSessionError = errorMessage.includes('125003') ||
        errorMessage.includes('session') ||
        !signalInfo;


      if (isSessionError && credentials && reloginAttempts < 3 && !showReloginWebView) {
        requestRelogin();
        setReloginAttempts(prev => prev + 1);
      }
    }
  };

  const loadTrafficOnly = async (service: ModemService) => {
    try {
      const traffic = await service.getTrafficStats();
      setTrafficStats(traffic);
    } catch (error) {
      console.error('Error loading traffic data:', error);
    }
  };

  const handleRefresh = () => {
    if (modemService) {
      loadData(modemService);
      loadBands(modemService);
      loadMonthlySettings(modemService);
    }
  };

  const loadBands = async (service: ModemService) => {
    try {
      const bands = await service.getBandSettings();
      if (bands && bands.lteBand) {
        const bandNames = getSelectedBandsDisplay(bands.lteBand);
        setSelectedBands(bandNames.length > 0 ? bandNames : [t('common.all')]);
      }
    } catch (error) {
      console.error('Error loading bands:', error);
    }
  };

  const loadMonthlySettings = async (service: ModemService) => {
    try {
      const settings = await service.getMonthlyDataSettings();
      setMonthlySettings(settings);
    } catch (error) {
      console.error('Error loading monthly settings:', error);
    }
  };

  const handleSaveMonthlySettings = async (settings: {
    enabled: boolean;
    startDay: number;
    dataLimit: number;
    dataLimitUnit: 'MB' | 'GB';
    monthThreshold: number;
  }) => {
    if (!modemService) return;

    try {
      await modemService.setMonthlyDataSettings(settings);
      ThemedAlertHelper.alert(t('common.success'), t('home.monthlySettingsSaved'));
      loadMonthlySettings(modemService);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('home.failedSaveMonthlySettings'));
      throw error;
    }
  };

  const handleReloginSuccess = async () => {
    setShowReloginWebView(false);
    setRelogging(false);
    clearSessionExpired();

    if (credentials) {
      await login({
        modemIp: credentials.modemIp,
        username: credentials.username,
        password: credentials.password,
      });
    }

    if (modemService) {
      loadData(modemService);
    }
  };

  const handleClearHistory = () => {
    ThemedAlertHelper.alert(
      t('home.clearHistory'),
      t('home.clearHistoryConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            if (!modemService) return;
            setIsClearingHistory(true);
            try {
              const success = await modemService.clearTrafficHistory();
              if (success) {
                const now = new Date().toISOString();
                await AsyncStorage.setItem('lastClearedTrafficDate', now);
                setLastClearedDate(now);
                setPreviousTotalTraffic(0);
                await AsyncStorage.setItem('previousTotalTraffic', '0');
                loadData(modemService);
                ThemedAlertHelper.alert(t('common.success'), t('home.historyClearedSuccess'));
              } else {
                ThemedAlertHelper.alert(t('common.error'), t('home.clearHistoryFailed'));
              }
            } catch (error) {
              ThemedAlertHelper.alert(t('common.error'), t('home.clearHistoryFailed'));
            } finally {
              setIsClearingHistory(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleMobileData = async () => {
    if (!modemService || isTogglingData) return;

    const newState = !mobileDataStatus?.dataswitch;

    const performToggle = async () => {
      setIsTogglingData(true);
      try {
        await modemService.toggleMobileData(newState);
        const dataStatus = await modemService.getMobileDataStatus();
        setMobileDataStatus(dataStatus);
        ThemedAlertHelper.alert(t('common.success'), newState ? t('home.dataEnabled') : t('home.dataDisabled'));
      } catch (error) {
        console.error('Error toggling mobile data:', error);
        ThemedAlertHelper.alert(t('common.error'), t('alerts.failedToggleData'));
      } finally {
        setIsTogglingData(false);
      }
    };

    if (!newState) {
      ThemedAlertHelper.alert(
        t('home.disableData'),
        t('home.confirmDisableData'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), onPress: performToggle },
        ]
      );
    } else {
      performToggle();
    }
  };

  const handleChangeIp = async () => {
    if (!modemService || isChangingIp) return;

    ThemedAlertHelper.alert(
      t('alerts.changeIpTitle'),
      t('alerts.changeIpMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue'),
          onPress: async () => {
            setIsChangingIp(true);

            ThemedAlertHelper.alert(
              t('alerts.ipChangeStartedTitle'),
              t('alerts.ipChangeStartedMessage'),
              [{ text: t('common.ok') }]
            );

            modemService.triggerPlmnScan().catch((error) => {
            });

            setTimeout(() => {
              setIsChangingIp(false);
            }, 10000);

            setTimeout(() => {
              if (modemService) {
                loadData(modemService);
              }
            }, 45000);
          },
        },
      ]
    );
  };

  const handleDiagnosis = async () => {
    if (!modemService || isRunningDiagnosis) return;

    if (!mobileDataStatus?.dataswitch) {
      ThemedAlertHelper.alert(
        t('common.error'),
        t('alerts.mobileDataRequired')
      );
      return;
    }

    setIsRunningDiagnosis(true);
    try {
      let result = await modemService.diagnosisPing('google.com', 5000);

      if (!result.success) {
        result = await modemService.diagnosisPing('1.1.1.1', 4000);
      }

      setDiagnosisTitle(t('home.diagnosisResult'));
      setDiagnosisResults([
        { label: `Ping ${result.host}`, success: result.success },
      ]);
      setDiagnosisSummary(result.success ? t('home.connectionOk') || 'Connection is working!' : t('home.connectionFailed') || 'Could not reach server');
      setShowDiagnosisModal(true);
    } catch (error: any) {
      console.error('Error running diagnosis ping:', error);
      if (error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK') {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.networkError'));
      } else {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.diagnosisFailed'));
      }
    } finally {
      setIsRunningDiagnosis(false);
    }
  };

  const handleOneClickCheck = async () => {
    if (!modemService || isRunningCheck) return;

    if (!mobileDataStatus?.dataswitch) {
      ThemedAlertHelper.alert(
        t('common.error'),
        t('alerts.mobileDataRequired')
      );
      return;
    }

    setIsRunningCheck(true);
    try {
      const result = await modemService.oneClickCheck();

      setDiagnosisTitle(t('home.oneClickCheckResult'));
      setDiagnosisResults([
        { label: t('home.internetConnection'), success: result.internetConnection },
        { label: t('home.dnsResolution'), success: result.dnsResolution },
        { label: t('home.status'), success: result.networkStatus === 'Connected', value: result.networkStatus },
        { label: t('home.signalStrength'), success: true, value: result.signalStrength },
      ]);
      setDiagnosisSummary(t(`home.${result.summaryKey}`));
      setShowDiagnosisModal(true);
    } catch (error: any) {
      console.error('Error running one click check:', error);
      if (error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK') {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.networkError'));
      } else {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.checkFailed'));
      }
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handleReLogin = () => {
    ThemedAlertHelper.alert(
      t('home.reLogin'),
      t('home.checkLogin'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('home.reLogin'),
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleRetrySilent = async () => {
    if (isRetryingSilent) return;
    setIsRetryingSilent(true);

    let success = false;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[Home] Silent login attempt ${attempt}/${maxAttempts}...`);
      try {
        const restored = await tryQuietSessionRestore();
        if (restored) {
          success = true;
          if (modemService) {
            loadData(modemService);
            loadBands(modemService);
          }
          break;
        }
      } catch (error) {
        console.error(`[Home] Silent login attempt ${attempt} failed:`, error);
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsRetryingSilent(false);

    if (!success) {
      ThemedAlertHelper.alert(
        t('alerts.sessionExpired'),
        t('alerts.silentLoginFailed'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.goToLogin'),
            onPress: async () => {
              await logout();
              router.replace('/login');
            },
          },
        ]
      );
    }
  };

  const hasValidData = !!(
    (signalInfo?.rssi && signalInfo.rssi !== '') ||
    (modemStatus?.connectionStatus && modemStatus.connectionStatus !== '')
  );

  return (
    <AnimatedScreen>
      <MeshGradientBackground>
        <ModernRefreshIndicator refreshing={isRefreshing} />

        <ScrollView
          style={[styles.container, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[
            styles.content,
            { paddingTop: 8 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
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
                onPress={handleReLogin}
                style={[styles.reLoginButton, { backgroundColor: colors.error }]}
              >
                <Text style={[typography.caption1, { color: '#FFFFFF' }]}>
                  {t('home.reLogin')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Warning if no valid data */}
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

              {/* Retry Silent Login Button */}
              <TouchableOpacity
                onPress={handleRetrySilent}
                disabled={isRetryingSilent}
                style={[styles.reLoginButtonLarge, {
                  backgroundColor: colors.primary,
                  marginTop: spacing.md,
                  opacity: isRetryingSilent ? 0.7 : 1
                }]}
              >
                {isRetryingSilent ? (
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

              {/* Go to Login Button */}
              {/* <TouchableOpacity
                onPress={handleReLogin}
                style={[styles.reLoginButtonLarge, {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: colors.error,
                  marginTop: spacing.sm
                }]}
              >
                <Text style={[typography.body, { color: colors.error, fontWeight: '600' }]}>
                  {t('common.goToLogin')}
                </Text>
              </TouchableOpacity> */}
            </Card>
          )}

          {/* Show skeletons during initial load */}
          {!signalInfo && isRefreshing && (
            <>
              <ConnectionStatusSkeleton />
              <QuickActionsSkeleton />
              <TrafficStatsSkeleton />
            </>
          )}

          {signalInfo && (
            <ConnectionStatusCard
              t={t}
              signalInfo={signalInfo}
              networkInfo={networkInfo}
              modemStatus={modemStatus}
              wanInfo={wanInfo}
            />
          )}

          <QuickActionsCard
            t={t}
            selectedBands={selectedBands}
            wanIpAddress={wanInfo?.wanIPAddress}
            mobileDataEnabled={!!mobileDataStatus?.dataswitch}
            isTogglingData={isTogglingData}
            isChangingIp={isChangingIp}
            isRunningDiagnosis={isRunningDiagnosis}
            isRunningCheck={isRunningCheck}
            onOpenBandModal={() => setShowBandModal(true)}
            onChangeIp={handleChangeIp}
            onToggleMobileData={handleToggleMobileData}
            onDiagnosis={handleDiagnosis}
            onQuickCheck={handleOneClickCheck}
            onSpeedtest={() => setShowSpeedtestModal(true)}
          />

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
              lastClearedDate={lastClearedDate}
              isClearingHistory={isClearingHistory}
              onClearHistory={handleClearHistory}
              onOpenMonthlySettings={() => setShowMonthlySettingsModal(true)}
            />
          )}

          {/* Hidden WebView for auto re-login when session expires */}
          <WebViewLogin
            modemIp={credentials?.modemIp || '192.168.8.1'}
            username={credentials?.username || 'admin'}
            password={credentials?.password || ''}
            visible={showReloginWebView}
            hidden={true}
            onClose={() => {
              setShowReloginWebView(false);
              if (authSessionExpired) {
                ThemedAlertHelper.alert(t('common.error'), t('alerts.sessionExpired'));
              }
            }}
            onLoginSuccess={handleReloginSuccess}
            onTimeout={async () => {
              setShowReloginWebView(false);
              requestRelogin();
              await logout();
              router.replace('/login');
            }}
          />

          {/* LTE Band Selection Modal */}
          <BandSelectionModal
            visible={showBandModal}
            onClose={() => setShowBandModal(false)}
            modemService={modemService}
            onSaved={() => {
              if (modemService) loadBands(modemService);
            }}
          />

          {/* Monthly Usage Settings Modal */}
          <MonthlySettingsModal
            visible={showMonthlySettingsModal}
            onClose={() => setShowMonthlySettingsModal(false)}
            onSave={handleSaveMonthlySettings}
            initialSettings={monthlySettings || undefined}
          />

          {/* Diagnosis Result Modal */}
          <DiagnosisResultModal
            visible={showDiagnosisModal}
            onClose={() => setShowDiagnosisModal(false)}
            title={diagnosisTitle}
            results={diagnosisResults}
            summary={diagnosisSummary}
          />

          {/* Speedtest Modal */}
          <SpeedtestModal
            visible={showSpeedtestModal}
            onClose={() => setShowSpeedtestModal(false)}
          />
        </ScrollView>
      </MeshGradientBackground>
    </AnimatedScreen>
  );
}

