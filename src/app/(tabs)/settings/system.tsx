import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { MeshGradientBackground, ThemedSwitch, BouncingDots, AnimatedScreen, AdNative, PageSheetModal, Button } from '@/components';
import { SettingsSection, SettingsItem, PageHeader, ProfileEditModal } from '@/components/settings';
import { useSystemSettings } from '@/hooks/settings';

const TIMEZONES = [
    'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6', 'UTC-5',
    'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3',
    'UTC+4', 'UTC+5', 'UTC+5:30', 'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10',
    'UTC+11', 'UTC+12',
];

export default function SystemSettingsScreen() {
    const { colors, typography } = useTheme();
    const { t } = useTranslation();

    const {
        formattedTime, sntpEnabled, timezone,
        showTimezoneModal, setShowTimezoneModal, isTogglingSntp,
        handleToggleSntp, handleTimezoneChange,
        profiles, showEditProfile, setShowEditProfile,
        editingProfile, setEditingProfile, isSwitching, updateProfile, addProfile,
        handleOpenEditProfile, handleOpenAddProfile, handleSwitchProfile, handleDeleteProfile,
        handleReboot, handleLogout, handleReset,
    } = useSystemSettings({ t });

    return (
        <AnimatedScreen noAnimation>
            <MeshGradientBackground>
                <PageHeader title={t('settings.system')} showBackButton />
                <ScrollView
                    style={[styles.container, { backgroundColor: 'transparent' }]}
                    contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
                >
                    {/* Time Settings */}
                    <SettingsSection title={t('timeSettings.title')}>
                        <SettingsItem
                            title={t('timeSettings.currentTime')}
                            value={formattedTime}
                            showChevron={false}
                        />
                        <SettingsItem
                            title={t('timeSettings.sntpServer')}
                            showChevron={false}
                            rightElement={isTogglingSntp ? <BouncingDots size="small" color={colors.primary} /> : (
                                <ThemedSwitch
                                    value={sntpEnabled}
                                    onValueChange={handleToggleSntp}
                                />
                            )}
                        />
                        <SettingsItem
                            title={t('timeSettings.timeZone')}
                            value={timezone}
                            onPress={() => setShowTimezoneModal(true)}
                            isLast
                        />
                    </SettingsSection>

                    {/* Modem Profiles */}
                    <SettingsSection title={t('settings.modemControl')}>
                        <View style={[styles.innerContent]}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 12, fontStyle: 'italic' }]}>
                                {t('settings.modemProfilesDesc')}
                            </Text>

                            {profiles.length === 0 && (
                                <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 }]}>
                                    {t('settings.noProfiles')}
                                </Text>
                            )}

                            {profiles.map((profile) => (
                                <View
                                    key={profile.id}
                                    style={[
                                        styles.profileCard,
                                        {
                                            borderColor: profile.isActive ? colors.primary : colors.border,
                                            backgroundColor: profile.isActive
                                                ? (colors.primary + '18')
                                                : colors.card,
                                        },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <MaterialIcons name="router" size={16} color={profile.isActive ? colors.primary : colors.textSecondary} />
                                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                                                {profile.name}
                                            </Text>
                                            {profile.isActive && (
                                                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                                                    <Text style={styles.activeBadgeText}>{t('settings.activeProfile')}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                                            {profile.modemIp} · {profile.username}
                                        </Text>
                                    </View>
                                    <View style={styles.profileActions}>
                                        {!profile.isActive && (
                                            <TouchableOpacity
                                                onPress={() => handleSwitchProfile(profile)}
                                                disabled={isSwitching}
                                                style={[styles.profileActionBtn, { borderColor: colors.primary }]}
                                            >
                                                <Text style={[typography.caption1, { color: colors.primary, fontWeight: '600' }]}>
                                                    {isSwitching ? '...' : t('settings.switchProfile')}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            onPress={() => handleOpenEditProfile(profile)}
                                            style={[styles.profileActionBtn, { borderColor: colors.border }]}
                                        >
                                            <MaterialIcons name="edit" size={16} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteProfile(profile)}
                                            style={[styles.profileActionBtn, { borderColor: colors.error }]}
                                        >
                                            <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            <View style={{ marginTop: 8 }}>
                                <Button
                                    title={t('settings.addProfile')}
                                    onPress={handleOpenAddProfile}
                                    variant="secondary"
                                />
                            </View>
                        </View>
                    </SettingsSection>

                    <View style={{ paddingHorizontal: 16}}>
                        <AdNative />
                    </View>

                    <ProfileEditModal
                        visible={showEditProfile}
                        onClose={() => { setShowEditProfile(false); setEditingProfile(null); }}
                        profile={editingProfile}
                        onSave={async (id, updatedData) => {
                            if (id) {
                                await updateProfile(id, updatedData);
                            } else {
                                await addProfile(updatedData);
                            }
                        }}
                    />

                    {/* Actions */}
                    <SettingsSection title={t('settings.actions')}>
                        <SettingsItem
                            icon="restart-alt"
                            title={t('settings.rebootModem')}
                            onPress={handleReboot}
                        />
                        <SettingsItem
                            icon="restore"
                            title={t('settings.resetFactory')}
                            onPress={handleReset}
                        />
                        <SettingsItem
                            icon="logout"
                            title={t('settings.logout')}
                            onPress={handleLogout}
                            isLast
                        />
                    </SettingsSection>

                    {/* Timezone Modal */}
                    <PageSheetModal
                        visible={showTimezoneModal}
                        onClose={() => setShowTimezoneModal(false)}
                        title={t('timeSettings.timeZone')}
                        cancelText={t('common.cancel') || 'Cancel'}
                    >
                        <ScrollView style={{ flex: 1, paddingHorizontal: 16, marginTop: 8 }}>
                            {TIMEZONES.map((tz) => (
                                <TouchableOpacity
                                    key={tz}
                                    style={[
                                        styles.modalItem,
                                        { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                                    ]}
                                    onPress={() => handleTimezoneChange(tz)}
                                >
                                    <Text style={{ color: timezone === tz ? colors.primary : colors.text, fontSize: 16 }}>{tz}</Text>
                                    {timezone === tz && <MaterialIcons name="check" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </PageSheetModal>
                </ScrollView>
            </MeshGradientBackground>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    innerContent: {
        padding: 16,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        gap: 8,
    },
    profileActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    profileActionBtn: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeBadge: {
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    activeBadgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
});
