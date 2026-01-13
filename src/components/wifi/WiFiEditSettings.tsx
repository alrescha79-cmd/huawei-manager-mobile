import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { SelectionModal, BouncingDots } from '@/components';
import { wifiStyles as styles } from './wifiStyles';

interface WiFiEditSettingsProps {
    t: (key: string) => string;
    isEditExpanded: boolean;
    formSsid: string;
    formSecurityMode: string;
    formPassword: string;
    showPassword: boolean;
    showSecurityDropdown: boolean;
    hasChanges: boolean;
    isSaving: boolean;
    onToggleExpanded: () => void;
    onSetFormSsid: (ssid: string) => void;
    onSetFormSecurityMode: (mode: string) => void;
    onSetFormPassword: (password: string) => void;
    onToggleShowPassword: () => void;
    onSetShowSecurityDropdown: (show: boolean) => void;
    onSaveSettings: () => void;
    getSecurityModeLabel: (value: string) => string;
}

export function WiFiEditSettings({
    t,
    isEditExpanded,
    formSsid,
    formSecurityMode,
    formPassword,
    showPassword,
    showSecurityDropdown,
    hasChanges,
    isSaving,
    onToggleExpanded,
    onSetFormSsid,
    onSetFormSecurityMode,
    onSetFormPassword,
    onToggleShowPassword,
    onSetShowSecurityDropdown,
    onSaveSettings,
    getSecurityModeLabel,
}: WiFiEditSettingsProps) {
    const { colors, typography, spacing } = useTheme();

    return (
        <>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

            <TouchableOpacity
                style={[styles.collapseHeader, { borderColor: colors.border }]}
                onPress={onToggleExpanded}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                        {t('wifi.editSettings')}
                    </Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                        {t('wifi.editSettingsHint')}
                    </Text>
                </View>
                <MaterialIcons
                    name={isEditExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={24}
                    color={colors.textSecondary}
                />
            </TouchableOpacity>

            {isEditExpanded && (
                <View style={{ marginTop: spacing.md }}>
                    <View style={styles.formGroup}>
                        <Text style={[typography.subheadline, { color: colors.textSecondary, marginBottom: 6 }]}>
                            {t('wifi.wifiName')}
                        </Text>
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                color: colors.text
                            }]}
                            value={formSsid}
                            onChangeText={onSetFormSsid}
                            placeholder={t('wifi.wifiNamePlaceholder')}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[typography.subheadline, { color: colors.textSecondary, marginBottom: 6 }]}>
                            {t('wifi.securityMode')}
                        </Text>
                        <TouchableOpacity
                            onPress={() => onSetShowSecurityDropdown(true)}
                            style={[styles.dropdown, {
                                backgroundColor: colors.card,
                                borderColor: colors.border
                            }]}
                        >
                            <Text style={[typography.body, { color: colors.text }]}>
                                {getSecurityModeLabel(formSecurityMode)}
                            </Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {formSecurityMode !== 'OPEN' && (
                        <View style={styles.formGroup}>
                            <Text style={[typography.subheadline, { color: colors.textSecondary, marginBottom: 6 }]}>
                                {t('wifi.password')}
                            </Text>
                            <View style={{ position: 'relative' }}>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text,
                                        paddingRight: 48
                                    }]}
                                    value={formPassword}
                                    onChangeText={onSetFormPassword}
                                    placeholder={t('wifi.enterPassword')}
                                    placeholderTextColor={colors.textSecondary}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    onPress={onToggleShowPassword}
                                    style={{
                                        position: 'absolute',
                                        right: 12,
                                        top: 0,
                                        bottom: 0,
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    <MaterialIcons
                                        name={showPassword ? 'visibility' : 'visibility-off'}
                                        size={22}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                            <Text style={[typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
                                {t('wifi.passwordHint')}
                            </Text>
                        </View>
                    )}

                    <SelectionModal
                        visible={showSecurityDropdown}
                        title={t('wifi.securityMode')}
                        options={[
                            { label: t('wifi.authModes.wpa2Psk'), value: 'WPA2-PSK' },
                            { label: t('wifi.authModes.wpaPsk'), value: 'WPA-PSK' },
                            { label: t('wifi.authModes.wpaWpa2Psk'), value: 'WPA/WPA2-PSK' },
                            { label: t('wifi.authModes.wpa2Enterprise'), value: 'WPA2' },
                            { label: t('wifi.authModes.wpaEnterprise'), value: 'WPA' },
                            { label: t('wifi.authModes.shared'), value: 'SHARED' },
                            { label: t('wifi.authModes.open'), value: 'OPEN' },
                        ]}
                        selectedValue={formSecurityMode}
                        onSelect={(val) => {
                            onSetFormSecurityMode(val);
                            onSetShowSecurityDropdown(false);
                        }}
                        onClose={() => onSetShowSecurityDropdown(false)}
                    />

                    {hasChanges && (
                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                {
                                    backgroundColor: colors.primary,
                                    opacity: isSaving ? 0.6 : 1
                                }
                            ]}
                            onPress={onSaveSettings}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <BouncingDots size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                                    {t('wifi.saveChanges')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </>
    );
}

export default WiFiEditSettings;
