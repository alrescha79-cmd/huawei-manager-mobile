import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import Constants from 'expo-constants';
import { MeshGradientBackground, AnimatedScreen, AdNative } from '@/components';
import { PageHeader, ReleaseNotesModal } from '@/components/settings';
import { useUpdateCheck, useUpdateDownload } from '@/hooks/settings';

export default function UpdateScreen() {
    const { colors, typography, isDark } = useTheme();
    const { t } = useTranslation();

    const {
        checking, updateAvailable, releaseInfo, preReleaseInfo, preReleaseAvailable,
        error, hasChecked, animatedStyle, availableCount, checkUpdate,
    } = useUpdateCheck();

    const { downloading, downloadProgress, handleDownloadAndInstall, handleCancelDownload } = useUpdateDownload({ t });

    const [selectedNotes, setSelectedNotes] = useState<{ version: string; notes: string } | null>(null);
    const { autoDownload } = useLocalSearchParams<{ autoDownload?: string }>();
    const autoDownloadTriggered = useRef(false);

    useEffect(() => {
        if (autoDownload === 'true' && releaseInfo?.downloadUrl && !downloading && !autoDownloadTriggered.current) {
            autoDownloadTriggered.current = true;
            handleDownloadAndInstall(releaseInfo.downloadUrl, releaseInfo.version);
        }
    }, [autoDownload, releaseInfo, downloading]);

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
                                                        style={[styles.downloadBtn, { backgroundColor: '#10B981' }]}
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
                                                        style={[styles.downloadBtn, { backgroundColor: '#F59E0B' }]}
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
