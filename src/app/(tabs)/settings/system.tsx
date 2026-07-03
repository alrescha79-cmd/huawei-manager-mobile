import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
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
import { ThemedAlertHelper, Button, SettingsSection, SettingsItem, MeshGradientBackground, PageHeader, ThemedSwitch, BouncingDots, AnimatedScreen, AdNative, PageSheetModal } from '@/components';
import { showInterstitial } from '@/services/ad.service';
import { useModemProfileStore } from '@/stores/modemProfile.store';
import { getModemProfilePassword } from '@/utils/storage';

const TIMEZONES = [
    'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6', 'UTC-5',
    'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3',
    'UTC+4', 'UTC+5', 'UTC+5:30', 'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10',
    'UTC+11', 'UTC+12',
];

const formatModemTime = (time: string) => {
    if (!time) return '...';
    try {
        if (time.includes('T')) {
            const dateObj = new Date(time);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const hours = String(dateObj.getHours()).padStart(2, '0');
                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }
            const parts = time.split('T');
            const datePart = parts[0];
            const timePart = parts[1]?.split('.')[0].replace('Z', '');
            return `${datePart} ${timePart}`;
        }

        let cleaned = time.replace(',', '');
        const parts = cleaned.split(' ');
        if (parts.length < 2) return time.replace(/\//g, '-');

        let datePart = parts[0];
        let timePart = parts[1];

        timePart = timePart.replace(/\./g, ':');

        if (datePart.includes('/')) {
            const dateSegments = datePart.split('/');
            if (dateSegments[2].length === 4) {
                datePart = `${dateSegments[2]}-${dateSegments[1]}-${dateSegments[0]}`;
            } else {
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
    const { profiles, loadProfiles, deleteProfile, updateProfile, switchProfile, isSwitching } = useModemProfileStore();

    // Profile edit state
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [editingProfile, setEditingProfile] = useState<{ id: string; name: string; modemIp: string; username: string; password: string } | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    useEffect(() => { loadProfiles(); }, []);

    const [modemService, setModemService] = useState<ModemService | null>(null);

    const [currentTime, setCurrentTime] = useState('');
    const [sntpEnabled, setSntpEnabled] = useState(true);
    const [ntpServer, setNtpServer] = useState('pool.ntp.org');
    const [timezone, setTimezone] = useState('UTC+7');
    const [showTimezoneModal, setShowTimezoneModal] = useState(false);
    const [isTogglingSntp, setIsTogglingSntp] = useState(false);

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
            showInterstitial(() => {});
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
            showInterstitial(() => {});
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
            showInterstitial(() => {
                ThemedAlertHelper.alert(t('common.success'), t('settings.credentialsSaved'));
                router.replace('/settings'); // Force reload of settings context
            });
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
                                showInterstitial(() => {
                                    ThemedAlertHelper.alert(t('common.success'), t('settings.rebootSuccess'));
                                });
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

    const handleReset = async () => {
        ThemedAlertHelper.alert(
            t('settings.resetFactory'),
            t('settings.resetConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.resetFactory'),
                    style: 'destructive',
                    onPress: async () => {
                        if (modemService) {
                            try {
                                await modemService.resetFactorySettings();
                                showInterstitial(() => {
                                    ThemedAlertHelper.alert(t('common.success'), t('settings.resetSuccess'));
                                });
                            } catch (e) {
                                ThemedAlertHelper.alert(t('common.error'), t('alerts.failedReset'));
                            }
                        }
                    }
                }
            ]
        );
    };

    return (
        <AnimatedScreen noAnimation>
            <MeshGradientBackground>
                <PageHeader title={t('settings.system')} showBackButton />
                <ScrollView
                    style={[styles.container, { backgroundColor: 'transparent' }]}
                    contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
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
                            rightElement={isTogglingSntp ? <BouncingDots size="small" color={colors.primary} /> : (
                                <ThemedSwitch
                                    value={sntpEnabled}
                                    onValueChange={handleToggleSntp}
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



                    {/* Modem Profiles */}
                    <SettingsSection title={t('settings.modemControl')}>
                        <View style={[styles.innerContent]}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 12, fontStyle: 'italic' }]}>
                                {t('settings.modemProfilesDesc')}
                            </Text>

                            {profiles.length === 0 && (
                                <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 }]}>
                                    {t('settings.noProfiles')}
                                </Text>
                            )}

                            {profiles.map((profile) => (
                                <View
                                    key={profile.id}
                                    style={[
                                        styles.profileCard,
                                        {
                                            borderColor: profile.isActive ? colors.primary : colors.border,
                                            backgroundColor: profile.isActive
                                                ? (colors.primary + '18')
                                                : colors.card,
                                        },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <MaterialIcons name="router" size={16} color={profile.isActive ? colors.primary : colors.textSecondary} />
                                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                                                {profile.name}
                                            </Text>
                                            {profile.isActive && (
                                                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                                                    <Text style={styles.activeBadgeText}>{t('settings.activeProfile')}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                                            {profile.modemIp} · {profile.username}
                                        </Text>
                                    </View>
                                    <View style={styles.profileActions}>
                                        {!profile.isActive && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    ThemedAlertHelper.alert(
                                                        t('settings.switchProfile'),
                                                        t('settings.switchProfileConfirm').replace('{{name}}', profile.name),
                                                        [
                                                            { text: t('common.cancel'), style: 'cancel' },
                                                            {
                                                                text: t('settings.switchProfile'),
                                                                onPress: async () => {
                                                                    const success = await switchProfile(profile.id);
                                                                    if (success) {
                                                                        ThemedAlertHelper.alert(
                                                                            t('common.success'),
                                                                            t('settings.switchSuccess').replace('{{name}}', profile.name)
                                                                        );
                                                                    } else {
                                                                        const err = useModemProfileStore.getState().switchError;
                                                                        const details = err ? `\n\nError: ${err}` : '';
                                                                        ThemedAlertHelper.alert(
                                                                            t('common.error'),
                                                                            t('settings.switchFailed') + details
                                                                        );
                                                                    }
                                                                }
                                                            },
                                                        ]
                                                    );
                                                }}
                                                disabled={isSwitching}
                                                style={[styles.profileActionBtn, { borderColor: colors.primary }]}
                                            >
                                                <Text style={[typography.caption1, { color: colors.primary, fontWeight: '600' }]}>
                                                    {isSwitching ? '...' : t('settings.switchProfile')}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            onPress={async () => {
                                                const pwd = await getModemProfilePassword(profile.id);
                                                setEditingProfile({
                                                    id: profile.id,
                                                    name: profile.name,
                                                    modemIp: profile.modemIp,
                                                    username: profile.username,
                                                    password: pwd,
                                                });
                                                setShowEditProfile(true);
                                            }}
                                            style={[styles.profileActionBtn, { borderColor: colors.border }]}
                                        >
                                            <MaterialIcons name="edit" size={16} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                ThemedAlertHelper.alert(
                                                    t('settings.deleteProfile'),
                                                    t('settings.deleteProfileConfirm').replace('{{name}}', profile.name),
                                                    [
                                                        { text: t('common.cancel'), style: 'cancel' },
                                                        {
                                                            text: t('common.delete'),
                                                            style: 'destructive',
                                                            onPress: () => deleteProfile(profile.id),
                                                        },
                                                    ]
                                                );
                                            }}
                                            style={[styles.profileActionBtn, { borderColor: colors.error }]}
                                        >
                                            <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </SettingsSection>

                    <View style={{ paddingHorizontal: 16}}>
                        <AdNative />
                    </View>

                    {/* Edit Profile Modal */}
                    <PageSheetModal
                        visible={showEditProfile}
                        onClose={() => { setShowEditProfile(false); setEditingProfile(null); }}
                        title={t('settings.editProfileTitle')}
                    >
                        {editingProfile && (
                            <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}>
                                <View style={styles.inputGroup}>
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.profileName')}</Text>
                                    <TextInput
                                        value={editingProfile.name}
                                        onChangeText={(v) => setEditingProfile({ ...editingProfile, name: v })}
                                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.modemIpLabel')}</Text>
                                    <TextInput
                                        value={editingProfile.modemIp}
                                        onChangeText={(v) => setEditingProfile({ ...editingProfile, modemIp: v })}
                                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.usernameLabel')}</Text>
                                    <TextInput
                                        value={editingProfile.username}
                                        onChangeText={(v) => setEditingProfile({ ...editingProfile, username: v })}
                                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                        autoCapitalize="none"
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.passwordLabel')}</Text>
                                    <TextInput
                                        value={editingProfile.password}
                                        onChangeText={(v) => setEditingProfile({ ...editingProfile, password: v })}
                                        secureTextEntry
                                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                    />
                                </View>
                                <Button
                                    title={isSavingEdit ? t('common.saving') : t('common.save')}
                                    loading={isSavingEdit}
                                    disabled={isSavingEdit || !editingProfile.name.trim()}
                                    onPress={async () => {
                                        setIsSavingEdit(true);
                                        await updateProfile(editingProfile.id, {
                                            name: editingProfile.name,
                                            modemIp: editingProfile.modemIp,
                                            username: editingProfile.username,
                                            password: editingProfile.password,
                                        });
                                        setIsSavingEdit(false);
                                        setShowEditProfile(false);
                                        setEditingProfile(null);
                                    }}
                                />
                            </View>
                        )}
                    </PageSheetModal>

                    {/* Actions */}
                    <SettingsSection title={t('settings.actions')}>
                        <SettingsItem
                            icon="restart-alt"
                            title={t('settings.rebootModem')}
                            onPress={handleReboot}
                        />
                        <SettingsItem
                            icon="restore"
                            title={t('settings.resetFactory')}
                            onPress={handleReset}
                        />
                        <SettingsItem
                            icon="logout"
                            title={t('settings.logout')}
                            onPress={handleLogout}
                            isLast
                        />
                    </SettingsSection>

                    {/* Timezone Modal */}
                    <PageSheetModal
                        visible={showTimezoneModal}
                        onClose={() => setShowTimezoneModal(false)}
                        title={t('timeSettings.timeZone')}
                        cancelText={t('common.cancel') || 'Cancel'}
                    >
                        <ScrollView style={{ flex: 1, paddingHorizontal: 16, marginTop: 8 }}>
                            {TIMEZONES.map((tz) => (
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
                    </PageSheetModal>
                </ScrollView>
            </MeshGradientBackground>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        gap: 8,
    },
    profileActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    profileActionBtn: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeBadge: {
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    activeBadgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
});

