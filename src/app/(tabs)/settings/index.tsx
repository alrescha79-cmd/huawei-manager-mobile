import React from 'react';
import {
    StyleSheet,
    ScrollView,
    Linking,
    View,
    Text,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { SettingsSection, SettingsItem, SelectionModal, MeshGradientBackground, PageHeader, AnimatedScreen } from '@/components';
import { useThemeStore } from '@/stores/theme.store';

export default function SettingsIndex() {
    const router = useRouter();
    const { colors, typography } = useTheme();
    const { t } = useTranslation();
    const { themeMode, setThemeMode, language, setLanguage, usageCardStyle, setUsageCardStyle } = useThemeStore();

    const [showThemeModal, setShowThemeModal] = React.useState(false);
    const [showLanguageModal, setShowLanguageModal] = React.useState(false);
    const [showUsageModal, setShowUsageModal] = React.useState(false);

    const handleOpenGitHub = () => {
        Linking.openURL('https://github.com/alrescha79-cmd');
    };

    const getThemeLabel = (mode: string) => {
        switch (mode) {
            case 'light': return t('settings.themeLight') || 'Light';
            case 'dark': return t('settings.themeDark') || 'Dark';
            default: return t('settings.themeSystem') || 'System';
        }
    };

    const getLanguageLabel = (lang: string) => {
        switch (lang) {
            case 'id': return 'Bahasa Indonesia';
            default: return 'English';
        }
    };

    return (
        <AnimatedScreen>
            <MeshGradientBackground>
                <PageHeader title={t('tabs.settings')} />
                <ScrollView
                    style={[styles.container, { backgroundColor: 'transparent' }]}
                    contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
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
                        {/* System Settings First */}
                        <SettingsItem
                            icon="settings"
                            title={t('settings.system')}
                            subtitle={t('settings.systemSubtitle') || 'Time, Reboot, Reset'}
                            onPress={() => router.push('/settings/system')}
                        />

                        {/* Data Usage View */}
                        <SettingsItem
                            icon="data-usage"
                            title="Data Usage View"
                            onPress={() => setShowUsageModal(true)}
                            rightElement={
                                <TouchableOpacity
                                    style={[styles.dropdownTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowUsageModal(true)}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text }]}>
                                        {usageCardStyle === 'compact' ? 'Compact' : 'Split'}
                                    </Text>
                                    <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            }
                        />

                        {/* Theme Settings */}
                        <SettingsItem
                            icon="brightness-6"
                            title={t('settings.theme')}
                            onPress={() => setShowThemeModal(true)}
                            rightElement={
                                <TouchableOpacity
                                    style={[styles.dropdownTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowThemeModal(true)}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text }]}>
                                        {getThemeLabel(themeMode)}
                                    </Text>
                                    <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            }
                        />

                        {/* Language Settings */}
                        <SettingsItem
                            icon="translate"
                            title={t('settings.language')}
                            onPress={() => setShowLanguageModal(true)}
                            isLast
                            rightElement={
                                <TouchableOpacity
                                    style={[styles.dropdownTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowLanguageModal(true)}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text }]}>
                                        {language.toUpperCase()}
                                    </Text>
                                    <MaterialIcons name="arrow-drop-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            }
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

                    {/* Theme Modal */}
                    <SelectionModal
                        visible={showThemeModal}
                        title={t('settings.theme')}
                        options={[
                            { label: getThemeLabel('light'), value: 'light' },
                            { label: getThemeLabel('dark'), value: 'dark' },
                            { label: getThemeLabel('system'), value: 'system' },
                        ]}
                        selectedValue={themeMode}
                        onSelect={(val) => {
                            setThemeMode(val);
                            setShowThemeModal(false);
                        }}
                        onClose={() => setShowThemeModal(false)}
                    />

                    {/* Language Modal */}
                    <SelectionModal
                        visible={showLanguageModal}
                        title={t('settings.language')}
                        options={[
                            { label: getLanguageLabel('en'), value: 'en' },
                            { label: getLanguageLabel('id'), value: 'id' },
                        ]}
                        selectedValue={language}
                        onSelect={(val) => {
                            setLanguage(val);
                            setShowLanguageModal(false);
                        }}
                        onClose={() => setShowLanguageModal(false)}
                    />

                    {/* Usage View Modal */}
                    <SelectionModal
                        visible={showUsageModal}
                        title="Data Usage View"
                        options={[
                            { label: 'Split View (Default)', value: 'split' },
                            { label: 'Compact View', value: 'compact' },
                        ]}
                        selectedValue={usageCardStyle}
                        onSelect={(val) => {
                            setUsageCardStyle(val as 'split' | 'compact');
                            setShowUsageModal(false);
                        }}
                        onClose={() => setShowUsageModal(false)}
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
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 1,
        gap: 4,
    },
    dropdownText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
