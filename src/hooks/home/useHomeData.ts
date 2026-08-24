import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModemService } from '@/services/modem.service';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { useSMSStore } from '@/stores/sms.store';
import { useWiFiStore } from '@/stores/wifi.store';
import { useDebugStore } from '@/stores/debug.store';
import { SMSService } from '@/services/sms.service';
import { WiFiService } from '@/services/wifi.service';
import {
  checkDailyUsageNotification,
  checkMonthlyUsageNotification,
  checkIPChangeNotification,
  sendDebugModeReminder,
  saveLastActiveTime,
} from '@/services/notification.service';
import { ThemedAlertHelper, ToastHelper, getSelectedBandsDisplay } from '@/components';
import { isSessionExpiredError } from '@/utils/huawei-error';

interface UseHomeDataProps {
  t: (key: string, options?: any) => string;
  showReloginWebView: boolean;
}

export function useHomeData({ t, showReloginWebView }: UseHomeDataProps) {
  const { credentials, isRelogging, requestRelogin, clearSessionExpired } = useAuthStore();

  const {
    modemStatus,
    monthlySettings,
    setSignalInfo,
    setNetworkInfo,
    setTrafficStats,
    setModemStatus,
    setWanInfo,
    setMobileDataStatus,
    setMonthlySettings,
    setModemInfo,
    loadFromCache,
  } = useModemStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modemService, setModemService] = useState<ModemService | null>(null);
  const [selectedBands, setSelectedBands] = useState<string[]>([]);

  const reloginAttemptsRef = useRef(0);
  const showReloginWebViewRef = useRef(showReloginWebView);
  showReloginWebViewRef.current = showReloginWebView;

  // Bumped on every credentials change; async results from an older
  // generation are discarded so a previous modem can't write into the store.
  const generationRef = useRef(0);
  const isStale = (gen: number) => gen !== generationRef.current;

  const [lastClearedDate, setLastClearedDate] = useState<string | null>(null);
  const [previousTotalTraffic, setPreviousTotalTraffic] = useState<number>(0);

  useEffect(() => {
    const loadLastClearedDate = async () => {
      try {
        const date = await AsyncStorage.getItem('lastClearedTrafficDate');
        if (date) setLastClearedDate(date);

        const prevTotal = await AsyncStorage.getItem('previousTotalTraffic');
        if (prevTotal) setPreviousTotalTraffic(parseInt(prevTotal));
      } catch {}
    };
    loadLastClearedDate();
  }, []);

  const loadData = async (service: ModemService) => {
    const gen = generationRef.current;
    try {
      setIsRefreshing(true);

      const [signal, network, traffic, status, wan, dataStatus, modemInfo] = await Promise.all([
        service.getSignalInfo().catch(() => null),
        service.getNetworkInfo().catch(() => null),
        service.getTrafficStats().catch(() => null),
        service.getModemStatus().catch(() => null),
        service.getWanInfo().catch(() => null),
        service.getMobileDataStatus().catch(() => null),
        service.getModemInfo().catch(() => null),
      ]);

      if (isStale(gen)) return;

      if (signal) setSignalInfo(signal);
      if (network) setNetworkInfo(network);
      if (traffic) setTrafficStats(traffic);
      if (status) setModemStatus(status);
      if (wan) setWanInfo(wan);
      if (dataStatus) setMobileDataStatus(dataStatus);
      if (modemInfo) setModemInfo(modemInfo);

      if (credentials?.modemIp) {
        try {
          const wifiService = new WiFiService(credentials.modemIp);
          const devices = await wifiService.getConnectedDevices();
          if (!isStale(gen)) useWiFiStore.getState().setConnectedDevices(devices);
        } catch {}

        try {
          const smsService = new SMSService(credentials.modemIp);
          const isSupported = await smsService.isSMSSupported();
          if (isSupported) {
            const smsCount = await smsService.getSMSCount();
            if (!isStale(gen)) useSMSStore.getState().setSMSCount(smsCount);
          }
        } catch {}
      }

      const isDataEmpty = !signal?.rsrp && !signal?.rssi && !status?.connectionStatus;

      if (isDataEmpty) {
        setSignalInfo(null);
        setModemStatus(null);
      }

      const currentTotal = traffic ? traffic.totalDownload + traffic.totalUpload : 0;
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
        const dataLimitInGB =
          monthlySettings.dataLimitUnit === 'GB'
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

        // Toast warning if daily usage >= 99%
        const dailyLimitBytes =
          (dataLimitInGB * 1073741824) /
          new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        if (dailyLimitBytes > 0) {
          const dailyPercent = Math.min(((traffic.dayUsed || 0) / dailyLimitBytes) * 100, 100);
          if (dailyPercent >= 99) {
            ToastHelper.warning(
              t('notifications.dailyUsageWarning') || 'Daily usage has reached 99%!'
            );
          }
        }

        checkMonthlyUsageNotification(
          traffic.monthDownload + traffic.monthUpload,
          dataLimitInGB,
          monthlySettings.monthThreshold,
          {
            title: t('notifications.monthlyUsageTitle'),
            body: (used, limit) => t('notifications.monthlyUsageBody', { used, limit }),
          }
        );

        const ipChangeDuration = await checkIPChangeNotification(traffic.currentConnectTime || 0, {
          title: t('notifications.ipChangeTitle'),
          body: (duration) =>
            duration === '0'
              ? t('notifications.ipChangeBodyJustNow')
              : t('notifications.ipChangeBody', { duration }),
        });

        if (ipChangeDuration !== null) {
          const alertBody =
            ipChangeDuration === '0'
              ? t('notifications.ipChangeBodyJustNow')
              : t('notifications.ipChangeBody', { duration: ipChangeDuration });
          ToastHelper.warning(alertBody);
        }
      }

      if (
        isDataEmpty &&
        credentials &&
        reloginAttemptsRef.current < 3 &&
        !showReloginWebViewRef.current
      ) {
        requestRelogin();
        reloginAttemptsRef.current += 1;
      } else if (!isDataEmpty) {
        clearSessionExpired();
        reloginAttemptsRef.current = 0;
      }
    } catch (error: any) {
      if (isStale(gen)) return;
      console.error('Error loading data:', error);

      const errorMessage = error?.message || '';
      const isSessionError =
        isSessionExpiredError(error) ||
        errorMessage.includes('session') ||
        errorMessage.includes('login') ||
        !modemStatus;

      if (isSessionError) {
        setSignalInfo(null);
        setModemStatus(null);

        if (credentials && reloginAttemptsRef.current < 3 && !showReloginWebViewRef.current) {
          requestRelogin();
          reloginAttemptsRef.current += 1;
        }
      } else {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.failedLoadModemData'));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadDataSilent = async (service: ModemService) => {
    const gen = generationRef.current;
    try {
      const [signal, network, traffic, status, wan, dataStatus, modemInfo] = await Promise.all([
        service.getSignalInfoFast().catch(() => null),
        service.getNetworkInfo().catch(() => null),
        service.getTrafficStatsFast().catch(() => null),
        service.getModemStatus().catch(() => null),
        service.getWanInfo().catch(() => null),
        service.getMobileDataStatus().catch(() => null),
        service.getModemInfo().catch(() => null),
      ]);

      if (isStale(gen)) return;

      if (signal) setSignalInfo(signal);
      if (network) setNetworkInfo(network);
      if (traffic) {
        // Preserve month/day stats from last full fetch
        const prev = useModemStore.getState().trafficStats;
        if (prev) {
          traffic.monthDownload = prev.monthDownload;
          traffic.monthUpload = prev.monthUpload;
          traffic.monthDuration = prev.monthDuration;
          traffic.dayUsed = prev.dayUsed;
          traffic.dayDuration = prev.dayDuration;
        }
        setTrafficStats(traffic);
      }
      if (status) setModemStatus(status);
      if (wan) setWanInfo(wan);
      if (dataStatus) setMobileDataStatus(dataStatus);
      if (modemInfo) setModemInfo(modemInfo);

      if (credentials?.modemIp) {
        try {
          const wifiService = new WiFiService(credentials.modemIp);
          const devices = await wifiService.getConnectedDevices();
          if (!isStale(gen)) useWiFiStore.getState().setConnectedDevices(devices);
        } catch {}

        try {
          const smsService = new SMSService(credentials.modemIp);
          const isSupported = await smsService.isSMSSupported();
          if (isSupported) {
            const smsCount = await smsService.getSMSCount();
            if (!isStale(gen)) useSMSStore.getState().setSMSCount(smsCount);
          }
        } catch {}
      }

      const isDataEmpty = !signal?.rsrp && !signal?.rssi && !status?.connectionStatus;

      if (isDataEmpty) {
        setSignalInfo(null);
        setModemStatus(null);
      }

      if (
        isDataEmpty &&
        credentials &&
        reloginAttemptsRef.current < 3 &&
        !showReloginWebViewRef.current
      ) {
        requestRelogin();
        reloginAttemptsRef.current += 1;
      } else if (!isDataEmpty) {
        clearSessionExpired();
        reloginAttemptsRef.current = 0;
      }
    } catch (error: any) {
      if (isStale(gen)) return;
      const errorMessage = error?.message || '';
      const isSessionError =
        isSessionExpiredError(error) || errorMessage.includes('session') || !modemStatus;

      if (isSessionError) {
        setSignalInfo(null);
        setModemStatus(null);

        if (credentials && reloginAttemptsRef.current < 3 && !showReloginWebViewRef.current) {
          requestRelogin();
          reloginAttemptsRef.current += 1;
        }
      }
    }
  };

  const loadTrafficOnly = async (service: ModemService) => {
    const gen = generationRef.current;
    try {
      const fast = await service.getTrafficStatsFast();
      if (isStale(gen)) return;
      // Preserve month/day stats from last full fetch
      const prev = useModemStore.getState().trafficStats;
      if (prev) {
        fast.monthDownload = prev.monthDownload;
        fast.monthUpload = prev.monthUpload;
        fast.monthDuration = prev.monthDuration;
        fast.dayUsed = prev.dayUsed;
        fast.dayDuration = prev.dayDuration;
      }
      setTrafficStats(fast);
    } catch (error) {
      if (isStale(gen)) return;
      console.error('Error loading traffic data:', error);
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

  useEffect(() => {
    if (credentials?.modemIp) {
      generationRef.current += 1;
      const service = new ModemService(credentials.modemIp);
      setModemService(service);

      const initializeData = async () => {
        await loadFromCache();

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

          const wifiService = new WiFiService(credentials.modemIp);
          const devices = await wifiService.getConnectedDevices();
          useWiFiStore.getState().setConnectedDevices(devices);
        } catch (e) {
          console.error('Failed to load initial tab badge data:', e);
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

      const trafficIntervalId = setInterval(() => {
        if (AppState.currentState === 'active') {
          loadTrafficOnly(service);
        }
      }, 3000);

      const fullDataIntervalId = setInterval(() => {
        if (AppState.currentState === 'active') {
          loadDataSilent(service);
        }
      }, 10000);

      return () => {
        clearInterval(trafficIntervalId);
        clearInterval(fullDataIntervalId);
      };
    }
  }, [credentials]);

  useEffect(() => {
    if (!isRelogging && modemService) {
      loadData(modemService);
      loadBands(modemService);
    }
  }, [isRelogging]);

  const handleRefresh = () => {
    if (modemService) {
      loadData(modemService);
      loadBands(modemService);
      loadMonthlySettings(modemService);
    }
  };

  return {
    isRefreshing,
    modemService,
    selectedBands,
    lastClearedDate,
    setLastClearedDate,
    previousTotalTraffic,
    setPreviousTotalTraffic,
    modemInfo: useModemStore((s) => s.modemInfo),
    loadData,
    loadBands,
    loadMonthlySettings,
    handleRefresh,
  };
}
