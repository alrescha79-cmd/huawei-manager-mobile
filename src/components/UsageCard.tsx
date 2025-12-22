import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { formatDuration } from '@/utils/helpers';

interface UsageCardProps {
    title: string;
    badge?: string;
    download: number;
    upload: number;
    duration?: number;
    color: 'cyan' | 'emerald' | 'amber' | 'fuchsia';
    icon: keyof typeof MaterialIcons.glyphMap;
}

// Helper to format bytes with separate value and unit
const formatBytesWithUnit = (bytes: number): { value: string; unit: string } => {
    if (!bytes || isNaN(bytes) || bytes === 0) return { value: '0', unit: 'B' };

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return {
        value: (bytes / Math.pow(k, i)).toFixed(1),
        unit: sizes[i],
    };
};

/**
 * Modern usage card with glassmorphism style
 */
export function UsageCard({
    title,
    badge,
    download,
    upload,
    duration,
    color,
    icon
}: UsageCardProps) {
    const { colors, typography, spacing } = useTheme();

    // Color themes
    const colorThemes = {
        cyan: {
            primary: '#22d3ee',
            secondary: '#0e7490',
            border: 'rgba(34, 211, 238, 0.3)',
            bg: 'rgba(34, 211, 238, 0.1)',
        },
        emerald: {
            primary: '#34d399',
            secondary: '#059669',
            border: 'rgba(52, 211, 153, 0.3)',
            bg: 'rgba(52, 211, 153, 0.1)',
        },
        amber: {
            primary: '#fbbf24',
            secondary: '#d97706',
            border: 'rgba(251, 191, 36, 0.3)',
            bg: 'rgba(251, 191, 36, 0.1)',
        },
        fuchsia: {
            primary: '#e879f9',
            secondary: '#a21caf',
            border: 'rgba(232, 121, 249, 0.3)',
            bg: 'rgba(232, 121, 249, 0.1)',
        },
    };

    const theme = colorThemes[color];
    const total = download + upload;
    const totalFormatted = formatBytesWithUnit(total);
    const dlFormatted = formatBytesWithUnit(download);
    const ulFormatted = formatBytesWithUnit(upload);

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: colors.card,
                borderTopColor: theme.border,
            }
        ]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialIcons name={icon} size={18} color={theme.primary} />
                    <Text style={[styles.title, { color: theme.primary }]}>
                        {title}
                    </Text>
                </View>
                {badge && (
                    <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                        <Text style={[styles.badgeText, { color: theme.primary }]}>
                            {badge}
                        </Text>
                    </View>
                )}
            </View>

            {/* Main Value */}
            <View style={styles.mainValueContainer}>
                <Text style={[styles.mainValue, { color: colors.text }]}>
                    {totalFormatted.value}
                </Text>
                <Text style={[styles.mainUnit, { color: theme.primary }]}>
                    {totalFormatted.unit}
                </Text>
            </View>

            {duration !== undefined && (
                <Text style={[styles.subtitle, { color: theme.secondary }]}>
                    Duration: {formatDuration(duration)}
                </Text>
            )}

            {/* Stats Grid */}
            <View style={[styles.statsGrid, { borderTopColor: colors.border }]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Download</Text>
                    <View style={styles.statValue}>
                        <MaterialIcons name="arrow-downward" size={12} color="#22d3ee" />
                        <Text style={[styles.statText, { color: '#22d3ee' }]}>
                            {dlFormatted.value} {dlFormatted.unit}
                        </Text>
                    </View>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Upload</Text>
                    <View style={styles.statValue}>
                        <MaterialIcons name="arrow-upward" size={12} color="#e879f9" />
                        <Text style={[styles.statText, { color: '#e879f9' }]}>
                            {ulFormatted.value} {ulFormatted.unit}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        borderTopWidth: 2,
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '500',
        fontFamily: 'monospace',
    },
    mainValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        marginBottom: 4,
    },
    mainValue: {
        fontSize: 42,
        fontWeight: '700',
        fontFamily: 'monospace',
    },
    mainUnit: {
        fontSize: 18,
        fontWeight: '500',
        fontFamily: 'monospace',
    },
    subtitle: {
        fontSize: 11,
        fontFamily: 'monospace',
        letterSpacing: 1,
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 12,
        marginTop: 4,
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: 10,
        color: '#6b7280',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 13,
        fontWeight: '500',
        fontFamily: 'monospace',
    },
});

export default UsageCard;
