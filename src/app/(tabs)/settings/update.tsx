import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
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
import * as FileSystem from 'expo-file-system/legacy';
import { MeshGradientBackground, PageHeader, AnimatedScreen, AdNative } from '@/components';

let IntentLauncher: any = null;
try {
    IntentLauncher = require('expo-intent-launcher');
} catch (e) {
    console.warn('expo-intent-launcher is not available in this environment:', e);
}

const GITHUB_OWNER = 'alrescha79-cmd';
const GITHUB_REPO = 'huawei-manager-mobile';

interface ReleaseInfo {
    tagName: string;
    version: string;
    downloadUrl: string;
    releaseNotes: string;
    publishedAt: string;
    isPreRelease: boolean;
}

/**
 * Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
    const normalize = (v: string) => v.replace(/^v/, '').replace(/-.*$/, '').split('.').map(n => parseInt(n, 10) || 0);
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
    const [preReleaseInfo, setPreReleaseInfo] = useState<ReleaseInfo | null>(null);
    const [preReleaseAvailable, setPreReleaseAvailable] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChecked, setHasChecked] = useState(false);

    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadResumable, setDownloadResumable] = useState<FileSystem.DownloadResumable | null>(null);

    const rotation = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    useEffect(() => {
        if (checking) {
            rotation.value = 0;
            rotation.value = withRepeat(
                withTiming(360, { duration: 1000, easing: Easing.linear }),
                -1,
                false
            );
        } else {
            cancelAnimation(rotation);
            rotation.value = 0;
        }
    }, [checking]);

    useEffect(() => {
        checkUpdate();
    }, []);

    const checkUpdate = useCallback(async () => {
        setChecking(true);
        setError(null);
        setUpdateAvailable(false);
        setPreReleaseAvailable(false);
        setReleaseInfo(null);
        setPreReleaseInfo(null);

        try {
            const response = await fetch(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const releases = await response.json();
            const currentVersion = Constants.expoConfig?.version || '0.0.0';

            const stableRelease = releases.find((r: any) => !r.prerelease && !r.draft);
            const preRelease = releases.find((r: any) => r.prerelease && !r.draft);

            const parseRelease = (data: any, isPreRelease: boolean): ReleaseInfo => {
                const apkAsset = data.assets?.find((asset: any) =>
                    asset.name?.endsWith('.apk') || asset.name?.includes('universal')
                );

                let version = '';
                const tagName = data.tag_name || '';

                const semverMatch = tagName.match(/v?(\d+\.\d+\.\d+)/);
                if (semverMatch) {
                    version = semverMatch[1];
                } else {
                    const nameMatch = (data.name || '').match(/v?(\d+\.\d+\.\d+)/);
                    if (nameMatch) {
                        version = nameMatch[1];
                    } else if (apkAsset?.name) {
                        const assetMatch = apkAsset.name.match(/v?(\d+\.\d+\.\d+)/);
                        if (assetMatch) {
                            version = assetMatch[1];
                        }
                    }
                }

                return {
                    tagName: tagName,
                    version: version,
                    downloadUrl: apkAsset?.browser_download_url || data.html_url || '',
                    releaseNotes: data.body || '',
                    publishedAt: data.published_at || '',
                    isPreRelease,
                };
            };

            if (stableRelease) {
                const info = parseRelease(stableRelease, false);
                setReleaseInfo(info);
                const comparison = compareVersions(info.version, currentVersion);
                setUpdateAvailable(comparison > 0);
            }

            if (preRelease) {
                const info = parseRelease(preRelease, true);
                setPreReleaseInfo(info);
                const comparison = info.version ? compareVersions(info.version, currentVersion) : 1;
                setPreReleaseAvailable(comparison > 0);
            }

            setHasChecked(true);
        } catch (err) {
            console.error('Update check failed:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setHasChecked(true);
        } finally {
            setChecking(false);
        }
    }, []);

    const handleDownloadAndInstall = async (url: string, versionName: string) => {
        if (Platform.OS !== 'android') {
            Linking.openURL(url);
            return;
        }

        try {
            setDownloading(true);
            setDownloadProgress(0);

            const filename = `huawei-manager-v${versionName}.apk`;
            const localUri = `${FileSystem.cacheDirectory}${filename}`;

            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (fileInfo.exists) {
                await FileSystem.deleteAsync(localUri, { idempotent: true });
            }

            const resumable = FileSystem.createDownloadResumable(
                url,
                localUri,
                {},
                (downloadProgressData) => {
                    const progress = downloadProgressData.totalBytesWritten / downloadProgressData.totalBytesExpectedToWrite;
                    setDownloadProgress(Math.round(progress * 100));
                }
            );

            setDownloadResumable(resumable);

            const result = await resumable.downloadAsync();
            setDownloading(false);

            if (result && result.uri) {
                let launched = false;
                if (Platform.OS === 'android') {
                    try {
                        const contentUri = await FileSystem.getContentUriAsync(result.uri);
                        if (IntentLauncher && IntentLauncher.startActivityAsync) {
                            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                                data: contentUri,
                                type: 'application/vnd.android.package-archive',
                                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                            });
                            launched = true;
                        }
                    } catch (e) {
                        console.warn('Failed to launch APK installation intent:', e);
                    }
                }

                if (!launched) {
                    Alert.alert(
                        t('common.success') || 'Success',
                        t('settings.downloadComplete') || 'Update downloaded successfully. Please open and install the APK file manually, or open the link in your browser.',
                        [
                            { text: t('common.ok') || 'OK' },
                            { text: t('settings.downloadUpdate') || 'Open Browser', onPress: () => Linking.openURL(url) }
                        ]
                    );
                }
            } else {
                throw new Error('Download failed: result is empty');
            }
        } catch (err: any) {
            console.error('Download/Install failed:', err);
            setDownloading(false);
            Alert.alert(
                t('common.error') || 'Error',
                t('settings.downloadFailed') || 'Failed to download or install update. Please try again or download manually.',
                [
                    { text: t('common.ok') || 'OK' },
                    { text: t('settings.downloadUpdate') || 'Open Browser', onPress: () => Linking.openURL(url) }
                ]
            );
        }
    };

    const handleCancelDownload = async () => {
        if (downloadResumable) {
            try {
                await downloadResumable.pauseAsync();
                setDownloading(false);
                setDownloadProgress(0);
            } catch (e) {
                console.error('Error pausing download:', e);
            }
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

                        {checking ? (
                            <View style={styles.statusContainer}>
                                <Text style={[typography.headline, { color: colors.text, marginBottom: 8, textAlign: 'center' }]}>
                                    {t('settings.checkingUpdate') || 'Checking for updates...'}
                                </Text>
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
                        ) : updateAvailable || preReleaseAvailable ? (
                            <View style={styles.statusContainer}>
                                <Text style={[typography.body, { color: colors.textSecondary, marginBottom: 8 }]}>
                                    {t('settings.appVersion')}: v{Constants.expoConfig?.version}
                                </Text>

                                {downloading ? (
                                    <View style={[styles.downloadCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: 8 }]}>
                                            {t('settings.downloadingUpdate')}
                                        </Text>
                                        <View style={[styles.progressBarContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                            <View style={[styles.progressBar, { width: `${downloadProgress}%`, backgroundColor: colors.primary }]} />
                                        </View>
                                        <View style={styles.progressInfoRow}>
                                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                                {downloadProgress}%
                                            </Text>
                                            <TouchableOpacity
                                                onPress={handleCancelDownload}
                                                style={{ paddingVertical: 4, paddingHorizontal: 8 }}
                                            >
                                                <Text style={[typography.caption1, { color: colors.error, fontWeight: '600' }]}>
                                                    {t('common.cancel')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        {/* Stable Release Section */}
                                        {updateAvailable && releaseInfo && (
                                            <View style={[styles.releaseCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                                                <View style={styles.releaseHeader}>
                                                    <Text style={[typography.headline, { color: colors.text }]}>
                                                        v{releaseInfo.version}
                                                    </Text>
                                                    <View style={[styles.badge, { backgroundColor: colors.success }]}>
                                                        <Text style={[typography.caption2, { color: '#FFF', fontWeight: '600' }]}>
                                                            {t('settings.stableBadge')}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 12 }]}>
                                                    {t('settings.updateAvailable')}
                                                </Text>
                                                <View style={styles.releaseActions}>
                                                    <TouchableOpacity
                                                        style={[styles.smallButton, { backgroundColor: colors.primary }]}
                                                        onPress={() => releaseInfo.downloadUrl && handleDownloadAndInstall(releaseInfo.downloadUrl, releaseInfo.version)}
                                                    >
                                                        <MaterialIcons name="download" size={16} color="#FFF" />
                                                        <Text style={[typography.caption1, { color: '#FFF', marginLeft: 4 }]}>
                                                            {t('settings.downloadUpdate')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.smallButtonOutline, { borderColor: colors.border }]}
                                                        onPress={() => Linking.openURL(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/${releaseInfo.tagName}`)}
                                                    >
                                                        <Text style={[typography.caption1, { color: colors.text }]}>{t('settings.viewReleaseNotes')}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}

                                        {/* If only stable is up to date but pre-release available */}
                                        {!updateAvailable && preReleaseAvailable && (
                                            <Text style={[typography.caption1, { color: colors.success, marginBottom: 8, textAlign: 'center' }]}>
                                                ✓ {t('settings.stableUpToDate')}
                                            </Text>
                                        )}

                                        {/* Pre-release Section */}
                                        {preReleaseAvailable && preReleaseInfo && (
                                            <View style={[styles.releaseCard, { backgroundColor: colors.card, borderColor: colors.warning, marginTop: updateAvailable ? 12 : 0 }]}>
                                                <View style={styles.releaseHeader}>
                                                    <Text style={[typography.headline, { color: colors.text }]}>
                                                        {preReleaseInfo.version ? `v${preReleaseInfo.version}` : preReleaseInfo.tagName}
                                                    </Text>
                                                    <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                                                        <Text style={[typography.caption2, { color: '#FFF', fontWeight: '600' }]}>
                                                            {t('settings.preReleaseBadge')}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 12 }]}>
                                                    {t('settings.preReleaseHint')}
                                                </Text>
                                                <View style={styles.releaseActions}>
                                                    <TouchableOpacity
                                                        style={[styles.smallButton, { backgroundColor: colors.warning }]}
                                                        onPress={() => preReleaseInfo.downloadUrl && handleDownloadAndInstall(preReleaseInfo.downloadUrl, preReleaseInfo.version || preReleaseInfo.tagName)}
                                                    >
                                                        <MaterialIcons name="download" size={16} color="#FFF" />
                                                        <Text style={[typography.caption1, { color: '#FFF', marginLeft: 4 }]}>
                                                            {t('settings.downloadUpdate')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.smallButtonOutline, { borderColor: colors.border }]}
                                                        onPress={() => Linking.openURL(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/${preReleaseInfo.tagName}`)}
                                                    >
                                                        <Text style={[typography.caption1, { color: colors.text }]}>{t('settings.viewReleaseNotes')}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </>
                                )}

                                <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 16 }}>
                                    <AdNative />
                                </View>
                                <TouchableOpacity
                                    style={[styles.buttonOutline, { borderColor: colors.border, marginTop: 16 }]}
                                    onPress={checkUpdate}
                                    disabled={downloading}
                                >
                                    <Text style={[typography.body, { color: colors.text }]}>
                                        {t('settings.checkAgain')}
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
    releaseCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        width: '100%',
    },
    releaseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    releaseActions: {
        flexDirection: 'row',
        gap: 8,
    },
    smallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    smallButtonOutline: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    downloadCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        width: '100%',
        marginBottom: 16,
    },
    progressBarContainer: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
    },
    progressInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
