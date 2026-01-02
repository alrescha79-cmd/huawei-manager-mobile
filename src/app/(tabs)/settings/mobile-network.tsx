import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    View, // Added View
    TouchableOpacity,
    Text,
} from 'react-native';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { ModemService } from '@/services/modem.service';
import { useTranslation } from '@/i18n';
import { BandSelectionModal, ThemedAlertHelper, getSelectedBandsDisplay, SettingsSection, SettingsItem, MonthlySettingsModal, SelectionModal, MeshGradientBackground, PageHeader, ThemedSwitch } from '@/components';
import { MaterialIcons } from '@expo/vector-icons';

const NETWORK_MODES = [
    { value: '00', labelKey: 'settings.networkAuto' },
    { value: '03', labelKey: 'settings.network4gOnly' },
    { value: '02', labelKey: 'settings.network3gOnly' },
    { value: '01', labelKey: 'settings.network2gOnly' },
    { value: '0302', labelKey: 'settings.network4g3g' },
];

export default function MobileNetworkSettingsScreen() {
    const { colors, typography } = useTheme();
    const { t } = useTranslation();
    const { credentials } = useAuthStore();

    const [modemService, setModemService] = useState<ModemService | null>(null);

    // Toggles
    const [mobileDataEnabled, setMobileDataEnabled] = useState(false);
    const [dataRoamingEnabled, setDataRoamingEnabled] = useState(false);
    const [autoNetworkEnabled, setAutoNetworkEnabled] = useState(true);

    const [isTogglingMobileData, setIsTogglingMobileData] = useState(false);
    const [isTogglingRoaming, setIsTogglingRoaming] = useState(false);
    const [isTogglingAutoNetwork, setIsTogglingAutoNetwork] = useState(false);

    // Network Mode
    const [networkMode, setNetworkMode] = useState('00');
    const [showNetworkModeModal, setShowNetworkModeModal] = useState(false);
    const [isChangingNetwork, setIsChangingNetwork] = useState(false);

    // Bands
    const [showBandModal, setShowBandModal] = useState(false);
    const [selectedBandsDisplay, setSelectedBandsDisplay] = useState<string[]>([]);

    // Monthly Settings
    const [showMonthlyModal, setShowMonthlyModal] = useState(false);
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

            setMobileDataEnabled(mobileData.dataswitch);
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
            ThemedAlertHelper.alert(t('common.success'), t('home.monthlySettingsSaved'));
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('home.failedSaveMonthlySettings'));
        }
    };

    const handleToggleMobileData = async (value: boolean) => {
        if (!modemService || isTogglingMobileData) return;

        if (!value) {
            // Turning OFF - Ask for confirmation
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
            // Turning ON - No confirmation
            executeToggleMobileData(value);
        }
    };

    const executeToggleMobileData = async (value: boolean) => {
        if (!modemService) return;
        setIsTogglingMobileData(true);
        try {
            await modemService.toggleMobileData(value);
            setMobileDataEnabled(value);
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
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
            setAutoNetworkEnabled(!value);
        } finally {
            setIsTogglingAutoNetwork(false);
        }
    };

    const handleNetworkModeChange = async (mode: string) => {
        if (!modemService) return;
        setShowNetworkModeModal(false); // Close first
        setIsChangingNetwork(true);
        try {
            await modemService.setNetworkMode(mode);
            setNetworkMode(mode);
            ThemedAlertHelper.alert(t('common.success'), t('settings.networkModeChanged'));
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('alerts.failedChangeNetwork'));
        } finally {
            setIsChangingNetwork(false);
        }
    };

    const currentNetworkModeLabel = NETWORK_MODES.find(m => m.value === networkMode)?.labelKey || 'settings.networkAuto';

    return (
        <MeshGradientBackground>
            <PageHeader title={t('settings.mobileNetwork')} showBackButton />
            <ScrollView
                style={[styles.container, { backgroundColor: 'transparent' }]}
                contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
            >
                <SettingsSection title={t('settings.mobileData')}>
                    <SettingsItem
                        title={t('settings.mobileData')}
                        onPress={() => handleToggleMobileData(!mobileDataEnabled)}
                        showChevron={false}
                        rightElement={
                            isTogglingMobileData ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <ThemedSwitch
                                    value={mobileDataEnabled}
                                    onValueChange={handleToggleMobileData}
                                />
                            )
                        }
                    />
                    <SettingsItem
                        title={t('settings.dataRoaming')}
                        onPress={() => handleToggleRoaming(!dataRoamingEnabled)}
                        showChevron={false}
                        rightElement={
                            isTogglingRoaming ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <ThemedSwitch
                                    value={dataRoamingEnabled}
                                    onValueChange={handleToggleRoaming}
                                />
                            )
                        }
                    />
                    <SettingsItem
                        title={t('settings.autoNetwork')}
                        onPress={() => handleToggleAutoNetwork(!autoNetworkEnabled)}
                        showChevron={false}
                        isLast
                        rightElement={
                            isTogglingAutoNetwork ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <ThemedSwitch
                                    value={autoNetworkEnabled}
                                    onValueChange={handleToggleAutoNetwork}
                                />
                            )
                        }
                    />
                </SettingsSection>

                <SettingsSection title={t('settings.preferredNetwork')}>
                    <SettingsItem
                        title={t('settings.preferredNetwork')}
                        value={t(currentNetworkModeLabel)}
                        onPress={() => setShowNetworkModeModal(true)}
                        isLast
                        rightElement={isChangingNetwork ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
                    />
                </SettingsSection>

                <SettingsSection title={t('settings.frequencyBands')}>
                    <SettingsItem
                        title={t('settings.selectBandsTitle')}
                        subtitle={selectedBandsDisplay.length > 0 ? selectedBandsDisplay.join(', ') : t('common.all')}
                        onPress={() => setShowBandModal(true)}
                        isLast
                    />
                </SettingsSection>

                {/* Monthly Usage Settings */}
                <SettingsSection title={t('home.monthlySettings')}>
                    <SettingsItem
                        title={t('home.monthlySettings')}
                        subtitle={monthlySettings.enabled
                            ? `${monthlySettings.dataLimit} ${monthlySettings.dataLimitUnit} | ${monthlySettings.monthThreshold}%`
                            : t('common.disabled')}
                        onPress={() => setShowMonthlyModal(true)}
                        isLast
                    />
                </SettingsSection>

                {/* Network Mode Modal */}
                {/* Network Mode Modal */}
                {/* Network Mode Modal */}
                <SelectionModal
                    visible={showNetworkModeModal}
                    title={t('settings.preferredNetwork')}
                    options={NETWORK_MODES.map(mode => ({
                        label: t(mode.labelKey),
                        value: mode.value
                    }))}
                    selectedValue={networkMode}
                    onSelect={(val) => handleNetworkModeChange(val)}
                    onClose={() => setShowNetworkModeModal(false)}
                />

                <BandSelectionModal
                    visible={showBandModal}
                    onClose={() => setShowBandModal(false)}
                    modemService={modemService}
                    onSaved={() => {
                        if (modemService) loadSettings(modemService);
                    }}
                />

                {/* Monthly Settings Modal */}
                <MonthlySettingsModal
                    visible={showMonthlyModal}
                    onClose={() => setShowMonthlyModal(false)}
                    onSave={handleSaveMonthlySettings}
                    initialSettings={monthlySettings}
                />
            </ScrollView>
        </MeshGradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
