import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/theme';
import { CollapsibleCard, SignalCard } from '@/components';
import {
    getSignalStrength,
    getSignalIconFromModemStatus,
    getSignalStrengthFromIcon,
    getLteBandInfo,
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
    const { colors, typography, spacing } = useTheme();

    const hasSignalData = (signalInfo && (signalInfo.rssi || signalInfo.rsrp)) || modemStatus?.signalIcon;

    if (!hasSignalData) {
        return (
            <CollapsibleCard title={t('home.signalInfo')}>
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

    const metrics = [
        ...(signalInfo?.rssi ? [{
            label: 'RSSI',
            value: signalInfo.rssi,
            unit: 'dBm',
            quality: getSignalQuality(parseFloat(signalInfo.rssi), { excellent: -65, good: -75, fair: -85, poor: -95 }, true),
        }] : []),
        ...(signalInfo?.rsrp ? [{
            label: 'RSRP',
            value: signalInfo.rsrp,
            unit: 'dBm',
            quality: getSignalQuality(parseFloat(signalInfo.rsrp), { excellent: -80, good: -90, fair: -100, poor: -110 }, true),
        }] : []),
        ...(signalInfo?.rsrq ? [{
            label: 'RSRQ',
            value: signalInfo.rsrq,
            unit: 'dB',
            quality: getSignalQuality(parseFloat(signalInfo.rsrq), { excellent: -5, good: -9, fair: -12, poor: -15 }, true),
        }] : []),
        ...(signalInfo?.sinr ? [{
            label: 'SINR',
            value: signalInfo.sinr,
            unit: 'dB',
            quality: getSignalQuality(parseFloat(signalInfo.sinr), { excellent: 20, good: 13, fair: 6, poor: 0 }, false),
        }] : []),
    ];

    return (
        <CollapsibleCard title={t('home.signalInfo')}>
            <SignalCard
                title={t('home.signalStrength')}
                badge={getStrengthBadge()}
                color="blue"
                icon="signal-cellular-alt"
                metrics={metrics}
                band={signalInfo?.band ? getLteBandInfo(signalInfo.band) : undefined}
                cellId={signalInfo?.cellId}
            />
        </CollapsibleCard>
    );
}

export default SignalInfoCard;
