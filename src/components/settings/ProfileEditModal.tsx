import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { PageSheetModal } from '../PageSheetModal';
import { MeshGradientBackground } from '../MeshGradientBackground';
import { Button } from '../Button';

interface ProfileData {
    id: string;
    name: string;
    modemIp: string;
    username: string;
    password?: string;
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

    const [name, setName] = useState('');
    const [modemIp, setModemIp] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            if (profile) {
                setName(profile.name || '');
                setModemIp(profile.modemIp || '');
                setUsername(profile.username || '');
                setPassword(profile.password || '');
            } else {
                setName('');
                setModemIp('192.168.8.1');
                setUsername('admin');
                setPassword('');
            }
            setIsPasswordVisible(false);
            setPasswordError('');
        }
    }, [visible, profile]);

    const handleSave = async () => {
        if (password.length > 0 && password.length < 8) {
            setPasswordError(t('settings.passwordLengthError'));
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
        } catch (error) {
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageSheetModal
            visible={visible}
            onClose={onClose}
            title={profile ? t('settings.editProfileTitle') : t('settings.addProfileTitle')}
        >
            <MeshGradientBackground>
                <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}>
                    <View style={styles.inputGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.profileName')}</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.modemIpLabel')}</Text>
                        <TextInput
                            value={modemIp}
                            onChangeText={setModemIp}
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.usernameLabel')}</Text>
                        <TextInput
                            value={username}
                            onChangeText={setUsername}
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                            autoCapitalize="none"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('settings.passwordLabel')}</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (text.length > 0 && text.length < 8) {
                                        setPasswordError(t('settings.passwordLengthError'));
                                    } else {
                                        setPasswordError('');
                                    }
                                }}
                                secureTextEntry={!isPasswordVisible}
                                style={[styles.input, styles.passwordInput, { color: colors.text, borderColor: passwordError ? colors.error : colors.border }]}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                            >
                                <MaterialIcons
                                    name={isPasswordVisible ? 'visibility' : 'visibility-off'}
                                    size={24}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                        {passwordError ? <Text style={{ color: colors.error, marginTop: 4 }}>{passwordError}</Text> : null}
                    </View>
                    <Button
                        title={isSaving ? t('common.saving') : t('common.save')}
                        loading={isSaving}
                        disabled={isSaving || !name.trim() || !!passwordError}
                        onPress={handleSave}
                    />
                </View>
            </MeshGradientBackground>
        </PageSheetModal>
    );
}

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: 8,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    passwordContainer: {
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
});
