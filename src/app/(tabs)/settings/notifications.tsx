import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { useModemStore } from '@/stores/modem.store';
import { useThemeStore } from '@/stores/theme.store';
import { MeshGradientBackground, AnimatedScreen, ThemedAlertHelper, ToastHelper, ThemedSwitch, AdNative } from '@/components';
import {
    getNotificationSettings,
    saveNotificationSettings,
    NotificationSettings,
} from '@/services/notification.service';
import { showInterstitial } from '@/services/ad.service';

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const { monthlySettings } = useModemStore();
    const { setBadgesEnabled } = useThemeStore();

    const [settings, setSettings] = useState<NotificationSettings>({
        dailyUsageEnabled: true,
        monthlyUsageEnabled: true,
        ipChangeEnabled: true,
        smsEnabled: true,
        badgesEnabled: true,
        preReleaseUpdateEnabled: false,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        const stored = await getNotificationSettings();
        setSettings(stored);
        setIsLoading(false);
    };

    const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
        if ((key === 'dailyUsageEnabled' || key === 'monthlyUsageEnabled') && value) {
            if (!monthlySettings?.enabled) {
                ToastHelper.warning(t('notifications.usageLimitRequired'));
                return;
            }
        }

        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        await saveNotificationSettings(newSettings);
        showInterstitial(() => { });

        if (key === 'badgesEnabled') {
            setBadgesEnabled(value);
        }
    };

    const usageLimitDisabled = !monthlySettings?.enabled;

    return (
        <MeshGradientBackground style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {t('notifications.title')}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <AnimatedScreen noAnimation>
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                >

                    {/* Usage Data Notifications */}
                    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                            {t('home.dataStatistics').toUpperCase()}
                        </Text>

                        {/* Daily Usage */}
                        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>
                                    {t('notifications.dailyUsage')}
                                </Text>
                                <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                                    {t('notifications.dailyUsageHint')}
                                </Text>
                            </View>
                            <ThemedSwitch
                                value={settings.dailyUsageEnabled}
                                onValueChange={(v) => updateSetting('dailyUsageEnabled', v)}
                                disabled={usageLimitDisabled}
                            />
                        </View>



                        {/* Monthly Usage */}
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>
                                    {t('notifications.monthlyUsage')}
                                </Text>
                                <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                                    {t('notifications.monthlyUsageHint')}
                                </Text>
                            </View>
                            <ThemedSwitch
                                value={settings.monthlyUsageEnabled}
                                onValueChange={(v) => updateSetting('monthlyUsageEnabled', v)}
                                disabled={usageLimitDisabled}
                            />
                        </View>
                        {usageLimitDisabled && (
                            <View style={[styles.warningBox, { backgroundColor: colors.warning + '20' }]}>
                                <MaterialIcons name="info-outline" size={16} color={colors.warning} />
                                <Text style={[styles.warningText, { color: colors.warning }]}>
                                    {t('notifications.usageLimitRequired')}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={{ paddingHorizontal: 2 }}>
                        <AdNative />
                    </View>

                    {/* IP Change Notification */}
                    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                            {t('home.wanInfo').toUpperCase()}
                        </Text>

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>
                                    {t('notifications.ipChange')}
                                </Text>
                                <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                                    {t('notifications.ipChangeHint')}
                                </Text>
                            </View>
                            <ThemedSwitch
                                value={settings.ipChangeEnabled}
                                onValueChange={(v) => updateSetting('ipChangeEnabled', v)}
                            />
                        </View>

                        {/* SMS Notification */}
                        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>
                                    {t('notifications.sms')}
                                </Text>
                                <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                                    {t('notifications.smsHint')}
                                </Text>
                            </View>
                            <ThemedSwitch
                                value={settings.smsEnabled}
                                onValueChange={(v) => updateSetting('smsEnabled', v)}
                            />
                        </View>



                        {/* Tab Badges */}
                        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>
                                    {t('notifications.badges')}
                                </Text>
                                <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                                    {t('notifications.badgesHint')}
                                </Text>
                            </View>
                            <ThemedSwitch
                                value={settings.badgesEnabled}
                                onValueChange={(v) => updateSetting('badgesEnabled', v)}
                            />
                        </View>
                    </View>

                    {/* App Updates */}
                    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                            {t('settings.appUpdates').toUpperCase()}
                        </Text>

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>
                                    {t('notifications.preReleaseUpdate')}
                                </Text>
                                <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                                    {t('notifications.preReleaseUpdateHint')}
                                </Text>
                            </View>
                            <ThemedSwitch
                                value={settings.preReleaseUpdateEnabled}
                                onValueChange={(v) => updateSetting('preReleaseUpdateEnabled', v)}
                            />
                        </View>
                    </View>

                </ScrollView>
            </AnimatedScreen>
        </MeshGradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 0,
    },
    settingInfo: {
        flex: 1,
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    settingHint: {
        fontSize: 12,
        marginTop: 4,
    },
    lastChange: {
        fontSize: 12,
        marginTop: 6,
        fontWeight: '500',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    warningText: {
        fontSize: 12,
        flex: 1,
    },
});
