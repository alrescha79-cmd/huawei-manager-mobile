import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    ScrollView,
    Switch,
    ActivityIndicator,
    View, // Added View
    Modal,
    TouchableOpacity,
    Text,
} from 'react-native';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { ModemService } from '@/services/modem.service';
import { useTranslation } from '@/i18n';
import { BandSelectionModal, ThemedAlertHelper, getSelectedBandsDisplay, SettingsSection, SettingsItem } from '@/components';
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

    useEffect(() => {
        if (credentials?.modemIp) {
            const service = new ModemService(credentials.modemIp);
            setModemService(service);
            loadSettings(service);
        }
    }, [credentials]);

    const loadSettings = async (service: ModemService) => {
        try {
            const [mobileData, roaming, autoNetwork, netMode, bandSettings] = await Promise.all([
                service.getMobileDataStatus(),
                service.getDataRoamingStatus(),
                service.getAutoNetworkStatus(),
                service.getNetworkMode(),
                service.getBandSettings(),
            ]);

            setMobileDataEnabled(mobileData.dataswitch);
            setDataRoamingEnabled(roaming);
            setAutoNetworkEnabled(autoNetwork);
            setNetworkMode(netMode);

            if (bandSettings?.lteBand) {
                setSelectedBandsDisplay(getSelectedBandsDisplay(bandSettings.lteBand));
            }
        } catch (error) {
            console.error('Error loading mobile network settings:', error);
        }
    };

    const handleToggleMobileData = async (value: boolean) => {
        if (!modemService || isTogglingMobileData) return;

        if (!value) {
            // Turning OFF - Ask for confirmation
            ThemedAlertHelper.alert(
                t('settings.mobileData'),
                t('settings.mobileDataDisableConfirm'), // Make sure this key exists or use a generic message
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
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={{ paddingBottom: 40 }}
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
                            <Switch
                                value={mobileDataEnabled}
                                onValueChange={handleToggleMobileData}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={'#FFFFFF'}
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
                            <Switch
                                value={dataRoamingEnabled}
                                onValueChange={handleToggleRoaming}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={'#FFFFFF'}
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
                            <Switch
                                value={autoNetworkEnabled}
                                onValueChange={handleToggleAutoNetwork}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={'#FFFFFF'}
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

            {/* Network Mode Modal */}
            <Modal
                visible={showNetworkModeModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowNetworkModeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[typography.headline, { color: colors.text, textAlign: 'center' }]}>{t('settings.preferredNetwork')}</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setShowNetworkModeModal(false)}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {NETWORK_MODES.map((mode, index) => (
                                <TouchableOpacity
                                    key={mode.value}
                                    style={[
                                        styles.modalItem,
                                        { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                                    ]}
                                    onPress={() => handleNetworkModeChange(mode.value)}
                                >
                                    <Text style={{ color: networkMode === mode.value ? colors.primary : colors.text, fontSize: 16 }}>
                                        {t(mode.labelKey)}
                                    </Text>
                                    {networkMode === mode.value && <MaterialIcons name="check" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <BandSelectionModal
                visible={showBandModal}
                onClose={() => setShowBandModal(false)}
                modemService={modemService}
                onSaved={() => {
                    if (modemService) loadSettings(modemService);
                }}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 16,
        overflow: 'hidden',
        maxHeight: 400,
        width: '85%', // restrict width for better popup feel
        borderWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.2)', // Subtle border
        alignSelf: 'center', // Ensure it's centered in the overlay
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'center', // Center title
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        position: 'relative', // For absolute positioning of close button if needed
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        top: 16,
        zIndex: 1,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
});
