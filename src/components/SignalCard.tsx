import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface SignalMetric {
    label: string;
    value: string | number;
    unit: string;
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

interface SignalCardProps {
    title: string;
    badge?: string;
    metrics: SignalMetric[];
    color: 'cyan' | 'emerald' | 'amber' | 'fuchsia' | 'blue';
    icon: keyof typeof MaterialIcons.glyphMap;
    band?: string;
    cellId?: string;
}

// Get quality color
const getQualityColor = (quality: SignalMetric['quality']): string => {
    switch (quality) {
        case 'excellent': return '#22c55e';
        case 'good': return '#84cc16';
        case 'fair': return '#facc15';
        case 'poor': return '#ef4444';
        default: return '#6b7280';
    }
};

const getQualityWidth = (quality: SignalMetric['quality']): number => {
    switch (quality) {
        case 'excellent': return 100;
        case 'good': return 75;
        case 'fair': return 50;
        case 'poor': return 25;
        default: return 10;
    }
};

export function SignalCard({
    title,
    badge,
    metrics,
    color,
    icon,
    band,
    cellId,
}: SignalCardProps) {
    const { colors, typography, spacing } = useTheme();

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
        blue: {
            primary: '#3b82f6',
            secondary: '#1d4ed8',
            border: 'rgba(59, 130, 246, 0.3)',
            bg: 'rgba(59, 130, 246, 0.1)',
        },
    };

    const theme = colorThemes[color];

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: 'transparent',
            }
        ]}>
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

            <View style={styles.metricsGrid}>
                {metrics.map((metric, index) => {
                    const qualityColor = getQualityColor(metric.quality);
                    return (
                        <View key={index} style={styles.metricItem}>
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                                {metric.label}
                            </Text>
                            <View style={styles.metricValueRow}>
                                <Text style={[styles.metricValue, { color: qualityColor }]}>
                                    {metric.value}
                                </Text>
                            </View>
                            <View style={[styles.qualityBarContainer, { backgroundColor: colors.border }]}>
                                <View style={[styles.qualityBar, { width: `${getQualityWidth(metric.quality)}%`, backgroundColor: qualityColor }]} />
                            </View>
                        </View>
                    );
                })}
            </View>

            {(band || cellId) && (
                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                    {band && (
                        <View style={styles.footerItem}>
                            <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Band</Text>
                            <Text style={[styles.footerValue, { color: theme.primary }]}>{band}</Text>
                        </View>
                    )}
                    {cellId && (
                        <View style={styles.footerItem}>
                            <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Cell ID</Text>
                            <Text style={[styles.footerValue, { color: colors.text }]}>{cellId}</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 0,
        padding: 0,
        marginBottom: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
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
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricItem: {
        width: '48%',
        marginBottom: 16,
    },
    metricLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    metricValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'monospace',
    },
    metricUnit: {
        fontSize: 12,
        fontWeight: '500',
    },
    qualityBarContainer: {
        height: 4,
        width: '100%',
        borderRadius: 2,
        marginTop: 6,
        overflow: 'hidden',
    },
    qualityBar: {
        height: '100%',
        borderRadius: 2,
    },
    footer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 12,
        marginTop: 4,
    },
    footerItem: {
        flex: 1,
    },
    footerLabel: {
        fontSize: 10,
        color: '#6b7280',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    footerValue: {
        fontSize: 13,
        fontWeight: '500',
        fontFamily: 'monospace',
    },
});

export default SignalCard;
