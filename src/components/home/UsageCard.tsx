import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { DurationUnits, formatDuration } from '@/utils/helpers';
import { Card } from '../Card';

interface UsageCardProps {
    title: string;
    badge?: string;
    download: number;
    upload: number;
    duration?: number;
    durationUnits?: DurationUnits;
    icon?: keyof typeof MaterialIcons.glyphMap;
    variant?: 'session' | 'monthly';
    dataLimit?: number;
    color?: string;
    style?: StyleProp<ViewStyle>;
    totalOnly?: boolean;
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

export function UsageCard({
    title,
    badge,
    download,
    upload,
    duration,
    durationUnits,
    icon,
    variant = 'session',
    dataLimit,
    style,
    totalOnly = false
}: UsageCardProps) {
    const { colors, typography, glassmorphism, isDark } = useTheme();
    const { t } = useTranslation();
    const [showRemaining, setShowRemaining] = useState(false);

    const total = download + upload;
    const canShowRemaining = variant === 'monthly' && !!dataLimit && dataLimit > 0;
    const remaining = canShowRemaining ? Math.max(dataLimit - total, 0) : 0;
    const displayedTotal = showRemaining && canShowRemaining ? remaining : total;
    const totalFormatted = formatBytesWithUnit(displayedTotal);
    const dlFormatted = formatBytesWithUnit(download);
    const ulFormatted = formatBytesWithUnit(upload);
    // Progress always answers "how much of quota is used"; toggle changes displayed amount only.
    const percent = canShowRemaining
        ? Math.min(Math.round((total / dataLimit) * 100), 100)
        : 0;
    const limitFormatted = canShowRemaining ? formatBytesWithUnit(dataLimit) : { value: '0', unit: 'GB' };

    const badgeText = badge || (duration ? formatDuration(duration, durationUnits) : '');

    const primaryColor = colors.primary;

    const getProgressColor = (pct: number): string => {
        if (pct >= 90) return '#ef4444';
        if (pct >= 75) return '#f97316';
        if (pct >= 50) return '#eab308';
        return '#22c55e';
    };

    const progressColor = variant === 'monthly' && dataLimit ? getProgressColor(percent) : primaryColor;

    return (
        <Card style={[styles.container, style]}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons
                        name={icon || (variant === 'session' ? 'access-time' : variant === 'monthly' ? 'calendar-month' : 'data-usage')}
                        size={18}
                        color={primaryColor}
                        style={{ marginRight: 8 }}
                    />
                    <Text style={[typography.headline, { color: colors.text, fontWeight: '700', fontSize: 16 }]}>
                        {title}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    {canShowRemaining && (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={showRemaining ? t('home.showUsedQuota') : t('home.showRemainingQuota')}
                            onPress={() => setShowRemaining((current) => !current)}
                            style={[styles.toggleButton, { borderColor: colors.border }]}
                        >
                            <MaterialIcons
                                name={showRemaining ? 'data-usage' : 'pie-chart-outline'}
                                size={16}
                                color={primaryColor}
                            />
                        </TouchableOpacity>
                    )}
                    {badgeText ? (
                        <View style={[styles.badgeContainer, { borderColor: colors.border }]}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, fontFamily: 'monospace' }]}>
                                {badgeText}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>

            <View style={styles.mainStatContainer}>
                <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>
                    {showRemaining ? t('home.remainingQuota') : t('home.usageAmount')}
                </Text>
                <View style={styles.mainValueRow}>
                    <Text style={[styles.mainValue, { color: primaryColor }]}>
                        {totalFormatted.value}
                    </Text>
                    <Text style={[styles.mainUnit, { color: colors.textSecondary }]}>
                        {totalFormatted.unit}
                    </Text>
                </View>
            </View>

            {variant === 'monthly' && (
                <View style={styles.progressSection}>
                    <View style={[styles.progressBarTrack, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
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

                    <View style={styles.progressInfo}>
                        <View style={[styles.percentBadge, { borderColor: progressColor, borderWidth: 1 }]}>
                            <Text style={[typography.caption2, { color: progressColor, fontWeight: 'bold' }]}>
                                {percent}%
                            </Text>
                        </View>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                            of {limitFormatted.value} {limitFormatted.unit}
                        </Text>
                    </View>
                </View>
            )}

            {!totalOnly && (
                <View style={styles.footerGrid}>
                    <View style={[styles.detailCard, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                            <MaterialIcons name="arrow-downward" size={16} color="#22c55e" />
                        </View>
                        <View>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>DOWNLOAD</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {dlFormatted.value} <Text style={{ fontSize: 12, color: colors.textSecondary }}>{dlFormatted.unit}</Text>
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.detailCard, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                            <MaterialIcons name="arrow-upward" size={16} color="#a855f7" />
                        </View>
                        <View>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>UPLOAD</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {ulFormatted.value} <Text style={{ fontSize: 12, color: colors.textSecondary }}>{ulFormatted.unit}</Text>
                            </Text>
                        </View>
                    </View>
                </View>
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
        marginBottom: 12,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toggleButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeContainer: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    mainStatContainer: {
        marginBottom: 20,
    },
    mainLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    mainValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    mainValue: {
        fontSize: 48,
        fontWeight: 'bold',
        letterSpacing: -1,
    },
    mainUnit: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    progressSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    progressBarTrack: {
        flex: 1,
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 6,
    },
    progressInfo: {
        alignItems: 'flex-end',
    },
    percentBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        marginBottom: 2,
        justifyContent: 'center',
        alignItems: 'center',
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
});
