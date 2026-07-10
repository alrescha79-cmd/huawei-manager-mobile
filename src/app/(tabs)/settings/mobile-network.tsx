import React from 'react';
import {
    StyleSheet,
    ScrollView,
    View,
    Text,
} from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { BandSelectionModal, MonthlySettingsModal, SelectionModal, MeshGradientBackground, ThemedSwitch, BouncingDots, AnimatedScreen, SignalPointingModal, AdNative } from '@/components';
import { SettingsSection, SettingsItem, PageHeader } from '@/components/settings';
import { useMobileNetwork } from '@/hooks/settings';

const NETWORK_MODES = [
    { value: '00', labelKey: 'settings.networkAuto' },
    { value: '04', labelKey: 'settings.network5gOnly' },
    { value: '0403', labelKey: 'settings.network5g4g' },
    { value: '03', labelKey: 'settings.network4gOnly' },
    { value: '0302', labelKey: 'settings.network4g3g' },
    { value: '02', labelKey: 'settings.network3gOnly' },
    { value: '01', labelKey: 'settings.network2gOnly' },
];

export default function MobileNetworkSettingsScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const {
        modemService, loadSettings,
        mobileDataEnabled, dataRoamingEnabled, autoNetworkEnabled,
        isTogglingMobileData, isTogglingRoaming, isTogglingAutoNetwork,
        handleToggleMobileData, handleToggleRoaming, handleToggleAutoNetwork,
        networkMode, showNetworkModeModal, setShowNetworkModeModal,
        isChangingNetwork, handleNetworkModeChange,
        showBandModal, setShowBandModal, selectedBandsDisplay,
        showMonthlyModal, setShowMonthlyModal, monthlySettings, handleSaveMonthlySettings,
        showSignalPointingModal, setShowSignalPointingModal,
    } = useMobileNetwork({ t });

    const currentNetworkModeLabel = NETWORK_MODES.find(m => m.value === networkMode)?.labelKey || 'settings.networkAuto';

    return (
        <AnimatedScreen noAnimation>
            <MeshGradientBackground>
                <PageHeader title={t('settings.mobileNetwork')} showBackButton />
                <ScrollView
                    style={[styles.container, { backgroundColor: 'transparent' }]}
                    contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
                >
                    <SettingsSection title={t('settings.mobileData')}>
                        <SettingsItem
                            title={t('settings.mobileData')}
                            onPress={() => handleToggleMobileData(!mobileDataEnabled)}
                            showChevron={false}
                            rightElement={
                                isTogglingMobileData ? (
                                    <BouncingDots size="small" color={colors.primary} />
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
                                    <BouncingDots size="small" color={colors.primary} />
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
                                    <BouncingDots size="small" color={colors.primary} />
                                ) : (
                                    <ThemedSwitch
                                        value={autoNetworkEnabled}
                                        onValueChange={handleToggleAutoNetwork}
                                    />
                                )
                            }
                        />
                    </SettingsSection>

                    <View style={{ paddingHorizontal: 16 }}>
                        <AdNative />
                    </View>

                    <SettingsSection title={t('settings.preferredNetwork')}>
                        <SettingsItem
                            title={t('settings.preferredNetwork')}
                            value={t(currentNetworkModeLabel)}
                            onPress={() => setShowNetworkModeModal(true)}
                            isLast
                            rightElement={isChangingNetwork ? <BouncingDots size="small" color={colors.primary} /> : undefined}
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

                    {/* Signal Tools */}
                    <SettingsSection title={t('settings.signalTools')}>
                        <SettingsItem
                            title={t('home.signalPointing')}
                            subtitle={t('settings.signalPointingDesc')}
                            onPress={() => setShowSignalPointingModal(true)}
                            isLast
                        />
                    </SettingsSection>

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

                    {/* Signal Pointing Modal */}
                    <SignalPointingModal
                        visible={showSignalPointingModal}
                        onClose={() => setShowSignalPointingModal(false)}
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
});
