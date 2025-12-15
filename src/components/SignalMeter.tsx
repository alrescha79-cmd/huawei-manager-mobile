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
    reverseScale?: boolean; // true if lower values are better (like RSSI: -50 better than -90)
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
    const { colors, typography, spacing } = useTheme();

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Calculate percentage (0-100) for bar width
    let percentage: number;
    if (reverseScale) {
        // For values like RSSI where higher (less negative) is better
        percentage = ((numValue - min) / (max - min)) * 100;
    } else {
        // For values like SINR where higher is better
        percentage = ((numValue - min) / (max - min)) * 100;
    }
    percentage = Math.max(0, Math.min(100, percentage));

    // Determine quality level and color based on value
    const getQualityInfo = (): { color: string; label: string } => {
        if (reverseScale) {
            // For RSSI/RSRP (higher = better, e.g., -50 > -90)
            if (numValue >= thresholds.excellent) return { color: '#007AFF', label: 'Excellent' };
            if (numValue >= thresholds.good) return { color: '#34C759', label: 'Good' };
            if (numValue >= thresholds.fair) return { color: '#FF9500', label: 'Fair' };
            return { color: '#FF3B30', label: 'Poor' };
        } else {
            // For SINR (higher = better)
            if (numValue >= thresholds.excellent) return { color: '#007AFF', label: 'Excellent' };
            if (numValue >= thresholds.good) return { color: '#34C759', label: 'Good' };
            if (numValue >= thresholds.fair) return { color: '#FF9500', label: 'Fair' };
            return { color: '#FF3B30', label: 'Poor' };
        }
    };

    const quality = getQualityInfo();

    return (
        <View style={styles.container}>
            {/* Label and Value Row */}
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

            {/* Bar Chart */}
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
                {/* Value indicator on bar */}
                <View style={[styles.barValueContainer, { left: `${Math.min(percentage, 85)}%` }]}>
                    <Text style={[styles.barValueText, { color: '#FFFFFF' }]}>
                        {quality.label}
                    </Text>
                </View>
            </View>

            {/* Scale indicators */}
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
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    scaleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
});

export default SignalMeter;
