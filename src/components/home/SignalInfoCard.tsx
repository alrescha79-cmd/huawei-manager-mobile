import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { CollapsibleCard } from '@/components';
import {
    getSignalStrength,
    getSignalIconFromModemStatus,
    getSignalStrengthFromIcon,
} from '@/utils/helpers';

interface SignalInfoCardProps {
    t: (key: string) => string;
    signalInfo?: {
        rssi?: string;
        rsrp?: string;
        rsrq?: string;
        sinr?: string;
        band?: string;
        cellId?: string;
    };
    modemStatus?: {
        signalIcon?: string | number;
    };
}

const getSignalQuality = (
    value: number,
    thresholds: { excellent: number; good: number; fair: number; poor: number },
    reverseScale: boolean
): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' => {
    if (isNaN(value)) return 'unknown';
    if (reverseScale) {
        if (value >= thresholds.excellent) return 'excellent';
        if (value >= thresholds.good) return 'good';
        if (value >= thresholds.fair) return 'fair';
        return 'poor';
    } else {
        if (value >= thresholds.excellent) return 'excellent';
        if (value >= thresholds.good) return 'good';
        if (value >= thresholds.fair) return 'fair';
        return 'poor';
    }
};

export function SignalInfoCard({ t, signalInfo, modemStatus }: SignalInfoCardProps) {
    const { colors, typography, spacing, isDark } = useTheme();

    const hasSignalData = (signalInfo && (signalInfo.rssi || signalInfo.rsrp)) || modemStatus?.signalIcon;

    if (!hasSignalData) {
        return (
            <CollapsibleCard title={t('home.signalInfo').toUpperCase()} titleStyle={styles.cardTitle}>
                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }]}>
                    {t('home.noSignalAvailable')}{'\n'}
                    {t('home.checkLogin')}
                </Text>
            </CollapsibleCard>
        );
    }

    const getStrengthBadge = () => {
        const strength = getSignalStrength(signalInfo?.rssi, signalInfo?.rsrp);
        if (strength !== 'unknown') {
            return t(`home.signal${strength.charAt(0).toUpperCase()}${strength.slice(1)}`);
        }
        const iconVal = getSignalIconFromModemStatus(modemStatus?.signalIcon?.toString());
        const fallbackStrength = getSignalStrengthFromIcon(iconVal);
        return t(`home.signal${fallbackStrength.charAt(0).toUpperCase()}${fallbackStrength.slice(1)}`);
    };

    const getStrengthColor = (strength: string): string => {
        switch (strength) {
            case 'excellent':
            case 'good':
                return colors.success;
            case 'fair':
                return colors.warning;
            default:
                return colors.error;
        }
    };

    const getStrengthBgColor = (strength: string): string => {
        switch (strength) {
            case 'excellent':
            case 'good':
                return 'rgba(34, 197, 94, 0.1)';
            case 'fair':
                return 'rgba(234, 179, 8, 0.1)';
            default:
                return 'rgba(239, 68, 68, 0.1)';
        }
    };

    const strength = getSignalStrength(signalInfo?.rssi, signalInfo?.rsrp);
    const strengthLabel = getStrengthBadge();
    const badgeColor = getStrengthColor(strength);
    const badgeBg = getStrengthBgColor(strength);

    const headerRightBadge = (
        <View style={[
            styles.headerStatusBadge,
            {
                borderColor: badgeColor,
                backgroundColor: badgeBg,
            }
        ]}>
            <Text style={[
                typography.caption1,
                {
                    color: badgeColor,
                    fontWeight: '700',
                }
            ]}>
                {strengthLabel}
            </Text>
        </View>
    );

    const parseSignalValue = (val: string): number => {
        if (!val) return NaN;
        const cleaned = val.replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? NaN : num;
    };

    const cleanDisplayValue = (val: string) => {
        if (!val) return '';
        return val.replace(/(dBm|dB|dBi)/gi, '').trim();
    };

    const metrics = [
        ...(signalInfo?.rssi ? [{
            label: 'RSSI',
            value: signalInfo.rssi,
            unit: 'dBm',
            quality: getSignalQuality(parseSignalValue(signalInfo.rssi), { excellent: -65, good: -75, fair: -85, poor: -95 }, true),
        }] : []),
        ...(signalInfo?.rsrp ? [{
            label: 'RSRP',
            value: signalInfo.rsrp,
            unit: 'dBm',
            quality: getSignalQuality(parseSignalValue(signalInfo.rsrp), { excellent: -80, good: -90, fair: -100, poor: -110 }, true),
        }] : []),
        ...(signalInfo?.rsrq ? [{
            label: 'RSRQ',
            value: signalInfo.rsrq,
            unit: 'dB',
            quality: getSignalQuality(parseSignalValue(signalInfo.rsrq), { excellent: -5, good: -9, fair: -12, poor: -15 }, true),
        }] : []),
        ...(signalInfo?.sinr ? [{
            label: 'SINR',
            value: signalInfo.sinr,
            unit: 'dB',
            quality: getSignalQuality(parseSignalValue(signalInfo.sinr), { excellent: 20, good: 13, fair: 6, poor: 0 }, false),
        }] : []),
    ];

    const getQualityColor = (quality: string): string => {
        switch (quality) {
            case 'excellent': return '#22c55e';
            case 'good': return '#a3e635';
            case 'fair': return '#eab308';
            case 'poor': return '#ef4444';
            default: return '#8e8e93';
        }
    };

    const getQualityWidth = (quality: string): number => {
        switch (quality) {
            case 'excellent': return 100;
            case 'good': return 75;
            case 'fair': return 50;
            case 'poor': return 25;
            default: return 10;
        }
    };

    const gridItemBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
    const gridItemBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

    return (
        <CollapsibleCard
            title={t('home.signalInfo').toUpperCase()}
            headerRight={headerRightBadge}
            titleStyle={styles.cardTitle}
        >
            <View style={styles.gridContainer}>
                {metrics.map((metric, index) => {
                    const qualityColor = getQualityColor(metric.quality);
                    const filledWidth = getQualityWidth(metric.quality);
                    return (
                        <View
                            key={index}
                            style={[
                                styles.gridItem,
                                {
                                    backgroundColor: gridItemBg,
                                    borderColor: gridItemBorder
                                }
                            ]}
                        >
                            <Text style={styles.gridItemLabel}>{metric.label}</Text>
                            <Text style={[styles.gridItemValue, { color: qualityColor }]}>
                                {cleanDisplayValue(metric.value)}
                                <Text style={{ fontSize: 16, fontWeight: '600' }}> {metric.unit}</Text>
                            </Text>
                            <View style={[styles.progressBarContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                <View style={[styles.progressBarFill, { width: `${filledWidth}%`, backgroundColor: qualityColor }]} />
                            </View>
                            <View style={styles.scaleRow}>
                                <Text style={styles.scaleText}>{t('home.signalWeak')}</Text>
                                <Text style={styles.scaleText}>{t('home.signalPerfect')}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </CollapsibleCard>
    );
}

const styles = StyleSheet.create({
    cardTitle: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        color: '#8e8e93',
    },
    headerStatusBadge: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItem: {
        width: '48.5%',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    gridItemLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#8e8e93',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    gridItemValue: {
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'monospace',
        textAlign: 'center',
    },
    progressBarContainer: {
        height: 6,
        width: '100%',
        borderRadius: 3,
        marginTop: 12,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    scaleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    scaleText: {
        fontSize: 9,
        fontWeight: '500',
        color: '#8e8e93',
    },
});

export default SignalInfoCard;
