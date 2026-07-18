import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import {
    Card,
    BouncingDots,
} from '@/components';
import { SpeedGauge } from './SpeedGauge';
import { DailyUsageCard } from './DailyUsageCard';
import { UsageCard } from './UsageCard';
import { CompactUsageCard } from './CompactUsageCard';
import { MonthlyComparisonCard } from './MonthlyComparisonCard';
import { formatDuration, DurationUnits } from '@/utils/helpers';

const SPEED_GAUGE_STORAGE_KEY = 'trafficStats_speedGaugeExpanded';

interface TrafficStats {
    currentDownloadRate: number;
    currentUploadRate: number;
    currentDownload: number;
    currentUpload: number;
    currentConnectTime: number;
    dayUsed: number;
    dayDuration: number;
    monthDownload: number;
    monthUpload: number;
    monthDuration: number;
    totalDownload: number;
    totalUpload: number;
    totalConnectTime: number;
}

interface MonthlySettings {
    enabled: boolean;
    dataLimit: number;
    dataLimitUnit: 'MB' | 'GB';
}

interface TrafficStatsCardProps {
    t: (key: string) => string;
    trafficStats: TrafficStats;
    monthlySettings?: MonthlySettings;
    usageCardStyle: 'compact' | 'split' | 'detailed';
    durationUnits: DurationUnits;
    lastClearedDate?: string;
    isClearingHistory?: boolean;
    onClearHistory?: () => void;
}

export function TrafficStatsCard({
    t,
    trafficStats,
    monthlySettings,
    usageCardStyle,
    durationUnits,
    lastClearedDate,
    isClearingHistory,
    onClearHistory,
}: TrafficStatsCardProps) {
    const { colors, typography, spacing } = useTheme();
    const [isSpeedGaugeVisible, setIsSpeedGaugeVisible] = useState<boolean | null>(null);

    useEffect(() => {
        AsyncStorage.getItem(SPEED_GAUGE_STORAGE_KEY)
            .then((value) => {
                const expanded = value !== null ? value === 'true' : true;
                setIsSpeedGaugeVisible(expanded);
            })
            .catch(() => setIsSpeedGaugeVisible(true));
    }, []);

    const toggleSpeedGauge = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newState = !isSpeedGaugeVisible;
        setIsSpeedGaugeVisible(newState);
        AsyncStorage.setItem(SPEED_GAUGE_STORAGE_KEY, String(newState)).catch(() => {});
    };

    const dataLimitBytes = monthlySettings?.enabled
        ? monthlySettings.dataLimit * (monthlySettings.dataLimitUnit === 'GB' ? 1073741824 : 1048576)
        : undefined;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dailyLimitBytes = dataLimitBytes ? dataLimitBytes / daysInMonth : undefined;

    return (
        <Card style={{ marginBottom: spacing.md }}>
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isSpeedGaugeVisible ? t('home.hideSpeedGauge') : t('home.showSpeedGauge')}
                accessibilityState={{ expanded: isSpeedGaugeVisible === true }}
                onPress={toggleSpeedGauge}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm }}
            >
                <Text style={[typography.headline, { color: colors.text }]}>{t('home.trafficStats')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[typography.caption2, { color: colors.textSecondary }]}>{t('home.speed')}</Text>
                    <MaterialIcons
                        name={isSpeedGaugeVisible === true ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={22}
                        color={colors.textSecondary}
                    />
                </View>
            </TouchableOpacity>

            {isSpeedGaugeVisible === true && (
                <>
                    <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.md }} />
                    <SpeedGauge
                        downloadSpeed={trafficStats.currentDownloadRate}
                        uploadSpeed={trafficStats.currentUploadRate}
                    />
                    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
                </>
            )}

            {(trafficStats.dayUsed > 0 || dailyLimitBytes) && (
                <DailyUsageCard
                    usage={trafficStats.dayUsed}
                    duration={trafficStats.dayDuration}
                    dailyLimit={dailyLimitBytes}
                    style={{ marginBottom: spacing.md }}
                />
            )}

            {usageCardStyle === 'compact' ? (
                <>
                    <CompactUsageCard stats={trafficStats} dataLimit={dataLimitBytes} />

                    <MonthlyComparisonCard
                        totalDownload={trafficStats.totalDownload}
                        totalUpload={trafficStats.totalUpload}
                        monthDownload={trafficStats.monthDownload}
                        monthUpload={trafficStats.monthUpload}
                    />
                </>
            ) : (
                <>
                    <UsageCard
                        title={t('home.session') || 'Session'}
                        download={trafficStats.currentDownload}
                        upload={trafficStats.currentUpload}
                        duration={trafficStats.currentConnectTime}
                        durationUnits={durationUnits}
                        variant="session"
                        style={{ marginBottom: spacing.md }}
                    />

                    <UsageCard
                        title={t('home.monthlyUsage') || 'Monthly Usage'}
                        download={trafficStats.monthDownload || trafficStats.totalDownload}
                        upload={trafficStats.monthUpload || trafficStats.totalUpload}
                        duration={trafficStats.monthDuration}
                        durationUnits={durationUnits}
                        variant="monthly"
                        dataLimit={dataLimitBytes}
                    />

                    <UsageCard
                        title={t('home.totalUsage') || 'Total Usage'}
                        badge={formatDuration(trafficStats.totalConnectTime, durationUnits)}
                        download={trafficStats.totalDownload}
                        upload={trafficStats.totalUpload}
                        icon="timeline"
                    />
                    <MonthlyComparisonCard
                        totalDownload={trafficStats.totalDownload}
                        totalUpload={trafficStats.totalUpload}
                        monthDownload={trafficStats.monthDownload}
                        monthUpload={trafficStats.monthUpload}
                        style={{ marginTop: spacing.md }}
                    />
                </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: spacing.sm,
                        backgroundColor: colors.error + '15',
                        borderRadius: 8,
                        opacity: isClearingHistory ? 0.6 : 1,
                    }}
                    onPress={onClearHistory}
                    disabled={isClearingHistory}
                >
                    {isClearingHistory ? (
                        <BouncingDots size="small" color={colors.error} />
                    ) : (
                        <>
                            <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                            <Text style={[typography.caption1, { color: colors.error, marginLeft: 6, fontWeight: '600' }]}>
                                {t('home.clearHistory')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {lastClearedDate && (
                <Text style={[typography.caption2, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                    {t('home.lastCleared')}: {new Date(lastClearedDate).toLocaleDateString()}
                </Text>
            )}
        </Card>
    );
}

export default TrafficStatsCard;
