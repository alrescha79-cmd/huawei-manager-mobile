import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { formatDuration } from '@/utils/helpers';
import { Card } from './Card';

/*
  Compact Usage Card
  Displays Session, Monthly, and All Time stats in a single tabbed card.
*/

interface TrafficStats {
    currentDownload: number;
    currentUpload: number;
    currentConnectTime: number;
    monthDownload: number;
    monthUpload: number;
    monthDuration: number;
    totalDownload: number;
    totalUpload: number;
    totalConnectTime: number;
}

interface CompactUsageCardProps {
    stats: TrafficStats;
    dataLimit?: number; // For monthly progress
    style?: StyleProp<ViewStyle>;
}

type TabType = 'session' | 'monthly' | 'total';

// Helper to format bytes
const formatBytesWithUnit = (bytes: number): { value: string; unit: string } => {
    if (!bytes || isNaN(bytes) || bytes === 0) return { value: '0', unit: 'B' };
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return {
        value: (bytes / Math.pow(k, i)).toFixed(2),
        unit: sizes[i],
    };
};

export function CompactUsageCard({ stats, dataLimit, style }: CompactUsageCardProps) {
    const { colors, typography, glassmorphism, isDark } = useTheme();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('monthly'); // Default to Monthly as in image

    // Highlight Colors
    const blueColor = '#3b82f6';
    const greenColor = '#22c55e';
    const purpleColor = '#a855f7';

    // Get current active stats
    const getActiveStats = () => {
        switch (activeTab) {
            case 'session':
                return {
                    download: stats.currentDownload,
                    upload: stats.currentUpload,
                    duration: stats.currentConnectTime,
                    label: t('home.currentSession')
                };
            case 'monthly':
                return {
                    download: stats.monthDownload > 0 ? stats.monthDownload : stats.totalDownload, // Fallback logic from home.tsx
                    upload: stats.monthUpload > 0 ? stats.monthUpload : stats.totalUpload,
                    duration: stats.monthDuration,
                    label: t('home.thisMonth')
                };
            case 'total':
                return {
                    download: stats.totalDownload,
                    upload: stats.totalUpload,
                    duration: stats.totalConnectTime,
                    label: t('home.allTime')
                };
        }
    };

    const currentStats = getActiveStats();
    const totalBytes = currentStats.download + currentStats.upload;
    const totalFormatted = formatBytesWithUnit(totalBytes);
    const dlFormatted = formatBytesWithUnit(currentStats.download);
    const ulFormatted = formatBytesWithUnit(currentStats.upload);

    // Duration Badge
    const durationText = currentStats.duration ? formatDuration(currentStats.duration) : '0s';

    // Progress Bar (Only for Monthly with Limit)
    let percent = 0;
    let limitFormatted = { value: '0', unit: 'GB' };
    const showProgress = activeTab === 'monthly' && dataLimit && dataLimit > 0;

    if (showProgress) {
        percent = Math.min(Math.round((totalBytes / dataLimit) * 100), 100);
        limitFormatted = formatBytesWithUnit(dataLimit);
    }

    // Dynamic color based on percentage
    const getProgressColor = (pct: number): string => {
        if (pct >= 90) return '#ef4444'; // Red
        if (pct >= 75) return '#f97316'; // Orange
        if (pct >= 50) return '#eab308'; // Yellow
        return '#22c55e'; // Green
    };

    const progressColor = showProgress ? getProgressColor(percent) : blueColor;

    return (
        <Card style={[styles.container, style]}>
            {/* Header: Title + Tabs */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="insert-chart" size={18} color={blueColor} style={{ marginRight: 8 }} />
                    <Text style={[typography.headline, { color: colors.text, fontWeight: '700', fontSize: 16 }]}>
                        {t('home.dataStatistics')}
                    </Text>
                </View>

                {/* Tabs */}
                <View style={[styles.tabsContainer, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
                    {(['session', 'monthly', 'total'] as TabType[]).map((tab) => {
                        let tabLabel = '';
                        switch (tab) {
                            case 'session': tabLabel = t('home.session'); break;
                            case 'monthly': tabLabel = t('home.monthly'); break;
                            case 'total': tabLabel = t('home.allTime'); break;
                        }

                        return (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => setActiveTab(tab)}
                                style={[
                                    styles.tabItem,
                                    activeTab === tab && { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)' }
                                ]}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: activeTab === tab ? blueColor : colors.textSecondary }
                                ]}>
                                    {tabLabel}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Main Stats Area */}
            <View style={styles.mainStatsRow}>
                {/* Left Side: Usage Value + Unit/Label */}
                <View style={styles.leftStatsGroup}>
                    <Text style={[styles.mainValue, { color: blueColor }]}>
                        {totalFormatted.value}
                    </Text>

                    <Text style={[styles.mainUnitLabel, { color: colors.textSecondary }]}>
                        {totalFormatted.unit} {currentStats.label}
                    </Text>
                </View>

                {/* Right Side: Progress Info (Monthly) OR Duration (Session/Total) */}
                <View style={styles.rightStatsGroup}>
                    {showProgress ? (
                        <>
                            <View style={[styles.percentBadge, { borderColor: progressColor }]}>
                                <Text style={[typography.caption2, { color: progressColor, fontWeight: 'bold' }]}>
                                    {percent}%
                                </Text>
                            </View>
                            <Text style={[typography.caption2, { color: colors.textSecondary, fontSize: 10, textAlign: 'right', marginTop: 2 }]}>
                                {t('home.of')} {limitFormatted.value} {limitFormatted.unit}
                            </Text>
                        </>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialIcons name="timeline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                            <Text style={[typography.caption1, { color: colors.textSecondary, fontSize: 12, fontFamily: 'monospace' }]}>
                                {durationText}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Progress Bar (Full Width if Monthly) */}
            {showProgress && (
                <View style={[styles.progressBarTrack, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light, marginBottom: 20 }]}>
                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                width: `${percent}%`,
                                backgroundColor: progressColor
                            }
                        ]}
                    />
                </View>
            )}

            {/* Spacer if no progress bar to align footer */}
            {!showProgress && <View style={{ height: 20 }} />}

            {/* Footer Grid */}
            <View style={styles.footerGrid}>
                {/* Download */}
                <View style={[styles.detailCard, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                        <MaterialIcons name="arrow-downward" size={16} color={greenColor} />
                    </View>
                    <View>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('home.download').toUpperCase()}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {dlFormatted.value} <Text style={{ fontSize: 12, color: colors.textSecondary }}>{dlFormatted.unit}</Text>
                        </Text>
                    </View>
                </View>

                {/* Upload */}
                <View style={[styles.detailCard, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                        <MaterialIcons name="arrow-upward" size={16} color={purpleColor} />
                    </View>
                    <View>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('home.upload').toUpperCase()}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {ulFormatted.value} <Text style={{ fontSize: 12, color: colors.textSecondary }}>{ulFormatted.unit}</Text>
                        </Text>
                    </View>
                </View>
            </View>

        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    tabsContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 2,
        overflow: 'hidden',
    },
    tabItem: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tabText: {
        fontSize: 11,
        fontWeight: '600',
    },
    mainStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // baseline can be tricky with different fonts, center often looks cleaner for side-by-side
        marginBottom: 10,
    },
    leftStatsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeContainer: {
        alignItems: 'flex-start',
        marginLeft: 12,
    },
    rightStatsGroup: {
        alignItems: 'flex-end',
    },
    mainValue: {
        fontSize: 42,
        fontWeight: 'bold',
        letterSpacing: -1,
        lineHeight: 42,
    },
    durationBadge: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    percentBadge: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    progressBarTrack: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    footerGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    detailCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    mainUnitLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
        marginTop: 12, // Align roughly with baseline of big number
    },
});
