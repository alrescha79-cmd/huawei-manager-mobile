import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkSettingsService } from '@/services/network.settings.service';
import { useTranslation } from '@/i18n';
import { ThemedAlertHelper, Button, SelectionModal, MeshGradientBackground, ThemedSwitch, BouncingDots, AnimatedScreen, AdNative } from '@/components';
import { InfoRow, SettingsSection, SettingsItem, PageHeader, ApnModal } from '@/components/settings';
import { showInterstitial } from '@/services/ad.service';

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
    const insets = useSafeAreaInsets();

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
    const [editingApn, setEditingApn] = useState<any | null>(null);
    const [isSavingApn, setIsSavingApn] = useState(false);

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

        const changed = mode !== ethernetMode;

        setIsChangingEthernet(true);
        try {
            await networkSettingsService.setEthernetConnectionMode(mode);
            setEthernetMode(mode);
            const settings = await networkSettingsService.getEthernetSettings();
            setEthernetStatus(settings.status);
            ThemedAlertHelper.alert(t('common.success'), t('networkSettings.profileSaved'));
            if (changed) {
                showInterstitial(() => { });
            }
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
            showInterstitial(() => {
                ThemedAlertHelper.alert(t('common.success'), t('networkSettings.dhcpSaved'));
            });
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
        setShowApnModal(true);
    };

    const openEditApnModal = (profile: any) => {
        setEditingApn(profile);
        setShowApnModal(true);
    };

    const handleSaveApnProfile = async (profileData: any) => {
        if (!networkSettingsService || isSavingApn) return;
        setIsSavingApn(true);
        try {
            const data = {
                ...profileData,
                readOnly: false,
            };

            if (editingApn) {
                await networkSettingsService.updateAPNProfile({ id: editingApn.id, ...data });
            } else {
                await networkSettingsService.createAPNProfile(data);
            }
            setShowApnModal(false);
            showInterstitial(() => {
                ThemedAlertHelper.alert(t('common.success'), t('networkSettings.apnSaved'));
            });
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
                    contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
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

                    <View style={{ paddingHorizontal: 16}}>
                        <AdNative />
                    </View>

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
                    <ApnModal
                        visible={showApnModal}
                        onClose={() => { setShowApnModal(false); setEditingApn(null); }}
                        onSave={handleSaveApnProfile}
                        profile={editingApn}
                        activeApnProfileId={activeApnProfileId}
                        isSaving={isSavingApn}
                    />
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
});
