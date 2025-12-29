import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    ActivityIndicator,
    TextInput,
    Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { NetworkSettingsService } from '@/services/network.settings.service';
import { useTranslation } from '@/i18n';
import { ThemedAlertHelper, Button, InfoRow, SettingsSection, SettingsItem } from '@/components';

const ETHERNET_MODES = [
    { value: 'auto', labelKey: 'networkSettings.modeAuto' },
    { value: 'lan_only', labelKey: 'networkSettings.modeLanOnly' },
    { value: 'pppoe', labelKey: 'networkSettings.modePppoe' },
    { value: 'dynamic_ip', labelKey: 'networkSettings.modeDynamicIp' },
    { value: 'pppoe_dynamic', labelKey: 'networkSettings.modePppoeDynamic' },
];

export default function LanSettingsScreen() {
    const { colors, typography, spacing } = useTheme();
    const { t } = useTranslation();
    const { credentials } = useAuthStore();

    const [networkSettingsService, setNetworkSettingsService] = useState<NetworkSettingsService | null>(null);

    // Ethernet
    const [ethernetMode, setEthernetMode] = useState<'auto' | 'lan_only' | 'pppoe' | 'dynamic_ip' | 'pppoe_dynamic'>('auto');
    const [ethernetStatus, setEthernetStatus] = useState<any>({ connected: false });
    const [isChangingEthernet, setIsChangingEthernet] = useState(false);
    const [showEthernetDropdown, setShowEthernetDropdown] = useState(false);

    // DHCP
    const [dhcpSettings, setDhcpSettings] = useState({
        dhcpIPAddress: '192.168.8.1',
        dhcpLanNetmask: '255.255.255.0',
        dhcpStatus: true,
        dhcpStartIPAddress: '192.168.8.100',
        dhcpEndIPAddress: '192.168.8.200',
        dhcpLeaseTime: 86400,
        dnsStatus: true,
    });
    const [isTogglingDhcp, setIsTogglingDhcp] = useState(false);
    const [isSavingDhcp, setIsSavingDhcp] = useState(false);
    const [showLeaseTimeDropdown, setShowLeaseTimeDropdown] = useState(false);

    // APN
    const [apnProfiles, setApnProfiles] = useState<any[]>([]);
    const [activeApnProfileId, setActiveApnProfileId] = useState('');

    // APN Modal
    const [showApnModal, setShowApnModal] = useState(false);
    const [editingApn, setEditingApn] = useState<string | null>(null);
    const [apnName, setApnName] = useState('');
    const [apnApn, setApnApn] = useState('');
    const [apnUsername, setApnUsername] = useState('');
    const [apnPassword, setApnPassword] = useState('');
    const [apnAuthType, setApnAuthType] = useState<'none' | 'pap' | 'chap' | 'pap_chap'>('none');
    const [apnIpType, setApnIpType] = useState<'ipv4' | 'ipv6' | 'ipv4v6'>('ipv4');
    const [apnIsDefault, setApnIsDefault] = useState(false);
    const [isSavingApn, setIsSavingApn] = useState(false);

    const [showApnAuthDropdown, setShowApnAuthDropdown] = useState(false);
    const [showApnIpDropdown, setShowApnIpDropdown] = useState(false);

    useEffect(() => {
        if (credentials?.modemIp) {
            const service = new NetworkSettingsService(credentials.modemIp);
            setNetworkSettingsService(service);
            loadEthernet(service);
            loadDhcp(service);
            loadApn(service);
        }
    }, [credentials]);

    const loadEthernet = async (service: NetworkSettingsService) => {
        try {
            const settings = await service.getEthernetSettings();
            setEthernetMode(settings.connectionMode);
            setEthernetStatus(settings.status);
        } catch (e) { }
    };

    const loadDhcp = async (service: NetworkSettingsService) => {
        try {
            const settings = await service.getDHCPSettings();
            setDhcpSettings(settings);
        } catch (e) { }
    };

    const loadApn = async (service: NetworkSettingsService) => {
        try {
            const profiles = await service.getAPNProfiles();
            const activeId = await service.getActiveAPNProfile();
            setActiveApnProfileId(activeId);
            setApnProfiles(profiles.map(p => ({ ...p, isDefault: p.id === activeId })));
        } catch (e) { }
    };

    // Ethernet Logic
    const handleEthernetModeChange = async (mode: typeof ethernetMode) => {
        if (!networkSettingsService || isChangingEthernet) return;
        setIsChangingEthernet(true);
        setShowEthernetDropdown(false);
        try {
            await networkSettingsService.setEthernetConnectionMode(mode);
            setEthernetMode(mode);
            const settings = await networkSettingsService.getEthernetSettings();
            setEthernetStatus(settings.status);
            ThemedAlertHelper.alert(t('common.success'), t('networkSettings.profileSaved'));
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
        } finally {
            setIsChangingEthernet(false);
        }
    };

    // DHCP Logic
    const handleDHCPToggle = async (enabled: boolean) => {
        if (!networkSettingsService || isTogglingDhcp) return;
        setIsTogglingDhcp(true);
        try {
            await networkSettingsService.toggleDHCPServer(enabled);
            setDhcpSettings(prev => ({ ...prev, dhcpStatus: enabled }));
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('networkSettings.failedSaveDhcp'));
        } finally {
            setIsTogglingDhcp(false);
        }
    };

    const handleSaveDHCPSettings = async () => {
        if (!networkSettingsService || isSavingDhcp) return;
        setIsSavingDhcp(true);
        try {
            await networkSettingsService.setDHCPSettings(dhcpSettings);
            ThemedAlertHelper.alert(t('common.success'), t('networkSettings.dhcpSaved'));
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('networkSettings.failedSaveDhcp'));
        } finally {
            setIsSavingDhcp(false);
        }
    };

    const getLeaseTimeLabel = (seconds: number): string => {
        if (seconds <= 3600) return t('networkSettings.leaseTime1Hour');
        if (seconds <= 43200) return t('networkSettings.leaseTime12Hours');
        if (seconds <= 86400) return t('networkSettings.leaseTime1Day');
        return t('networkSettings.leaseTime1Week');
    };

    // APN Logic
    const openAddApnModal = () => {
        setEditingApn(null);
        setApnName('');
        setApnApn('');
        setApnUsername('');
        setApnPassword('');
        setApnAuthType('none');
        setApnIpType('ipv4');
        setApnIsDefault(false);
        setShowApnModal(true);
    };

    const openEditApnModal = (profile: any) => {
        setEditingApn(profile.id);
        setApnName(profile.name);
        setApnApn(profile.apn);
        setApnUsername(profile.username);
        setApnPassword(profile.password);
        setApnAuthType(profile.authType);
        setApnIpType(profile.ipType);
        setApnIsDefault(profile.isDefault);
        setShowApnModal(true);
    };

    const handleSaveApnProfile = async () => {
        if (!networkSettingsService || isSavingApn) return;
        if (!apnName.trim() || !apnApn.trim()) {
            ThemedAlertHelper.alert(t('common.error'), t('networkSettings.apnRequired'));
            return;
        }

        setIsSavingApn(true);
        try {
            const profileData = {
                name: apnName.trim(),
                apn: apnApn.trim(),
                username: apnUsername,
                password: apnPassword,
                authType: apnAuthType,
                ipType: apnIpType,
                isDefault: apnIsDefault,
            };

            if (editingApn) {
                await networkSettingsService.updateAPNProfile({ id: editingApn, ...profileData });
            } else {
                await networkSettingsService.createAPNProfile(profileData);
            }
            setShowApnModal(false);
            ThemedAlertHelper.alert(t('common.success'), t('networkSettings.apnSaved'));
            setTimeout(() => loadApn(networkSettingsService), 2000);
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
        } finally {
            setIsSavingApn(false);
        }
    };

    const handleDeleteApnProfile = (profileId: string) => {
        ThemedAlertHelper.alert(
            t('networkSettings.deleteProfile'),
            t('networkSettings.deleteProfileConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        await networkSettingsService?.deleteAPNProfile(profileId);
                        if (networkSettingsService) loadApn(networkSettingsService);
                    },
                },
            ]
        );
    };

    const handleSetDefaultApn = async (profileId: string) => {
        try {
            await networkSettingsService?.setActiveAPNProfile(profileId);
            if (networkSettingsService) loadApn(networkSettingsService);
        } catch (e) {
            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
        }
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={{ paddingBottom: 40 }}
        >
            {/* Ethernet Section */}
            <SettingsSection title={t('networkSettings.ethernet')}>
                <SettingsItem
                    title={t('networkSettings.connectionMode')}
                    value={(() => { const mode = ETHERNET_MODES.find(m => m.value === ethernetMode); return mode ? t(mode.labelKey) : t('networkSettings.modeAuto'); })()}
                    onPress={() => setShowEthernetDropdown(!showEthernetDropdown)}
                    showChevron={false}
                    rightElement={
                        isChangingEthernet ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name={showEthernetDropdown ? "expand-less" : "expand-more"} size={24} color={colors.primary} />
                    }
                    isLast={!showEthernetDropdown && !ethernetStatus.connected}
                />

                {showEthernetDropdown && (
                    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                        {ETHERNET_MODES.map((mode, index) => (
                            <TouchableOpacity
                                key={mode.value}
                                style={[styles.dropdownItem, {
                                    backgroundColor: ethernetMode === mode.value ? colors.primary + '10' : 'transparent',
                                    borderBottomWidth: (index === ETHERNET_MODES.length - 1) && !ethernetStatus.connected ? 0 : StyleSheet.hairlineWidth
                                }]}
                                onPress={() => handleEthernetModeChange(mode.value as any)}
                            >
                                <Text style={{ color: ethernetMode === mode.value ? colors.primary : colors.text }}>{t(mode.labelKey)}</Text>
                                {ethernetMode === mode.value && <MaterialIcons name="check" size={18} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {ethernetStatus.connected && (
                    <View style={{ padding: 16, borderTopWidth: showEthernetDropdown ? StyleSheet.hairlineWidth : 1, borderTopColor: colors.border }}>
                        <InfoRow label={t('networkSettings.ipAddress')} value={ethernetStatus.ipAddress} />
                        <InfoRow label={t('networkSettings.gateway')} value={ethernetStatus.gateway} />
                    </View>
                )}
            </SettingsSection>

            {/* DHCP Section */}
            <SettingsSection title={t('networkSettings.dhcpSettings')}>
                <SettingsItem
                    title={t('networkSettings.dhcpServer')}
                    rightElement={
                        isTogglingDhcp ? <ActivityIndicator size="small" /> : (
                            <Switch value={dhcpSettings.dhcpStatus} onValueChange={handleDHCPToggle} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="white" />
                        )
                    }
                    showChevron={false}
                    isLast={!dhcpSettings.dhcpStatus}
                />

                {dhcpSettings.dhcpStatus && (
                    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
                        <View style={styles.inputRow}>
                            <Text style={[typography.body, { color: colors.text, marginBottom: 8 }]}>{t('networkSettings.dhcpIpRange')}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: colors.textSecondary }}>{dhcpSettings.dhcpIPAddress.split('.').slice(0, 3).join('.')}.</Text>
                                <TextInput
                                    style={[styles.smallInput, { color: colors.text, borderColor: colors.border }]}
                                    value={dhcpSettings.dhcpStartIPAddress.split('.').pop()}
                                    onChangeText={t => {
                                        const base = dhcpSettings.dhcpIPAddress.split('.').slice(0, 3).join('.');
                                        setDhcpSettings(p => ({ ...p, dhcpStartIPAddress: `${base}.${t}` }))
                                    }}
                                    keyboardType="numeric"
                                />
                                <Text style={{ marginHorizontal: 8, color: colors.text }}>-</Text>
                                <TextInput
                                    style={[styles.smallInput, { color: colors.text, borderColor: colors.border }]}
                                    value={dhcpSettings.dhcpEndIPAddress.split('.').pop()}
                                    onChangeText={t => {
                                        const base = dhcpSettings.dhcpIPAddress.split('.').slice(0, 3).join('.');
                                        setDhcpSettings(p => ({ ...p, dhcpEndIPAddress: `${base}.${t}` }))
                                    }}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <SettingsItem
                            title={t('networkSettings.dhcpLeaseTime')}
                            value={getLeaseTimeLabel(dhcpSettings.dhcpLeaseTime)}
                            onPress={() => setShowLeaseTimeDropdown(!showLeaseTimeDropdown)}
                            showChevron={false}
                            rightElement={<MaterialIcons name={showLeaseTimeDropdown ? "expand-less" : "expand-more"} size={24} color={colors.primary} />}
                        />

                        {showLeaseTimeDropdown && (
                            <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
                                {[3600, 43200, 86400, 604800].map(val => (
                                    <TouchableOpacity key={val} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => {
                                        setDhcpSettings(p => ({ ...p, dhcpLeaseTime: val }));
                                        setShowLeaseTimeDropdown(false);
                                    }}>
                                        <Text style={{ color: colors.text }}>{getLeaseTimeLabel(val)}</Text>
                                        {dhcpSettings.dhcpLeaseTime === val && <MaterialIcons name="check" size={18} color={colors.primary} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <View style={{ padding: 16 }}>
                            <Button
                                title={t('common.save')}
                                onPress={handleSaveDHCPSettings}
                                loading={isSavingDhcp}
                            />
                        </View>
                    </View>
                )}
            </SettingsSection>

            <SettingsSection title={t('networkSettings.apnProfiles')}>

                {apnProfiles.map((profile, index) => (
                    <SettingsItem
                        key={profile.id}
                        title={profile.name}
                        subtitle={profile.apn}
                        onPress={() => openEditApnModal(profile)}
                        showChevron={true}
                        rightElement={
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {profile.isDefault && (
                                    <View style={{ backgroundColor: colors.primary, paddingHorizontal: 6, borderRadius: 4, marginRight: 8 }}>
                                        <Text style={{ color: '#fff', fontSize: 10 }}>DEFAULT</Text>
                                    </View>
                                )}
                                {!profile.isDefault && (
                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setShowApnModal(false); handleSetDefaultApn(profile.id); }} style={{ padding: 4 }}>
                                        <MaterialIcons name="star-outline" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setShowApnModal(false); handleDeleteApnProfile(profile.id); }} style={{ padding: 4 }}>
                                    <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        }
                    />
                ))}
                <SettingsItem
                    title={t('networkSettings.addApn')}
                    onPress={openAddApnModal}
                    icon="add"
                    color={colors.primary}
                    isLast
                />
            </SettingsSection>

            {/* APN Modal */}
            <Modal
                visible={showApnModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowApnModal(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowApnModal(false)}>
                            <Text style={{ color: colors.primary, fontSize: 17 }}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <Text style={[typography.headline, { color: colors.text }]}>{editingApn ? t('networkSettings.editApn') : t('networkSettings.addApn')}</Text>
                        <TouchableOpacity onPress={handleSaveApnProfile} disabled={isSavingApn}>
                            {isSavingApn ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>{t('common.save')}</Text>}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 16 }}>
                        <View style={[styles.formGroup, { backgroundColor: colors.card, borderRadius: 10, padding: 16 }]}>
                            <TextInput
                                placeholder={t('networkSettings.profileName')}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                                value={apnName}
                                onChangeText={setApnName}
                            />
                            <TextInput
                                placeholder="APN"
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                                value={apnApn}
                                onChangeText={setApnApn}
                            />
                            <TextInput
                                placeholder={t('settings.usernameLabel')}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                                value={apnUsername}
                                onChangeText={setApnUsername}
                            />
                            <TextInput
                                placeholder={t('settings.passwordLabel')}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { color: colors.text, borderBottomColor: 'transparent' }]}
                                secureTextEntry
                                value={apnPassword}
                                onChangeText={setApnPassword}
                            />
                        </View>
                    </ScrollView>
                </View>
            </Modal>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionWrapper: {
        marginBottom: 24,
        marginHorizontal: 16,
    },
    sectionContent: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    inputRow: { padding: 16 },
    smallInput: {
        borderWidth: 1, borderRadius: 4, width: 44, padding: 4, textAlign: 'center',
    },
    apnRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 16, marginLeft: 16,
    },
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc'
    },
    formGroup: { marginBottom: 24 },
    input: {
        paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, fontSize: 16
    }
});
