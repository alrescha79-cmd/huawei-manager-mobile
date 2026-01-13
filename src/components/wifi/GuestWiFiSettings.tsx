import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ThemedSwitch, BouncingDots } from '@/components';
import { wifiStyles as styles } from './wifiStyles';

interface GuestWiFiSettingsProps {
    t: (key: string) => string;
    guestWifiEnabled: boolean;
    isTogglingGuest: boolean;
    guestWifiDuration: string;
    showGuestDurationDropdown: boolean;
    guestTimeRemaining: number;
    isTimeRemainingActive: boolean;
    isExtendingTime: boolean;
    guestWifiSsid: string;
    guestWifiSecurity: string;
    showGuestSecurityDropdown: boolean;
    guestWifiPassword: string;
    isSavingGuestSettings: boolean;
    onToggleGuestWiFi: (enabled: boolean) => void;
    onSetShowGuestDurationDropdown: (show: boolean) => void;
    onSetGuestWifiDuration: (duration: string) => void;
    onExtendGuestTime: () => void;
    onSetGuestWifiSsid: (ssid: string) => void;
    onSetShowGuestSecurityDropdown: (show: boolean) => void;
    onSetGuestWifiSecurity: (security: string) => void;
    onSetGuestWifiPassword: (password: string) => void;
    onSaveGuestSettings: () => void;
    formatTimeRemaining: (seconds: number) => string;
}

export function GuestWiFiSettings({
    t,
    guestWifiEnabled,
    isTogglingGuest,
    guestWifiDuration,
    showGuestDurationDropdown,
    guestTimeRemaining,
    isTimeRemainingActive,
    isExtendingTime,
    guestWifiSsid,
    guestWifiSecurity,
    showGuestSecurityDropdown,
    guestWifiPassword,
    isSavingGuestSettings,
    onToggleGuestWiFi,
    onSetShowGuestDurationDropdown,
    onSetGuestWifiDuration,
    onExtendGuestTime,
    onSetGuestWifiSsid,
    onSetShowGuestSecurityDropdown,
    onSetGuestWifiSecurity,
    onSetGuestWifiPassword,
    onSaveGuestSettings,
    formatTimeRemaining,
}: GuestWiFiSettingsProps) {
    const { colors, typography, spacing } = useTheme();

    return (
        <>
            <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text }]}>{t('wifi.guestWifi')}</Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                        {guestWifiEnabled ? t('wifi.enabled') : t('wifi.disabled')}
                    </Text>
                </View>
                {isTogglingGuest ? (
                    <BouncingDots size="medium" color={colors.primary} />
                ) : (
                    <ThemedSwitch value={guestWifiEnabled} onValueChange={onToggleGuestWiFi} />
                )}
            </View>

            {guestWifiEnabled && (
                <View style={{ marginTop: spacing.md, paddingLeft: spacing.md }}>
                    <View style={styles.formGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            {t('wifi.duration')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => onSetShowGuestDurationDropdown(!showGuestDurationDropdown)}
                        >
                            <Text style={[typography.body, { color: colors.text }]}>
                                {guestWifiDuration === '0' ? t('wifi.durationUnlimited') :
                                    guestWifiDuration === '24' ? t('wifi.duration1Day') :
                                        guestWifiDuration === '4' ? t('wifi.duration4Hours') : t('wifi.durationUnlimited')}
                            </Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                        {showGuestDurationDropdown && (
                            <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {[
                                    { value: '0', label: t('wifi.durationUnlimited') },
                                    { value: '24', label: t('wifi.duration1Day') },
                                    { value: '4', label: t('wifi.duration4Hours') },
                                ].map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[styles.dropdownItem, guestWifiDuration === option.value && { backgroundColor: colors.primary + '20' }]}
                                        onPress={() => {
                                            onSetGuestWifiDuration(option.value);
                                            onSetShowGuestDurationDropdown(false);
                                        }}
                                    >
                                        <Text style={[typography.body, { color: guestWifiDuration === option.value ? colors.primary : colors.text }]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {guestWifiDuration !== '0' && isTimeRemainingActive && (
                        <View style={[styles.formGroup, { backgroundColor: colors.card, padding: spacing.md, borderRadius: 8, marginTop: spacing.sm }]}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                {t('wifi.timeRemaining')}
                            </Text>
                            <Text style={[typography.body, { color: colors.primary, fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold' }]}>
                                {formatTimeRemaining(guestTimeRemaining)}
                            </Text>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: colors.success,
                                    paddingVertical: spacing.sm,
                                    paddingHorizontal: spacing.md,
                                    borderRadius: 6,
                                    marginTop: spacing.sm,
                                    opacity: isExtendingTime ? 0.6 : 1,
                                }}
                                onPress={onExtendGuestTime}
                                disabled={isExtendingTime}
                            >
                                {isExtendingTime ? (
                                    <BouncingDots size="small" color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="add" size={18} color="#fff" />
                                        <Text style={[typography.caption1, { color: '#fff', marginLeft: 4, fontWeight: '600' }]}>
                                            {t('wifi.extend30Min')}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.formGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            {t('wifi.guestSsid')}
                        </Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                            value={guestWifiSsid}
                            onChangeText={onSetGuestWifiSsid}
                            placeholder={t('wifi.enterSsid')}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            {t('wifi.security')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => onSetShowGuestSecurityDropdown(!showGuestSecurityDropdown)}
                        >
                            <Text style={[typography.body, { color: colors.text }]}>
                                {guestWifiSecurity === 'OPEN' ? t('wifi.securityOpen') : t('wifi.securityEncrypted')}
                            </Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                        {showGuestSecurityDropdown && (
                            <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {[
                                    { value: 'OPEN', label: t('wifi.securityOpen') },
                                    { value: 'WPA2-PSK', label: t('wifi.securityEncrypted') },
                                ].map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[styles.dropdownItem, guestWifiSecurity === option.value && { backgroundColor: colors.primary + '20' }]}
                                        onPress={() => {
                                            onSetGuestWifiSecurity(option.value);
                                            onSetShowGuestSecurityDropdown(false);
                                        }}
                                    >
                                        <Text style={[typography.body, { color: guestWifiSecurity === option.value ? colors.primary : colors.text }]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {guestWifiSecurity !== 'OPEN' && (
                        <View style={styles.formGroup}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                {t('wifi.password')}
                            </Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                value={guestWifiPassword}
                                onChangeText={onSetGuestWifiPassword}
                                placeholder={t('wifi.enterPassword')}
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }, isSavingGuestSettings && { opacity: 0.6 }]}
                        onPress={onSaveGuestSettings}
                        disabled={isSavingGuestSettings}
                    >
                        {isSavingGuestSettings ? (
                            <BouncingDots size="small" color="#fff" />
                        ) : (
                            <Text style={[typography.body, { color: '#fff', fontWeight: '600' }]}>{t('common.save')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </>
    );
}

export default GuestWiFiSettings;
