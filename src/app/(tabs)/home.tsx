import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader, CollapsibleCard, InfoRow, SignalBar, SignalMeter, SpeedGauge, ThemedAlertHelper, WebViewLogin, BandSelectionModal, getSelectedBandsDisplay, UsageCard, DailyUsageCard, SignalCard, MonthlySettingsModal, DiagnosisResultModal, SpeedtestModal, CompactUsageCard, MeshGradientBackground, AnimatedScreen, MonthlyComparisonCard } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { useThemeStore } from '@/stores/theme.store';
import { ModemService } from '@/services/modem.service';
import {
  formatBytes,
  formatBitsPerSecond,
  formatDuration,
  DurationUnits,
  getSignalIcon,
  getSignalStrength,
  getSignalIconFromModemStatus,
  getSignalStrengthFromIcon,
  getConnectionStatusText,
  getNetworkTypeText,
  getLteBandInfo,
} from '@/utils/helpers';
import { useTranslation } from '@/i18n';
import { checkDailyUsageNotification, checkMonthlyUsageNotification, checkIPChangeNotification, sendDebugModeReminder, saveLastActiveTime } from '@/services/notification.service';
import { useDebugStore } from '@/stores/debug.store';
import { useSMSStore } from '@/stores/sms.store';
import { useWiFiStore } from '@/stores/wifi.store';
import { SMSService } from '@/services/sms.service';
import { WiFiService } from '@/services/wifi.service';

