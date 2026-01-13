import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ModemService } from '@/services/modem.service';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { ThemedAlertHelper } from '@/components';

interface UseModemActionsOptions {
    t: (key: string, params?: Record<string, any>) => string;
    modemService: ModemService | null;
    onRefresh?: () => void;
    onLoadBands?: () => void;
}

interface DiagnosisResult {
    label: string;
    success: boolean;
    value?: string;
}

interface UseModemActionsReturn {
    isTogglingData: boolean;
    handleToggleMobileData: () => Promise<void>;

    isChangingIp: boolean;
    handleChangeIp: () => Promise<void>;

    isRunningDiagnosis: boolean;
    handleDiagnosis: () => Promise<void>;
    showDiagnosisModal: boolean;
    setShowDiagnosisModal: (show: boolean) => void;
    diagnosisTitle: string;
    diagnosisResults: DiagnosisResult[];
    diagnosisSummary: string;

    isRunningCheck: boolean;
    handleOneClickCheck: () => Promise<void>;

    handleReLogin: () => void;
    isRetryingSilent: boolean;
    handleRetrySilent: () => Promise<void>;

    showSpeedtestModal: boolean;
    setShowSpeedtestModal: (show: boolean) => void;
}

/**
 * Hook for modem actions like toggle data, change IP, diagnosis
 */
export function useModemActions({
    t,
    modemService,
    onRefresh,
    onLoadBands,
}: UseModemActionsOptions): UseModemActionsReturn {
    const router = useRouter();
    const { logout, tryQuietSessionRestore } = useAuthStore();
    const { mobileDataStatus, setMobileDataStatus } = useModemStore();

    const [isTogglingData, setIsTogglingData] = useState(false);

    const [isChangingIp, setIsChangingIp] = useState(false);

    const [isRunningDiagnosis, setIsRunningDiagnosis] = useState(false);
    const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
    const [diagnosisTitle, setDiagnosisTitle] = useState('');
    const [diagnosisResults, setDiagnosisResults] = useState<DiagnosisResult[]>([]);
    const [diagnosisSummary, setDiagnosisSummary] = useState('');

    const [isRunningCheck, setIsRunningCheck] = useState(false);

    const [isRetryingSilent, setIsRetryingSilent] = useState(false);

    const [showSpeedtestModal, setShowSpeedtestModal] = useState(false);

    const handleToggleMobileData = useCallback(async () => {
        if (!modemService || isTogglingData) return;

        const newState = !mobileDataStatus?.dataswitch;

        const performToggle = async () => {
            setIsTogglingData(true);
            try {
                await modemService.toggleMobileData(newState);
                const dataStatus = await modemService.getMobileDataStatus();
                setMobileDataStatus(dataStatus);
                ThemedAlertHelper.alert(
                    t('common.success'),
                    newState ? t('home.dataEnabled') : t('home.dataDisabled')
                );
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
    }, [modemService, isTogglingData, mobileDataStatus, t]);

    const handleChangeIp = useCallback(async () => {
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
                            console.error('PLMN scan error:', error);
                        });

                        setTimeout(() => {
                            setIsChangingIp(false);
                        }, 10000);

                        setTimeout(() => {
                            onRefresh?.();
                        }, 45000);
                    },
                },
            ]
        );
    }, [modemService, isChangingIp, t, onRefresh]);

    const handleDiagnosis = useCallback(async () => {
        if (!modemService || isRunningDiagnosis) return;

        if (!mobileDataStatus?.dataswitch) {
            ThemedAlertHelper.alert(t('common.error'), t('alerts.mobileDataRequired'));
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
            setDiagnosisSummary(
                result.success
                    ? t('home.connectionOk') || 'Connection is working!'
                    : t('home.connectionFailed') || 'Could not reach server'
            );
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
    }, [modemService, isRunningDiagnosis, mobileDataStatus, t]);

    const handleOneClickCheck = useCallback(async () => {
        if (!modemService || isRunningCheck) return;

        if (!mobileDataStatus?.dataswitch) {
            ThemedAlertHelper.alert(t('common.error'), t('alerts.mobileDataRequired'));
            return;
        }

        setIsRunningCheck(true);
        try {
            const result = await modemService.oneClickCheck();

            setDiagnosisTitle(t('home.oneClickCheckResult'));
            setDiagnosisResults([
                { label: t('home.internetConnection'), success: result.internetConnection },
                { label: t('home.dnsResolution'), success: result.dnsResolution },
                {
                    label: t('home.status'),
                    success: result.networkStatus === 'Connected',
                    value: result.networkStatus,
                },
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
    }, [modemService, isRunningCheck, mobileDataStatus, t]);

    const handleReLogin = useCallback(() => {
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
    }, [t, logout, router]);

    const handleRetrySilent = useCallback(async () => {
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
                    onRefresh?.();
                    onLoadBands?.();
                    break;
                }
            } catch (error) {
                console.error(`[Home] Silent login attempt ${attempt} failed:`, error);
            }

            if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 500));
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
    }, [isRetryingSilent, tryQuietSessionRestore, onRefresh, onLoadBands, t, logout, router]);

    return {
        isTogglingData,
        handleToggleMobileData,
        isChangingIp,
        handleChangeIp,
        isRunningDiagnosis,
        handleDiagnosis,
        showDiagnosisModal,
        setShowDiagnosisModal,
        diagnosisTitle,
        diagnosisResults,
        diagnosisSummary,
        isRunningCheck,
        handleOneClickCheck,
        handleReLogin,
        isRetryingSilent,
        handleRetrySilent,
        showSpeedtestModal,
        setShowSpeedtestModal,
    };
}
