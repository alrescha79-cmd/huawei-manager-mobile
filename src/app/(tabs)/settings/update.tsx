import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    Easing,
    cancelAnimation
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import Constants from 'expo-constants';
import { MeshGradientBackground, PageHeader, AnimatedScreen } from '@/components';

// GitHub repository info
const GITHUB_OWNER = 'alrescha79-cmd';
const GITHUB_REPO = 'huawei-manager-mobile';

interface ReleaseInfo {
    tagName: string;
    version: string;
    downloadUrl: string;
    releaseNotes: string;
    publishedAt: string;
}

/**
 * Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
    const normalize = (v: string) => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    const parts1 = normalize(v1);
    const parts2 = normalize(v2);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

export default function UpdateScreen() {
    const { colors, typography, spacing, isDark } = useTheme();
    const { t } = useTranslation();
    const router = useRouter();

    const [checking, setChecking] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasChecked, setHasChecked] = useState(false);

    // Rotation animation for sync icon
    const rotation = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    // Start rotation animation when checking
    useEffect(() => {
        if (checking) {
            rotation.value = 0;
            rotation.value = withRepeat(
                withTiming(360, { duration: 1000, easing: Easing.linear }),
                -1, // infinite
                false
            );
        } else {
            cancelAnimation(rotation);
            rotation.value = 0;
        }
    }, [checking]);

    // Auto check on mount
    useEffect(() => {
        checkUpdate();
    }, []);

    const checkUpdate = useCallback(async () => {
        setChecking(true);
        setError(null);
        setUpdateAvailable(false);
        setReleaseInfo(null);

        try {
            // Fetch latest release from GitHub API
            const response = await fetch(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const data = await response.json();

            const latestVersion = data.tag_name?.replace(/^v/, '') || '';
            const currentVersion = Constants.expoConfig?.version || '0.0.0';

            // Find APK download URL
            const apkAsset = data.assets?.find((asset: any) =>
                asset.name?.endsWith('.apk') || asset.name?.includes('universal')
            );

            const info: ReleaseInfo = {
                tagName: data.tag_name || '',
                version: latestVersion,
                downloadUrl: apkAsset?.browser_download_url || data.html_url || '',
                releaseNotes: data.body || '',
                publishedAt: data.published_at || '',
            };

            setReleaseInfo(info);

            // Compare versions
            const comparison = compareVersions(latestVersion, currentVersion);
            setUpdateAvailable(comparison > 0);
            setHasChecked(true);

        } catch (err) {
            console.error('Update check failed:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setHasChecked(true);
        } finally {
            setChecking(false);
        }
    }, []);

    const handleDownload = () => {
        if (releaseInfo?.downloadUrl) {
            Linking.openURL(releaseInfo.downloadUrl);
        }
    };

    const getStatusIcon = () => {
        if (checking) return 'sync';
        if (error) return 'error-outline';
        if (updateAvailable) return 'system-update';
        return 'check-circle';
    };

    const getStatusColor = () => {
        if (checking) return colors.primary;
        if (error) return colors.error;
        if (updateAvailable) return colors.primary;
        return colors.success;
    };

    return (
        <AnimatedScreen noAnimation>
            <MeshGradientBackground>
                <PageHeader title={t('settings.checkUpdate')} showBackButton />
                <View style={[styles.container, { backgroundColor: 'transparent' }]}>
                    <Stack.Screen options={{ title: t('settings.checkUpdate') }} />

                    <View style={styles.content}>
                        {/* Icon Container with Animation */}
                        <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
                            {checking ? (
                                <Animated.View style={animatedStyle}>
                                    <MaterialIcons
                                        name="sync"
                                        size={64}
                                        color={colors.primary}
                                    />
                                </Animated.View>
                            ) : (
                                <MaterialIcons
                                    name={getStatusIcon()}
                                    size={64}
                                    color={getStatusColor()}
                                />
                            )}
                        </View>

                        {/* Status Text */}
                        {checking ? (
                            <View style={styles.statusContainer}>
                                <Text style={[typography.headline, { color: colors.text, marginBottom: 8, textAlign: 'center' }]}>
                                    {t('settings.checkingUpdate') || 'Checking for updates...'}
                                </Text>
                                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
                            </View>
                        ) : error ? (
                            <View style={styles.statusContainer}>
                                <Text style={[typography.headline, { color: colors.error, marginBottom: 8, textAlign: 'center' }]}>
                                    {t('settings.updateCheckFailed') || 'Update check failed'}
                                </Text>
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 16, textAlign: 'center' }]}>
                                    {error}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: colors.primary }]}
                                    onPress={checkUpdate}
                                >
                                    <Text style={[typography.body, { color: '#FFF', fontWeight: '600' }]}>
                                        {t('settings.tryAgain') || 'Try Again'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : updateAvailable ? (
                            <View style={styles.statusContainer}>
                                <Text style={[typography.headline, { color: colors.text, marginBottom: 8, textAlign: 'center' }]}>
                                    {t('settings.updateAvailable')}
                                </Text>
                                <Text style={[typography.body, { color: colors.textSecondary, marginBottom: 4, textAlign: 'center' }]}>
                                    {t('settings.appVersion')}: v{Constants.expoConfig?.version}
                                </Text>
                                <Text style={[typography.body, { color: colors.primary, marginBottom: 24, textAlign: 'center' }]}>
                                    {t('settings.latestVersion') || 'Latest'}: v{releaseInfo?.version}
                                </Text>

                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: colors.primary }]}
                                    onPress={handleDownload}
                                >
                                    <MaterialIcons name="download" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={[typography.body, { color: '#FFF', fontWeight: '600' }]}>
                                        {t('settings.downloadUpdate')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.buttonOutline, { borderColor: colors.border }]}
                                    onPress={() => Linking.openURL(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/${releaseInfo?.tagName}`)}
                                >
                                    <Text style={[typography.body, { color: colors.text }]}>
                                        {t('settings.viewReleaseNotes') || 'View Release Notes'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : hasChecked ? (
                            <View style={styles.statusContainer}>
                                <Text style={[typography.headline, { color: colors.text, marginBottom: 8, textAlign: 'center' }]}>
                                    {t('settings.appUpToDate')}
                                </Text>
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 24 }]}>
                                    {t('settings.appVersion')}: v{Constants.expoConfig?.version}
                                </Text>

                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                                    onPress={checkUpdate}
                                >
                                    <Text style={[typography.body, { color: colors.text }]}>
                                        {t('settings.checkNow')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                    </View>
                </View>
            </MeshGradientBackground>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    statusContainer: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    button: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        marginTop: 16,
        alignItems: 'center',
    },
    buttonOutline: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        marginTop: 12,
        borderWidth: 1,
    },
});
