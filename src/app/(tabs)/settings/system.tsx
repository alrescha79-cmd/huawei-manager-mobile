import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    TextInput,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { ModemService } from '@/services/modem.service';
import { useTranslation } from '@/i18n';
import { ThemedAlertHelper, Button, SettingsSection, SettingsItem } from '@/components';

const TIMEZONES = [
    'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6', 'UTC-5',
    'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3',
    'UTC+4', 'UTC+5', 'UTC+5:30', 'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10',
    'UTC+11', 'UTC+12',
];

const formatModemTime = (time: string) => {
    if (!time) return '...';
    // Expecting "YYYY/MM/DD HH:MM:SS" or "DD/MM/YYYY HH.MM.SS" or similar
    // Try to normalize to YYYY-MM-DD HH:MM:SS
    try {
        // Remove comma if present
        let cleaned = time.replace(',', '');

        // Split date and time
        const parts = cleaned.split(' ');
        if (parts.length < 2) return time.replace(/\//g, '-');

        let datePart = parts[0];
        let timePart = parts[1];

        // Fix time part: HH.MM.SS -> HH:MM:SS
        timePart = timePart.replace(/\./g, ':');

        // Fix date part: DD/MM/YYYY -> YYYY-MM-DD
        if (datePart.includes('/')) {
            const dateSegments = datePart.split('/');
            // If year is last (DD/MM/YYYY)
            if (dateSegments[2].length === 4) {
                datePart = `${dateSegments[2]}-${dateSegments[1]}-${dateSegments[0]}`;
            } else {
                // Assume YYYY/MM/DD
                datePart = datePart.replace(/\//g, '-');
            }
        }

        return `${datePart} ${timePart}`;

    } catch (e) {
        return time;
    }
};

export default function SystemSettingsScreen() {
    const router = useRouter();
    const { colors, typography } = useTheme();
    const { t } = useTranslation();
    const { credentials, login, logout } = useAuthStore();
    const { themeMode, setThemeMode, language, setLanguage } = useThemeStore();

    const [modemService, setModemService] = useState<ModemService | null>(null);

    // Time
    const [currentTime, setCurrentTime] = useState('');
    const [sntpEnabled, setSntpEnabled] = useState(true);
    const [ntpServer, setNtpServer] = useState('pool.ntp.org');
    const [timezone, setTimezone] = useState('UTC+7');
    const [showTimezoneModal, setShowTimezoneModal] = useState(false);
    const [isTogglingSntp, setIsTogglingSntp] = useState(false);

    // Credentials
    const [modemIp, setModemIp] = useState(credentials?.modemIp || '192.168.8.1');
    const [modemUsername, setModemUsername] = useState(credentials?.username || 'admin');
    const [modemPassword, setModemPassword] = useState(credentials?.password || '');
    const [showPassword, setShowPassword] = useState(false);
    const [isSavingCredentials, setIsSavingCredentials] = useState(false);

    const hasCredentialsChanges =
        modemIp !== (credentials?.modemIp || '192.168.8.1') ||
        modemUsername !== (credentials?.username || 'admin') ||
        modemPassword !== (credentials?.password || '');

    useEffect(() => {
        if (credentials?.modemIp) {
            const service = new ModemService(credentials.modemIp);
            setModemService(service);
            loadTime(service);

            // Clock
            const interval = setInterval(() => {
                service.getCurrentTime().then(setTime => setCurrentTime(setTime)).catch(() => { });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [credentials]);

    const loadTime = async (service: ModemService) => {
        try {
            const settings = await service.getTimeSettings();
            setCurrentTime(settings.currentTime);
            setSntpEnabled(settings.sntpEnabled);
            setNtpServer(settings.ntpServer);
            setTimezone(settings.timezone);
        } catch (e) { }
    };

    const handleToggleSntp = async (enabled: boolean) => {
        if (!modemService || isTogglingSntp) return;
        setIsTogglingSntp(true);
        try {
            await modemService.setTimeSettings({ sntpEnabled: enabled });
            setSntpEnabled(enabled);
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
        } finally {
            setIsTogglingSntp(false);
        }
    };

    const handleTimezoneChange = async (tz: string) => {
        if (!modemService) return;
        setShowTimezoneModal(false);
        try {
            await modemService.setTimeSettings({ timezone: tz });
            setTimezone(tz);
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
        }
    };

    const handleSaveCredentials = async () => {
        if (isSavingCredentials) return;
        setIsSavingCredentials(true);
        try {
            await login({
                modemIp,
                username: modemUsername,
                password: modemPassword,
            });
            ThemedAlertHelper.alert(t('common.success'), t('settings.credentialsSaved'));
            router.replace('/settings'); // Force reload of settings context
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('settings.failedSaveCredentials'));
        } finally {
            setIsSavingCredentials(false);
        }
    };

    const handleReboot = async () => {
        ThemedAlertHelper.alert(
            t('settings.rebootModem'),
            t('settings.rebootConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.rebootModem'),
                    style: 'destructive',
                    onPress: async () => {
                        if (modemService) {
                            try {
                                await modemService.reboot();
                                ThemedAlertHelper.alert(t('common.success'), t('settings.rebootSuccess'));
                            } catch (e) {
                                ThemedAlertHelper.alert(t('common.error'), t('alerts.failedReboot'));
                            }
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        ThemedAlertHelper.alert(
            t('settings.logout'),
            t('settings.logoutConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (modemService) await modemService.logout();
                        } catch (e) { }
                        await logout();
                        router.replace('/login');
                    }
                }
            ]
        );
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={{ paddingBottom: 40 }}
        >
            {/* Time Settings */}
            <SettingsSection title={t('timeSettings.title')}>
                <SettingsItem
                    title={t('timeSettings.currentTime')}
                    value={formatModemTime(currentTime)}
                    showChevron={false}
                />
                <SettingsItem
                    title={t('timeSettings.sntpServer')}
                    showChevron={false}
                    rightElement={isTogglingSntp ? <ActivityIndicator size="small" color={colors.primary} /> : (
                        <Switch
                            value={sntpEnabled}
                            onValueChange={handleToggleSntp}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={'#FFFFFF'}
                        />
                    )}
                />
                <SettingsItem
                    title={t('timeSettings.timeZone')}
                    value={timezone}
                    onPress={() => setShowTimezoneModal(true)}
                    isLast
                />
            </SettingsSection>

            {/* App Settings */}
            <SettingsSection title={t('settings.appSettings')}>
                <View style={styles.customRow}>
                    <Text style={[typography.body, { color: colors.text }]}>{t('settings.theme')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {['light', 'dark', 'system'].map(mode => (
                            <TouchableOpacity
                                key={mode}
                                style={[
                                    styles.segmentedBtn,
                                    {
                                        backgroundColor: themeMode === mode ? colors.primary : 'transparent',
                                        borderColor: colors.border,
                                        borderWidth: 1
                                    }
                                ]}
                                onPress={() => setThemeMode(mode as any)}
                            >
                                <MaterialIcons
                                    name={mode === 'light' ? 'light-mode' : mode === 'dark' ? 'dark-mode' : 'brightness-auto'}
                                    size={18}
                                    color={themeMode === mode ? '#fff' : colors.textSecondary}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={[styles.customRow, { borderBottomWidth: 0 }]}>
                    <Text style={[typography.body, { color: colors.text }]}>{t('settings.language')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {['en', 'id'].map(lang => (
                            <TouchableOpacity
                                key={lang}
                                style={[
                                    styles.segmentedBtn,
                                    {
                                        backgroundColor: language === lang ? colors.primary : 'transparent',
                                        borderColor: colors.border,
                                        borderWidth: 1,
                                        width: 40
                                    }
                                ]}
                                onPress={() => setLanguage(lang as any)}
                            >
                                <Text style={{ color: language === lang ? '#fff' : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                                    {lang.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </SettingsSection>

            {/* Connection Credentials */}
            <SettingsSection title={t('settings.modemControl')}>
                <View style={[styles.innerContent]}>
                    <View style={styles.inputGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.modemIpLabel')}</Text>
                        <TextInput
                            value={modemIp}
                            onChangeText={setModemIp}
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.usernameLabel')}</Text>
                        <TextInput
                            value={modemUsername}
                            onChangeText={setModemUsername}
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                            autoCapitalize="none"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.passwordLabel')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                value={modemPassword}
                                onChangeText={setModemPassword}
                                secureTextEntry={!showPassword}
                                style={[styles.input, { color: colors.text, borderColor: colors.border, flex: 1 }]}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ marginLeft: 8, padding: 4 }}>
                                <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {hasCredentialsChanges && (
                        <Button
                            title={t('common.save')}
                            onPress={handleSaveCredentials}
                            loading={isSavingCredentials}
                            style={{ marginTop: 8 }}
                        />
                    )}
                </View>
            </SettingsSection>

            {/* Actions */}
            <SettingsSection title={t('settings.actions')}>
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={handleReboot}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="restart-alt" size={24} color={colors.error} />
                        <Text style={[typography.subheadline, styles.actionButtonText, { color: colors.error }]}>
                            {t('settings.rebootModem')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="logout" size={24} color={colors.error} />
                        <Text style={[typography.subheadline, styles.actionButtonText, { color: colors.error }]}>
                            {t('settings.logout')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SettingsSection>

            {/* Timezone Modal */}
            <Modal
                visible={showTimezoneModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowTimezoneModal(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[typography.headline, { color: colors.text }]}>{t('timeSettings.timeZone')}</Text>
                        <TouchableOpacity onPress={() => setShowTimezoneModal(false)}>
                            <Text style={{ color: colors.primary, fontSize: 17 }}>{t('common.done')}</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView>
                        {TIMEZONES.map((tz, index) => (
                            <TouchableOpacity
                                key={tz}
                                style={[
                                    styles.modalItem,
                                    { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                                ]}
                                onPress={() => handleTimezoneChange(tz)}
                            >
                                <Text style={{ color: timezone === tz ? colors.primary : colors.text, fontSize: 16 }}>{tz}</Text>
                                {timezone === tz && <MaterialIcons name="check" size={20} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    customRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        paddingLeft: 16, // Check SettingsItem padding
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#eee' // Will be overridden
    },
    segmentedBtn: {
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    innerContent: {
        padding: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        marginTop: 4,
    },
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12, // Reduced from 16
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4, // Reduced from 8
    },
    actionButtonText: {
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 12, // Slightly smaller text
    },
});
