import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    Pressable,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedAlertHelper } from '../ThemedAlert';
import { ModalHeader } from '../ModalHeader';
import { ThemedSwitch } from '../ThemedSwitch';
import { BouncingDots } from '../LoadingIndicators';

interface ApnProfile {
    id?: string;
    name: string;
    apn: string;
    username?: string;
    password?: string;
    authType?: 'none' | 'pap' | 'chap' | 'pap_chap';
    ipType?: 'ipv4' | 'ipv6' | 'ipv4v6';
    isDefault?: boolean;
}

interface ApnModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: ApnProfile) => Promise<void>;
    profile: ApnProfile | null;
    activeApnProfileId: string;
    isSaving: boolean;
}

export function ApnModal({
    visible,
    onClose,
    onSave,
    profile,
    activeApnProfileId,
    isSaving,
}: ApnModalProps) {
    const { colors, typography } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const [apnName, setApnName] = useState('');
    const [apnApn, setApnApn] = useState('');
    const [apnUsername, setApnUsername] = useState('');
    const [apnPassword, setApnPassword] = useState('');
    const [apnIsDefault, setApnIsDefault] = useState(false);

    // Initial state to track unsaved changes
    const [initialState, setInitialState] = useState({
        name: '',
        apn: '',
        username: '',
        password: '',
        isDefault: false,
    });

    useEffect(() => {
        if (visible) {
            const defaultState = {
                name: profile?.name || '',
                apn: profile?.apn || '',
                username: profile?.username || '',
                password: profile?.password || '',
                isDefault: profile?.isDefault || false,
            };
            setApnName(defaultState.name);
            setApnApn(defaultState.apn);
            setApnUsername(defaultState.username);
            setApnPassword(defaultState.password);
            setApnIsDefault(defaultState.isDefault);
            setInitialState(defaultState);
        }
    }, [visible, profile]);

    const hasApnChanges = () => {
        return (
            apnName !== initialState.name ||
            apnApn !== initialState.apn ||
            apnUsername !== initialState.username ||
            apnPassword !== initialState.password ||
            apnIsDefault !== initialState.isDefault
        );
    };

    const handleClose = () => {
        if (hasApnChanges()) {
            ThemedAlertHelper.alert(
                t('common.unsavedChanges'),
                t('common.discardChangesMessage'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.discard'), style: 'destructive', onPress: onClose }
                ]
            );
        } else {
            onClose();
        }
    };

    const handleSave = () => {
        Keyboard.dismiss();
        if (!apnName.trim() || !apnApn.trim()) {
            ThemedAlertHelper.alert(t('common.error'), t('networkSettings.apnRequired'));
            return;
        }

        onSave({
            name: apnName.trim(),
            apn: apnApn.trim(),
            username: apnUsername,
            password: apnPassword,
            isDefault: apnIsDefault,
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                <ModalHeader
                    title={profile ? t('networkSettings.editApn') : t('networkSettings.addApn')}
                    onClose={handleClose}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        style={{ flex: 1, padding: 20 }}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Profile Name */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>{t('networkSettings.profileName')}</Text>
                            <TextInput
                                placeholder={t('networkSettings.profileName')}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                value={apnName}
                                onChangeText={setApnName}
                            />
                        </View>

                        {/* APN */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>APN</Text>
                            <TextInput
                                placeholder="APN"
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                value={apnApn}
                                onChangeText={setApnApn}
                            />
                        </View>

                        {/* Username */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>{t('settings.usernameLabel')}</Text>
                            <TextInput
                                placeholder={t('settings.usernameLabel')}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                value={apnUsername}
                                onChangeText={setApnUsername}
                            />
                        </View>

                        {/* Password */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>{t('settings.passwordLabel')}</Text>
                            <TextInput
                                placeholder={t('settings.passwordLabel')}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                secureTextEntry
                                value={apnPassword}
                                onChangeText={setApnPassword}
                            />
                        </View>

                        {/* Set as Default Toggle */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 16,
                            backgroundColor: colors.card,
                            padding: 12,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: colors.border
                        }}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: 'bold' }]}>{t('networkSettings.setAsDefault')}</Text>
                                <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('networkSettings.setAsDefaultHint')}</Text>
                            </View>
                            <ThemedSwitch
                                value={apnIsDefault}
                                onValueChange={setApnIsDefault}
                                disabled={profile?.id === activeApnProfileId}
                            />
                        </View>
                    </ScrollView>

                    <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 }]}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.saveButton,
                                { backgroundColor: hasApnChanges() ? colors.primary : colors.textSecondary },
                                pressed && { opacity: 0.8 }
                            ]}
                            onPress={() => {
                                if (hasApnChanges()) {
                                    handleSave();
                                } else {
                                    onClose();
                                }
                            }}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <BouncingDots size="small" color="#FFF" />
                            ) : (
                                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                                    {hasApnChanges() ? t('common.save') : t('common.cancel')}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1
    },
    input: {
        height: 50, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, fontSize: 16
    },
    footer: {
        padding: 20, paddingBottom: 40, borderTopWidth: 1
    },
    saveButton: {
        height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center'
    }
});
