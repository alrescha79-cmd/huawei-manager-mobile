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
 * with legend below the chart
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
    const downloadPercent = total > 0 ? (download / total) * 100 : 50;

    // Colors for download (blue) and upload (orange)
    const downloadColor = '#007AFF';
    const uploadColor = '#FF9500';

    // Calculate rotation for segments
    const downloadDeg = (downloadPercent / 100) * 360;

    const size = compact ? 80 : 100;
    const centerSize = compact ? 50 : 60;

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
                {/* Background (upload color - full circle) */}
                <View style={[
                    styles.donutBackground,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: uploadColor,
                    }
                ]} />

                {/* Download segment overlay */}
                <View style={[styles.segmentContainer, { width: size, height: size }]}>
                    {/* Left half of download */}
                    {downloadDeg > 0 && (
                        <View style={[styles.halfContainer, { width: size / 2, height: size, left: 0 }]}>
                            <View style={[
                                styles.halfCircle,
                                {
                                    width: size / 2,
                                    height: size,
                                    backgroundColor: downloadColor,
                                    borderTopLeftRadius: size / 2,
                                    borderBottomLeftRadius: size / 2,
                                    transform: [{ rotate: `${Math.min(downloadDeg, 180)}deg` }],
                                    transformOrigin: 'right center',
                                }
                            ]} />
                        </View>
                    )}
                    {/* Right half of download (if > 180deg) */}
                    {downloadDeg > 180 && (
                        <View style={[styles.halfContainer, { width: size / 2, height: size, right: 0 }]}>
                            <View style={[
                                styles.halfCircle,
                                {
                                    width: size / 2,
                                    height: size,
                                    backgroundColor: downloadColor,
                                    borderTopRightRadius: size / 2,
                                    borderBottomRightRadius: size / 2,
                                    transform: [{ rotate: `${downloadDeg - 180}deg` }],
                                    transformOrigin: 'left center',
                                }
                            ]} />
                        </View>
                    )}
                </View>

                {/* Center circle with total */}
                <View style={[
                    styles.centerCircle,
                    {
                        width: centerSize,
                        height: centerSize,
                        borderRadius: centerSize / 2,
                        backgroundColor: colors.card
                    }
                ]}>
                    <Text style={[
                        compact ? typography.caption1 : typography.caption1,
                        { color: colors.text, fontWeight: '700', textAlign: 'center' }
                    ]}>
                        {formatValue(total)}
                    </Text>
                </View>
            </View>

            {/* Legend - horizontal below chart */}
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
    donutBackground: {
        position: 'absolute',
    },
    segmentContainer: {
        position: 'absolute',
        overflow: 'hidden',
    },
    halfContainer: {
        position: 'absolute',
        overflow: 'hidden',
    },
    halfCircle: {
        position: 'absolute',
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
