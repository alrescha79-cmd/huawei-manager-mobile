import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface DataPieChartProps {
    download: number;
    upload: number;
    title: string;
    subtitle?: string;
    formatValue: (value: number) => string;
    compact?: boolean;
}

/**
 * Donut chart showing download vs upload ratio
 * Download = Blue (#007AFF)
 * Upload = Orange (#FF9500)
 */
export function DataPieChart({
    download,
    upload,
    title,
    subtitle,
    formatValue,
    compact = false,
}: DataPieChartProps) {
    const { colors, typography, spacing } = useTheme();

    const total = download + upload;
    // Calculate UPLOAD percent - this is what we overlay on top of download
    const uploadPercent = total > 0 ? (upload / total) * 100 : 50;

    // Colors - Download is BLUE, Upload is ORANGE
    const downloadColor = '#007AFF';
    const uploadColor = '#FF9500';

    const size = compact ? 80 : 100;
    const strokeWidth = compact ? 12 : 14;
    const innerSize = size - (strokeWidth * 2);

    // Calculate degrees for UPLOAD segment (we overlay upload on download background)
    const uploadDeg = (uploadPercent / 100) * 360;

    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            {/* Title */}
            <Text style={[
                compact ? typography.caption1 : typography.subheadline,
                { color: colors.primary, fontWeight: '600', textAlign: 'center', marginBottom: spacing.xs }
            ]}>
                {title}
            </Text>
            {subtitle && (
                <Text style={[typography.caption2, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm }]}>
                    {subtitle}
                </Text>
            )}

            {/* Donut Chart */}
            <View style={[styles.chartWrapper, { width: size, height: size }]}>
                {/* Download background (blue) - full ring */}
                <View style={[
                    styles.ring,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: strokeWidth,
                        borderColor: downloadColor,
                    }
                ]} />

                {/* Upload segment (orange) - overlay using clipping */}
                {uploadPercent > 0 && (
                    <>
                        {/* First 180 degrees (left side) */}
                        <View style={[styles.halfMask, { width: size / 2, height: size, left: 0 }]}>
                            <View style={[
                                styles.halfRing,
                                {
                                    width: size,
                                    height: size,
                                    borderRadius: size / 2,
                                    borderWidth: strokeWidth,
                                    borderColor: uploadColor,
                                    left: 0,
                                    transform: [
                                        { translateX: 0 },
                                        { rotate: `${Math.min(uploadDeg, 180) - 90}deg` }
                                    ],
                                }
                            ]} />
                        </View>

                        {/* Second 180 degrees (right side) - only if > 50% */}
                        {uploadDeg > 180 && (
                            <View style={[styles.halfMask, { width: size / 2, height: size, right: 0 }]}>
                                <View style={[
                                    styles.halfRing,
                                    {
                                        width: size,
                                        height: size,
                                        borderRadius: size / 2,
                                        borderWidth: strokeWidth,
                                        borderColor: uploadColor,
                                        right: 0,
                                        transform: [
                                            { translateX: 0 },
                                            { rotate: `${(uploadDeg - 180) + 90}deg` }
                                        ],
                                    }
                                ]} />
                            </View>
                        )}
                    </>
                )}

                {/* Center circle */}
                <View style={[
                    styles.centerCircle,
                    {
                        width: innerSize,
                        height: innerSize,
                        borderRadius: innerSize / 2,
                        backgroundColor: colors.card,
                    }
                ]}>
                    <Text style={[
                        compact ? typography.caption1 : typography.body,
                        { color: colors.text, fontWeight: '700', textAlign: 'center' }
                    ]}>
                        {formatValue(total)}
                    </Text>
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: downloadColor }]} />
                    <Text style={[typography.caption2, { color: colors.textSecondary }]}>↓ </Text>
                    <Text style={[typography.caption1, { color: colors.text, fontWeight: '500' }]}>
                        {formatValue(download)}
                    </Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: uploadColor }]} />
                    <Text style={[typography.caption2, { color: colors.textSecondary }]}>↑ </Text>
                    <Text style={[typography.caption1, { color: colors.text, fontWeight: '500' }]}>
                        {formatValue(upload)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 16,
    },
    containerCompact: {
        marginBottom: 8,
    },
    chartWrapper: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    ring: {
        position: 'absolute',
    },
    halfMask: {
        position: 'absolute',
        overflow: 'hidden',
    },
    halfRing: {
        position: 'absolute',
        borderLeftColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    centerCircle: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
});

export default DataPieChart;


