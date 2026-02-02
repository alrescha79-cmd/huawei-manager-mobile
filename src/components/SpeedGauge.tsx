import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import Svg, { Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

interface SpeedGaugeProps {
    downloadSpeed: number;
    uploadSpeed: number;
}

export function SpeedGauge({ downloadSpeed, uploadSpeed }: SpeedGaugeProps) {
    const { colors, typography, spacing } = useTheme();

    const formatSpeed = (bps: number): { value: string; unit: string } => {
        if (bps === 0) return { value: '0.0', unit: 'bps' };
        const k = 1000;
        const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
        const i = Math.floor(Math.log(bps) / Math.log(k));
        const value = (bps / Math.pow(k, i)).toFixed(1);
        return { value, unit: sizes[i] };
    };

    const dlSpeed = formatSpeed(downloadSpeed);
    const ulSpeed = formatSpeed(uploadSpeed);

    const size = 140;
    const strokeWidth = 10;
    const radius = (size / 2) - strokeWidth - 8;
    const center = size / 2;

    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;
    const totalAngle = endAngle - startAngle;

    const getPoint = (angle: number, r: number) => ({
        x: center + Math.cos(angle) * r,
        y: center + Math.sin(angle) * r,
    });

    const createArc = (start: number, end: number, r: number) => {
        const p1 = getPoint(start, r);
        const p2 = getPoint(end, r);
        const sweep = end - start;
        const largeArc = sweep > Math.PI ? 1 : 0;
        return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
    };

    const renderTicks = () => {
        const ticks = [];
        const numTicks = 40;
        const innerR = radius - 12;
        const outerR = radius - 6;

        for (let i = 0; i <= numTicks; i++) {
            const angle = startAngle + (totalAngle * (i / numTicks));
            const p1 = getPoint(angle, innerR);
            const p2 = getPoint(angle, outerR);
            const isMajor = i % 10 === 0;

            ticks.push(
                <Line
                    key={`tick-${i}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={isMajor ? colors.text : colors.textSecondary}
                    strokeWidth={isMajor ? 2 : 1}
                />
            );
        }
        return ticks;
    };

    const renderGauge = (
        speedBps: number,
        speedValue: string,
        speedUnit: string,
        primaryColor: string,
        secondaryColor: string,
        label: string,
        gradientId: string
    ) => {
        let progressRatio = 0;
        if (speedBps > 0) {
            if (speedUnit === 'Kbps' || speedUnit === 'bps') {
                progressRatio = Math.min(speedBps / (1000 * 1000), 1);
                progressRatio = Math.min(speedBps / (1000 * 1000), 1);
            } else if (speedUnit === 'Mbps') {
                progressRatio = Math.min(speedBps / (100 * 1000 * 1000), 1);
            } else {
                progressRatio = Math.min(speedBps / (10 * 1000 * 1000 * 1000), 1);
            }
        }
        const progressEndAngle = startAngle + (totalAngle * progressRatio);

        return (
            <View style={styles.gaugeItem}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Defs>
                        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%" stopColor={secondaryColor} />
                            <Stop offset="100%" stopColor={primaryColor} />
                        </LinearGradient>
                    </Defs>

                    <Path
                        d={createArc(startAngle, endAngle, radius)}
                        stroke={colors.border}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                    />

                    {progressRatio > 0 && (
                        <Path
                            d={createArc(startAngle, progressEndAngle, radius)}
                            stroke={`url(#${gradientId})`}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeLinecap="round"
                        />
                    )}

                    {renderTicks()}
                </Svg>

                <View style={styles.centerValue}>
                    <Text style={[styles.speedValue, { color: primaryColor }]}>
                        {speedValue}
                    </Text>
                    <Text style={[styles.unitLabel, { color: primaryColor + '99' }]}>
                        {speedUnit}
                    </Text>
                </View>

                <Text style={[typography.caption1, { color: colors.text, fontWeight: '600', marginTop: 4 }]}>
                    {label}
                </Text>
            </View>
        );
    };

    const downloadColors = { primary: '#22d3ee', secondary: '#0e7490' };
    const uploadColors = { primary: '#e879f9', secondary: '#a21caf' };

    return (
        <View style={styles.container}>
            <View style={styles.gaugesRow}>
                {renderGauge(
                    downloadSpeed,
                    dlSpeed.value,
                    dlSpeed.unit,
                    downloadColors.primary,
                    downloadColors.secondary,
                    'Download',
                    'dlGrad'
                )}
                {renderGauge(
                    uploadSpeed,
                    ulSpeed.value,
                    ulSpeed.unit,
                    uploadColors.primary,
                    uploadColors.secondary,
                    'Upload',
                    'ulGrad'
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    gaugesRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    gaugeItem: {
        alignItems: 'center',
        position: 'relative',
    },
    centerValue: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 10,
    },
    speedValue: {
        fontSize: 26,
        fontWeight: '700',
        fontFamily: 'monospace',
    },
    unitLabel: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
    },
});

export default SpeedGauge;