// Helper to determine signal quality based on thresholds
const getSignalQuality = (
  value: number,
  thresholds: { excellent: number; good: number; fair: number; poor: number },
  reverseScale: boolean
): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' => {
  if (isNaN(value)) return 'unknown';

  if (reverseScale) {
    // Higher value is better (e.g., RSSI: -60 is better than -90)
    if (value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.fair) return 'fair';
    return 'poor';
  } else {
    // Higher value is better in normal scale (e.g., SINR: 20 is better than 5)
    if (value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.fair) return 'fair';
    return 'poor';
  }
};

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

  // Duration units for i18n-aware formatting
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
  const [modemService, setModemService] = useState<ModemService | null>(null);

  const [isTogglingData, setIsTogglingData] = useState(false);
  const [isChangingIp, setIsChangingIp] = useState(false);
  const [showReloginWebView, setShowReloginWebView] = useState(false);
  const [isBackgroundLogging, setIsBackgroundLogging] = useState(false); // Silent background login
  const [reloginAttempts, setReloginAttempts] = useState(0);
  const [selectedBands, setSelectedBands] = useState<string[]>([]);
  const [showBandModal, setShowBandModal] = useState(false);
  const [showMonthlySettingsModal, setShowMonthlySettingsModal] = useState(false);
  const [isRunningDiagnosis, setIsRunningDiagnosis] = useState(false);
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  // Diagnosis result modal state
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagnosisTitle, setDiagnosisTitle] = useState('');
  const [diagnosisResults, setDiagnosisResults] = useState<{ label: string; success: boolean; value?: string }[]>([]);
  const [diagnosisSummary, setDiagnosisSummary] = useState('');

  // Speedtest modal state
  const [showSpeedtestModal, setShowSpeedtestModal] = useState(false);

  // Clear history state
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [lastClearedDate, setLastClearedDate] = useState<string | null>(null);
  const [previousTotalTraffic, setPreviousTotalTraffic] = useState<number>(0);

  // Load last cleared date from storage
  useEffect(() => {
    const loadLastClearedDate = async () => {
      try {
        const date = await AsyncStorage.getItem('lastClearedTrafficDate');
        if (date) setLastClearedDate(date);

        // Load previous total traffic for comparison
        const prevTotal = await AsyncStorage.getItem('previousTotalTraffic');
        if (prevTotal) setPreviousTotalTraffic(parseInt(prevTotal));
      } catch (error) {
        // Ignore error
      }
    };
    loadLastClearedDate();
  }, []);

  // Auto-refresh interval (fast for speed, slower for other data)
  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new ModemService(credentials.modemIp);
      setModemService(service);

      // Load cached data first for instant display
      const initializeData = async () => {
        const hasCachedData = await loadFromCache();

        // Try to load fresh data (will trigger background login if needed)
        loadData(service);
        loadBands(service);
        loadMonthlySettings(service);

        // Load SMS count for tab badge
        try {
          const smsService = new SMSService(credentials.modemIp);
          const isSupported = await smsService.isSMSSupported();
          if (isSupported) {
            const smsCount = await smsService.getSMSCount();
            useSMSStore.getState().setSMSCount(smsCount);
          }
        } catch (e) {
          // SMS loading failed silently
        }

        // Load WiFi connected devices for tab badge
        try {
          const wifiService = new WiFiService(credentials.modemIp);
          const devices = await wifiService.getConnectedDevices();
          useWiFiStore.getState().setConnectedDevices(devices);
        } catch (e) {
          // WiFi loading failed silently
        }
      };

      initializeData();

      // Check for debug mode reminder after login
      const checkDebugReminder = async () => {
        const debugStore = useDebugStore.getState();
        if (debugStore.debugEnabled) {
          await sendDebugModeReminder({
            title: t('notifications.debugModeReminderTitle'),
            body: t('notifications.debugModeReminderBody'),
          });
        }
        // Save last active time for inactivity tracking
        await saveLastActiveTime();
      };
      checkDebugReminder();

      // Fast refresh for traffic/speed data only (every 1 second)
      const fastIntervalId = setInterval(() => {
        loadTrafficOnly(service);
      }, 1000); // Speed updates every 1 second

      // Slower refresh for all other data (every 5 seconds)
      const slowIntervalId = setInterval(() => {
        loadDataSilent(service);
      }, 5000); // Full data every 5 seconds

      return () => {
        clearInterval(fastIntervalId);
        clearInterval(slowIntervalId);
      };
    }
  }, [credentials]);

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

      // Auto-detect if traffic history was cleared
      const currentTotal = traffic.totalDownload + traffic.totalUpload;
      if (previousTotalTraffic > 1024 * 1024 * 100 && currentTotal < previousTotalTraffic * 0.1) {
        // Total traffic dropped significantly (less than 10% of previous, and previous was > 100MB)
        // This indicates history was cleared from modem web interface or other app
        const now = new Date().toISOString();
        await AsyncStorage.setItem('lastClearedTrafficDate', now);
        setLastClearedDate(now);
      }

      // Save current total for next comparison (only if significant)
      if (currentTotal > 1024 * 1024) { // Only save if > 1MB
        setPreviousTotalTraffic(currentTotal);
        await AsyncStorage.setItem('previousTotalTraffic', currentTotal.toString());
      }

      // Check for push notifications
      if (traffic && monthlySettings?.enabled) {
        const dataLimitInGB = monthlySettings.dataLimitUnit === 'GB'
          ? monthlySettings.dataLimit
          : monthlySettings.dataLimit / 1024;

        // Check daily usage threshold notification
        checkDailyUsageNotification(
          traffic.dayUsed || 0,
          dataLimitInGB,
          monthlySettings.monthThreshold,
          {
            title: t('notifications.dailyUsageTitle'),
            body: (used, limit) => t('notifications.dailyUsageBody', { used, limit }),
          }
        );

        // Check monthly usage threshold notification
        checkMonthlyUsageNotification(
          traffic.monthDownload + traffic.monthUpload,
          dataLimitInGB,
          monthlySettings.monthThreshold,
          {
            title: t('notifications.monthlyUsageTitle'),
            body: (used, limit) => t('notifications.monthlyUsageBody', { used, limit }),
          }
        );

        // Check IP change notification (via session duration reset)
        checkIPChangeNotification(traffic.currentConnectTime || 0, {
          title: t('notifications.ipChangeTitle'),
          body: (duration) => duration === '0'
            ? t('notifications.ipChangeBodyJustNow')
            : t('notifications.ipChangeBody', { duration }),
        });
      }

      // Check if data is empty (session expired returns empty values)
      const isDataEmpty = !signal?.rsrp && !signal?.rssi && !status?.connectionStatus;

      if (isDataEmpty && credentials && reloginAttempts < 3 && !showReloginWebView) {
        // Session expired, trigger re-login via WebView with loading animation
        requestRelogin();
        setShowReloginWebView(true);
        setReloginAttempts(prev => prev + 1);
      } else if (!isDataEmpty) {
        // Session is valid, reset expired state
        clearSessionExpired();
        setReloginAttempts(0);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);

      // Check if this is a session/auth error (no valid data means session expired)
      const errorMessage = error?.message || '';
      const isSessionError = errorMessage.includes('125003') ||
        errorMessage.includes('session') ||
        errorMessage.includes('login') ||
        !signalInfo; // No signal data might indicate session issue


      if (isSessionError && credentials && reloginAttempts < 3 && !showReloginWebView) {
        // Session expired, trigger re-login via WebView with loading animation
        requestRelogin();
        setShowReloginWebView(true);
        setReloginAttempts(prev => prev + 1);
      } else {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.failedLoadModemData'));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Silent background refresh without showing loading indicator
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

      // Log background updates (lighter logging)
      // Background update successful

      setSignalInfo(signal);
      setNetworkInfo(network);
      setTrafficStats(traffic);
      setModemStatus(status);
      if (wan) setWanInfo(wan);
      if (dataStatus) setMobileDataStatus(dataStatus);

      // Check if data is empty (session expired returns empty values)
      const isDataEmpty = !signal?.rsrp && !signal?.rssi && !status?.connectionStatus;

      if (isDataEmpty && credentials && reloginAttempts < 3 && !showReloginWebView) {
        // Session expired, trigger re-login via WebView with loading animation
        requestRelogin();
        setShowReloginWebView(true);
        setReloginAttempts(prev => prev + 1);
      } else if (!isDataEmpty) {
        // Session is valid
        clearSessionExpired();
        setReloginAttempts(0);
      }

    } catch (error: any) {
      // Check if session expired in background
      const errorMessage = error?.message || '';
      const isSessionError = errorMessage.includes('125003') ||
        errorMessage.includes('session') ||
        !signalInfo;


      if (isSessionError && credentials && reloginAttempts < 3 && !showReloginWebView) {
        // Session expired, trigger re-login via WebView with loading animation
        requestRelogin();
        setShowReloginWebView(true);
        setReloginAttempts(prev => prev + 1);
      }
    }
  };

  // Fast traffic-only refresh for realtime speed display
  const loadTrafficOnly = async (service: ModemService) => {
    try {
      const traffic = await service.getTrafficStats();
      setTrafficStats(traffic);
    } catch (error) {
      // Silent fail
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
      // Silent fail
    }
  };

  const loadMonthlySettings = async (service: ModemService) => {
    try {
      const settings = await service.getMonthlyDataSettings();
      setMonthlySettings(settings);
    } catch (error) {
      // Silent fail
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
      // Reload settings
      loadMonthlySettings(modemService);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('home.failedSaveMonthlySettings'));
      throw error;
    }
  };

  // Handle successful re-login from WebView
  const handleReloginSuccess = async () => {
    setShowReloginWebView(false);
    setRelogging(false);
    clearSessionExpired();

    // Re-save credentials with new timestamp
    if (credentials) {
      await login({
        modemIp: credentials.modemIp,
        username: credentials.username,
        password: credentials.password,
      });
    }

    // Reload data after successful re-login
    if (modemService) {
      loadData(modemService);
    }
  };

  // Handle clear traffic history
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
                // Reset previous total traffic
                setPreviousTotalTraffic(0);
                await AsyncStorage.setItem('previousTotalTraffic', '0');
                // Reload traffic data
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

    // Helper function to perform the toggle
    const performToggle = async () => {
      setIsTogglingData(true);
      try {
        await modemService.toggleMobileData(newState);
        // Refresh data after toggle
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

    // Only show confirmation when disabling data
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
      // Enable data directly without confirmation
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

            // Show immediate feedback - the scan is being triggered
            ThemedAlertHelper.alert(
              t('alerts.ipChangeStartedTitle'),
              t('alerts.ipChangeStartedMessage'),
              [{ text: t('common.ok') }]
            );

            // Fire and forget - don't wait for response as PLMN scan takes 30-60s
            modemService.triggerPlmnScan().catch((error) => {
              // This error is expected due to timeout during reconnection
              // Expected timeout during PLMN scan
            });

            // Keep loading state for 10 seconds then allow retry
            setTimeout(() => {
              setIsChangingIp(false);
            }, 10000);

            // Refresh data after 45 seconds to get new IP
            setTimeout(() => {
              if (modemService) {
                // Refresh data to get new IP
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

    // Check if mobile data is enabled first
    if (!mobileDataStatus?.dataswitch) {
      ThemedAlertHelper.alert(
        t('common.error'),
        t('alerts.mobileDataRequired')
      );
      return;
    }

    setIsRunningDiagnosis(true);
    try {
      // Try google.com first
      let result = await modemService.diagnosisPing('google.com', 5000);

      // If google.com fails, try 1.1.1.1 as fallback
      if (!result.success) {
        result = await modemService.diagnosisPing('1.1.1.1', 4000);
      }

      // Show result in modal
      setDiagnosisTitle(t('home.diagnosisResult'));
      setDiagnosisResults([
        { label: `Ping ${result.host}`, success: result.success },
      ]);
      setDiagnosisSummary(result.success ? t('home.connectionOk') || 'Connection is working!' : t('home.connectionFailed') || 'Could not reach server');
      setShowDiagnosisModal(true);
    } catch (error: any) {
      console.error('Error running diagnosis ping:', error);
      // Check if it's a network error
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

    // Check if mobile data is enabled first
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

      // Show result in modal
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
      // Check if it's a network error
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

  // Check if we have any valid signal or status data
  const hasValidData = !!(
    (signalInfo?.rssi && signalInfo.rssi !== '') ||
    (modemStatus?.connectionStatus && modemStatus.connectionStatus !== '')
  );

  return (
    <AnimatedScreen>
      <MeshGradientBackground>
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
              tintColor={colors.primary}
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
              <TouchableOpacity
                onPress={handleReLogin}
                style={[styles.reLoginButtonLarge, { backgroundColor: colors.error }]}
              >
                <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                  {t('common.goToLogin')}
                </Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Connection Status Card - Matching Reference Design */}
          <CollapsibleCard title={t('home.connectionStatus')}>
            {/* Top Section: Signal Bars + Info | Status + Network Badge */}
            <View style={styles.connectionMainRow}>
              {/* Left: Signal Bars + Good + ISP */}
              <View style={styles.connectionLeftSection}>
                <SignalBar
                  strength={(() => {
                    // Try RSSI/RSRP first, then fallback to modem's SignalIcon
                    const calculatedIcon = getSignalIcon(signalInfo?.rssi, signalInfo?.rsrp);
                    if (calculatedIcon > 0) return calculatedIcon;
                    // Fallback to modem's native SignalIcon (0-5)
                    return getSignalIconFromModemStatus(modemStatus?.signalIcon);
                  })()}
                  label=""
                />
                <View style={styles.connectionSignalLabels}>
                  <Text style={[typography.subheadline, { color: colors.primary, fontWeight: '600' }]}>
                    {(() => {
                      // Try RSSI/RSRP first
                      const strength = getSignalStrength(signalInfo?.rssi, signalInfo?.rsrp);
                      if (strength !== 'unknown') {
                        return t(`home.signal${strength.charAt(0).toUpperCase()}${strength.slice(1)}`);
                      }
                      // Fallback to modem's SignalIcon
                      const iconVal = getSignalIconFromModemStatus(modemStatus?.signalIcon);
                      const fallbackStrength = getSignalStrengthFromIcon(iconVal);
                      return t(`home.signal${fallbackStrength.charAt(0).toUpperCase()}${fallbackStrength.slice(1)}`);
                    })()}
                  </Text>
                  <Text style={[typography.headline, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    {networkInfo?.fullName || networkInfo?.networkName || networkInfo?.spnName || t('common.unknown')}
                  </Text>
                </View>
              </View>

              {/* Right: Connected Status + 4G Badge */}
              <View style={styles.connectionRightSection}>
                <Text style={[
                  typography.subheadline,
                  {
                    color: modemStatus?.connectionStatus === '901' ? colors.primary : colors.error,
                    fontWeight: '600',
                    marginBottom: 4,
                  }
                ]}>
                  {t(`home.status${getConnectionStatusText(modemStatus?.connectionStatus).charAt(0).toUpperCase()}${getConnectionStatusText(modemStatus?.connectionStatus).slice(1)}`)}
                </Text>
                <View style={[styles.networkTypeBadge, { borderColor: colors.primary, borderWidth: 1 }]}>
                  <Text style={[typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                    {getNetworkTypeText(networkInfo?.currentNetworkType || modemStatus?.currentNetworkType)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />

            {/* Info Grid 2x2 */}
            <View style={styles.connectionInfoGrid}>

              {/* Network Type */}
              <View style={styles.connectionInfoGridItem}>
                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 2 }]}>
                  {t('home.networkType')}
                </Text>
                <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>
                  {getNetworkTypeText(networkInfo?.currentNetworkType || modemStatus?.currentNetworkType)}
                </Text>
              </View>

              {/* IP Address */}
              <View style={styles.connectionInfoGridItem}>
                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 2 }]}>
                  {t('home.ipAddress')}
                </Text>
                <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                  {wanInfo?.wanIPAddress || '...'}
                </Text>
              </View>

              {/* Band */}
              <View style={styles.connectionInfoGridItem}>
                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 2 }]}>
                  {t('home.band')}
                </Text>
                <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>
                  {getLteBandInfo(signalInfo?.band)}
                </Text>
              </View>

              {/* Width */}
              <View style={styles.connectionInfoGridItem}>
                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 2 }]}>
                  {t('home.width')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {signalInfo?.dlbandwidth || signalInfo?.ulbandwidth ? (
                    <>
                      <MaterialIcons name="arrow-upward" size={14} color={colors.primary} />
                      <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600', marginRight: 4 }]}>
                        {signalInfo.ulbandwidth || '-'}
                      </Text>
                      <MaterialIcons name="arrow-downward" size={14} color={colors.success} />
                      <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>
                        {signalInfo.dlbandwidth || '-'}
                      </Text>
                    </>
                  ) : (
                    <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>-</Text>
                  )}
                </View>
              </View>
            </View>
          </CollapsibleCard>

          {/* Quick Actions Card - Modern Compact Design */}
          <CollapsibleCard title={t('home.actions')}>
            {/* Row 1: Large Action Buttons */}
            <View style={styles.quickActionsRow}>
              {/* Set Band Button */}
              <TouchableOpacity
                style={[styles.quickActionLarge, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowBandModal(true)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.background }]}>
                  <MaterialIcons name="settings-input-antenna" size={20} color={colors.primary} />
                </View>
                <View style={styles.quickActionLargeContent}>
                  <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    {t('home.setBand')}
                  </Text>
                  <Text
                    style={[typography.caption2, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {selectedBands.length > 0 ? selectedBands.join(', ') : t('common.loading')}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Change IP Button */}
              <TouchableOpacity
                style={[styles.quickActionLarge, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={handleChangeIp}
                disabled={isChangingIp}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.background }]}>
                  {isChangingIp ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <MaterialIcons name="sync" size={20} color={colors.primary} />
                  )}
                </View>
                <View style={styles.quickActionLargeContent}>
                  <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    {t('home.changeIp')}
                  </Text>
                  <Text
                    style={[typography.caption2, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {wanInfo?.wanIPAddress || '...'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Row 2: Compact Action Buttons Grid */}
            <View style={styles.quickActionsRow}>
              {/* Mobile Data Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.quickActionSmall,
                  {
                    backgroundColor: mobileDataStatus?.dataswitch ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                  }
                ]}
                onPress={handleToggleMobileData}
                disabled={isTogglingData}
              >
                {isTogglingData ? (
                  <ActivityIndicator color={mobileDataStatus?.dataswitch ? '#FFFFFF' : colors.primary} size="small" />
                ) : (
                  <>
                    <MaterialIcons
                      name="swap-vert"
                      size={22}
                      color={mobileDataStatus?.dataswitch ? '#FFFFFF' : colors.primary}
                    />
                    <Text
                      style={[
                        typography.caption2,
                        {
                          color: mobileDataStatus?.dataswitch ? '#FFFFFF' : colors.text,
                          fontWeight: '500',
                          marginTop: 4,
                          textAlign: 'center',
                        }
                      ]}
                      numberOfLines={1}
                    >
                      {t('home.mobileData')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Diagnosis Button */}
              <TouchableOpacity
                style={[styles.quickActionSmall, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={handleDiagnosis}
                disabled={isRunningDiagnosis}
              >
                {isRunningDiagnosis ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="network-check" size={22} color={colors.primary} />
                    <Text
                      style={[typography.caption2, { color: colors.text, fontWeight: '500', marginTop: 4, textAlign: 'center' }]}
                      numberOfLines={1}
                    >
                      {t('home.diagnosis')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Quick Check Button */}
              <TouchableOpacity
                style={[styles.quickActionSmall, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={handleOneClickCheck}
                disabled={isRunningCheck}
              >
                {isRunningCheck ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="perm-scan-wifi" size={22} color={colors.primary} />
                    <Text
                      style={[typography.caption2, { color: colors.text, fontWeight: '500', marginTop: 4, textAlign: 'center' }]}
                      numberOfLines={1}
                    >
                      {t('home.quickCheck')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Speedtest Button */}
              <TouchableOpacity
                style={[styles.quickActionSmall, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowSpeedtestModal(true)}
              >
                <MaterialIcons name="speed" size={22} color={colors.primary} />
                <Text
                  style={[typography.caption2, { color: colors.text, fontWeight: '500', marginTop: 4, textAlign: 'center' }]}
                  numberOfLines={1}
                >
                  {t('home.speedtest')}
                </Text>
              </TouchableOpacity>
            </View>
          </CollapsibleCard>

          {/* Signal Strength Card */}
          {(signalInfo && (signalInfo.rssi || signalInfo.rsrp)) || modemStatus?.signalIcon ? (
            <CollapsibleCard title={t('home.signalInfo')}>
              <SignalCard
                title={t('home.signalStrength')}
                badge={(() => {
                  const strength = getSignalStrength(signalInfo?.rssi, signalInfo?.rsrp);
                  if (strength !== 'unknown') {
                    return t(`home.signal${strength.charAt(0).toUpperCase()}${strength.slice(1)}`);
                  }
                  const iconVal = getSignalIconFromModemStatus(modemStatus?.signalIcon);
                  const fallbackStrength = getSignalStrengthFromIcon(iconVal);
                  return t(`home.signal${fallbackStrength.charAt(0).toUpperCase()}${fallbackStrength.slice(1)}`);
                })()}
                color="blue"
                icon="signal-cellular-alt"
                metrics={[
                  ...(signalInfo.rssi ? [{
                    label: 'RSSI',
                    value: signalInfo.rssi,
                    unit: 'dBm',
                    quality: getSignalQuality(parseFloat(signalInfo.rssi), { excellent: -65, good: -75, fair: -85, poor: -95 }, true),
                  }] : []),
                  ...(signalInfo.rsrp ? [{
                    label: 'RSRP',
                    value: signalInfo.rsrp,
                    unit: 'dBm',
                    quality: getSignalQuality(parseFloat(signalInfo.rsrp), { excellent: -80, good: -90, fair: -100, poor: -110 }, true),
                  }] : []),
                  ...(signalInfo.rsrq ? [{
                    label: 'RSRQ',
                    value: signalInfo.rsrq,
                    unit: 'dB',
                    quality: getSignalQuality(parseFloat(signalInfo.rsrq), { excellent: -5, good: -9, fair: -12, poor: -15 }, true),
                  }] : []),
                  ...(signalInfo.sinr ? [{
                    label: 'SINR',
                    value: signalInfo.sinr,
                    unit: 'dB',
                    quality: getSignalQuality(parseFloat(signalInfo.sinr), { excellent: 20, good: 13, fair: 6, poor: 0 }, false),
                  }] : []),
                ]}
                band={signalInfo.band ? getLteBandInfo(signalInfo.band) : undefined}
                cellId={signalInfo.cellId}
              />
            </CollapsibleCard>
          ) : (
            <CollapsibleCard title={t('home.signalInfo')}>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }]}>
                ⚠️ {t('home.noSignalAvailable')}{'\n'}
                {t('home.checkLogin')}
              </Text>
            </CollapsibleCard>
          )}

          {/* Traffic Statistics Card */}
          {trafficStats && (
            <Card style={{ marginBottom: spacing.md }}>
              {/* Header with gear icon - centered title */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={[typography.headline, { color: colors.text, textAlign: 'center' }]}>{t('home.trafficStats')}</Text>
              </View>

              {/* Divider below header */}
              <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.md }} />

              {/* Speed Gauge */}
              <SpeedGauge
                downloadSpeed={trafficStats.currentDownloadRate}
                uploadSpeed={trafficStats.currentUploadRate}
              />

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

              {/* Daily Usage Card - only show if data is available */}
              {trafficStats.dayUsed > 0 && (
                <DailyUsageCard
                  usage={trafficStats.dayUsed}
                  duration={trafficStats.dayDuration}
                  style={{ marginBottom: spacing.md }}
                />
              )}

              {usageCardStyle === 'compact' ? (
                <>
                  <CompactUsageCard
                    stats={trafficStats}
                    dataLimit={monthlySettings?.enabled ? monthlySettings.dataLimit * (monthlySettings.dataLimitUnit === 'GB' ? 1073741824 : 1048576) : undefined}
                  />
                  <MonthlyComparisonCard
                    totalDownload={trafficStats.totalDownload}
                    totalUpload={trafficStats.totalUpload}
                    monthDownload={trafficStats.monthDownload}
                    monthUpload={trafficStats.monthUpload}
                  />
                </>
              ) : (
                <>
                  {/* Session Usage Card */}
                  <UsageCard
                    title={t('home.session') || "Session"}
                    download={trafficStats.currentDownload}
                    upload={trafficStats.currentUpload}
                    duration={trafficStats.currentConnectTime}
                    durationUnits={durationUnits}
                    variant="session"
                    style={{ marginBottom: spacing.md }}
                  />

                  {/* Monthly Usage Card */}
                  <UsageCard
                    title={t('home.monthlyUsage') || "Monthly Usage"}
                    download={trafficStats.monthDownload || trafficStats.totalDownload}
                    upload={trafficStats.monthUpload || trafficStats.totalUpload}
                    duration={trafficStats.monthDuration}
                    durationUnits={durationUnits}
                    variant="monthly"
                    dataLimit={monthlySettings?.enabled ? monthlySettings.dataLimit * (monthlySettings.dataLimitUnit === 'GB' ? 1073741824 : 1048576) : undefined}
                  />

                  {/* Total Usage Card */}
                  <UsageCard
                    title={t('home.totalUsage') || "Total Usage"}
                    badge={formatDuration(trafficStats.totalConnectTime, durationUnits)}
                    download={trafficStats.totalDownload}
                    upload={trafficStats.totalUpload}
                    icon="timeline"
                  />

                  {/* Monthly Comparison Card */}
                  <MonthlyComparisonCard
                    totalDownload={trafficStats.totalDownload}
                    totalUpload={trafficStats.totalUpload}
                    monthDownload={trafficStats.monthDownload}
                    monthUpload={trafficStats.monthUpload}
                    style={{ marginTop: spacing.md }}
                  />
                </>
              )}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

              {/* Actions: Clear History + Monthly Settings */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, gap: 12 }}>
                {/* Clear History Button */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: spacing.sm,
                    backgroundColor: colors.error + '15',
                    borderRadius: 8,
                    opacity: isClearingHistory ? 0.6 : 1,
                  }}
                  onPress={handleClearHistory}
                  disabled={isClearingHistory}
                >
                  {isClearingHistory ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <>
                      <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                      <Text style={[typography.caption1, { color: colors.error, marginLeft: 6, fontWeight: '600' }]}>
                        {t('home.clearHistory')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Monthly Settings Button */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: spacing.sm,
                    backgroundColor: colors.primary + '15',
                    borderRadius: 8,
                  }}
                  onPress={() => setShowMonthlySettingsModal(true)}
                >
                  <MaterialIcons name="data-saver-on" size={18} color={colors.primary} />
                  <Text style={[typography.caption1, { color: colors.primary, marginLeft: 6, fontWeight: '600' }]}>
                    {t('home.monthlySettings') || 'Monthly Limit'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Last Cleared Text */}
              {lastClearedDate && (
                <Text style={[typography.caption2, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                  {t('home.lastCleared')}: {new Date(lastClearedDate).toLocaleDateString()}
                </Text>
              )}
            </Card>
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
              // If user cancels re-login, show error
              if (authSessionExpired) {
                ThemedAlertHelper.alert(t('common.error'), t('alerts.sessionExpired'));
              }
            }}
            onLoginSuccess={handleReloginSuccess}
            onTimeout={async () => {
              // Session re-login timed out, redirect to login screen
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reLoginButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reLoginButtonLarge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalContainer: {
    marginLeft: 16,
  },
  trafficSection: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    padding: 12,
  },
  trafficHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trafficRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  trafficItem: {
    flex: 1,
    alignItems: 'center',
  },
  dataUsageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dataUsageItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalUsageContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  controlButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 70,
  },
  infoRowCustom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // New Quick Actions styles
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickActionLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  quickActionSmall: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    minHeight: 60,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  quickActionLargeContent: {
    flex: 1,
    minWidth: 0,
  },
  // Connection Status Card styles
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  ispContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  connectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  connectionGridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  connectionGridIcon: {
    marginRight: 8,
  },
  connectionGridContent: {
    flex: 1,
    minWidth: 0,
  },
  // Connection Status Info-focused styles
  connectionMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalIconContainer: {
    marginRight: 12,
  },
  connectionInfoContainer: {
    flex: 1,
    minWidth: 0,
  },
  connectionStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  connectionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  connectionInfoRows: {
    gap: 8,
  },
  connectionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Connection Status - Reference Design styles
  connectionLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  connectionSignalLabels: {
    marginLeft: 12,
    flex: 1,
  },
  connectionRightSection: {
    alignItems: 'flex-end',
  },
  connectionInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  connectionInfoGridItem: {
    width: '50%',
    paddingVertical: 8,
    paddingRight: 8,
  },
});
