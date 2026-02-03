import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { CollapsibleCard, BouncingDots } from '@/components';

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

    return (
        <CollapsibleCard title={t('home.actions')}>
            <View style={styles.quickActionsRow}>
                <TouchableOpacity
                    style={[styles.quickActionLarge, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={onOpenBandModal}
                >
                    <View style={[styles.quickActionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.background }]}>
                        <MaterialIcons name="settings-input-antenna" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.quickActionLargeContent}>
                        <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                            {t('home.setBand')}
                        </Text>
                        <Text
                            style={[typography.caption2, { color: colors.textSecondary }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {selectedBands.length > 0 ? selectedBands.join(', ') : t('common.loading')}
                        </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickActionLarge, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={onChangeIp}
                    disabled={isChangingIp}
                >
                    <View style={[styles.quickActionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.background }]}>
                        {isChangingIp ? (
                            <BouncingDots size="small" color={colors.primary} />
                        ) : (
                            <MaterialIcons name="sync" size={20} color={colors.primary} />
                        )}
                    </View>
                    <View style={styles.quickActionLargeContent}>
                        <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                            {t('home.changeIp')}
                        </Text>
                        <Text
                            style={[typography.caption2, { color: colors.textSecondary }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {wanIpAddress || '...'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.quickActionsRow}>
                <TouchableOpacity
                    style={[
                        styles.quickActionSmall,
                        {
                            backgroundColor: mobileDataEnabled ? colors.primary : colors.card,
                            borderColor: colors.border,
                            borderWidth: 1,
                        }
                    ]}
                    onPress={onToggleMobileData}
                    disabled={isTogglingData}
                >
                    {isTogglingData ? (
                        <BouncingDots size="small" color={mobileDataEnabled ? '#FFFFFF' : colors.primary} />
                    ) : (
                        <>
                            <MaterialIcons
                                name="swap-vert"
                                size={22}
                                color={mobileDataEnabled ? '#FFFFFF' : colors.primary}
                            />
                            <Text
                                style={[
                                    typography.caption2,
                                    {
                                        color: mobileDataEnabled ? '#FFFFFF' : colors.text,
                                        fontWeight: '500',
                                        marginTop: 4,
                                        textAlign: 'center',
                                    }
                                ]}
                                numberOfLines={1}
                            >
                                {t('home.mobileData')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickActionSmall, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={onSignalPointing}
                >
                    <MaterialIcons name="gps-fixed" size={22} color={colors.primary} />
                    <Text
                        style={[typography.caption2, { color: colors.text, fontWeight: '500', marginTop: 4, textAlign: 'center' }]}
                        numberOfLines={1}
                    >
                        {t('home.signalPointing')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickActionSmall, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={onQuickCheck}
                    disabled={isRunningCheck}
                >
                    {isRunningCheck ? (
                        <BouncingDots size="small" color={colors.primary} />
                    ) : (
                        <>
                            <MaterialIcons name="perm-scan-wifi" size={22} color={colors.primary} />
                            <Text
                                style={[typography.caption2, { color: colors.text, fontWeight: '500', marginTop: 4, textAlign: 'center' }]}
                                numberOfLines={1}
                            >
                                {t('home.quickCheck')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickActionSmall, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={onSpeedtest}
                >
                    <MaterialIcons name="speed" size={22} color={colors.primary} />
                    <Text
                        style={[typography.caption2, { color: colors.text, fontWeight: '500', marginTop: 4, textAlign: 'center' }]}
                        numberOfLines={1}
                    >
                        {t('home.speedtest')}
                    </Text>
                </TouchableOpacity>
            </View>
        </CollapsibleCard>
    );
}

const styles = StyleSheet.create({
    quickActionsRow: {
        flexDirection: 'row',
        marginBottom: 8,
        gap: 8,
    },
    quickActionLarge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    quickActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    quickActionLargeContent: {
        flex: 1,
    },
    quickActionSmall: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 70,
    },
});

export default QuickActionsCard;
