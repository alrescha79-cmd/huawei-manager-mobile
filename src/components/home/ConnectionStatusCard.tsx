import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TextTicker from 'react-native-text-ticker';
import { useTheme } from '@/theme';
import { CollapsibleCard, SignalBar } from '@/components';
import { BatteryIndicator } from './BatteryIndicator';
import {
    getSignalIcon,
    getSignalStrength,
    getSignalIconFromModemStatus,
    getSignalStrengthFromIcon,
    getConnectionStatusText,
    getNetworkTypeText,
    getLteBandInfo,
} from '@/utils/helpers';

interface ConnectionStatusCardProps {
    t: (key: string) => string;
    signalInfo?: {
        rssi?: string;
        rsrp?: string;
        band?: string;
        ulbandwidth?: string;
        dlbandwidth?: string;
    };
    networkInfo?: {
        shortName?: string;
        fullName?: string;
        networkName?: string;
        spnName?: string;
        currentNetworkType?: string;
    };
    modemStatus?: {
        connectionStatus?: string;
        currentNetworkType?: string;
        signalIcon?: string | number;
        batteryStatus?: string;
        batteryLevel?: string;
        batteryPercent?: string;
    };
    wanInfo?: {
        wanIPAddress?: string;
    };
}

/**
 * Connection status card showing signal strength, network type, and connection info
 */
