import { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import { useAuthStore } from '@/stores/auth.store';
import { useModemProfileStore } from '@/stores/modem-profile.store';
import { getModemProfilePassword } from '@/utils/storage';
import { networkService } from '@/services/network.service';
import { ModemAPIClient } from '@/services/api.service';
import { ThemedAlertHelper } from '@/components';
import { ModemProfile } from '@/types';

interface UseLoginProps {
    t: (key: string, options?: any) => string;
}

export function useLogin({ t }: UseLoginProps) {
    const router = useRouter();
    const { login, isLoading, error, setError, credentials, loadCredentials } = useAuthStore();
    const { profiles, loadProfiles, addProfile, ensureProfile } = useModemProfileStore();

    const [modemIp, setModemIp] = useState('192.168.8.1');
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    const [isDetecting, setIsDetecting] = useState(false);
    const [showWebViewLogin, setShowWebViewLogin] = useState(false);
    const [isDirectLogging, setIsDirectLogging] = useState(false);
    const [showWebViewOption, setShowWebViewOption] = useState(false);
    const [isAutoLoginReady, setIsAutoLoginReady] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [showAddProfile, setShowAddProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    useEffect(() => {
        const initCredentials = async () => {
            await loadCredentials();
            await loadProfiles();
            setIsAutoLoginReady(true);
        };
        initCredentials();
    }, []);

    useEffect(() => {
        if (isAutoLoginReady && credentials) {
            const active = profiles.find((p) => p.isActive);
            if (active) {
                setSelectedProfileId(active.id);
            }
            setModemIp(credentials.modemIp || '192.168.8.1');
            setUsername(credentials.username || 'admin');
            setPassword(credentials.password || '');
        }
    }, [isAutoLoginReady, credentials, profiles]);

    const selectProfile = async (profile: ModemProfile) => {
        setSelectedProfileId(profile.id);
        setModemIp(profile.modemIp);
        setUsername(profile.username);
        const pwd = await getModemProfilePassword(profile.id);
        setPassword(pwd);
        setError(null);
        setShowWebViewOption(false);
    };

    const handleSaveProfile = async () => {
        if (!newProfileName.trim()) {
            ThemedAlertHelper.alert(t('common.error'), t('settings.profileName') + ' ' + t('common.error').toLowerCase());
            return;
        }
        if (profiles.length >= 5) {
            ThemedAlertHelper.alert(t('common.error'), t('settings.profileLimitReached'));
            return;
        }
        setIsSavingProfile(true);
        const result = await addProfile({
            name: newProfileName.trim(),
            modemIp,
            username,
            password,
        });
        setIsSavingProfile(false);
        if (result) {
            setNewProfileName('');
            setShowAddProfile(false);
            setSelectedProfileId(result.id);
        }
    };

    const detectModemIP = async () => {
        setIsDetecting(true);
        try {
            const isWiFi = await networkService.isConnectedToWiFi();

            if (!isWiFi) {
                ThemedAlertHelper.alert(
                    t('login.wifiRequired'),
                    t('login.wifiRequiredMessage')
                );
                setIsDetecting(false);
                return;
            }

            const detectedIP = await networkService.detectGatewayIP();
            setModemIp(detectedIP);
        } catch (err) {
            console.error('Error detecting modem IP:', err);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleLoginPress = async () => {
        setError(null);
        setShowWebViewOption(false);

        if (!modemIp) {
            ThemedAlertHelper.alert(t('common.error'), t('login.enterModemIp'));
            return;
        }

        setIsDirectLogging(true);

        const apiClient = new ModemAPIClient(modemIp);
        let success = false;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[Login Page] Attempt ${attempt}/3...`);
                success = await apiClient.login(username, password);

                if (success) {
                    console.log('[Login Page] Direct login successful!');
                    await login({
                        modemIp,
                        username,
                        password,
                    });
                    await ensureProfile({ modemIp, username, password });
                    setIsDirectLogging(false);
                    router.replace('/(tabs)/home');
                    return;
                }
            } catch (err: any) {
                console.log(`[Login Page] Attempt ${attempt} failed:`, err.message);
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        setIsDirectLogging(false);

        setShowWebViewOption(true);
        ThemedAlertHelper.alert(
            t('login.directLoginFailed'),
            t('login.directLoginFailedMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('login.openWebLogin'), onPress: () => setShowWebViewLogin(true) }
            ]
        );
    };

    const handleWebViewLoginSuccess = async () => {
        setShowWebViewLogin(false);

        try {
            await login({
                modemIp,
                username,
                password,
            });
            await ensureProfile({ modemIp, username, password });

            ThemedAlertHelper.alert(t('common.success'), t('login.loginSuccess'), [
                {
                    text: t('common.ok'),
                    onPress: () => router.replace('/(tabs)/home'),
                },
            ]);
        } catch (err) {
            console.error('[Login] Error saving credentials:', err);
            const errorMessage = err instanceof Error ? err.message : t('login.loginFailed');
            ThemedAlertHelper.alert(t('common.error'), errorMessage);
            setError(errorMessage);
        }
    };

    const handleReportIssue = async () => {
        const deviceString = `${Device.manufacturer || ''} ${Device.modelName || 'Unknown Device'}`.trim();
        const osString = `${Device.osName || 'Unknown OS'} ${Device.osVersion || ''}`;
        const appVersion = Constants.expoConfig?.version || '1.0.0';
        const dateString = new Date().toLocaleDateString();

        const reportTemplate = `=== BUG REPORT / FEATURE REQUEST ===

📱 Device: ${deviceString}
📲 OS: ${osString}
📦 App Version: ${appVersion}
🔧 Modem IP: ${modemIp || 'Not set'}
📅 Date: ${dateString}

---

📝 Description (please fill in):
[Describe the issue you're experiencing. Include any error messages you see.]

🔄 Steps to Reproduce:
1. Open App
2. Enter credentials
3. [What happens next?]

---
`;

        const emailSubject = `[Huawei Manager] Login Issue - ${deviceString}`;
        const githubTitle = encodeURIComponent(`Login Issue - ${deviceString}`);
        const githubBody = encodeURIComponent(reportTemplate);
        const githubUrl = `https://github.com/alrescha79-cmd/huawei-manager-mobile/issues/new?title=${githubTitle}&body=${githubBody}`;

        ThemedAlertHelper.alert(
            t('login.reportIssue'),
            t('login.reportIssueMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: 'GitHub Issue',
                    onPress: () => {
                        Linking.openURL(githubUrl).catch(() => {
                            ThemedAlertHelper.alert(t('common.error'), 'Could not open GitHub');
                        });
                    }
                },
                {
                    text: 'Email',
                    onPress: async () => {
                        const isAvailable = await MailComposer.isAvailableAsync();
                        if (isAvailable) {
                            await MailComposer.composeAsync({
                                recipients: ['anggun@cakson.my.id'],
                                subject: emailSubject,
                                body: reportTemplate,
                            });
                        } else {
                            const mailtoUrl = `mailto:anggun@cakson.my.id?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(reportTemplate)}`;
                            Linking.openURL(mailtoUrl).catch(() => {
                                ThemedAlertHelper.alert(t('common.error'), 'Could not open email client');
                            });
                        }
                    }
                }
            ]
        );
    };

    return {
        // Form state
        modemIp,
        setModemIp,
        username,
        setUsername,
        password,
        setPassword,
        error,
        isLoading,
        isDetecting,
        isDirectLogging,
        showWebViewLogin,
        setShowWebViewLogin,
        showWebViewOption,
        setShowWebViewOption,

        // Profile state
        profiles,
        selectedProfileId,
        showAddProfile,
        setShowAddProfile,
        newProfileName,
        setNewProfileName,
        isSavingProfile,

        // Handlers
        selectProfile,
        handleSaveProfile,
        detectModemIP,
        handleLoginPress,
        handleWebViewLoginSuccess,
        handleReportIssue,
    };
}
