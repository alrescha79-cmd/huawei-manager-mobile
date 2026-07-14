import { useState, useEffect, useCallback } from 'react';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    Easing,
    cancelAnimation
} from 'react-native-reanimated';
import Constants from 'expo-constants';

const GITHUB_OWNER = 'alrescha79-cmd';
const GITHUB_REPO = 'huawei-manager-mobile';

export interface ReleaseInfo {
    tagName: string;
    version: string;
    downloadUrl: string;
    releaseNotes: string;
    publishedAt: string;
    isPreRelease: boolean;
}

/**
 * Compare semantic versions.
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

export function useUpdateCheck() {
    const [checking, setChecking] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
    const [preReleaseInfo, setPreReleaseInfo] = useState<ReleaseInfo | null>(null);
    const [preReleaseAvailable, setPreReleaseAvailable] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChecked, setHasChecked] = useState(false);

    // Rotation animation for sync icon
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
                const comparison = info.version ? compareVersions(info.version, currentVersion) : 0;
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

    const availableCount = (updateAvailable ? 1 : 0) + (preReleaseAvailable ? 1 : 0);

    return {
        checking,
        updateAvailable,
        releaseInfo,
        preReleaseInfo,
        preReleaseAvailable,
        error,
        hasChecked,
        animatedStyle,
        availableCount,
        checkUpdate,
    };
}
