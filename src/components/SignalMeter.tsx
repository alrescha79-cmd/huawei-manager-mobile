import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface SignalMeterProps {
    label: string;
    value: number | string;
    unit: string;
    min: number;
    max: number;
    thresholds: {
        excellent: number;
        good: number;
        fair: number;
        poor: number;
    };
    reverseScale?: boolean;
}

/**
 * Signal meter with horizontal bar chart showing signal quality
 * Colors: Excellent (green), Good (blue), Fair (yellow), Poor (red)
 */
export function SignalMeter({
    label,
    value,
    unit,
    min,
    max,
    thresholds,
    reverseScale = true,
}: SignalMeterProps) {
    const { colors, typography, spacing, isDark } = useTheme();

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    let percentage: number;
    if (reverseScale) {
        percentage = ((numValue - min) / (max - min)) * 100;
    } else {
        percentage = ((numValue - min) / (max - min)) * 100;
    }
    percentage = Math.max(0, Math.min(100, percentage));
    const getQualityInfo = (): { color: string; label: string } => {
        if (reverseScale) {
            if (numValue >= thresholds.excellent) return { color: '#007AFF', label: 'Excellent' };
            if (numValue >= thresholds.good) return { color: '#34C759', label: 'Good' };
            if (numValue >= thresholds.fair) return { color: '#FF9500', label: 'Fair' };
            return { color: '#FF3B30', label: 'Poor' };
        } else {
            if (numValue >= thresholds.excellent) return { color: '#007AFF', label: 'Excellent' };
            if (numValue >= thresholds.good) return { color: '#34C759', label: 'Good' };
            if (numValue >= thresholds.fair) return { color: '#FF9500', label: 'Fair' };
            return { color: '#FF3B30', label: 'Poor' };
        }
    };

    const quality = getQualityInfo();

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>
                    {label}
                </Text>
                <View style={styles.valueContainer}>
                    <Text style={[typography.body, { color: quality.color, fontWeight: '700' }]}>
                        {numValue}
                    </Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary, marginLeft: 2 }]}>
                        {unit}
                    </Text>
                </View>
            </View>

            <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
                <View
                    style={[
                        styles.barFill,
                        {
                            width: `${percentage}%`,
                            backgroundColor: quality.color,
                        }
                    ]}
                />
                <View style={[styles.barValueContainer, { left: `${Math.min(percentage, 85)}%` }]}>
                    <Text style={[
                        styles.barValueText,
                        {
                            color: '#FFFFFF',
                            textShadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'transparent',
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: isDark ? 2 : 0,
                        }
                    ]}>
                        {quality.label}
                    </Text>
                </View>
            </View>

            <View style={styles.scaleRow}>
                <Text style={[typography.caption2, { color: colors.textSecondary }]}>
                    {reverseScale ? 'Poor' : min}
                </Text>
                <Text style={[typography.caption2, { color: colors.textSecondary }]}>
                    {reverseScale ? 'Excellent' : max}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    barBackground: {
        height: 24,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    barFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        borderRadius: 12,
    },
    barValueContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    barValueText: {
        fontSize: 11,
        fontWeight: '600',
    },
    scaleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
});

export default SignalMeter;
