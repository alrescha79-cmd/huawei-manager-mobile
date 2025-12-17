import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/theme';

interface SpeedGaugeProps {
    downloadSpeed: number; // in bps
    uploadSpeed: number; // in bps
}

/**
 * Speed gauge showing current download/upload speeds with colored circular progress
 */
export function SpeedGauge({ downloadSpeed, uploadSpeed }: SpeedGaugeProps) {
    const { colors, typography, spacing } = useTheme();

    // Animated values for smooth transitions
    const downloadAnim = useRef(new Animated.Value(0)).current;
    const uploadAnim = useRef(new Animated.Value(0)).current;

    // Format speed to human readable
    const formatSpeed = (bps: number): { value: string; unit: string } => {
        if (bps === 0) return { value: '0', unit: 'bps' };

        const k = 1000;
        const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
        const i = Math.floor(Math.log(bps) / Math.log(k));
        const value = (bps / Math.pow(k, i)).toFixed(1);

        return { value, unit: sizes[i] };
    };

    // Calculate gauge percentage (0-100) - max at 100 Mbps
    const maxSpeed = 100 * 1000 * 1000; // 100 Mbps
    const downloadPercent = Math.min((downloadSpeed / maxSpeed) * 100, 100);
    const uploadPercent = Math.min((uploadSpeed / maxSpeed) * 100, 100);

    // Animate when speed changes
    useEffect(() => {
        Animated.timing(downloadAnim, {
            toValue: downloadPercent,
            duration: 500,
            useNativeDriver: false,
        }).start();
    }, [downloadPercent]);

    useEffect(() => {
        Animated.timing(uploadAnim, {
            toValue: uploadPercent,
            duration: 500,
            useNativeDriver: false,
        }).start();
    }, [uploadPercent]);

    const dlSpeed = formatSpeed(downloadSpeed);
    const ulSpeed = formatSpeed(uploadSpeed);

    // Get color based on speed percentage
    const getSpeedColor = (percent: number, isDownload: boolean): string => {
        if (isDownload) {
            if (percent >= 60) return '#00C853'; // Bright Green - very fast
            if (percent >= 30) return '#00BFA5'; // Teal - good
            if (percent >= 10) return '#26A69A'; // Light Teal - moderate
            if (percent >= 1) return '#4DB6AC';  // Pale Teal - low
            return '#546E7A'; // Blue Gray - idle
        } else {
            if (percent >= 60) return '#FF6D00'; // Bright Orange - very fast
            if (percent >= 30) return '#FF9100'; // Orange - good
            if (percent >= 10) return '#FFA726'; // Light Orange - moderate
            if (percent >= 1) return '#FFB74D';  // Pale Orange - low
            return '#78909C'; // Gray - idle
        }
    };

    const downloadColor = getSpeedColor(downloadPercent, true);
    const uploadColor = getSpeedColor(uploadPercent, false);

    // Size constants
    const size = 100;
    const strokeWidth = 8;
    const innerSize = size - (strokeWidth * 2) - 8;

    // Calculate degrees for progress
    const downloadDeg = (downloadPercent / 100) * 360;
    const uploadDeg = (uploadPercent / 100) * 360;

    return (
        <View style={styles.container}>
            <Text style={[typography.subheadline, { color: colors.primary, fontWeight: '600', marginBottom: spacing.md, textAlign: 'center' }]}>
                Current Speed
            </Text>

            <View style={styles.gaugesContainer}>
                {/* Download Speed */}
                <View style={styles.gaugeItem}>
                    <View style={[styles.speedCircle, { width: size, height: size }]}>
                        {/* Background circle */}
                        <View style={[
                            styles.circleBackground,
                            {
                                width: size,
                                height: size,
                                borderRadius: size / 2,
                                borderWidth: strokeWidth,
                                borderColor: colors.border,
                            }
                        ]} />

                        {/* Progress circle with color */}
                        {downloadPercent > 0 && (
                            <>
                                {/* First 180 degrees (left) */}
                                <View style={[styles.halfMask, { width: size / 2, height: size, left: 0 }]}>
                                    <View style={[
                                        styles.halfRing,
                                        {
                                            width: size,
                                            height: size,
                                            borderRadius: size / 2,
                                            borderWidth: strokeWidth,
                                            borderColor: downloadColor,
                                            left: 0,
                                            transform: [{ rotate: `${Math.min(downloadDeg, 180) - 90}deg` }],
                                        }
                                    ]} />
                                </View>

                                {/* Second 180 degrees (right) - only if > 50% */}
                                {downloadDeg > 180 && (
                                    <View style={[styles.halfMask, { width: size / 2, height: size, right: 0 }]}>
                                        <View style={[
                                            styles.halfRing,
                                            {
                                                width: size,
                                                height: size,
                                                borderRadius: size / 2,
                                                borderWidth: strokeWidth,
                                                borderColor: downloadColor,
                                                right: 0,
                                                transform: [{ rotate: `${(downloadDeg - 180) + 90}deg` }],
                                            }
                                        ]} />
                                    </View>
                                )}
                            </>
                        )}

                        {/* Center content */}
                        <View style={[
                            styles.circleCenter,
                            {
                                width: innerSize,
                                height: innerSize,
                                borderRadius: innerSize / 2,
                                backgroundColor: colors.card,
                            }
                        ]}>
                            <Text style={[styles.speedValue, { color: downloadColor }]}>
                                {dlSpeed.value}
                            </Text>
                            <Text style={[typography.caption2, { color: colors.textSecondary }]}>
                                {dlSpeed.unit}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.labelContainer}>
                        <View style={[styles.speedIndicator, { backgroundColor: downloadColor }]} />
                        <Text style={[typography.caption1, { color: colors.text, fontWeight: '600' }]}>
                            ↓ Download
                        </Text>
                    </View>
                </View>

                {/* Upload Speed */}
                <View style={styles.gaugeItem}>
                    <View style={[styles.speedCircle, { width: size, height: size }]}>
                        {/* Background circle */}
                        <View style={[
                            styles.circleBackground,
                            {
                                width: size,
                                height: size,
                                borderRadius: size / 2,
                                borderWidth: strokeWidth,
                                borderColor: colors.border,
                            }
                        ]} />

                        {/* Progress circle with color */}
                        {uploadPercent > 0 && (
                            <>
                                {/* First 180 degrees (left) */}
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
                                            transform: [{ rotate: `${Math.min(uploadDeg, 180) - 90}deg` }],
                                        }
                                    ]} />
                                </View>

                                {/* Second 180 degrees (right) - only if > 50% */}
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
                                                transform: [{ rotate: `${(uploadDeg - 180) + 90}deg` }],
                                            }
                                        ]} />
                                    </View>
                                )}
                            </>
                        )}

                        {/* Center content */}
                        <View style={[
                            styles.circleCenter,
                            {
                                width: innerSize,
                                height: innerSize,
                                borderRadius: innerSize / 2,
                                backgroundColor: colors.card,
                            }
                        ]}>
                            <Text style={[styles.speedValue, { color: uploadColor }]}>
                                {ulSpeed.value}
                            </Text>
                            <Text style={[typography.caption2, { color: colors.textSecondary }]}>
                                {ulSpeed.unit}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.labelContainer}>
                        <View style={[styles.speedIndicator, { backgroundColor: uploadColor }]} />
                        <Text style={[typography.caption1, { color: colors.text, fontWeight: '600' }]}>
                            ↑ Upload
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    gaugesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    gaugeItem: {
        alignItems: 'center',
    },
    speedCircle: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    circleBackground: {
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
    circleCenter: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    speedValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    labelContainer: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    speedIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
});

export default SpeedGauge;
