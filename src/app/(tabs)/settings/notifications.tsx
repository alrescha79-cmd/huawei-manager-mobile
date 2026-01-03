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
import { MeshGradientBackground, AnimatedScreen, ThemedAlertHelper, ThemedSwitch } from '@/components';
import {
    getNotificationSettings,
    saveNotificationSettings,
    NotificationSettings,
    getLastIpChangeTime,
    formatTimeAgo,
} from '@/services/notification.service';

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const { monthlySettings } = useModemStore();

    const [settings, setSettings] = useState<NotificationSettings>({
        dailyUsageEnabled: true,
        monthlyUsageEnabled: true,
        ipChangeEnabled: true,
    });
    const [lastIpChangeTime, setLastIpChangeTime] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        const stored = await getNotificationSettings();
        setSettings(stored);
        const ipTime = await getLastIpChangeTime();
        setLastIpChangeTime(ipTime);
        setIsLoading(false);
    };

    const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
        // Check if usage limit is enabled for usage notifications
        if ((key === 'dailyUsageEnabled' || key === 'monthlyUsageEnabled') && value) {
            if (!monthlySettings?.enabled) {
                ThemedAlertHelper.alert(
                    t('home.monthlySettings'),
                    t('notifications.usageLimitRequired')
                );
                return;
            }
        }

        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        await saveNotificationSettings(newSettings);
    };

    const getLastIpChangeText = () => {
        if (!lastIpChangeTime) return null;
        return formatTimeAgo(lastIpChangeTime, {
            minutesAgo: t('notifications.minutesAgo'),
            hoursAgo: t('notifications.hoursAgo'),
            justNow: t('notifications.justNow'),
        });
    };

    const usageLimitDisabled = !monthlySettings?.enabled;

    return (
        <MeshGradientBackground style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {t('notifications.title')}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <AnimatedScreen>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

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
                                {lastIpChangeTime && (
                                    <Text style={[styles.lastChange, { color: colors.primary }]}>
                                        {t('notifications.ipChangeTitle')}: {getLastIpChangeText()}
                                    </Text>
                                )}
                            </View>
                            <ThemedSwitch
                                value={settings.ipChangeEnabled}
                                onValueChange={(v) => updateSetting('ipChangeEnabled', v)}
                            />
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
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
