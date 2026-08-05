import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useModemProfileStore } from '@/stores/modem-profile.store';
import { ModemService } from '@/services/modem.service';
import { ThemedAlertHelper, ToastHelper } from '@/components';
import { showInterstitial } from '@/services/ad.service';
import { getModemProfilePassword } from '@/utils/storage';

interface UseSystemSettingsProps {
    t: (key: string, options?: any) => string;
}

const formatModemTime = (time: string) => {
    if (!time) return '...';
    try {
        if (time.includes('T')) {
            const dateObj = new Date(time);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const hours = String(dateObj.getHours()).padStart(2, '0');
                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }
            const parts = time.split('T');
            const datePart = parts[0];
            const timePart = parts[1]?.split('.')[0].replace('Z', '');
            return `${datePart} ${timePart}`;
        }

        let cleaned = time.replace(',', '');
        const parts = cleaned.split(' ');
        if (parts.length < 2) return time.replace(/\//g, '-');

        let datePart = parts[0];
        let timePart = parts[1];

        timePart = timePart.replace(/\./g, ':');

        if (datePart.includes('/')) {
            const dateSegments = datePart.split('/');
            if (dateSegments[2].length === 4) {
                datePart = `${dateSegments[2]}-${dateSegments[1]}-${dateSegments[0]}`;
            } else {
                datePart = datePart.replace(/\//g, '-');
            }
        }

        return `${datePart} ${timePart}`;

    } catch {
        return time;
    }
};

export function useSystemSettings({ t }: UseSystemSettingsProps) {
    const router = useRouter();
    const { credentials, logout } = useAuthStore();
    const { profiles, loadProfiles, addProfile, deleteProfile, updateProfile, switchProfile, isSwitching } = useModemProfileStore();

    // Profile edit state
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [editingProfile, setEditingProfile] = useState<{ id: string; name: string; modemIp: string; username: string; password: string } | null>(null);

    useEffect(() => { loadProfiles(); }, []);

    const [modemService, setModemService] = useState<ModemService | null>(null);

    // Time settings
    const [currentTime, setCurrentTime] = useState('');
    const [sntpEnabled, setSntpEnabled] = useState(true);
    const [, setNtpServer] = useState('pool.ntp.org');
    const [timezone, setTimezone] = useState('UTC+7');
    const [showTimezoneModal, setShowTimezoneModal] = useState(false);
    const [isTogglingSntp, setIsTogglingSntp] = useState(false);

    useEffect(() => {
        if (credentials?.modemIp) {
            const service = new ModemService(credentials.modemIp);
            setModemService(service);
            loadTime(service);

            // ponytail: tick the clock client-side instead of a full HTTP poll
            // every second; resync from the modem every 60s
            const tick = () => setCurrentTime(prev => {
                if (!prev) return prev;
                const date = new Date(prev);
                if (isNaN(date.getTime())) return prev;
                date.setSeconds(date.getSeconds() + 1);
                return date.toISOString();
            });
            const tickerId = setInterval(tick, 1000);
            const syncId = setInterval(() => {
                service.getCurrentTime().then(time => setCurrentTime(time)).catch(() => { });
            }, 60000);
            return () => {
                clearInterval(tickerId);
                clearInterval(syncId);
            };
        }
    }, [credentials]);

    const loadTime = async (service: ModemService) => {
        try {
            const settings = await service.getTimeSettings();
            setCurrentTime(settings.currentTime);
            setSntpEnabled(settings.sntpEnabled);
            setNtpServer(settings.ntpServer);
            setTimezone(settings.timezone);
        } catch { }
    };

    const handleToggleSntp = async (enabled: boolean) => {
        if (!modemService || isTogglingSntp) return;
        setIsTogglingSntp(true);
        try {
            await modemService.setTimeSettings({ sntpEnabled: enabled });
            setSntpEnabled(enabled);
            showInterstitial(() => {});
        } catch {
            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
        } finally {
            setIsTogglingSntp(false);
        }
    };

    const handleTimezoneChange = async (tz: string) => {
        if (!modemService) return;
        setShowTimezoneModal(false);
        try {
            await modemService.setTimeSettings({ timezone: tz });
            setTimezone(tz);
            showInterstitial(() => {});
        } catch {
            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
        }
    };

    const handleReboot = async () => {
        ThemedAlertHelper.alert(
            t('settings.rebootModem'),
            t('settings.rebootConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.rebootModem'),
                    style: 'destructive',
                    onPress: async () => {
                        if (modemService) {
                            try {
                                await modemService.reboot();
                                showInterstitial(() => {});
                                ToastHelper.success(t('settings.rebootSuccess'));
                            } catch {
                                ToastHelper.error(t('alerts.failedReboot'));
                            }
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        ThemedAlertHelper.alert(
            t('settings.logout'),
            t('settings.logoutConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (modemService) await modemService.logout();
                        } catch { }
                        await logout();
                        router.replace('/login');
                    }
                }
            ]
        );
    };

    const handleReset = async () => {
        ThemedAlertHelper.alert(
            t('settings.resetFactory'),
            t('settings.resetConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.resetFactory'),
                    style: 'destructive',
                    onPress: async () => {
                        if (modemService) {
                            try {
                                await modemService.resetFactorySettings();
                                showInterstitial(() => {});
                                ToastHelper.success(t('settings.resetSuccess'));
                            } catch {
                                ToastHelper.error(t('alerts.failedReset'));
                            }
                        }
                    }
                }
            ]
        );
    };

    const handleOpenAddProfile = () => {
        setEditingProfile(null);
        setShowEditProfile(true);
    };

    const handleOpenEditProfile = async (profile: any) => {
        const pwd = await getModemProfilePassword(profile.id);
        setEditingProfile({
            id: profile.id,
            name: profile.name,
            modemIp: profile.modemIp,
            username: profile.username,
            password: pwd,
        });
        setShowEditProfile(true);
    };

    const handleSwitchProfile = (profile: any) => {
        ThemedAlertHelper.alert(
            t('settings.switchProfile'),
            t('settings.switchProfileConfirm').replace('{{name}}', profile.name),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.switchProfile'),
                    onPress: async () => {
                        const success = await switchProfile(profile.id);
                        if (success) {
                            ToastHelper.success(t('settings.switchSuccess').replace('{{name}}', profile.name));
                        } else {
                            const err = useModemProfileStore.getState().switchError;
                            const details = err ? `\n\nError: ${err}` : '';
                            ToastHelper.error(t('settings.switchFailed') + details);
                        }
                    }
                },
            ]
        );
    };

    const handleDeleteProfile = (profile: any) => {
        ThemedAlertHelper.alert(
            t('settings.deleteProfile'),
            t('settings.deleteProfileConfirm').replace('{{name}}', profile.name),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => deleteProfile(profile.id),
                },
            ]
        );
    };

    return {
        // Time
        currentTime,
        formattedTime: formatModemTime(currentTime),
        sntpEnabled,
        timezone,
        showTimezoneModal,
        setShowTimezoneModal,
        isTogglingSntp,
        handleToggleSntp,
        handleTimezoneChange,

        // Profiles
        profiles,
        showEditProfile,
        setShowEditProfile,
        editingProfile,
        setEditingProfile,
        isSwitching,
        updateProfile,
        addProfile,
        handleOpenAddProfile,
        handleOpenEditProfile,
        handleSwitchProfile,
        handleDeleteProfile,

        // Actions
        handleReboot,
        handleLogout,
        handleReset,
    };
}
