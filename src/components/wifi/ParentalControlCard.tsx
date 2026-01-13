import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, CardHeader, Button, ThemedSwitch, BouncingDots } from '@/components';
import { wifiStyles as styles } from './wifiStyles';

interface ParentalProfile {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    activeDays: number[];
    deviceMacs: string[];
    enabled: boolean;
}

interface ParentalControlCardProps {
    t: (key: string) => string;
    parentalControlEnabled: boolean;
    isTogglingParental: boolean;
    isParentalExpanded: boolean;
    parentalProfiles: ParentalProfile[];
    onToggleParentalControl: (enabled: boolean) => void;
    onToggleExpanded: () => void;
    onEditProfile: (profile: ParentalProfile) => void;
    onDeleteProfile: (profileId: string, profileName: string) => void;
    onAddProfile: () => void;
    getDayName: (day: number) => string;
}

export function ParentalControlCard({
    t,
    parentalControlEnabled,
    isTogglingParental,
    isParentalExpanded,
    parentalProfiles,
    onToggleParentalControl,
    onToggleExpanded,
    onEditProfile,
    onDeleteProfile,
    onAddProfile,
    getDayName,
}: ParentalControlCardProps) {
    const { colors, typography, spacing } = useTheme();

    return (
        <Card style={{ marginTop: spacing.md }}>
            <CardHeader title={t('parentalControl.title')} />

            <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text }]}>{t('parentalControl.title')}</Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                        {t('parentalControl.enableHint')}
                    </Text>
                </View>
                {isTogglingParental ? (
                    <BouncingDots size="medium" color={colors.primary} />
                ) : (
                    <ThemedSwitch
                        value={parentalControlEnabled}
                        onValueChange={onToggleParentalControl}
                    />
                )}
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

            <TouchableOpacity
                style={[styles.collapseHeader, { borderColor: colors.border }]}
                onPress={onToggleExpanded}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                        {t('parentalControl.profiles')}
                    </Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                        {parentalProfiles.length > 0
                            ? `${parentalProfiles.length} ${t('parentalControl.profiles').toLowerCase()}`
                            : t('parentalControl.noProfiles')}
                    </Text>
                </View>
                <MaterialIcons
                    name={isParentalExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={24}
                    color={colors.textSecondary}
                />
            </TouchableOpacity>

            {isParentalExpanded && (
                <View style={{ marginTop: spacing.md }}>
                    {parentalProfiles.length === 0 ? (
                        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md }]}>
                            {t('parentalControl.noProfiles')}
                        </Text>
                    ) : (
                        parentalProfiles.map((profile, index) => (
                            <TouchableOpacity
                                key={profile.id}
                                onPress={() => onEditProfile(profile)}
                                style={[
                                    styles.deviceItem,
                                    {
                                        borderBottomWidth: index < parentalProfiles.length - 1 ? 1 : 0,
                                        borderBottomColor: colors.border,
                                        paddingBottom: spacing.md,
                                        marginBottom: index < parentalProfiles.length - 1 ? spacing.md : 0,
                                        backgroundColor: profile.enabled ? colors.primary + '10' : 'transparent',
                                        padding: spacing.sm,
                                        borderRadius: 8,
                                    },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: 4 }]}>
                                        {profile.name}
                                    </Text>
                                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                        {t('parentalControl.timeRange')}: {profile.startTime} - {profile.endTime}
                                    </Text>
                                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                        {t('parentalControl.activeDays')}: {profile.activeDays.map(d => getDayName(d).substring(0, 3)).join(', ')}
                                    </Text>
                                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                        {profile.deviceMacs.length} {t('parentalControl.selectDevices').toLowerCase()}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TouchableOpacity
                                        onPress={(e) => { e.stopPropagation(); onDeleteProfile(profile.id, profile.name); }}
                                        style={{ padding: 4 }}
                                    >
                                        <MaterialIcons name="delete" size={20} color={colors.error} />
                                    </TouchableOpacity>
                                    <MaterialIcons
                                        name={profile.enabled ? 'check-circle' : 'radio-button-unchecked'}
                                        size={24}
                                        color={profile.enabled ? colors.success : colors.textSecondary}
                                    />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}

                    <Button
                        title={t('parentalControl.addProfile')}
                        onPress={onAddProfile}
                        style={{ marginTop: spacing.md }}
                    />
                </View>
            )}
        </Card>
    );
}

export default ParentalControlCard;
