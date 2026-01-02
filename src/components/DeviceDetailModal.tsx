import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Pressable,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { ConnectedDevice } from '@/types';
import { MeshGradientBackground } from './MeshGradientBackground';

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
const parseIpAddresses = (ipString: string): { ipv4: string | null; ipv6: string | null } => {
    if (!ipString) return { ipv4: null, ipv6: null };

    const parts = ipString.split(';').map(ip => ip.trim()).filter(ip => ip);

    let ipv4: string | null = null;
    let ipv6: string | null = null;

    for (const ip of parts) {
        if (ip.includes('::') || (ip.match(/:/g) || []).length > 1) {
            ipv6 = ip;
        } else if (ip.includes('.')) {
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
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();

    const [deviceName, setDeviceName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (visible && device) {
            setDeviceName(device.hostName || '');
            setHasChanges(false);
        }
    }, [visible, device]);

    useEffect(() => {
        if (device) {
            setHasChanges(deviceName !== (device.hostName || ''));
        }
    }, [deviceName, device]);

    const handleSave = async () => {
        Keyboard.dismiss();
        if (!device || !hasChanges) return;

        setIsSaving(true);
        try {
            await onSaveName(device.id, deviceName);
            setHasChanges(false);
            onClose();
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

    const { ipv4, ipv6 } = parseIpAddresses(device.ipAddress);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <MeshGradientBackground style={styles.modalContainer}>
                {/* Header - Same style as MonthlySettingsModal */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16 }]}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {t('wifi.deviceDetails')}
                    </Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close-circle" size={32} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        style={styles.modalContent}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Device Name Section */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                {t('wifi.deviceName')}
                            </Text>
                            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={deviceName}
                                    onChangeText={setDeviceName}
                                    placeholder={t('wifi.deviceName')}
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                        </View>

                        {/* Network Info Section */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                {t('wifi.networkInfo') || 'Network Information'}
                            </Text>
                            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {/* IPv4 */}
                                {ipv4 && (
                                    <View style={[styles.infoRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>IPv4</Text>
                                        <Text style={[styles.infoValue, { color: colors.text }]}>{ipv4}</Text>
                                    </View>
                                )}

                                {/* IPv6 */}
                                {ipv6 && (
                                    <View style={[styles.infoRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>IPv6</Text>
                                        <Text style={[styles.infoValue, { color: colors.text, fontSize: 11 }]} numberOfLines={1} ellipsizeMode="middle">
                                            {ipv6}
                                        </Text>
                                    </View>
                                )}

                                {/* MAC Address */}
                                <View style={[styles.infoRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>MAC</Text>
                                    <Text style={[styles.infoValue, { color: colors.text }]}>
                                        {formatMacAddress(device.macAddress)}
                                    </Text>
                                </View>

                                {/* Lease Time */}
                                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('wifi.leaseTime')}</Text>
                                    <Text style={[styles.infoValue, { color: colors.text }]}>
                                        {formatLeaseTime(device.associatedTime)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Actions Section */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                {t('settings.actions') || 'Actions'}
                            </Text>
                            <TouchableOpacity
                                style={[styles.dangerButton, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.1)' }]}
                                onPress={handleBlock}
                            >
                                <MaterialIcons name="block" size={20} color={colors.error} />
                                <Text style={[styles.dangerButtonText, { color: colors.error }]}>
                                    {t('wifi.blockDevice')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    {/* Footer - Inside KeyboardAvoidingView */}
                    <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.saveButton,
                                { backgroundColor: hasChanges ? colors.primary : colors.textSecondary },
                                pressed && { opacity: 0.8 }
                            ]}
                            onPress={() => {
                                Keyboard.dismiss();
                                if (hasChanges) {
                                    handleSave();
                                } else {
                                    onClose();
                                }
                            }}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.saveButtonText}>
                                    {hasChanges ? t('common.save') : t('common.cancel')}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </MeshGradientBackground>
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
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    infoLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 15,
        fontFamily: 'monospace',
        maxWidth: '60%',
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    dangerButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
    },
    saveButton: {
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: 'bold',
    },
});

export default DeviceDetailModal;
