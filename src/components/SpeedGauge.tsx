import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface SpeedGaugeProps {
    downloadSpeed: number; // in bps
    uploadSpeed: number; // in bps
}

/**
 * Speed gauge showing current download/upload speeds with animated-style display
 */
export function SpeedGauge({ downloadSpeed, uploadSpeed }: SpeedGaugeProps) {
    const { colors, typography, spacing } = useTheme();

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

    const dlSpeed = formatSpeed(downloadSpeed);
    const ulSpeed = formatSpeed(uploadSpeed);

    // Get color based on download speed (green/teal tones)
    const getDownloadColor = (percent: number): string => {
        if (percent >= 60) return '#00C853'; // Bright Green - very fast
        if (percent >= 30) return '#00BFA5'; // Teal - good
        if (percent >= 10) return '#26A69A'; // Light Teal - moderate
        return '#78909C'; // Blue Gray - slow
    };

    // Get color based on upload speed (orange/purple tones)
    const getUploadColor = (percent: number): string => {
        if (percent >= 60) return '#FF6D00'; // Bright Orange - very fast
        if (percent >= 30) return '#FF9100'; // Orange - good
        if (percent >= 10) return '#FFA726'; // Light Orange - moderate
        return '#BDBDBD'; // Gray - slow
    };

    return (
        <View style={styles.container}>
            <Text style={[typography.subheadline, { color: colors.primary, fontWeight: '600', marginBottom: spacing.md }]}>
                Current Speed
            </Text>

            <View style={styles.gaugesContainer}>
                {/* Download Speed */}
                <View style={styles.gaugeItem}>
                    <View style={styles.speedCircle}>
                        {/* Background circle */}
                        <View style={[styles.circleBackground, { borderColor: colors.border }]} />
                        {/* Progress arc - simplified as filled portion */}
                        <View
                            style={[
                                styles.circleProgress,
                                {
                                    borderColor: getDownloadColor(downloadPercent),
                                    borderRightColor: 'transparent',
                                    borderBottomColor: downloadPercent > 25 ? getDownloadColor(downloadPercent) : 'transparent',
                                    borderLeftColor: downloadPercent > 50 ? getDownloadColor(downloadPercent) : 'transparent',
                                    borderTopColor: downloadPercent > 75 ? getDownloadColor(downloadPercent) : 'transparent',
                                    transform: [{ rotate: '-45deg' }],
                                }
                            ]}
                        />
                        {/* Center content */}
                        <View style={[styles.circleCenter, { backgroundColor: colors.card }]}>
                            <Text style={[styles.speedValue, { color: getDownloadColor(downloadPercent) }]}>
                                {dlSpeed.value}
                            </Text>
                            <Text style={[typography.caption2, { color: colors.textSecondary }]}>
                                {dlSpeed.unit}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.labelContainer}>
                        <Text style={[typography.caption1, { color: getDownloadColor(downloadPercent), fontWeight: '600' }]}>
                            ↓ Download
                        </Text>
                    </View>
                </View>

                {/* Upload Speed */}
                <View style={styles.gaugeItem}>
                    <View style={styles.speedCircle}>
                        {/* Background circle */}
                        <View style={[styles.circleBackground, { borderColor: colors.border }]} />
                        {/* Progress arc */}
                        <View
                            style={[
                                styles.circleProgress,
                                {
                                    borderColor: getUploadColor(uploadPercent),
                                    borderRightColor: 'transparent',
                                    borderBottomColor: uploadPercent > 25 ? getUploadColor(uploadPercent) : 'transparent',
                                    borderLeftColor: uploadPercent > 50 ? getUploadColor(uploadPercent) : 'transparent',
                                    borderTopColor: uploadPercent > 75 ? getUploadColor(uploadPercent) : 'transparent',
                                    transform: [{ rotate: '-45deg' }],
                                }
                            ]}
                        />
                        {/* Center content */}
                        <View style={[styles.circleCenter, { backgroundColor: colors.card }]}>
                            <Text style={[styles.speedValue, { color: getUploadColor(uploadPercent) }]}>
                                {ulSpeed.value}
                            </Text>
                            <Text style={[typography.caption2, { color: colors.textSecondary }]}>
                                {ulSpeed.unit}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.labelContainer}>
                        <Text style={[typography.caption1, { color: getUploadColor(uploadPercent), fontWeight: '600' }]}>
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
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    circleBackground: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 6,
    },
    circleProgress: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 6,
    },
    circleCenter: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    speedValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    labelContainer: {
        marginTop: 8,
    },
});

export default SpeedGauge;
