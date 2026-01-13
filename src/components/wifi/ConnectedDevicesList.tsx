import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader, Button } from '@/components';
import { ConnectedDevice } from '@/types';

interface ConnectedDevicesListProps {
    t: (key: string) => string;
    devices: ConnectedDevice[];
    onDevicePress: (device: ConnectedDevice) => void;
    onBlockDevice: (macAddress: string, hostName: string) => void;
}

/**
 * Format MAC address for display
 */
function formatMacAddress(mac: string): string {
    if (!mac) return '';
    if (mac.includes(':')) return mac.toUpperCase();
    // Format as XX:XX:XX:XX:XX:XX
    return mac.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
}

/**
 * Connected devices list for WiFi screen
 */
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
                    <TouchableOpacity
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
                        onPress={() => onDevicePress(device)}
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

                        <Button
                            title={t('wifi.blockDevice')}
                            variant="danger"
                            onPress={() => onBlockDevice(device.macAddress, device.hostName)}
                            style={styles.kickButton}
                        />
                    </TouchableOpacity>
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
    kickButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 70,
    },
});

export default ConnectedDevicesList;
