import React from 'react';
import {
    StyleSheet,
    ScrollView,
    Linking,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { SettingsSection, SettingsItem, SelectionModal, MeshGradientBackground, PageHeader, AnimatedScreen, ThemedSwitch, ThemedAlertHelper, BouncingDots } from '@/components';
import { useThemeStore } from '@/stores/theme.store';
import { useDebugStore } from '@/stores/debug.store';

export default function SettingsIndex() {
    const router = useRouter();
    const { colors, typography } = useTheme();
    const { t } = useTranslation();
    const { themeMode, setThemeMode, language, setLanguage, usageCardStyle, setUsageCardStyle } = useThemeStore();

    const [showThemeModal, setShowThemeModal] = React.useState(false);
    const [showLanguageModal, setShowLanguageModal] = React.useState(false);
    const [showUsageModal, setShowUsageModal] = React.useState(false);
    const [isSendingDebugLog, setIsSendingDebugLog] = React.useState(false);

    // Debug store
    const { debugEnabled, setDebugEnabled, apiLogs, sendDebugEmail, clearLogs, shareDebugLog } = useDebugStore();

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
        <AnimatedScreen noAnimation>
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
                        <SettingsItem
                            icon="settings"
                            title={t('settings.system')}
                            subtitle={t('settings.systemSubtitle') || 'Time, Reboot, Reset'}
                            onPress={() => router.push('/settings/system')}
                        />

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

                        <SettingsItem
                            icon="translate"
                            title={t('settings.language')}
                            onPress={() => setShowLanguageModal(true)}
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

                        <SettingsItem
                            icon="notifications"
                            title={t('notifications.title')}
                            onPress={() => router.push('/settings/notifications')}
                            isLast
                        />
                    </SettingsSection>

                    <SettingsSection title={t('settings.about')}>
                        <SettingsItem
                            icon="system-update"
                            title={`${t('settings.appVersion')} v${Constants.expoConfig?.version}`}
                            subtitle={t('settings.checkNow')}
                            onPress={() => router.push('/settings/update')}
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
                            isLast
                        />
                    </SettingsSection>

                    <SettingsSection title={t('settings.developer')}>
                        <SettingsItem
                            icon="developer-mode"
                            title={t('settings.debugMode')}
                            subtitle={t('settings.debugModeHint')}
                            showChevron={false}
                            rightElement={
                                <ThemedSwitch
                                    value={debugEnabled}
                                    onValueChange={(enabled) => {
                                        if (enabled) {
                                            ThemedAlertHelper.alert(
                                                t('settings.enableDebugConfirm'),
                                                t('settings.enableDebugMessage'),
                                                [
                                                    { text: t('common.cancel'), style: 'cancel' },
                                                    { text: t('common.enable'), onPress: () => setDebugEnabled(true) }
                                                ]
                                            );
                                        } else {
                                            if (apiLogs.length > 0) {
                                                ThemedAlertHelper.alert(
                                                    t('settings.disableDebugConfirm'),
                                                    t('settings.disableDebugMessage'),
                                                    [
                                                        { text: t('common.cancel'), style: 'cancel' },
                                                        { text: t('common.turnOff'), style: 'destructive', onPress: () => setDebugEnabled(false) }
                                                    ]
                                                );
                                            } else {
                                                setDebugEnabled(false);
                                            }
                                        }
                                    }}
                                />
                            }
                        />
                        {debugEnabled && (
                            <>
                                <SettingsItem
                                    icon="list-alt"
                                    title={t('settings.debugLogCount')}
                                    subtitle={`${apiLogs.length} ${t('settings.entries')}`}
                                    showChevron={false}
                                    rightElement={
                                        apiLogs.length > 0 ? (
                                            <View style={styles.iconButtonRow}>
                                                <TouchableOpacity
                                                    style={[styles.iconButton, { backgroundColor: colors.primary + '20' }]}
                                                    onPress={async () => {
                                                        try {
                                                            await shareDebugLog();
                                                        } catch (e) {
                                                        }
                                                    }}
                                                >
                                                    <MaterialIcons name="download" size={20} color={colors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.iconButton, { backgroundColor: colors.error + '20' }]}
                                                    onPress={() => {
                                                        ThemedAlertHelper.alert(
                                                            t('settings.clearLogsConfirm'),
                                                            t('settings.clearLogsMessage'),
                                                            [
                                                                { text: t('common.cancel'), style: 'cancel' },
                                                                {
                                                                    text: t('common.clear'),
                                                                    style: 'destructive',
                                                                    onPress: () => {
                                                                        clearLogs();
                                                                        ThemedAlertHelper.alert(t('common.success'), t('settings.debugLogsCleared'));
                                                                    }
                                                                }
                                                            ]
                                                        );
                                                    }}
                                                >
                                                    <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                                                </TouchableOpacity>
                                            </View>
                                        ) : undefined
                                    }
                                />
                                <SettingsItem
                                    icon="email"
                                    title={t('settings.sendDebugLog')}
                                    subtitle={t('settings.sendDebugLogHint')}
                                    onPress={async () => {
                                        if (apiLogs.length === 0) {
                                            ThemedAlertHelper.alert(
                                                t('settings.noDebugLogs'),
                                                t('settings.noDebugLogsHint')
                                            );
                                            return;
                                        }
                                        setIsSendingDebugLog(true);
                                        try {
                                            const emailOpened = await sendDebugEmail();
                                            if (!emailOpened) {
                                                ThemedAlertHelper.alert(
                                                    t('settings.emailClientError'),
                                                    t('settings.sendDebugLogHint'),
                                                    [
                                                        { text: t('common.cancel'), style: 'cancel' },
                                                        {
                                                            text: t('common.download'),
                                                            onPress: async () => {
                                                                try {
                                                                    await shareDebugLog();
                                                                } catch (e) {
                                                                }
                                                            }
                                                        }
                                                    ]
                                                );
                                            }
                                        } catch (e) {
                                            ThemedAlertHelper.alert(t('common.error'), t('settings.emailClientError'));
                                        } finally {
                                            setIsSendingDebugLog(false);
                                        }
                                    }}
                                    rightElement={
                                        isSendingDebugLog ? (
                                            <BouncingDots size="small" color={colors.primary} />
                                        ) : undefined
                                    }
                                    isLast
                                />
                            </>
                        )}
                        {!debugEnabled && (
                            <View style={{ height: 0 }} />
                        )}
                    </SettingsSection>

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
    clearButton: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    clearButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    iconButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        padding: 8,
        borderRadius: 8,
    },
});
