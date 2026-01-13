import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Modal,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
    Keyboard,
    Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { NetworkSettingsService } from '@/services/network.settings.service';
import { useTranslation } from '@/i18n';
import { ThemedAlertHelper, Button, InfoRow, SettingsSection, SettingsItem, SelectionModal, MeshGradientBackground, PageHeader, ThemedSwitch, BouncingDots, AnimatedScreen } from '@/components';

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
    const [showEthernetModal, setShowEthernetModal] = useState(false);

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

    const [initialApnValues, setInitialApnValues] = useState<{
        name: string;
        apn: string;
        username: string;
        password: string;
        authType: string;
        ipType: string;
        isDefault: boolean;
    } | null>(null);

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
        setInitialApnValues({
            name: '',
            apn: '',
            username: '',
            password: '',
            authType: 'none',
            ipType: 'ipv4',
            isDefault: false,
        });
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
        setInitialApnValues({
            name: profile.name,
            apn: profile.apn,
            username: profile.username,
            password: profile.password,
            authType: profile.authType,
            ipType: profile.ipType,
            isDefault: profile.isDefault,
        });
        setShowApnModal(true);
    };

    // Check if APN has changes
    const hasApnChanges = () => {
        if (!initialApnValues) return false;
        return (
            apnName !== initialApnValues.name ||
            apnApn !== initialApnValues.apn ||
            apnUsername !== initialApnValues.username ||
            apnPassword !== initialApnValues.password ||
            apnAuthType !== initialApnValues.authType ||
            apnIpType !== initialApnValues.ipType ||
            apnIsDefault !== initialApnValues.isDefault
        );
    };

    // Handle APN modal close with confirmation
    const handleCloseApnModal = () => {
        if (hasApnChanges()) {
            ThemedAlertHelper.alert(
                t('common.unsavedChanges'),
                t('common.discardChangesMessage'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.discard'), style: 'destructive', onPress: () => setShowApnModal(false) }
                ]
            );
        } else {
            setShowApnModal(false);
        }
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
                readOnly: false,
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
        const profile = apnProfiles.find(p => p.id === profileId);
        const profileName = profile?.name || profileId;

        ThemedAlertHelper.alert(
            t('networkSettings.deleteProfile'),
            t('networkSettings.deleteProfileConfirm', { name: profileName }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await networkSettingsService?.deleteAPNProfile(profileId);
                            ThemedAlertHelper.alert(t('common.success'), t('networkSettings.apnDeleted'));
                            if (networkSettingsService) loadApn(networkSettingsService);
                        } catch (error) {
                            ThemedAlertHelper.alert(t('common.error'), t('networkSettings.deleteApnFailed'));
                        }
                    },
                },
            ]
        );
    };

    const handleSetDefaultApn = async (profileId: string) => {
        const profile = apnProfiles.find(p => p.id === profileId);
        const profileName = profile?.name || profileId;

        ThemedAlertHelper.alert(
            t('networkSettings.switchProfile'),
            t('networkSettings.switchProfileConfirm', { name: profileName }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'),
                    onPress: async () => {
                        try {
                            await networkSettingsService?.setActiveAPNProfile(profileId);
                            if (networkSettingsService) loadApn(networkSettingsService);
                            ThemedAlertHelper.alert(t('common.success'), t('networkSettings.profileSwitched'));
                        } catch (e) {
                            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
                        }
                    },
                },
            ]
        );
    };

    return (
        <AnimatedScreen noAnimation>
            <MeshGradientBackground>
                <PageHeader title={t('settings.lanSettings')} showBackButton />
                <ScrollView
                    style={[styles.container, { backgroundColor: 'transparent' }]}
                    contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
                >
                    {/* Ethernet Section */}
                    <SettingsSection title={t('networkSettings.ethernet')}>
                        <SettingsItem
                            title={t('networkSettings.connectionMode')}
                            value={(() => { const mode = ETHERNET_MODES.find(m => m.value === ethernetMode); return mode ? t(mode.labelKey) : t('networkSettings.modeAuto'); })()}
                            onPress={() => setShowEthernetModal(true)}
                            rightElement={
                                isChangingEthernet ? <BouncingDots size="small" color={colors.primary} /> : undefined
                            }
                            isLast={!ethernetStatus.connected}
                        />

                        {ethernetStatus.connected && (
                            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                                <InfoRow label={t('networkSettings.ipAddress')} value={ethernetStatus.ipAddress} />
                                <InfoRow label={t('networkSettings.gateway')} value={ethernetStatus.gateway} />
                            </View>
                        )}
                    </SettingsSection>

                    <SelectionModal
                        visible={showEthernetModal}
                        title={t('networkSettings.connectionMode')}
                        options={ETHERNET_MODES.map(mode => ({
                            label: t(mode.labelKey),
                            value: mode.value
                        }))}
                        selectedValue={ethernetMode}
                        onSelect={(val) => {
                            setShowEthernetModal(false);
                            handleEthernetModeChange(val);
                        }}
                        onClose={() => setShowEthernetModal(false)}
                    />

                    {/* DHCP Section */}
                    <SettingsSection title={t('networkSettings.dhcpSettings')}>
                        <SettingsItem
                            title={t('networkSettings.dhcpServer')}
                            rightElement={
                                isTogglingDhcp ? <BouncingDots size="small" color={colors.primary} /> : (
                                    <ThemedSwitch value={dhcpSettings.dhcpStatus} onValueChange={handleDHCPToggle} />
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
                                        {profile.id === activeApnProfileId ? (
                                            <MaterialIcons name="check-circle" size={22} color={colors.primary} style={{ marginRight: 8 }} />
                                        ) : (
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleSetDefaultApn(profile.id); }} style={{ padding: 4, marginRight: 4 }}>
                                                <MaterialIcons name="radio-button-unchecked" size={22} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        )}
                                        {profile.readOnly ? (
                                            <View style={{ padding: 4, opacity: 0.5 }}>
                                                <MaterialIcons name="lock" size={18} color={colors.textSecondary} />
                                            </View>
                                        ) : profile.id === activeApnProfileId ? (
                                            <View style={{ padding: 4, opacity: 0.3 }}>
                                                <MaterialIcons name="delete-outline" size={20} color={colors.textSecondary} />
                                            </View>
                                        ) : (
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteApnProfile(profile.id); }} style={{ padding: 4 }}>
                                                <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                                            </TouchableOpacity>
                                        )}
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
                        onRequestClose={handleCloseApnModal}
                    >
                        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16 }]}>
                            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                                <Text style={[typography.headline, { color: colors.text, fontSize: 18, fontWeight: 'bold' }]}>
                                    {editingApn ? t('networkSettings.editApn') : t('networkSettings.addApn')}
                                </Text>
                                <TouchableOpacity onPress={handleCloseApnModal}>
                                    <MaterialIcons name="close" size={28} color={colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                style={{ flex: 1 }}
                            >
                                <ScrollView
                                    style={{ flex: 1, padding: 20 }}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {/* Profile Name */}
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>{t('networkSettings.profileName')}</Text>
                                        <TextInput
                                            placeholder={t('networkSettings.profileName')}
                                            placeholderTextColor={colors.textSecondary}
                                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                            value={apnName}
                                            onChangeText={setApnName}
                                        />
                                    </View>

                                    {/* APN */}
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>APN</Text>
                                        <TextInput
                                            placeholder="APN"
                                            placeholderTextColor={colors.textSecondary}
                                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                            value={apnApn}
                                            onChangeText={setApnApn}
                                        />
                                    </View>

                                    {/* Username */}
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>{t('settings.usernameLabel')}</Text>
                                        <TextInput
                                            placeholder={t('settings.usernameLabel')}
                                            placeholderTextColor={colors.textSecondary}
                                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                            value={apnUsername}
                                            onChangeText={setApnUsername}
                                        />
                                    </View>

                                    {/* Password */}
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>{t('settings.passwordLabel')}</Text>
                                        <TextInput
                                            placeholder={t('settings.passwordLabel')}
                                            placeholderTextColor={colors.textSecondary}
                                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                            secureTextEntry
                                            value={apnPassword}
                                            onChangeText={setApnPassword}
                                        />
                                    </View>

                                    {/* Set as Default Toggle */}
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 16,
                                        backgroundColor: colors.card,
                                        padding: 12,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: colors.border
                                    }}>
                                        <View style={{ flex: 1, marginRight: 12 }}>
                                            <Text style={[typography.body, { color: colors.text, fontWeight: 'bold' }]}>{t('networkSettings.setAsDefault')}</Text>
                                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('networkSettings.setAsDefaultHint')}</Text>
                                        </View>
                                        <ThemedSwitch
                                            value={apnIsDefault}
                                            onValueChange={setApnIsDefault}
                                            disabled={editingApn === activeApnProfileId}
                                        />
                                    </View>
                                </ScrollView>

                                <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.saveButton,
                                            { backgroundColor: hasApnChanges() ? colors.primary : colors.textSecondary },
                                            pressed && { opacity: 0.8 }
                                        ]}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            if (hasApnChanges()) {
                                                handleSaveApnProfile();
                                            } else {
                                                setShowApnModal(false);
                                            }
                                        }}
                                        disabled={isSavingApn}
                                    >
                                        {isSavingApn ? (
                                            <BouncingDots size="small" color="#FFF" />
                                        ) : (
                                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                                                {hasApnChanges() ? t('common.save') : t('common.cancel')}
                                            </Text>
                                        )}
                                    </Pressable>
                                </View>
                            </KeyboardAvoidingView>
                        </View>
                    </Modal>

                </ScrollView>
            </MeshGradientBackground>
        </AnimatedScreen>
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
        paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1
    },
    formGroup: { marginBottom: 24 },
    input: {
        height: 50, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, fontSize: 16
    },
    footer: {
        padding: 20, paddingBottom: 40, borderTopWidth: 1
    },
    saveButton: {
        height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center'
    }
});
