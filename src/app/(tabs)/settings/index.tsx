import React from 'react';
import {
    StyleSheet,
    ScrollView,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { SettingsSection, SettingsItem } from '@/components';

export default function SettingsIndex() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();

    const handleOpenGitHub = () => {
        Linking.openURL('https://github.com/alrescha79-cmd');
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={{ paddingBottom: 40 }}
        >
            <SettingsSection title={t('settings.connection')}>
                <SettingsItem
                    icon="router"
                    title={t('settings.modemInfo')}
                    subtitle={t('settings.modemInfoSubtitle') || 'Status, Antenna'}
                    onPress={() => router.push('/settings/modem')}
                />
                <SettingsItem
                    icon="signal-cellular-alt"
                    title={t('settings.mobileNetwork')}
                    subtitle={t('settings.mobileNetworkSubtitle') || 'Data, Roaming, Bands'}
                    onPress={() => router.push('/settings/mobile-network')}
                />
                <SettingsItem
                    icon="settings-ethernet"
                    title={t('settings.lanSettings')}
                    subtitle={t('settings.lanSettingsSubtitle') || 'Ethernet, DHCP, APN'}
                    onPress={() => router.push('/settings/lan')}
                    isLast
                />
            </SettingsSection>

            <SettingsSection title={t('settings.general')}>
                <SettingsItem
                    icon="settings"
                    title={t('settings.system')}
                    subtitle={t('settings.systemSubtitle') || 'Time, Reboot, Reset'}
                    onPress={() => router.push('/settings/system')}
                    isLast
                />
            </SettingsSection>

            <SettingsSection title={t('settings.about')}>
                <SettingsItem
                    icon="info-outline"
                    title={t('settings.appVersion')}
                    subtitle={`v${Constants.expoConfig?.version}`}
                    // onPress={() => { }} // Remove pressable effect for info items if desired
                    showChevron={false}
                />
                <SettingsItem
                    icon="person-outline"
                    title={t('settings.developer')}
                    subtitle="github.com/alrescha79-cmd"
                    onPress={handleOpenGitHub}
                />
                <SettingsItem
                    icon="bug-report"
                    title={t('settings.bugReport')}
                    subtitle={t('settings.bugReportHint')}
                    onPress={() => Linking.openURL('https://github.com/alrescha79-cmd/huawei-manager-mobile/issues')}
                />
                <SettingsItem
                    icon="system-update"
                    title={t('settings.checkUpdate')}
                    subtitle={t('settings.checkNow')}
                    onPress={() => router.push('/settings/update')}
                    isLast
                />
            </SettingsSection>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
