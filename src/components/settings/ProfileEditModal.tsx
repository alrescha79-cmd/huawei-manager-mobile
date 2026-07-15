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
    ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedAlertHelper } from '../ThemedAlert';
import { ModalHeader } from '../ModalHeader';
import { BouncingDots } from '../LoadingIndicators';

interface ProfileData {
    id: string;
    name: string;
    modemIp: string;
    username: string;
    password: string;
}

interface ProfileEditModalProps {
    visible: boolean;
    onClose: () => void;
    profile: ProfileData | null;
    onSave: (id: string | null, updatedData: Omit<ProfileData, 'id'>) => Promise<void>;
}

export function ProfileEditModal({
    visible,
    onClose,
    profile,
    onSave,
}: ProfileEditModalProps) {
    const { colors, typography } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [modemIp, setModemIp] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [initialState, setInitialState] = useState({
        name: '',
        modemIp: '',
        username: '',
        password: '',
    });

    useEffect(() => {
        if (visible) {
            const defaultState = {
                name: profile?.name || '',
                modemIp: profile?.modemIp || '192.168.8.1',
                username: profile?.username || 'admin',
                password: profile?.password || '',
            };
            setName(defaultState.name);
            setModemIp(defaultState.modemIp);
            setUsername(defaultState.username);
            setPassword(defaultState.password);
            setInitialState(defaultState);
            setIsPasswordVisible(false);
        }
    }, [visible, profile]);

    const hasChanges = () => {
        return (
            name !== initialState.name ||
            modemIp !== initialState.modemIp ||
            username !== initialState.username ||
            password !== initialState.password
        );
    };

    const handleClose = () => {
        if (hasChanges()) {
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

    const handleSave = async () => {
        Keyboard.dismiss();
        if (!name.trim()) return;
        if (password.length > 0 && password.length < 8) {
            ThemedAlertHelper.alert(t('common.error'), t('settings.passwordLengthError'));
            return;
        }

        setIsSaving(true);
        try {
            await onSave(profile ? profile.id : null, {
                name,
                modemIp,
                username,
                password,
            });
            onClose();
        } catch {
        } finally {
            setIsSaving(false);
        }
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
                    title={profile ? t('settings.editProfileTitle') : t('settings.addProfileTitle')}
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
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>{t('settings.profileName')}</Text>
                            <TextInput
                                placeholder={t('settings.profileName')}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* Modem IP */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>{t('settings.modemIpLabel')}</Text>
                            <TextInput
                                placeholder="192.168.8.1"
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                value={modemIp}
                                onChangeText={setModemIp}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Username */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>{t('settings.usernameLabel')}</Text>
                            <TextInput
                                placeholder={t('settings.usernameLabel')}
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Password */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>{t('settings.passwordLabel')}</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    placeholder={t('settings.passwordLabel')}
                                    placeholderTextColor={colors.textSecondary}
                                    style={[styles.input, styles.passwordInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!isPasswordVisible}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                >
                                    <MaterialIcons
                                        name={isPasswordVisible ? 'visibility' : 'visibility-off'}
                                        size={22}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 }]}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.saveButton,
                                { backgroundColor: hasChanges() && name.trim() ? colors.primary : colors.textSecondary },
                                pressed && { opacity: 0.8 }
                            ]}
                            onPress={() => {
                                if (hasChanges() && name.trim()) {
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
                                    {hasChanges() && name.trim() ? t('common.save') : t('common.cancel')}
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
    input: {
        height: 50, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, fontSize: 16
    },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
    },
    footer: {
        padding: 20, paddingBottom: 40, borderTopWidth: 1
    },
    saveButton: {
        height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center'
    },
});
