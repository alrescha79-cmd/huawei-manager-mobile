import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader } from '@/components';

interface BlockedDevice {
    macAddress: string;
    hostName: string;
}

interface BlockedDevicesListProps {
    t: (key: string) => string;
    devices: BlockedDevice[];
    unblockingMac: string | null;
    onUnblock: (macAddress: string) => void;
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
    unblockingMac,
    onUnblock,
    onDevicePress,
}: BlockedDevicesListProps) {
    const { colors, typography, spacing } = useTheme();

    if (devices.length === 0) {
        return null;
    }

    return (
        <Card style={{ marginTop: spacing.md }}>
            <CardHeader title={`${t('wifi.blockedDevices')} (${devices.length})`} />

            {devices.map((device, index) => (
                <View
                    key={device.macAddress + index}
                    style={[
                        styles.deviceItem,
                        {
                            borderBottomWidth: index < devices.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                            paddingBottom: spacing.md,
                            marginBottom: index < devices.length - 1 ? spacing.md : 0,
                        }
                    ]}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: 4 }]}>
                            {device.hostName || t('wifi.unknownDevice')}
                        </Text>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                            MAC: {formatMacAddress(device.macAddress)}
                        </Text>
                    </View>

                    {/* Detail Button */}
                    <TouchableOpacity
                        style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => onDevicePress?.(device)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Unblock Button */}
                    <TouchableOpacity
                        style={[
                            styles.circleButton,
                            {
                                backgroundColor: colors.success + '15',
                                borderColor: colors.success + '30',
                                marginLeft: 8,
                                opacity: unblockingMac === device.macAddress ? 0.6 : 1,
                            }
                        ]}
                        onPress={() => onUnblock(device.macAddress)}
                        disabled={unblockingMac === device.macAddress}
                        activeOpacity={0.7}
                    >
                        {unblockingMac === device.macAddress ? (
                            <ActivityIndicator size="small" color={colors.success} />
                        ) : (
                            <FontAwesome5 name="user-check" size={14} color={colors.success} />
                        )}
                    </TouchableOpacity>
                </View>
            ))}
        </Card>
    );
}

const styles = StyleSheet.create({
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    circleButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
});

export default BlockedDevicesList;
