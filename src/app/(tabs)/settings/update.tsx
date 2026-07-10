import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { MeshGradientBackground, AnimatedScreen, AdNative, ThemedAlertHelper } from '@/components';
import { PageHeader, ReleaseNotesModal } from '@/components/settings';

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
    const isCancelledRef = useRef(false);
    const [selectedNotes, setSelectedNotes] = useState<{ version: string; notes: string } | null>(null);

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
            isCancelledRef.current = false;

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
            setDownloadResumable(null);

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
                    ThemedAlertHelper.alert(
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
            if (isCancelledRef.current) {
                isCancelledRef.current = false;
                return;
            }
            console.error('Download/Install failed:', err);
            setDownloading(false);
            setDownloadResumable(null);

            const message = err instanceof Error ? err.message : String(err);
            ThemedAlertHelper.alert(
                t('common.error') || 'Error',
                `${t('settings.downloadFailed') || 'Failed to download or install update. Please try again or download manually.'}\n\n${message}`,
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
                isCancelledRef.current = true;
                await downloadResumable.cancelAsync();
                setDownloading(false);
                setDownloadProgress(0);
                setDownloadResumable(null);
                ThemedAlertHelper.alert(
                    t('settings.downloadCancelledTitle') || 'Cancelled',
                    t('settings.downloadCancelledMessage') || 'Download cancelled.'
                );
            } catch (e) {
                console.error('Error cancelling download:', e);
                isCancelledRef.current = false;
                const message = e instanceof Error ? e.message : String(e);
                ThemedAlertHelper.alert(
                    t('common.error') || 'Error',
                    `${t('settings.downloadFailed') || 'Failed to download or install update. Please try again or download manually.'}\n\n${message}`
                );
            }
        }
    };

    const availableCount = (updateAvailable ? 1 : 0) + (preReleaseAvailable ? 1 : 0);

    return (
        <AnimatedScreen noAnimation>
            <MeshGradientBackground>
                <PageHeader title={t('settings.checkUpdate')} showBackButton />
                <View style={[styles.container, { backgroundColor: 'transparent' }]}>
                    <Stack.Screen options={{ title: t('settings.checkUpdate') }} />

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Device status header */}
                        <View style={styles.headerSection}>
                            <View style={[styles.deviceOuterCircle, { borderColor: colors.primary }]}>
                                <View style={[styles.deviceInnerSquare, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}>
                                    <MaterialCommunityIcons
                                        name="cellphone"
                                        size={42}
                                        color={colors.primary}
                                    />
                                </View>
                            </View>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 16 }]}>
                                {t('settings.currentAppVersion')}
                            </Text>
                            <View style={styles.currentVersionRow}>
                                <Text style={[typography.title1, { color: colors.text, fontWeight: '700' }]}>
                                    v{Constants.expoConfig?.version}
                                </Text>
                                <View style={[styles.installedBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                                    <Text style={[typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                                        {t('settings.installedBadge')}
                                    </Text>
                                </View>
                            </View>
                            {hasChecked && !updateAvailable && !preReleaseAvailable && (
                                <View style={[styles.upToDateBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)', borderWidth: 1, marginTop: 12 }]}>
                                    <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" style={{ marginRight: 6 }} />
                                    <Text style={[typography.caption2, { color: '#10B981', fontWeight: '700' }]}>
                                        {t('settings.appUpToDate').toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {checking ? (
                            <View style={styles.statusContainer}>
                                <Animated.View style={animatedStyle}>
                                    <MaterialCommunityIcons
                                        name="sync"
                                        size={48}
                                        color={colors.primary}
                                    />
                                </Animated.View>
                                <Text style={[typography.headline, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
                                    {t('settings.checkingUpdate') || 'Checking for updates...'}
                                </Text>
                            </View>
                        ) : error ? (
                            <View style={styles.statusContainer}>
                                <MaterialCommunityIcons
                                    name="alert-circle-outline"
                                    size={48}
                                    color={colors.error}
                                />
                                <Text style={[typography.headline, { color: colors.error, marginTop: 16, marginBottom: 8, textAlign: 'center' }]}>
                                    {t('settings.updateCheckFailed') || 'Update check failed'}
                                </Text>
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 16, textAlign: 'center' }]}>
                                    {error}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.checkNowBtn, { backgroundColor: colors.primary }]}
                                    onPress={checkUpdate}
                                >
                                    <Text style={[typography.body, { color: '#FFF', fontWeight: '600' }]}>
                                        {t('settings.tryAgain') || 'Try Again'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : updateAvailable || preReleaseAvailable ? (
                            <View style={{ width: '100%' }}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={[typography.subheadline, { color: colors.textSecondary, fontWeight: '700', letterSpacing: 0.5 }]}>
                                        {t('settings.updatesAvailableHeader')}
                                    </Text>
                                    <View style={[styles.versionsCountBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                                        <Text style={[typography.caption2, { color: colors.success, fontWeight: '700' }]}>
                                            {availableCount === 2
                                                ? t('settings.newVersionsBadge', { count: 2 })
                                                : t('settings.newVersionBadge')}
                                        </Text>
                                    </View>
                                </View>

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
                                            <View style={[styles.releaseCard, { backgroundColor: colors.card, borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1 }]}>
                                                <View style={styles.releaseHeader}>
                                                    <Text style={[typography.headline, { color: colors.text, fontSize: 20, fontWeight: '700' }]}>
                                                        v{releaseInfo.version}
                                                    </Text>
                                                    <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1 }]}>
                                                        <MaterialCommunityIcons name="shield-check" size={14} color={colors.success} style={{ marginRight: 4 }} />
                                                        <Text style={[typography.caption2, { color: colors.success, fontWeight: '700', letterSpacing: 0.5 }]}>
                                                            {t('settings.stableBadge').toUpperCase()}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.infoRow}>
                                                    <MaterialCommunityIcons name="information-outline" size={16} color={colors.success} />
                                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginLeft: 6, flex: 1 }]}>
                                                        {t('settings.stableBadgeText')}
                                                    </Text>
                                                </View>

                                                <View style={styles.divider} />

                                                <View style={styles.releaseActions}>
                                                    <TouchableOpacity
                                                        style={[styles.downloadBtn, { backgroundColor: '#10B981' }]} // Teal/green
                                                        onPress={() => releaseInfo.downloadUrl && handleDownloadAndInstall(releaseInfo.downloadUrl, releaseInfo.version)}
                                                    >
                                                        <MaterialCommunityIcons name="download" size={18} color="#FFF" />
                                                        <Text style={[typography.body, { color: '#FFF', fontWeight: '700', marginLeft: 6 }]}>
                                                            {t('settings.downloadUpdate')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.notesBtn, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                                                        onPress={() => setSelectedNotes({ version: releaseInfo.version || releaseInfo.tagName, notes: releaseInfo.releaseNotes })}
                                                    >
                                                        <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.text} />
                                                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: 6 }]}>
                                                            Notes
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}

                                        {/* Pre-release Section */}
                                        {preReleaseAvailable && preReleaseInfo && (
                                            <View style={[styles.releaseCard, { backgroundColor: colors.card, borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, marginTop: updateAvailable ? 16 : 0 }]}>
                                                <View style={styles.releaseHeader}>
                                                    <Text style={[typography.headline, { color: colors.text, fontSize: 20, fontWeight: '700' }]}>
                                                        {preReleaseInfo.version ? `v${preReleaseInfo.version}` : preReleaseInfo.tagName}
                                                    </Text>
                                                    <View style={[styles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1 }]}>
                                                        <MaterialCommunityIcons name="flask" size={14} color={colors.warning} style={{ marginRight: 4 }} />
                                                        <Text style={[typography.caption2, { color: colors.warning, fontWeight: '700', letterSpacing: 0.5 }]}>
                                                            {t('settings.preReleaseBadge').toUpperCase()}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.infoRow}>
                                                    <MaterialCommunityIcons name="alert-outline" size={16} color={colors.warning} />
                                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginLeft: 6, flex: 1 }]}>
                                                        {t('settings.preReleaseBadgeText')}
                                                    </Text>
                                                </View>

                                                <View style={styles.divider} />

                                                <View style={styles.releaseActions}>
                                                    <TouchableOpacity
                                                        style={[styles.downloadBtn, { backgroundColor: '#F59E0B' }]} // Yellow/Orange
                                                        onPress={() => preReleaseInfo.downloadUrl && handleDownloadAndInstall(preReleaseInfo.downloadUrl, preReleaseInfo.version || preReleaseInfo.tagName)}
                                                    >
                                                        <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFF" />
                                                        <Text style={[typography.body, { color: '#FFF', fontWeight: '700', marginLeft: 6 }]}>
                                                            {t('settings.downloadUpdate')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.notesBtn, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                                                        onPress={() => setSelectedNotes({ version: preReleaseInfo.version || preReleaseInfo.tagName, notes: preReleaseInfo.releaseNotes })}
                                                    >
                                                        <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.text} />
                                                        <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: 6 }]}>
                                                            Notes
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </>
                                )}

                                <View style={{ paddingHorizontal: 0, marginTop: 24, marginBottom: 12 }}>
                                    <AdNative />
                                </View>

                                {(updateAvailable || preReleaseAvailable) && !downloading && (
                                    <TouchableOpacity
                                        style={[styles.checkAgainBtn, { borderColor: colors.border }]}
                                        onPress={checkUpdate}
                                        disabled={checking}
                                    >
                                        <MaterialCommunityIcons name="refresh" size={18} color={colors.text} style={{ marginRight: 6 }} />
                                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                            {t('settings.checkAgain')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : hasChecked ? (
                            <View style={{ width: '100%', alignItems: 'center', marginTop: 16 }}>
                                <TouchableOpacity
                                    style={[styles.checkNowBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                                    onPress={checkUpdate}
                                    disabled={checking}
                                >
                                    <MaterialCommunityIcons name="refresh" size={18} color={colors.text} style={{ marginRight: 6 }} />
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                        {t('settings.checkNow')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                    </ScrollView>
                </View>
            </MeshGradientBackground>

            <ReleaseNotesModal
                visible={selectedNotes !== null}
                onClose={() => setSelectedNotes(null)}
                selectedNotes={selectedNotes}
            />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 120,
    },
    headerSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    deviceOuterCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deviceInnerSquare: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    currentVersionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    installedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginLeft: 8,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 10,
    },
    versionsCountBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    releaseCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    releaseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 16,
    },
    releaseActions: {
        flexDirection: 'row',
        gap: 12,
    },
    downloadBtn: {
        flex: 2,
        flexDirection: 'row',
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notesBtn: {
        flex: 1.1,
        flexDirection: 'row',
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    downloadCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    progressBarContainer: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBar: {
        height: '100%',
    },
    progressInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    checkAgainBtn: {
        flexDirection: 'row',
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        alignSelf: 'center',
        paddingHorizontal: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    upToDateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    checkNowBtn: {
        flexDirection: 'row',
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    statusContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
});
