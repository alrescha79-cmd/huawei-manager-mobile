import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { Button, SelectionModal, MeshGradientBackground, ThemedSwitch, BouncingDots, AnimatedScreen, AdNative } from '@/components';
import { InfoRow, SettingsSection, SettingsItem, PageHeader, ApnModal } from '@/components/settings';
import { useLanSettings } from '@/hooks/settings';

const ETHERNET_MODES = [
    { value: 'auto', labelKey: 'networkSettings.modeAuto' },
    { value: 'lan_only', labelKey: 'networkSettings.modeLanOnly' },
    { value: 'pppoe', labelKey: 'networkSettings.modePppoe' },
    { value: 'dynamic_ip', labelKey: 'networkSettings.modeDynamicIp' },
    { value: 'pppoe_dynamic', labelKey: 'networkSettings.modePppoeDynamic' },
];

export default function LanSettingsScreen() {
    const { colors, typography } = useTheme();
    const { t } = useTranslation();

    const {
        ethernetMode, ethernetStatus, isChangingEthernet,
        showEthernetModal, setShowEthernetModal, handleEthernetModeChange,
        dhcpSettings, setDhcpSettings, isTogglingDhcp, isSavingDhcp,
        showLeaseTimeDropdown, setShowLeaseTimeDropdown,
        handleDHCPToggle, handleSaveDHCPSettings, getLeaseTimeLabel,
        apnProfiles, activeApnProfileId, showApnModal, setShowApnModal,
        editingApn, setEditingApn, isSavingApn,
        openAddApnModal, openEditApnModal, handleSaveApnProfile,
        handleDeleteApnProfile, handleSetDefaultApn,
    } = useLanSettings({ t });

    return (
        <AnimatedScreen noAnimation>
            <MeshGradientBackground>
                <PageHeader title={t('settings.lanSettings')} showBackButton />
                <ScrollView
                    style={[styles.container, { backgroundColor: 'transparent' }]}
                    contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
                >
                    {/* Ethernet Section */}
                    <SettingsSection title={t('networkSettings.ethernet')}>
                        <SettingsItem
                            title={t('networkSettings.connectionMode')}
                            value={(() => { const mode = ETHERNET_MODES.find(m => m.value === ethernetMode); return mode ? t(mode.labelKey) : t('networkSettings.modeAuto'); })()}
                            onPress={() => setShowEthernetModal(true)}
                            rightElement={
                                isChangingEthernet ? <BouncingDots size="small" color={colors.primary} /> : undefined
                            }
                            isLast={!ethernetStatus.connected}
                        />

                        {ethernetStatus.connected && (
                            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                                <InfoRow label={t('networkSettings.ipAddress')} value={ethernetStatus.ipAddress} />
                                <InfoRow label={t('networkSettings.gateway')} value={ethernetStatus.gateway} />
                            </View>
                        )}
                    </SettingsSection>

                    <SelectionModal
                        visible={showEthernetModal}
                        title={t('networkSettings.connectionMode')}
                        options={ETHERNET_MODES.map(mode => ({
                            label: t(mode.labelKey),
                            value: mode.value
                        }))}
                        selectedValue={ethernetMode}
                        onSelect={(val) => {
                            setShowEthernetModal(false);
                            handleEthernetModeChange(val);
                        }}
                        onClose={() => setShowEthernetModal(false)}
                    />

                    {/* DHCP Section */}
                    <SettingsSection title={t('networkSettings.dhcpSettings')}>
                        <SettingsItem
                            title={t('networkSettings.dhcpServer')}
                            rightElement={
                                isTogglingDhcp ? <BouncingDots size="small" color={colors.primary} /> : (
                                    <ThemedSwitch value={dhcpSettings.dhcpStatus} onValueChange={handleDHCPToggle} />
                                )
                            }
                            showChevron={false}
                            isLast={!dhcpSettings.dhcpStatus}
                        />

                        {dhcpSettings.dhcpStatus && (
                            <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
                                <View style={styles.inputRow}>
                                    <Text style={[typography.body, { color: colors.text, marginBottom: 8 }]}>{t('networkSettings.dhcpIpRange')}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: colors.textSecondary }}>{dhcpSettings.dhcpIPAddress.split('.').slice(0, 3).join('.')}.</Text>
                                        <TextInput
                                            style={[styles.smallInput, { color: colors.text, borderColor: colors.border }]}
                                            value={dhcpSettings.dhcpStartIPAddress.split('.').pop()}
                                            onChangeText={val => {
                                                const base = dhcpSettings.dhcpIPAddress.split('.').slice(0, 3).join('.');
                                                setDhcpSettings(p => ({ ...p, dhcpStartIPAddress: `${base}.${val}` }))
                                            }}
                                            keyboardType="numeric"
                                        />
                                        <Text style={{ marginHorizontal: 8, color: colors.text }}>-</Text>
                                        <TextInput
                                            style={[styles.smallInput, { color: colors.text, borderColor: colors.border }]}
                                            value={dhcpSettings.dhcpEndIPAddress.split('.').pop()}
                                            onChangeText={val => {
                                                const base = dhcpSettings.dhcpIPAddress.split('.').slice(0, 3).join('.');
                                                setDhcpSettings(p => ({ ...p, dhcpEndIPAddress: `${base}.${val}` }))
                                            }}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                <SettingsItem
                                    title={t('networkSettings.dhcpLeaseTime')}
                                    value={getLeaseTimeLabel(dhcpSettings.dhcpLeaseTime)}
                                    onPress={() => setShowLeaseTimeDropdown(!showLeaseTimeDropdown)}
                                    showChevron={false}
                                    rightElement={<MaterialIcons name={showLeaseTimeDropdown ? "expand-less" : "expand-more"} size={24} color={colors.primary} />}
                                />

                                {showLeaseTimeDropdown && (
                                    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
                                        {[3600, 43200, 86400, 604800].map(val => (
                                            <TouchableOpacity key={val} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => {
                                                setDhcpSettings(p => ({ ...p, dhcpLeaseTime: val }));
                                                setShowLeaseTimeDropdown(false);
                                            }}>
                                                <Text style={{ color: colors.text }}>{getLeaseTimeLabel(val)}</Text>
                                                {dhcpSettings.dhcpLeaseTime === val && <MaterialIcons name="check" size={18} color={colors.primary} />}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                <View style={{ padding: 16 }}>
                                    <Button
                                        title={t('common.save')}
                                        onPress={handleSaveDHCPSettings}
                                        loading={isSavingDhcp}
                                    />
                                </View>
                            </View> 
                        )}
                    </SettingsSection>

                    <View style={{ paddingHorizontal: 16}}>
                        <AdNative />
                    </View>

                    <SettingsSection title={t('networkSettings.apnProfiles')}>

                        {apnProfiles.map((profile) => (
                            <SettingsItem
                                key={profile.id}
                                title={profile.name}
                                subtitle={profile.apn}
                                onPress={() => openEditApnModal(profile)}
                                showChevron={true}
                                rightElement={
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {profile.id === activeApnProfileId ? (
                                            <MaterialIcons name="check-circle" size={22} color={colors.primary} style={{ marginRight: 8 }} />
                                        ) : (
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleSetDefaultApn(profile.id); }} style={{ padding: 4, marginRight: 4 }}>
                                                <MaterialIcons name="radio-button-unchecked" size={22} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        )}
                                        {profile.readOnly ? (
                                            <View style={{ padding: 4, opacity: 0.5 }}>
                                                <MaterialIcons name="lock" size={18} color={colors.textSecondary} />
                                            </View>
                                        ) : profile.id === activeApnProfileId ? (
                                            <View style={{ padding: 4, opacity: 0.3 }}>
                                                <MaterialIcons name="delete-outline" size={20} color={colors.textSecondary} />
                                            </View>
                                        ) : (
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteApnProfile(profile.id); }} style={{ padding: 4 }}>
                                                <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                }
                            />
                        ))}
                        <SettingsItem
                            title={t('networkSettings.addApn')}
                            onPress={openAddApnModal}
                            icon="add"
                            color={colors.primary}
                            isLast
                        />
                    </SettingsSection>

                    {/* APN Modal */}
                    <ApnModal
                        visible={showApnModal}
                        onClose={() => { setShowApnModal(false); setEditingApn(null); }}
                        onSave={handleSaveApnProfile}
                        profile={editingApn}
                        activeApnProfileId={activeApnProfileId}
                        isSaving={isSavingApn}
                    />
                </ScrollView>
            </MeshGradientBackground>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    dropdownItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    inputRow: { padding: 16 },
    smallInput: {
        borderWidth: 1, borderRadius: 4, width: 44, padding: 4, textAlign: 'center',
    },
});
