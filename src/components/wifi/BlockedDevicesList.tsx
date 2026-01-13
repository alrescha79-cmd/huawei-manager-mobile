import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, BouncingDots } from '@/components';

interface BlockedDevice {
    macAddress: string;
    hostName: string;
}

interface BlockedDevicesListProps {
    t: (key: string) => string;
    devices: BlockedDevice[];
    unblockingMac: string | null;
    onUnblock: (macAddress: string) => void;
}

/**
 * Blocked devices list for WiFi screen
 */
export function BlockedDevicesList({
    t,
    devices,
    unblockingMac,
    onUnblock,
}: BlockedDevicesListProps) {
    const { colors, typography, spacing } = useTheme();

    if (devices.length === 0) {
        return null;
    }

    return (
        <Card style={{ marginTop: spacing.md }}>
            <View style={styles.header}>
                <MaterialIcons name="block" size={20} color={colors.error} />
                <Text style={[typography.headline, { color: colors.text, marginLeft: 8 }]}>
                    {t('wifi.blockedDevices')}
                </Text>
            </View>

            {devices.map((device, index) => (
                <View
                    key={device.macAddress + index}
                    style={[
                        styles.deviceItem,
                        {
                            borderBottomWidth: index < devices.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                        }
                    ]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
                            <MaterialIcons name="block" size={20} color={colors.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>
                                {device.hostName || t('wifi.unknownDevice')}
                            </Text>
                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                {device.macAddress}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.unblockButton,
                            {
                                backgroundColor: colors.success,
                                opacity: unblockingMac === device.macAddress ? 0.6 : 1,
                            }
                        ]}
                        onPress={() => onUnblock(device.macAddress)}
                        disabled={unblockingMac === device.macAddress}
                    >
                        {unblockingMac === device.macAddress ? (
                            <BouncingDots size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialIcons name="check" size={16} color="#fff" />
                                <Text style={[typography.caption1, { color: '#fff', marginLeft: 4, fontWeight: '600' }]}>
                                    {t('wifi.unblock')}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            ))}
        </Card>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    deviceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    unblockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
});

export default BlockedDevicesList;
