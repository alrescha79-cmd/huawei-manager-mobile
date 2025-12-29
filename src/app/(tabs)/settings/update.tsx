import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router'; // Add useRouter
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import Constants from 'expo-constants';

export default function UpdateScreen() {
    const { colors, typography, spacing } = useTheme();
    const { t } = useTranslation();
    const router = useRouter(); // Use router
    const [checking, setChecking] = useState(true);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [latestVersion, setLatestVersion] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');

    useEffect(() => {
        checkUpdate();
    }, []);

    const checkUpdate = async () => {
        setChecking(true);
        try {
            // Mock update check or existing service
            // For now, simulate a check
            setTimeout(() => {
                setChecking(false);
                // logic to compare versions would go here
                setUpdateAvailable(false);
            }, 2000);
        } catch (error) {
            setChecking(false);
            Alert.alert(t('common.error'), t('settings.updateCheckFailed'));
        }
    };

    const handleDownload = () => {
        if (downloadUrl) {
            Linking.openURL(downloadUrl);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: t('settings.checkUpdate') }} />

            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
                    <MaterialIcons
                        name={checking ? "sync" : (updateAvailable ? "system-update" : "check-circle")}
                        size={64}
                        color={checking ? colors.primary : (updateAvailable ? colors.primary : colors.success)}
                    />
                </View>

                {checking ? (
                    <Text style={[typography.body, { color: colors.textSecondary }]}>
                        {t('settings.checkNow')}...
                    </Text>
                ) : (
                    <>
                        <Text style={[typography.headline, { color: colors.text, marginBottom: 8, textAlign: 'center' }]}>
                            {updateAvailable ? t('settings.updateAvailable') : t('settings.appUpToDate')}
                        </Text>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 24 }]}>
                            {t('settings.appVersion')}: v{Constants.expoConfig?.version}
                        </Text>

                        {updateAvailable && (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: colors.primary }]}
                                onPress={handleDownload}
                            >
                                <Text style={[typography.body, { color: '#FFF', fontWeight: '600' }]}>
                                    {t('settings.downloadUpdate')}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {!updateAvailable && (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                                onPress={checkUpdate}
                            >
                                <Text style={[typography.body, { color: colors.text }]}>
                                    {t('settings.checkNow')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        </View>
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
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        marginTop: 16,
    },
});
