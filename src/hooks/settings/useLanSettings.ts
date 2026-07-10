import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { NetworkSettingsService } from '@/services/network.settings.service';
import { ThemedAlertHelper } from '@/components';
import { showInterstitial } from '@/services/ad.service';

type EthernetMode = 'auto' | 'lan_only' | 'pppoe' | 'dynamic_ip' | 'pppoe_dynamic';

interface UseLanSettingsProps {
    t: (key: string, options?: any) => string;
}

export function useLanSettings({ t }: UseLanSettingsProps) {
    const { credentials } = useAuthStore();
    const [networkSettingsService, setNetworkSettingsService] = useState<NetworkSettingsService | null>(null);

    // Ethernet
    const [ethernetMode, setEthernetMode] = useState<EthernetMode>('auto');
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

    // Ethernet handlers
    const handleEthernetModeChange = async (mode: EthernetMode) => {
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

    // DHCP handlers
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

    // APN handlers
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

    return {
        // Ethernet
        ethernetMode,
        ethernetStatus,
        isChangingEthernet,
        showEthernetModal,
        setShowEthernetModal,
        handleEthernetModeChange,

        // DHCP
        dhcpSettings,
        setDhcpSettings,
        isTogglingDhcp,
        isSavingDhcp,
        showLeaseTimeDropdown,
        setShowLeaseTimeDropdown,
        handleDHCPToggle,
        handleSaveDHCPSettings,
        getLeaseTimeLabel,

        // APN
        apnProfiles,
        activeApnProfileId,
        showApnModal,
        setShowApnModal,
        editingApn,
        setEditingApn,
        isSavingApn,
        openAddApnModal,
        openEditApnModal,
        handleSaveApnProfile,
        handleDeleteApnProfile,
        handleSetDefaultApn,
    };
}
