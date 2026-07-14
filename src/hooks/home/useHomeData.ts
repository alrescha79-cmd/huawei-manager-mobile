import { useState, useEffect } from 'react';
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
import { checkDailyUsageNotification, checkMonthlyUsageNotification, checkIPChangeNotification, sendDebugModeReminder, saveLastActiveTime } from '@/services/notification.service';
import { ThemedAlertHelper } from '@/components';
import { getSelectedBandsDisplay } from '@/components';

interface UseHomeDataProps {
  t: (key: string, options?: any) => string;
  showReloginWebView: boolean;
}

export function useHomeData({ t, showReloginWebView }: UseHomeDataProps) {
  const { credentials, isRelogging, requestRelogin, clearSessionExpired } = useAuthStore();
  
  const {
    signalInfo,
    networkInfo,
    trafficStats,
    modemStatus,
    wanInfo,
    mobileDataStatus,
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
  const [reloginAttempts, setReloginAttempts] = useState(0);
  const [selectedBands, setSelectedBands] = useState<string[]>([]);
  
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

  const loadData = async (service: ModemService) => {
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

      if (signal) setSignalInfo(signal);
      if (network) setNetworkInfo(network);
      if (traffic) setTrafficStats(traffic);
      if (status) setModemStatus(status);
      if (wan) setWanInfo(wan);
      if (dataStatus) setMobileDataStatus(dataStatus);
      if (modemInfo) setModemInfo(modemInfo);

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

        const ipChangeDuration = await checkIPChangeNotification(traffic.currentConnectTime || 0, {
          title: t('notifications.ipChangeTitle'),
          body: (duration) => duration === '0'
            ? t('notifications.ipChangeBodyJustNow')
            : t('notifications.ipChangeBody', { duration }),
        });

        if (ipChangeDuration !== null) {
          const alertBody = ipChangeDuration === '0'
            ? t('notifications.ipChangeBodyJustNow')
            : t('notifications.ipChangeBody', { duration: ipChangeDuration });
          ThemedAlertHelper.alert(
            t('notifications.ipChangeTitle'),
            alertBody
          );
        }
      }

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
        errorMessage.includes('125002') ||
        errorMessage.includes('session') ||
        errorMessage.includes('login') ||
        !modemStatus;

      if (isSessionError) {
        setSignalInfo(null);
        setModemStatus(null);
        
        if (credentials && reloginAttempts < 3 && !showReloginWebView) {
          requestRelogin();
          setReloginAttempts(prev => prev + 1);
        }
      } else {
        ThemedAlertHelper.alert(t('common.error'), t('alerts.failedLoadModemData'));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadDataSilent = async (service: ModemService) => {
    try {
      const [signal, network, traffic, status, wan, dataStatus, modemInfo] = await Promise.all([
        service.getSignalInfo().catch(() => null),
        service.getNetworkInfo().catch(() => null),
        service.getTrafficStats().catch(() => null),
        service.getModemStatus().catch(() => null),
        service.getWanInfo().catch(() => null),
        service.getMobileDataStatus().catch(() => null),
        service.getModemInfo().catch(() => null),
      ]);

      if (signal) setSignalInfo(signal);
      if (network) setNetworkInfo(network);
      if (traffic) setTrafficStats(traffic);
      if (status) setModemStatus(status);
      if (wan) setWanInfo(wan);
      if (dataStatus) setMobileDataStatus(dataStatus);
      if (modemInfo) setModemInfo(modemInfo);

      const isDataEmpty = !signal?.rsrp && !signal?.rssi && !status?.connectionStatus;

      if (isDataEmpty) {
        setSignalInfo(null);
        setModemStatus(null);
      }

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
        errorMessage.includes('125002') ||
        errorMessage.includes('session') ||
        !modemStatus;

      if (isSessionError) {
        setSignalInfo(null);
        setModemStatus(null);
        
        if (credentials && reloginAttempts < 3 && !showReloginWebView) {
          requestRelogin();
          setReloginAttempts(prev => prev + 1);
        }
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
        if (AppState.currentState === 'active') {
          loadTrafficOnly(service);
        }
      }, 1000);

      const slowIntervalId = setInterval(() => {
        if (AppState.currentState === 'active') {
          loadDataSilent(service);
        }
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
