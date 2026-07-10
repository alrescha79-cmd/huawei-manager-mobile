import { useState, useRef } from 'react';
import { Platform, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ThemedAlertHelper } from '@/components';

let IntentLauncher: any = null;
try {
    IntentLauncher = require('expo-intent-launcher');
} catch (e) {
    console.warn('expo-intent-launcher is not available in this environment:', e);
}

interface UseUpdateDownloadProps {
    t: (key: string, options?: any) => string;
}

export function useUpdateDownload({ t }: UseUpdateDownloadProps) {
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadResumable, setDownloadResumable] = useState<FileSystem.DownloadResumable | null>(null);
    const isCancelledRef = useRef(false);

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

    return {
        downloading,
        downloadProgress,
        handleDownloadAndInstall,
        handleCancelDownload,
    };
}
