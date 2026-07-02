import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TextTicker from 'react-native-text-ticker';
import { useTheme } from '@/theme';
import { CollapsibleCard, BouncingDots } from '@/components';
import { colors } from 'react-native-keyboard-controller/lib/typescript/components/KeyboardToolbar/colors';

interface QuickActionsCardProps {
    t: (key: string) => string;
    selectedBands: string[];
    wanIpAddress?: string;
    mobileDataEnabled: boolean;
    isTogglingData: boolean;
    isChangingIp: boolean;
    isRunningCheck: boolean;
    onOpenBandModal: () => void;
    onChangeIp: () => void;
    onToggleMobileData: () => void;
    onSignalPointing: () => void;
    onQuickCheck: () => void;
    onSpeedtest: () => void;
}

/**
 * Quick actions card for home screen
 * Contains: Band selection, Change IP, Toggle Data, Signal Pointing, Quick Check, Speedtest
 */
export function QuickActionsCard({
    t,
    selectedBands,
    wanIpAddress,
    mobileDataEnabled,
    isTogglingData,
    isChangingIp,
    isRunningCheck,
    onOpenBandModal,
    onChangeIp,
    onToggleMobileData,
    onSignalPointing,
    onQuickCheck,
    onSpeedtest,
}: QuickActionsCardProps) {
    const { colors, typography, isDark } = useTheme();

    const itemBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
    const itemBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

    return (
        <CollapsibleCard
            title={t('home.actions')}
        >
            {/* Top row - Large actions */}
            <View style={styles.topRow}>
                {/* Pilih Band */}
                <TouchableOpacity
                    style={[styles.largeAction, { backgroundColor: itemBg, borderColor: itemBorder }]}
                    onPress={onOpenBandModal}
                    activeOpacity={0.7}
                >
                    <View style={[styles.largeIconContainer, { backgroundColor: colors.itemBg }]}>
                        <MaterialIcons name="tune" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.largeActionContent}>
                        <TextTicker
                            style={StyleSheet.flatten([typography.subheadline, { color: colors.text, fontWeight: '700' }])}
                            duration={4000}
                            loop
                            bounce
                            repeatSpacer={50}
                            marqueeDelay={1000}
                        >
                            {t('home.setBand')}
                        </TextTicker>
                        <TextTicker
                            style={StyleSheet.flatten([typography.caption2, { color: colors.textSecondary, marginTop: 2 }])}
                            duration={6000}
                            loop
                            bounce
                            repeatSpacer={50}
                            marqueeDelay={1000}
                        >
                            {selectedBands.length > 0 ? selectedBands.join(', ') : t('common.loading')}
                        </TextTicker>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Ganti IP */}
                <TouchableOpacity
                    style={[styles.largeAction, { backgroundColor: itemBg, borderColor: itemBorder }]}
                    onPress={onChangeIp}
                    disabled={isChangingIp}
                    activeOpacity={0.7}
                >
                    <View style={[styles.largeIconContainer, { backgroundColor: colors.itemBg }]}>
                        {isChangingIp ? (
                            <BouncingDots size="small" color={colors.primary} />
                        ) : (
                            <MaterialIcons name="sync" size={20} color={colors.primary} />
                        )}
                    </View>
                    <View style={styles.largeActionContent}>
                        <TextTicker
                            style={StyleSheet.flatten([typography.subheadline, { color: colors.text, fontWeight: '700' }])}
                            duration={4000}
                            loop
                            bounce
                            repeatSpacer={50}
                            marqueeDelay={1000}
                        >
                            {t('home.changeIp')}
                        </TextTicker>
                        <TextTicker
                            style={StyleSheet.flatten([typography.caption2, { color: colors.textSecondary, marginTop: 2 }])}
                            duration={6000}
                            loop
                            bounce
                            repeatSpacer={50}
                            marqueeDelay={1000}
                        >
                            {wanIpAddress || '...'}
                        </TextTicker>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Bottom row - Small actions */}
            <View style={styles.bottomRow}>
                {/* Data Seluler */}
                <TouchableOpacity
                    style={styles.smallAction}
                    onPress={onToggleMobileData}
                    disabled={isTogglingData}
                    activeOpacity={0.7}
                >
                    {isTogglingData ? (
                        <BouncingDots size="small" color={mobileDataEnabled ? colors.background : colors.primary} />
                    ) : (
                        <>
                            <View style={[
                                styles.smallIconCircle,
                                {
                                    backgroundColor: mobileDataEnabled ? colors.primary : itemBg,
                                    borderColor: mobileDataEnabled ? colors.border : itemBorder,
                                    borderWidth: 1,
                                }
                            ]}>
                                <MaterialIcons
                                    name="swap-vert"
                                    size={16}
                                    color={mobileDataEnabled ? colors.background : colors.primary}
                                />
                            </View>
                            <View style={{ width: '100%', overflow: 'hidden', marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                                <TextTicker
                                    style={StyleSheet.flatten([
                                        typography.caption2,
                                        {
                                            color: colors.text,
                                            fontWeight: '600',
                                            textAlign: 'center',
                                            alignSelf: 'center'
                                        }
                                    ])}
                                    duration={4000}
                                    loop
                                    bounce
                                    repeatSpacer={50}
                                    marqueeDelay={1000}
                                >
                                    {t('home.mobileData')}
                                </TextTicker>
                            </View>
                        </>
                    )}
                </TouchableOpacity>

                {/* Cari Sinyal */}
                <TouchableOpacity
                    style={styles.smallAction}
                    onPress={onSignalPointing}
                    activeOpacity={0.7}
                >
                    <View style={[styles.smallIconCircle, {
                        backgroundColor: colors.itemBg,
                        borderColor: colors.border,
                        borderWidth: 1,
                    }]}>
                        <MaterialIcons name="location-on" size={16} color={colors.primary} />
                    </View>
                    <View style={{ width: '100%', overflow: 'hidden', marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                        <TextTicker
                            style={StyleSheet.flatten([typography.caption2, { color: colors.text, fontWeight: '600', textAlign: 'center', alignSelf: 'center' }])}
                            duration={4000}
                            loop
                            bounce
                            repeatSpacer={50}
                            marqueeDelay={1000}
                        >
                            {t('home.signalPointing')}
                        </TextTicker>
                    </View>
                </TouchableOpacity>

                {/* Cek Cepat */}
                <TouchableOpacity
                    style={styles.smallAction}
                    onPress={onQuickCheck}
                    disabled={isRunningCheck}
                    activeOpacity={0.7}
                >
                    {isRunningCheck ? (
                        <BouncingDots size="small" color={colors.primary} />
                    ) : (
                        <>
                            <View style={[styles.smallIconCircle, {
                                backgroundColor: colors.itemBg,
                                borderColor: colors.border,
                                borderWidth: 1,
                            }]}>
                                <MaterialIcons name="flash-on" size={16} color={colors.primary} />
                            </View>
                            <View style={{ width: '100%', overflow: 'hidden', marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                                <TextTicker
                                    style={StyleSheet.flatten([typography.caption2, { color: colors.text, fontWeight: '600', textAlign: 'center', alignSelf: 'center' }])}
                                    duration={4000}
                                    loop
                                    bounce
                                    repeatSpacer={50}
                                    marqueeDelay={1000}
                                >
                                    {t('home.quickCheck')}
                                </TextTicker>
                            </View>
                        </>
                    )}
                </TouchableOpacity>

                {/* Speed Test */}
                <TouchableOpacity
                    style={styles.smallAction}
                    onPress={onSpeedtest}
                    activeOpacity={0.7}
                >
                    <View style={[styles.smallIconCircle, {
                        backgroundColor: colors.itemBg,
                        borderColor: colors.border,
                        borderWidth: 1,
                    }]}>
                        <MaterialIcons name="speed" size={16} color={colors.primary} />
                    </View>
                    <View style={{ width: '100%', overflow: 'hidden', marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                        <TextTicker
                            style={StyleSheet.flatten([typography.caption2, { color: colors.text, fontWeight: '600', textAlign: 'center', alignSelf: 'center' }])}
                            duration={4000}
                            loop
                            bounce
                            repeatSpacer={50}
                            marqueeDelay={1000}
                        >
                            {t('home.speedtest')}
                        </TextTicker>
                    </View>
                </TouchableOpacity>
            </View>
        </CollapsibleCard>
    );
}

const styles = StyleSheet.create({
    cardTitle: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        color: '#8e8e93',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    largeAction: {
        width: '48.5%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 36,
        borderWidth: 1,
    },
    largeIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    largeActionContent: {
        flex: 1,
        overflow: 'hidden',
        marginRight: 4,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    smallAction: {
        width: '24%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallIconCircle: {
        width: 42,
        height: 42,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default QuickActionsCard;
