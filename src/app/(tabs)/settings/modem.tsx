import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    View,
} from 'react-native';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { useModemStore } from '@/stores/modem.store';
import { ModemService } from '@/services/modem.service';
import { useTranslation } from '@/i18n';
import { ThemedAlertHelper, SettingsSection, SettingsItem, SelectionModal, MeshGradientBackground, PageHeader, BouncingDots } from '@/components';
import { MaterialIcons } from '@expo/vector-icons';

const ANTENNA_MODES = [
    { value: 'auto', labelKey: 'settings.antennaAuto', icon: 'settings-input-antenna' as const },
    { value: 'internal', labelKey: 'settings.antennaInternal', icon: 'wifi' as const },
    { value: 'external', labelKey: 'settings.antennaExternal', icon: 'router' as const },
];

export default function ModemSettingsScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { credentials } = useAuthStore();
    const { modemInfo, setModemInfo } = useModemStore();

    const [modemService, setModemService] = useState<ModemService | null>(null);
    const [antennaMode, setAntennaMode] = useState('auto');
    const [showAntennaModal, setShowAntennaModal] = useState(false);
    const [isChangingAntenna, setIsChangingAntenna] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (credentials?.modemIp) {
            const service = new ModemService(credentials.modemIp);
            setModemService(service);
            loadModemInfo(service);
            loadAntennaMode(service);
        }
    }, [credentials]);

    const loadModemInfo = async (service: ModemService) => {
        try {
            setIsLoading(true);
            const info = await service.getModemInfo();
            setModemInfo(info);
        } catch (error) {
            console.error('Error loading modem info:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAntennaMode = async (service: ModemService) => {
        try {
            const mode = await service.getAntennaMode();
            if (mode === 'auto' || mode === 'internal' || mode === 'external') {
                setAntennaMode(mode);
            } else {
                setAntennaMode('auto');
            }
        } catch (error) {
            console.error('Error loading antenna mode:', error);
        }
    };

    const handleAntennaChange = async (mode: 'auto' | 'internal' | 'external') => {
        if (!modemService || isChangingAntenna) return;

        setIsChangingAntenna(true);
        try {
            await modemService.setAntennaMode(mode);
            setAntennaMode(mode);
            ThemedAlertHelper.alert(t('common.success'), t('settings.antennaModeChanged'));
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('alerts.failedChangeAntenna'));
        } finally {
            setIsChangingAntenna(false);
        }
    };

    return (
        <MeshGradientBackground>
            <PageHeader title={t('settings.modemInfo')} showBackButton />
            <ScrollView
                style={[styles.container, { backgroundColor: 'transparent' }]}
                contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
            >
                <SettingsSection title={t('settings.deviceInfo')}>
                    {isLoading ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <BouncingDots size="medium" color={colors.primary} />
                        </View>
                    ) : (
                        <>
                            <SettingsItem title={t('settings.deviceName')} value={modemInfo?.deviceName} showChevron={false} />
                            <SettingsItem title={t('settings.serialNumber')} value={modemInfo?.serialNumber} showChevron={false} />
                            <SettingsItem title={t('settings.imei')} value={modemInfo?.imei} showChevron={false} />
                            <SettingsItem title={t('settings.imsi')} value={modemInfo?.imsi} showChevron={false} />
                            <SettingsItem title={t('settings.hardwareVersion')} value={modemInfo?.hardwareVersion} showChevron={false} />
                            <SettingsItem title={t('settings.softwareVersion')} value={modemInfo?.softwareVersion} showChevron={false} />
                            <SettingsItem title={t('settings.webUiVersion')} value={modemInfo?.webUIVersion} showChevron={false} isLast />
                        </>
                    )}
                </SettingsSection>

                <SettingsSection title={t('settings.antennaSettings')}>
                    <SettingsItem
                        title={t('settings.antennaSettings')}
                        value={t(ANTENNA_MODES.find(m => m.value === antennaMode)?.labelKey || 'settings.antennaAuto')}
                        onPress={() => setShowAntennaModal(true)}
                        isLast
                        rightElement={isChangingAntenna ? <BouncingDots size="small" color={colors.primary} /> : undefined}
                    />
                </SettingsSection>

                <SelectionModal
                    visible={showAntennaModal}
                    title={t('settings.antennaSettings')}
                    options={ANTENNA_MODES.map(mode => ({
                        label: t(mode.labelKey),
                        value: mode.value
                    }))}
                    selectedValue={antennaMode}
                    onSelect={(val) => {
                        setShowAntennaModal(false);
                        handleAntennaChange(val);
                    }}
                    onClose={() => setShowAntennaModal(false)}
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
