import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { useThemeStore } from '@/stores/theme.store';
import { Card } from './Card';
import {
    getLastMonthUsage,
    checkAndSaveMonthlyUsage,
    formatMonthKey,
    getCurrentMonthKey,
    getLastMonthKey,
    MonthlyUsageData
} from '@/services/usageHistory.service';

interface MonthlyComparisonCardProps {
    totalDownload: number;
    totalUpload: number;
    monthDownload: number;
    monthUpload: number;
    style?: StyleProp<ViewStyle>;
}

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

export function MonthlyComparisonCard({
    totalDownload,
    totalUpload,
    monthDownload,
    monthUpload,
    style
}: MonthlyComparisonCardProps) {
    const { colors, typography, glassmorphism, isDark } = useTheme();
    const { t } = useTranslation();
    const { language } = useThemeStore();
    const [lastMonthData, setLastMonthData] = useState<MonthlyUsageData | null>(null);

    const locale = language === 'id' ? 'id-ID' : 'en-US';

    const thisMonthTotal = monthDownload + monthUpload;
    const thisMonthFormatted = formatBytesWithUnit(thisMonthTotal);
    const lastMonthFormatted = lastMonthData ? formatBytesWithUnit(lastMonthData.total) : { value: '0', unit: 'GB' };

    const getPercentageChange = (): { value: number; isIncrease: boolean } | null => {
        if (!lastMonthData || lastMonthData.total === 0) return null;
        const change = ((thisMonthTotal - lastMonthData.total) / lastMonthData.total) * 100;
        return { value: Math.abs(change), isIncrease: change > 0 };
    };

    const percentChange = getPercentageChange();

    const maxValue = Math.max(thisMonthTotal, lastMonthData?.total || 0);

    useEffect(() => {
        const loadData = async () => {
            await checkAndSaveMonthlyUsage(totalDownload, totalUpload, monthDownload, monthUpload);

            const lastMonth = await getLastMonthUsage(totalDownload, totalUpload, monthDownload, monthUpload);
            setLastMonthData(lastMonth);
        };

        if (totalDownload > 0 || totalUpload > 0) {
            loadData();
        }
    }, [totalDownload, totalUpload, monthDownload, monthUpload]);

    const blueColor = '#3b82f6';
    const grayColor = '#6b7280';
    const greenColor = '#22c55e';
    const redColor = '#ef4444';

    return (
        <Card style={[styles.container, style]}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="history" size={18} color={blueColor} style={{ marginRight: 8 }} />
                    <Text style={[typography.headline, { color: colors.text, fontWeight: '700', fontSize: 16 }]}>
                        {t('home.monthlyComparison')}
                    </Text>
                </View>

                {percentChange && (
                    <View style={[
                        styles.changeBadge,
                        { backgroundColor: percentChange.isIncrease ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)' }
                    ]}>
                        <MaterialIcons
                            name={percentChange.isIncrease ? 'trending-up' : 'trending-down'}
                            size={14}
                            color={percentChange.isIncrease ? redColor : greenColor}
                        />
                        <Text style={[styles.changeText, { color: percentChange.isIncrease ? redColor : greenColor }]}>
                            {percentChange.value.toFixed(1)}%
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.chartContainer}>
                <View style={styles.barRow}>
                    <View style={styles.barLabel}>
                        <Text style={[styles.monthText, { color: colors.text }]}>
                            {formatMonthKey(getCurrentMonthKey(), locale)}
                        </Text>
                        <Text style={[styles.valueText, { color: blueColor }]}>
                            {thisMonthFormatted.value} {thisMonthFormatted.unit}
                        </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
                        <View
                            style={[
                                styles.barFill,
                                {
                                    width: maxValue > 0 ? `${(thisMonthTotal / maxValue) * 100}%` : '0%',
                                    backgroundColor: blueColor
                                }
                            ]}
                        />
                    </View>
                </View>

                <View style={styles.barRow}>
                    <View style={styles.barLabel}>
                        <Text style={[styles.monthText, { color: colors.textSecondary }]}>
                            {t('home.lastMonth')}
                        </Text>
                        <Text style={[styles.valueText, { color: grayColor }]}>
                            {lastMonthFormatted.value} {lastMonthFormatted.unit}
                        </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
                        <View
                            style={[
                                styles.barFill,
                                {
                                    width: maxValue > 0 && lastMonthData ? `${(lastMonthData.total / maxValue) * 100}%` : '0%',
                                    backgroundColor: grayColor,
                                    opacity: 0.7
                                }
                            ]}
                        />
                    </View>
                </View>
            </View>

            {!lastMonthData && (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    {t('home.noLastMonthData')}
                </Text>
            )}
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
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    changeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    chartContainer: {
        gap: 16,
    },
    barRow: {
        gap: 8,
    },
    barLabel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    monthText: {
        fontSize: 12,
        fontWeight: '600',
    },
    valueText: {
        fontSize: 12,
        fontWeight: '700',
    },
    barTrack: {
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 6,
    },
    hint: {
        fontSize: 11,
        textAlign: 'center',
        marginTop: 12,
        fontStyle: 'italic',
    },
});
