import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { useSMSStore } from '@/stores/sms.store';
import { useWiFiStore } from '@/stores/wifi.store';
import { useDebugStore } from '@/stores/debug.store';
import { ModemService } from '@/services/modem.service';
import { SMSService } from '@/services/sms.service';
import { WiFiService } from '@/services/wifi.service';
import { getSelectedBandsDisplay, ThemedAlertHelper } from '@/components';
import {
    checkDailyUsageNotification,
    checkMonthlyUsageNotification,
    checkIPChangeNotification,
    sendDebugModeReminder,
    saveLastActiveTime,
} from '@/services/notification.service';

interface UseModemDataOptions {
    t: (key: string, params?: Record<string, any>) => string;
    durationUnits: {
        days: string;
        hours: string;
        minutes: string;
        seconds: string;
    };
}

interface UseModemDataReturn {
    modemService: ModemService | null;
    isRefreshing: boolean;
    pullProgress: number;
    setPullProgress: (progress: number) => void;
    handleRefresh: () => void;
    selectedBands: string[];
    hasValidData: boolean;
    reloginAttempts: number;
    showReloginWebView: boolean;
    setShowReloginWebView: (show: boolean) => void;
    handleReloginSuccess: () => Promise<void>;
    lastClearedDate: string | null;
    previousTotalTraffic: number;
    isClearingHistory: boolean;
    handleClearHistory: () => void;
    loadBands: () => Promise<void>;
    /** Load monthly settings */
    loadMonthlySettings: () => Promise<void>;
    handleSaveMonthlySettings: (settings: MonthlySettingsInput) => Promise<void>;
}

interface MonthlySettingsInput {
    enabled: boolean;
    startDay: number;
    dataLimit: number;
    dataLimitUnit: 'MB' | 'GB';
    monthThreshold: number;
}

/**
 * Hook for managing modem data loading and refresh
 * Extracts data loading logic from HomeScreen
 */
export function useModemData({ t, durationUnits }: UseModemDataOptions): UseModemDataReturn {
    const {
        credentials,
        login,
        requestRelogin,
        clearSessionExpired,
        setRelogging,
    } = useAuthStore();

    const {
        signalInfo,
        monthlySettings,
        setSignalInfo,
        setNetworkInfo,
        setTrafficStats,
        setModemStatus,
        setWanInfo,
        setMobileDataStatus,
        setMonthlySettings,
        loadFromCache,
    } = useModemStore();

    const [modemService, setModemService] = useState<ModemService | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullProgress, setPullProgress] = useState(0);
    const [reloginAttempts, setReloginAttempts] = useState(0);
    const [showReloginWebView, setShowReloginWebView] = useState(false);
    const [selectedBands, setSelectedBands] = useState<string[]>([]);
    const [lastClearedDate, setLastClearedDate] = useState<string | null>(null);
    const [previousTotalTraffic, setPreviousTotalTraffic] = useState<number>(0);
    const [isClearingHistory, setIsClearingHistory] = useState(false);

    useEffect(() => {
        const loadLastClearedDate = async () => {
            try {
                const date = await AsyncStorage.getItem('lastClearedTrafficDate');
                if (date) setLastClearedDate(date);

                const prevTotal = await AsyncStorage.getItem('previousTotalTraffic');
                if (prevTotal) setPreviousTotalTraffic(parseInt(prevTotal));
            } catch (error) {
                // Ignore storage errors
            }
        };
        loadLastClearedDate();
    }, []);

    useEffect(() => {
        if (credentials?.modemIp) {
            const service = new ModemService(credentials.modemIp);
            setModemService(service);

            const initializeData = async () => {
                await loadFromCache();
                loadData(service);
                loadBandsInternal(service);
                loadMonthlySettingsInternal(service);

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

    const loadBandsInternal = async (service: ModemService) => {
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

    const loadMonthlySettingsInternal = async (service: ModemService) => {
        try {
            const settings = await service.getMonthlyDataSettings();
            setMonthlySettings(settings);
        } catch (error) {
            console.error('Error loading monthly settings:', error);
        }
    };

    const handleRefresh = useCallback(() => {
        if (modemService) {
            loadData(modemService);
            loadBandsInternal(modemService);
            loadMonthlySettingsInternal(modemService);
        }
    }, [modemService]);

    const loadBands = useCallback(async () => {
        if (modemService) {
            await loadBandsInternal(modemService);
        }
    }, [modemService]);

    const loadMonthlySettings = useCallback(async () => {
        if (modemService) {
            await loadMonthlySettingsInternal(modemService);
        }
    }, [modemService]);

    const handleSaveMonthlySettings = useCallback(async (settings: MonthlySettingsInput) => {
        if (!modemService) return;

        try {
            await modemService.setMonthlyDataSettings(settings);
            ThemedAlertHelper.alert(t('common.success'), t('home.monthlySettingsSaved'));
            await loadMonthlySettingsInternal(modemService);
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('home.failedSaveMonthlySettings'));
            throw error;
        }
    }, [modemService, t]);

    const handleReloginSuccess = useCallback(async () => {
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
    }, [modemService, credentials]);

    const handleClearHistory = useCallback(() => {
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
                            await modemService.clearTrafficHistory();
                            ThemedAlertHelper.alert(t('common.success'), t('home.clearHistorySuccess'));

                            const now = new Date().toISOString();
                            await AsyncStorage.setItem('lastClearedTrafficDate', now);
                            setLastClearedDate(now);
                            setPreviousTotalTraffic(0);
                            await AsyncStorage.setItem('previousTotalTraffic', '0');

                            loadData(modemService);
                        } catch (error) {
                            ThemedAlertHelper.alert(t('common.error'), t('home.clearHistoryFailed'));
                        } finally {
                            setIsClearingHistory(false);
                        }
                    },
                },
            ]
        );
    }, [modemService, t]);

    const hasValidData = signalInfo?.rsrp !== undefined ||
        signalInfo?.rssi !== undefined ||
        signalInfo?.sinr !== undefined;

    return {
        modemService,
        isRefreshing,
        pullProgress,
        setPullProgress,
        handleRefresh,
        selectedBands,
        hasValidData,
        reloginAttempts,
        showReloginWebView,
        setShowReloginWebView,
        handleReloginSuccess,
        lastClearedDate,
        previousTotalTraffic,
        isClearingHistory,
        handleClearHistory,
        loadBands,
        loadMonthlySettings,
        handleSaveMonthlySettings,
    };
}
