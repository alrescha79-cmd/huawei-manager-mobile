import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface BlockedDevice {
    macAddress: string;
    hostName: string;
}

interface BlockedDevicesListProps {
    t: (key: string) => string;
    devices: BlockedDevice[];
    unblockingMac?: string | null;
    onUnblock?: (macAddress: string) => void;
    onDevicePress?: (device: BlockedDevice) => void;
}

function formatMacAddress(mac: string): string {
    if (!mac) return '';
    if (mac.includes(':')) return mac.toUpperCase();
    return mac.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
}

export function BlockedDevicesList({
    t,
    devices,
    onDevicePress,
}: BlockedDevicesListProps) {
    const { colors, typography, isDark } = useTheme();

    if (devices.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Header with Title and Red Badge */}
            <View style={styles.headerContainer}>
                <Text style={[typography.body, { color: colors.error, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 14 }]}>
                    {t('wifi.blockedDevices')}
                </Text>
                <View style={[styles.badge, { backgroundColor: colors.error + '15' }]}>
                    <Text style={[styles.badgeText, { color: colors.error }]}>{devices.length}</Text>
                </View>
            </View>

            {devices.map((device) => {
                const iconColor = colors.error;
                const iconBg = colors.error + '15';

                return (
                    <TouchableOpacity
                        key={device.macAddress}
                        style={[
                            styles.deviceCard,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                            }
                        ]}
                        onPress={() => onDevicePress?.(device)}
                        activeOpacity={0.7}
                    >
                        {/* Left Column: Red Icon Box */}
                        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                            <MaterialIcons name="person-off" size={22} color={iconColor} />
                        </View>

                        {/* Middle Column: Hostname & MAC */}
                        <View style={styles.middleColumn}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                                {device.hostName || t('wifi.unknownDevice')}
                            </Text>
                            <Text style={[typography.caption2, { color: colors.error, marginTop: 4, fontWeight: '500' }]} numberOfLines={1}>
                                MAC: {formatMacAddress(device.macAddress)}
                            </Text>
                        </View>

                        {/* Right Column: "Terblokir" pill badge */}
                        <View style={[styles.blockedBadge, { backgroundColor: colors.error + '15' }]}>
                            <Text style={[typography.caption2, { color: colors.error, fontWeight: '700' }]}>
                                {t('wifi.blocked')}
                            </Text>
                        </View>

                        {/* Far Right: Chevron Icon Container */}
                        <View style={[styles.chevronContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                            <MaterialIcons name="chevron-right" size={16} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginTop: 16,
        marginBottom: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    badge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    deviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        marginBottom: 10,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    middleColumn: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    blockedBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chevronContainer: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default BlockedDevicesList;
