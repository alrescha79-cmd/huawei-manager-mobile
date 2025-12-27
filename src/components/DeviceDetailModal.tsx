import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Platform,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { ConnectedDevice } from '@/types';

interface DeviceDetailModalProps {
    visible: boolean;
    onClose: () => void;
    device: ConnectedDevice | null;
    onSaveName: (deviceId: string, newName: string) => Promise<void>;
    onBlock: (macAddress: string, hostName: string) => void;
}

// Helper to format MAC address
const formatMacAddress = (mac: string): string => {
    if (!mac) return '';
    // Remove existing separators and format with colons
    const cleanMac = mac.replace(/[:-]/g, '').toUpperCase();
    return cleanMac.match(/.{1,2}/g)?.join(':') || mac;
};

// Helper to format lease/associated time
const formatLeaseTime = (seconds: string): string => {
    const secs = parseInt(seconds) || 0;
    if (secs === 0) return '-';

    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
};

// Helper to parse IPv4 and IPv6 from combined IP string
// Format can be: "192.168.8.100" or "192.168.8.100;fe80::..." or just "fe80::..."
const parseIpAddresses = (ipString: string): { ipv4: string | null; ipv6: string | null } => {
    if (!ipString) return { ipv4: null, ipv6: null };

    // Split by semicolon
    const parts = ipString.split(';').map(ip => ip.trim()).filter(ip => ip);

    let ipv4: string | null = null;
    let ipv6: string | null = null;

    for (const ip of parts) {
        // Check if IPv6 (contains ::  or multiple colons)
        if (ip.includes('::') || (ip.match(/:/g) || []).length > 1) {
            ipv6 = ip;
        } else if (ip.includes('.')) {
            // IPv4 contains dots
            ipv4 = ip;
        }
    }

    return { ipv4, ipv6 };
};

export function DeviceDetailModal({
    visible,
    onClose,
    device,
    onSaveName,
    onBlock,
}: DeviceDetailModalProps) {
    const { colors, typography, spacing } = useTheme();
    const { t } = useTranslation();

    const [deviceName, setDeviceName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Load device name when modal opens
    useEffect(() => {
        if (visible && device) {
            setDeviceName(device.hostName || '');
            setHasChanges(false);
        }
    }, [visible, device]);

    // Track changes
    useEffect(() => {
        if (device) {
            setHasChanges(deviceName !== (device.hostName || ''));
        }
    }, [deviceName, device]);

    const handleSave = async () => {
        if (!device || !hasChanges) return;

        setIsSaving(true);
        try {
            await onSaveName(device.id, deviceName);
            setHasChanges(false);
            onClose(); // Close modal after successful save
        } catch (error) {
            // Error handled by parent
        } finally {
            setIsSaving(false);
        }
    };

    const handleBlock = () => {
        if (device) {
            onBlock(device.macAddress, device.hostName);
            onClose();
        }
    };

    if (!device) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.modalHeader, {
                    borderBottomColor: colors.border,
                    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16
                }]}>
                    <TouchableOpacity onPress={onClose} style={{ width: 60 }}>
                        <Text style={[typography.body, { color: colors.primary }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                        {t('wifi.deviceDetails')}
                    </Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!hasChanges || isSaving}
                        style={{ width: 60, alignItems: 'flex-end' }}
                    >
                        {isSaving ? (
                            <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                            <Text style={[typography.body, {
                                color: hasChanges ? colors.primary : colors.textSecondary,
                                fontWeight: '600'
                            }]}>
                                {t('common.save')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                    {/* Device Name (Editable) */}
                    <View style={styles.formGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            {t('wifi.deviceName')}
                        </Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                            value={deviceName}
                            onChangeText={setDeviceName}
                            placeholder={t('wifi.deviceName')}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    {/* IPv4 Address (Read-only) */}
                    {(() => {
                        const { ipv4, ipv6 } = parseIpAddresses(device.ipAddress);
                        return (
                            <>
                                {ipv4 && (
                                    <View style={styles.infoRow}>
                                        <Text style={[typography.body, { color: colors.textSecondary }]}>IPv4</Text>
                                        <Text style={[typography.body, { color: colors.text, fontFamily: 'monospace' }]}>
                                            {ipv4}
                                        </Text>
                                    </View>
                                )}
                                {ipv6 && (
                                    <View style={styles.infoRow}>
                                        <Text style={[typography.body, { color: colors.textSecondary }]}>IPv6</Text>
                                        <Text style={[typography.body, { color: colors.text, fontFamily: 'monospace', fontSize: 12 }]} numberOfLines={1} ellipsizeMode="middle">
                                            {ipv6}
                                        </Text>
                                    </View>
                                )}
                                {!ipv4 && !ipv6 && (
                                    <View style={styles.infoRow}>
                                        <Text style={[typography.body, { color: colors.textSecondary }]}>IP</Text>
                                        <Text style={[typography.body, { color: colors.text, fontFamily: 'monospace' }]}>
                                            {device.ipAddress || '-'}
                                        </Text>
                                    </View>
                                )}
                            </>
                        );
                    })()}

                    {/* MAC Address (Read-only) */}
                    <View style={styles.infoRow}>
                        <Text style={[typography.body, { color: colors.textSecondary }]}>MAC</Text>
                        <Text style={[typography.body, { color: colors.text, fontFamily: 'monospace' }]}>
                            {formatMacAddress(device.macAddress)}
                        </Text>
                    </View>

                    {/* Lease Time (Read-only) */}
                    <View style={styles.infoRow}>
                        <Text style={[typography.body, { color: colors.textSecondary }]}>{t('wifi.leaseTime')}</Text>
                        <Text style={[typography.body, { color: colors.text }]}>
                            {formatLeaseTime(device.associatedTime)}
                        </Text>
                    </View>

                    {/* Block Button */}
                    <TouchableOpacity
                        style={[styles.blockButton, { backgroundColor: colors.error }]}
                        onPress={handleBlock}
                    >
                        <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                            {t('wifi.blockDevice')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    formGroup: {
        marginBottom: 24,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    saveButton: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 24,
    },
    blockButton: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 16,
    },
});

export default DeviceDetailModal;
