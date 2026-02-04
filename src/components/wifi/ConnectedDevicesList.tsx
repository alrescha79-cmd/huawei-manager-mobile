import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader } from '@/components';
import { ConnectedDevice } from '@/types';

interface ConnectedDevicesListProps {
    t: (key: string) => string;
    devices: ConnectedDevice[];
    onDevicePress: (device: ConnectedDevice) => void;
    onBlockDevice: (macAddress: string, hostName: string) => void;
}

function formatMacAddress(mac: string): string {
    if (!mac) return '';
    if (mac.includes(':')) return mac.toUpperCase();
    return mac.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
}

export function ConnectedDevicesList({
    t,
    devices,
    onDevicePress,
    onBlockDevice,
}: ConnectedDevicesListProps) {
    const { colors, typography, spacing } = useTheme();

    return (
        <Card>
            <CardHeader title={`${t('wifi.connectedDevices')} (${devices.length})`} />

            {devices.length === 0 ? (
                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }]}>
                    {t('wifi.noDevices')}
                </Text>
            ) : (
                devices.map((device, index) => (
                    <View
                        key={device.macAddress}
                        style={[
                            styles.deviceItem,
                            {
                                borderBottomWidth: index < devices.length - 1 ? 1 : 0,
                                borderBottomColor: colors.border,
                                paddingBottom: spacing.md,
                                marginBottom: index < devices.length - 1 ? spacing.md : 0,
                            },
                        ]}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: 4 }]}>
                                {device.hostName || 'Unknown Device'}
                            </Text>
                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                IP: {device.ipAddress}
                            </Text>
                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                MAC: {formatMacAddress(device.macAddress)}
                            </Text>
                        </View>

                        {/* Detail Button */}
                        <TouchableOpacity
                            style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => onDevicePress(device)}
                            activeOpacity={0.7}
                        >
                            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Block Button */}
                        <TouchableOpacity
                            style={[styles.circleButton, { backgroundColor: colors.error + '15', borderColor: colors.error + '30', marginLeft: 8 }]}
                            onPress={() => onBlockDevice(device.macAddress, device.hostName)}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name="user-slash" size={14} color={colors.error} />
                        </TouchableOpacity>
                    </View>
                ))
            )}
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

export default ConnectedDevicesList;
