import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader, Button, BouncingDots } from '@/components';

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

/**
 * Format MAC address for display
 */
function formatMacAddress(mac: string): string {
    if (!mac) return '';
    if (mac.includes(':')) return mac.toUpperCase();
    return mac.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
}

/**
 * Blocked devices list for WiFi screen
 */
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
                <TouchableOpacity
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
                    onPress={() => onDevicePress?.(device)}
                    activeOpacity={0.7}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: 4 }]}>
                            {device.hostName || t('wifi.unknownDevice')}
                        </Text>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                            MAC: {formatMacAddress(device.macAddress)}
                        </Text>
                    </View>

                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />

                    <Button
                        title={t('wifi.unblock')}
                        variant="success"
                        size="small"
                        onPress={() => onUnblock(device.macAddress)}
                        disabled={unblockingMac === device.macAddress}
                        loading={unblockingMac === device.macAddress}
                        style={styles.unblockButton}
                    />
                </TouchableOpacity>
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
    unblockButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 80,
    },
});

export default BlockedDevicesList;