export function ConnectionStatusCard({
    t,
    signalInfo,
    networkInfo,
    modemStatus,
    wanInfo,
}: ConnectionStatusCardProps) {
    const { colors, typography } = useTheme();

    const getStrengthLabel = () => {
        const strength = getSignalStrength(signalInfo?.rssi, signalInfo?.rsrp);
        if (strength !== 'unknown') {
            return t(`home.signal${strength.charAt(0).toUpperCase()}${strength.slice(1)}`);
        }
        const signalIconStr = modemStatus?.signalIcon?.toString();
        const iconVal = getSignalIconFromModemStatus(signalIconStr);
        const fallbackStrength = getSignalStrengthFromIcon(iconVal);
        return t(`home.signal${fallbackStrength.charAt(0).toUpperCase()}${fallbackStrength.slice(1)}`);
    };

    const getSignalBars = () => {
        const calculatedIcon = getSignalIcon(signalInfo?.rssi, signalInfo?.rsrp);
        if (calculatedIcon > 0) return calculatedIcon;
        const signalIconStr = modemStatus?.signalIcon?.toString();
        return getSignalIconFromModemStatus(signalIconStr);
    };

    const getStatusText = () => {
        const status = getConnectionStatusText(modemStatus?.connectionStatus);
        return t(`home.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);
    };

    const networkType = getNetworkTypeText(networkInfo?.currentNetworkType || modemStatus?.currentNetworkType);
    const isConnected = modemStatus?.connectionStatus === '901';

    return (
        <CollapsibleCard title={t('home.connectionStatus')}>
            <View style={styles.connectionMainRow}>
                <View style={styles.connectionLeftSection}>
                    <SignalBar strength={getSignalBars()} label="" />
                    <View style={styles.connectionSignalLabels}>
                        <TextTicker
                            style={StyleSheet.flatten([typography.subheadline, { color: colors.primary, fontWeight: '600' }])}
                            duration={4000}
                            loop
                            bounce
                            repeatSpacer={50}
                            marqueeDelay={1000}
                        >
                            {getStrengthLabel()}
                        </TextTicker>
                        <TextTicker
                            style={StyleSheet.flatten([typography.headline, { color: colors.text, fontWeight: '600' }])}
                            duration={4000}
                            loop
                            bounce
                            repeatSpacer={50}
                            marqueeDelay={1000}
                        >
                            {networkInfo?.shortName || networkInfo?.fullName || networkInfo?.networkName || networkInfo?.spnName || t('common.unknown')}
                        </TextTicker>
                    </View>
                </View>

                <View style={styles.connectionRightSection}>
                    <TextTicker
                        style={StyleSheet.flatten([
                            typography.subheadline,
                            {
                                color: isConnected ? colors.primary : colors.error,
                                fontWeight: '600',
                                marginBottom: 4,
                            }
                        ])}
                        duration={4000}
                        loop
                        bounce
                        repeatSpacer={50}
                        marqueeDelay={1000}
                    >
                        {getStatusText()}
                    </TextTicker>
                    <View style={[styles.networkTypeBadge, { borderColor: colors.primary, borderWidth: 1 }]}>
                        <Text
                            style={[typography.caption1, { color: colors.primary, fontWeight: '700' }]}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            {networkType}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />

            <View style={styles.connectionInfoGrid}>
                <View style={styles.connectionInfoGridItem}>
                    <TextTicker
                        style={StyleSheet.flatten([typography.caption1, { color: colors.textSecondary, marginBottom: 2 }])}
                        duration={4000}
                        loop
                        bounce
                        repeatSpacer={50}
                        marqueeDelay={1000}
                    >
                        {t('home.power')}
                    </TextTicker>
                    <BatteryIndicator
                        batteryStatus={modemStatus?.batteryStatus}
                        batteryLevel={modemStatus?.batteryLevel}
                        batteryPercent={modemStatus?.batteryPercent}
                        size="medium"
                    />
                </View>

                <View style={styles.connectionInfoGridItem}>
                    <TextTicker
                        style={StyleSheet.flatten([typography.caption1, { color: colors.textSecondary, marginBottom: 2 }])}
                        duration={4000}
                        loop
                        bounce
                        repeatSpacer={50}
                        marqueeDelay={1000}
                    >
                        {t('home.ipAddress')}
                    </TextTicker>
                    <TextTicker
                        style={StyleSheet.flatten([typography.subheadline, { color: colors.text, fontWeight: '600' }])}
                        duration={4000}
                        loop
                        bounce
                        repeatSpacer={50}
                        marqueeDelay={1000}
                    >
                        {wanInfo?.wanIPAddress || '...'}
                    </TextTicker>
                </View>

                <View style={styles.connectionInfoGridItem}>
                    <TextTicker
                        style={StyleSheet.flatten([typography.caption1, { color: colors.textSecondary, marginBottom: 2 }])}
                        duration={4000}
                        loop
                        bounce
                        repeatSpacer={50}
                        marqueeDelay={1000}
                    >
                        {t('home.band')}
                    </TextTicker>
                    <TextTicker
                        style={StyleSheet.flatten([typography.subheadline, { color: colors.text, fontWeight: '600' }])}
                        duration={4000}
                        loop
                        bounce
                        repeatSpacer={50}
                        marqueeDelay={1000}
                    >
                        {getLteBandInfo(signalInfo?.band)}
                    </TextTicker>
                </View>

                <View style={styles.connectionInfoGridItem}>
                    <TextTicker
                        style={StyleSheet.flatten([typography.caption1, { color: colors.textSecondary, marginBottom: 2 }])}
                        duration={4000}
                        loop
                        bounce
                        repeatSpacer={50}
                        marqueeDelay={1000}
                    >
                        {t('home.width')}
                    </TextTicker>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {signalInfo?.dlbandwidth || signalInfo?.ulbandwidth ? (
                            <>
                                <MaterialIcons name="arrow-upward" size={14} color={colors.primary} />
                                <Text
                                    style={[typography.subheadline, { color: colors.text, fontWeight: '600', marginRight: 4 }]}
                                    adjustsFontSizeToFit
                                    numberOfLines={1}
                                >
                                    {signalInfo.ulbandwidth || '-'}
                                </Text>
                                <MaterialIcons name="arrow-downward" size={14} color={colors.success} />
                                <Text
                                    style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}
                                    adjustsFontSizeToFit
                                    numberOfLines={1}
                                >
                                    {signalInfo.dlbandwidth || '-'}
                                </Text>
                            </>
                        ) : (
                            <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>-</Text>
                        )}
                    </View>
                </View>
            </View>
        </CollapsibleCard>
    );
}

const styles = StyleSheet.create({
    connectionMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    connectionLeftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    connectionSignalLabels: {
        marginLeft: 12,
        flex: 1,
    },
    connectionRightSection: {
        alignItems: 'flex-end',
    },
    networkTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    connectionInfoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    connectionInfoGridItem: {
        width: '50%',
        marginBottom: 12,
    },
});

export default ConnectionStatusCard;
