import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    trafficStats?: {
        currentDownloadRate?: number;
        currentUploadRate?: number;
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
    trafficStats,
}: ConnectionStatusCardProps) {
    const { colors, typography, isDark } = useTheme();

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

    const formatSpeed = (bps: number): string => {
        if (bps === 0) return '0 bps';
        const k = 1000;
        const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
        const i = Math.floor(Math.log(bps) / Math.log(k));
        const value = (bps / Math.pow(k, i)).toFixed(1);
        return `${value} ${sizes[i]}`;
    };

    const getPowerSourceInfo = () => {
        const isCharging = modemStatus?.batteryStatus === '1';
        const hasBattery = modemStatus?.batteryPercent !== undefined && modemStatus?.batteryPercent !== '' && modemStatus?.batteryPercent !== null;
        const percent = parseInt(modemStatus?.batteryPercent || '0', 10);

        if (!hasBattery || isCharging) {
            return {
                icon: 'power' as const,
                iconColor: colors.success,
                text: t('home.acPower'),
            };
        }
        
        return {
            icon: 'battery-std' as const,
            iconColor: percent <= 20 ? colors.error : percent <= 50 ? colors.warning : colors.success,
            text: `${t('home.battery')} (${percent}%)`,
        };
    };

    const statusText = getStatusText();
    const isStatusConnected = isConnected;

    const headerRightBadge = (
        <View style={[
            styles.headerStatusBadge,
            {
                borderColor: isStatusConnected ? colors.success : colors.error,
                backgroundColor: isStatusConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            }
        ]}>
            <Text style={[
                typography.caption1,
                {
                    color: isStatusConnected ? colors.success : colors.error,
                    fontWeight: '700',
                }
            ]}>
                {statusText}
            </Text>
        </View>
    );

    const gridItemBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
    const gridItemBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
    const powerInfo = getPowerSourceInfo();

    return (
        <CollapsibleCard 
            title={t('home.connectionStatus').toUpperCase()}
            headerRight={headerRightBadge}
            titleStyle={styles.cardTitle}
        >
            <View style={styles.topRow}>
                <View style={styles.providerSection}>
                    <SignalBar strength={getSignalBars()} label="" />
                    <View style={styles.providerInfoColumn}>
                        <Text style={styles.sectionLabel}>{t('home.provider').toUpperCase()}</Text>
                        <View style={styles.providerNameRow}>
                            <View style={{ overflow: 'hidden', flexShrink: 1, marginRight: 8 }}>
                                <TextTicker
                                    style={StyleSheet.flatten([typography.title3, { color: colors.text, fontWeight: '700' }])}
                                    duration={4000}
                                    loop
                                    bounce
                                    repeatSpacer={50}
                                    marqueeDelay={1000}
                                >
                                    {networkInfo?.shortName || networkInfo?.fullName || networkInfo?.networkName || networkInfo?.spnName || t('common.unknown')}
                                </TextTicker>
                            </View>
                            <View style={[
                                styles.networkBadge,
                                {
                                    borderColor: colors.primary,
                                    backgroundColor: isDark ? 'rgba(129, 140, 248, 0.15)' : 'rgba(79, 70, 229, 0.1)',
                                }
                            ]}>
                                <Text
                                    style={[typography.caption2, { color: colors.primary, fontWeight: '700' }]}
                                    adjustsFontSizeToFit
                                    numberOfLines={1}
                                >
                                    {networkType}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.speedSection}>
                    <Text style={[styles.sectionLabel, { textAlign: 'right' }]}>{t('home.networkSpeed').toUpperCase()}</Text>
                    <View style={[styles.speedSubRow, { marginTop: 4 }]}>
                        <MaterialIcons name="arrow-downward" size={16} color="#22c55e" />
                        <Text style={[typography.body, { color: '#22c55e', fontWeight: '700', marginLeft: 4 }]}>
                            {formatSpeed((trafficStats?.currentDownloadRate || 0) * 8)}
                        </Text>
                    </View>
                    <View style={[styles.speedSubRow, { marginTop: 2 }]}>
                        <MaterialIcons name="arrow-upward" size={16} color="#e879f9" />
                        <Text style={[typography.body, { color: '#e879f9', fontWeight: '700', marginLeft: 4 }]}>
                            {formatSpeed((trafficStats?.currentUploadRate || 0) * 8)}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.gridContainer}>
                {/* Aliran Daya */}
                <View style={[styles.gridItem, { backgroundColor: gridItemBg, borderColor: gridItemBorder, width: '48.5%', marginBottom: 12 }]}>
                    <Text style={styles.gridItemLabel}>{t('home.powerSource').toUpperCase()}</Text>
                    <View style={styles.gridItemContent}>
                        <MaterialIcons name={powerInfo.icon} size={18} color={powerInfo.iconColor} />
                        <Text style={[typography.subheadline, { color: colors.text, fontWeight: '700', marginLeft: 8 }]}>
                            {powerInfo.text}
                        </Text>
                    </View>
                </View>

                {/* Alamat IP */}
                <View style={[styles.gridItem, { backgroundColor: gridItemBg, borderColor: gridItemBorder, width: '48.5%', marginBottom: 12 }]}>
                    <Text style={styles.gridItemLabel}>{t('home.ipAddress').toUpperCase()}</Text>
                    <View style={styles.gridItemContent}>
                        <MaterialIcons name="public" size={18} color="#c084fc" />
                        <View style={{ flex: 1, marginLeft: 8, overflow: 'hidden' }}>
                            <TextTicker
                                style={StyleSheet.flatten([typography.subheadline, { color: colors.text, fontWeight: '700' }])}
                                duration={4000}
                                loop
                                bounce
                                repeatSpacer={50}
                                marqueeDelay={1000}
                            >
                                {wanInfo?.wanIPAddress || '...'}
                            </TextTicker>
                        </View>
                    </View>
                </View>

                {/* Frekuensi / Band */}
                <View style={[styles.gridItem, { backgroundColor: gridItemBg, borderColor: gridItemBorder, width: '48.5%', marginBottom: 12 }]}>
                    <Text style={styles.gridItemLabel}>{t('home.frequencyBand').toUpperCase()}</Text>
                    <View style={styles.gridItemContent}>
                        <MaterialIcons name="rss-feed" size={18} color="#a78bfa" />
                        <View style={{ flex: 1, marginLeft: 8, overflow: 'hidden' }}>
                            <TextTicker
                                style={StyleSheet.flatten([typography.subheadline, { color: colors.text, fontWeight: '700' }])}
                                duration={4000}
                                loop
                                bounce
                                repeatSpacer={50}
                                marqueeDelay={1000}
                            >
                                {getLteBandInfo(signalInfo?.band) || '-'}
                            </TextTicker>
                        </View>
                    </View>
                </View>

                {/* Bandwidth */}
                <View style={[styles.gridItem, { backgroundColor: gridItemBg, borderColor: gridItemBorder, width: '48.5%', marginBottom: 12 }]}>
                    <Text style={styles.gridItemLabel}>{t('home.bandwidth').toUpperCase()}</Text>
                    <View style={styles.gridItemContent}>
                        <MaterialIcons name="show-chart" size={18} color="#22d3ee" />
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, flexWrap: 'wrap', flex: 1 }}>
                            {signalInfo?.dlbandwidth || signalInfo?.ulbandwidth ? (
                                <>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                                        <MaterialIcons name="arrow-upward" size={12} color="#e879f9" />
                                        <Text style={[typography.caption1, { color: '#e879f9', fontWeight: '700' }]}>
                                            {signalInfo.ulbandwidth || '-'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <MaterialIcons name="arrow-downward" size={12} color="#22d3ee" />
                                        <Text style={[typography.caption1, { color: '#22d3ee', fontWeight: '700' }]}>
                                            {signalInfo.dlbandwidth || '-'}
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <Text style={[typography.subheadline, { color: colors.text, fontWeight: '700' }]}>-</Text>
                            )}
                        </View>
                    </View>
                </View>
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
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    providerSection: {
        flex: 1.4,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    providerInfoColumn: {
        marginLeft: 12,
        flex: 1,
        justifyContent: 'center',
    },
    providerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#8e8e93',
        letterSpacing: 0.5,
    },
    speedSection: {
        flex: 1,
        alignItems: 'flex-end',
    },
    speedSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    networkBadge: {
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItem: {
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
    },
    gridItemLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#8e8e93',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    gridItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default ConnectionStatusCard;
