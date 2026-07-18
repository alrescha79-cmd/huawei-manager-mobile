import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { ModemService } from '@/services/modem.service';
import { ThemedAlertHelper, ToastHelper, getSelectedBandsDisplay } from '@/components';
import { showInterstitial } from '@/services/ad.service';

interface UseMobileNetworkProps {
    t: (key: string, options?: any) => string;
}

export function useMobileNetwork({ t }: UseMobileNetworkProps) {
    const { credentials } = useAuthStore();
    const [modemService, setModemService] = useState<ModemService | null>(null);

    const [mobileDataEnabled, setMobileDataEnabled] = useState(false);
    const [dataRoamingEnabled, setDataRoamingEnabled] = useState(false);
    const [autoNetworkEnabled, setAutoNetworkEnabled] = useState(true);

    const [isTogglingMobileData, setIsTogglingMobileData] = useState(false);
    const [isTogglingRoaming, setIsTogglingRoaming] = useState(false);
    const [isTogglingAutoNetwork, setIsTogglingAutoNetwork] = useState(false);

    const [networkMode, setNetworkMode] = useState('00');
    const [showNetworkModeModal, setShowNetworkModeModal] = useState(false);
    const [isChangingNetwork, setIsChangingNetwork] = useState(false);

    const [showBandModal, setShowBandModal] = useState(false);
    const [selectedBandsDisplay, setSelectedBandsDisplay] = useState<string[]>([]);

    const [showMonthlyModal, setShowMonthlyModal] = useState(false);
    const [showSignalPointingModal, setShowSignalPointingModal] = useState(false);
    const [monthlySettings, setMonthlySettings] = useState({
        enabled: false,
        startDay: 1,
        dataLimit: 0,
        dataLimitUnit: 'GB' as 'MB' | 'GB',
        monthThreshold: 90,
    });

    useEffect(() => {
        if (credentials?.modemIp) {
            const service = new ModemService(credentials.modemIp);
            setModemService(service);
            loadSettings(service);
        }
    }, [credentials]);

    const loadSettings = async (service: ModemService) => {
        try {
            const [mobileData, roaming, autoNetwork, netMode, bandSettings, mSettings] = await Promise.all([
                service.getMobileDataStatus(),
                service.getDataRoamingStatus(),
                service.getAutoNetworkStatus(),
                service.getNetworkMode(),
                service.getBandSettings(),
                service.getMonthlyDataSettings(),
            ]);

            setMobileDataEnabled(mobileData.isEnabled);
            setDataRoamingEnabled(roaming);
            setAutoNetworkEnabled(autoNetwork);
            setNetworkMode(netMode);

            if (bandSettings?.lteBand) {
                setSelectedBandsDisplay(getSelectedBandsDisplay(bandSettings.lteBand));
            }

            setMonthlySettings({
                enabled: mSettings.enabled,
                startDay: mSettings.startDay,
                dataLimit: mSettings.dataLimit,
                dataLimitUnit: mSettings.dataLimitUnit,
                monthThreshold: mSettings.monthThreshold,
            });

        } catch (error) {
            console.error('Error loading mobile network settings:', error);
        }
    };

    const handleSaveMonthlySettings = async (settings: any) => {
        if (!modemService) return;
        try {
            await modemService.setMonthlyDataSettings(settings);
            setMonthlySettings(settings);
            showInterstitial(() => {});
            ToastHelper.success(t('home.monthlySettingsSaved'));
        } catch (error) {
            ToastHelper.error(t('home.failedSaveMonthlySettings'));
        }
    };

    const handleToggleMobileData = async (value: boolean) => {
        if (!modemService || isTogglingMobileData) return;

        if (!value) {
            ThemedAlertHelper.alert(
                t('settings.mobileData'),
                t('home.confirmDisableData'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('common.turnOff'),
                        style: 'destructive',
                        onPress: () => executeToggleMobileData(value)
                    }
                ]
            );
        } else {
            executeToggleMobileData(value);
        }
    };

    const executeToggleMobileData = async (value: boolean) => {
        if (!modemService) return;
        setIsTogglingMobileData(true);
        try {
            await modemService.toggleMobileData(value);
            setMobileDataEnabled(value);
            showInterstitial(() => { });
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('alerts.failedToggleData'));
            setMobileDataEnabled(!value);
        } finally {
            setIsTogglingMobileData(false);
        }
    };

    const handleToggleRoaming = async (value: boolean) => {
        if (!modemService || isTogglingRoaming) return;
        setIsTogglingRoaming(true);
        try {
            await modemService.setDataRoaming(value);
            setDataRoamingEnabled(value);
            showInterstitial(() => { });
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
            setDataRoamingEnabled(!value);
        } finally {
            setIsTogglingRoaming(false);
        }
    };

    const handleToggleAutoNetwork = async (value: boolean) => {
        if (!modemService || isTogglingAutoNetwork) return;
        setIsTogglingAutoNetwork(true);
        try {
            await modemService.setAutoNetwork(value);
            setAutoNetworkEnabled(value);
            showInterstitial(() => { });
        } catch (error) {
            ToastHelper.error(t('common.error'));
            setAutoNetworkEnabled(!value);
        } finally {
            setIsTogglingAutoNetwork(false);
        }
    };

    const handleNetworkModeChange = async (mode: string) => {
        if (!modemService) return;

        const changed = mode !== networkMode;

        setShowNetworkModeModal(false);
        setIsChangingNetwork(true);
        try {
            await modemService.setNetworkMode(mode);
            setNetworkMode(mode);
            ToastHelper.success(t('settings.networkModeChanged'));
            if (changed) {
                showInterstitial(() => { });
            }
        } catch (error: any) {
            let errorMessage = t('alerts.failedChangeNetwork');
            if (error?.huaweiErrorCode === '100003') {
                errorMessage = t('alerts.networkModeNotSupported') || 'Preferred network mode selection is not supported on this modem.';
            }
            ToastHelper.error(errorMessage);
        } finally {
            setIsChangingNetwork(false);
        }
    };

    return {
        modemService,
        loadSettings,

        // Data toggles
        mobileDataEnabled,
        dataRoamingEnabled,
        autoNetworkEnabled,
        isTogglingMobileData,
        isTogglingRoaming,
        isTogglingAutoNetwork,
        handleToggleMobileData,
        handleToggleRoaming,
        handleToggleAutoNetwork,

        // Network mode
        networkMode,
        showNetworkModeModal,
        setShowNetworkModeModal,
        isChangingNetwork,
        handleNetworkModeChange,

        // Band
        showBandModal,
        setShowBandModal,
        selectedBandsDisplay,

        // Monthly
        showMonthlyModal,
        setShowMonthlyModal,
        monthlySettings,
        handleSaveMonthlySettings,

        // Signal pointing
        showSignalPointingModal,
        setShowSignalPointingModal,
    };
}
