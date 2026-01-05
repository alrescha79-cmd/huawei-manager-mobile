import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { DurationUnits, formatDuration } from '@/utils/helpers';
import { Card } from './Card';
import { LinearGradient } from 'expo-linear-gradient';

interface UsageCardProps {
    title: string;
    badge?: string; // e.g., "1d 2h 32m"
    download: number;
    upload: number;
    duration?: number; // In seconds
    durationUnits?: DurationUnits; // Translated units
    icon?: keyof typeof MaterialIcons.glyphMap;
    // New props for layout variant
    variant?: 'session' | 'monthly';
    dataLimit?: number; // Total quota in bytes
    color?: string; // Keep for compatibility but might override
    style?: StyleProp<ViewStyle>;
    totalOnly?: boolean;
}

// Helper to format bytes
const formatBytesWithUnit = (bytes: number): { value: string; unit: string } => {
    if (!bytes || isNaN(bytes) || bytes === 0) return { value: '0', unit: 'B' };
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return {
        value: (bytes / Math.pow(k, i)).toFixed(2), // 2 decimal places as per image "500.20"
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

    // Calculate totals
    const total = download + upload;
    const totalFormatted = formatBytesWithUnit(total);
    const dlFormatted = formatBytesWithUnit(download);
    const ulFormatted = formatBytesWithUnit(upload);

    // Calculate percentage if monthly
    let percent = 0;
    let limitFormatted = { value: '0', unit: 'GB' };
    if (variant === 'monthly' && dataLimit && dataLimit > 0) {
        percent = Math.min(Math.round((total / dataLimit) * 100), 100);
        limitFormatted = formatBytesWithUnit(dataLimit);
    }

    // Badge text (Duration or fallback)
    const badgeText = badge || (duration ? formatDuration(duration, durationUnits) : '');

    // Highlight color (Blue for Usage as per image)
    const highlightColor = '#3b82f6'; // Tailwind blue-500

    // Dynamic color based on percentage for monthly variant
    const getProgressColor = (pct: number): string => {
        if (pct >= 90) return '#ef4444'; // Red
        if (pct >= 75) return '#f97316'; // Orange
        if (pct >= 50) return '#eab308'; // Yellow
        return '#22c55e'; // Green
    };

    const progressColor = variant === 'monthly' && dataLimit ? getProgressColor(percent) : highlightColor;

    return (
        <Card style={[styles.container, style]}>
            {/* Header: Title + Badge */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons
                        name={icon || (variant === 'session' ? 'access-time' : variant === 'monthly' ? 'calendar-month' : 'data-usage')}
                        size={18}
                        color={highlightColor}
                        style={{ marginRight: 8 }}
                    />
                    <Text style={[typography.headline, { color: colors.text, fontWeight: '700', fontSize: 16 }]}>
                        {title}
                    </Text>
                </View>
                {badgeText ? (
                    <View style={[styles.badgeContainer, { borderColor: colors.border }]}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, fontFamily: 'monospace' }]}>
                            {badgeText}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Main Stat: Large Number + Unit */}
            <View style={styles.mainStatContainer}>
                <Text style={[styles.mainValue, { color: highlightColor }]}>
                    {totalFormatted.value}
                </Text>
                <Text style={[styles.mainUnit, { color: colors.textSecondary }]}>
                    {totalFormatted.unit}
                </Text>
            </View>

            {/* Monthly Variant: Progress Bar */}
            {variant === 'monthly' && (
                <View style={styles.progressSection}>
                    {/* Progress Bar Track */}
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

                    {/* Percentage Info */}
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

            {/* Footer: Download / Upload Details */}
            {!totalOnly && (
                <View style={styles.footerGrid}>
                    {/* Download Item */}
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

                    {/* Upload Item */}
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
    badgeContainer: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    mainStatContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 20,
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
