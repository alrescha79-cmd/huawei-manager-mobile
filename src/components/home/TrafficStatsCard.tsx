import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import {
    Card,
    SpeedGauge,
    DailyUsageCard,
    UsageCard,
    CompactUsageCard,
    MonthlyComparisonCard,
} from '@/components';
import { formatDuration, DurationUnits } from '@/utils/helpers';

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
    onOpenMonthlySettings?: () => void;
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
    onOpenMonthlySettings,
}: TrafficStatsCardProps) {
    const { colors, typography, spacing } = useTheme();

    const dataLimitBytes = monthlySettings?.enabled
        ? monthlySettings.dataLimit * (monthlySettings.dataLimitUnit === 'GB' ? 1073741824 : 1048576)
        : undefined;

    return (
        <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={[typography.headline, { color: colors.text, textAlign: 'center' }]}>{t('home.trafficStats')}</Text>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.md }} />

            <SpeedGauge
                downloadSpeed={trafficStats.currentDownloadRate}
                uploadSpeed={trafficStats.currentUploadRate}
            />

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

            {trafficStats.dayUsed > 0 && (
                <DailyUsageCard
                    usage={trafficStats.dayUsed}
                    duration={trafficStats.dayDuration}
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

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, gap: 12 }}>
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
                        <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                        <>
                            <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                            <Text style={[typography.caption1, { color: colors.error, marginLeft: 6, fontWeight: '600' }]}>
                                {t('home.clearHistory')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: spacing.sm,
                        backgroundColor: colors.primary + '15',
                        borderRadius: 8,
                    }}
                    onPress={onOpenMonthlySettings}
                >
                    <MaterialIcons name="data-saver-on" size={18} color={colors.primary} />
                    <Text style={[typography.caption1, { color: colors.primary, marginLeft: 6, fontWeight: '600' }]}>
                        {t('home.monthlySettings') || 'Monthly Limit'}
                    </Text>
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
