import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { PageSheetModal } from '../PageSheetModal';
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
    onSave: (id: string, updatedData: Omit<ProfileData, 'id'>) => Promise<void>;
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
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (visible && profile) {
            setName(profile.name || '');
            setModemIp(profile.modemIp || '');
            setUsername(profile.username || '');
            setPassword(profile.password || '');
        }
    }, [visible, profile]);

    const handleSave = async () => {
        if (!profile) return;
        setIsSaving(true);
        try {
            await onSave(profile.id, {
                name,
                modemIp,
                username,
                password,
            });
            onClose();
        } catch (error) {
            // Error handled by caller
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageSheetModal
            visible={visible}
            onClose={onClose}
            title={t('settings.editProfileTitle')}
        >
            {profile && (
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
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        />
                    </View>
                    <Button
                        title={isSaving ? t('common.saving') : t('common.save')}
                        loading={isSaving}
                        disabled={isSaving || !name.trim()}
                        onPress={handleSave}
                    />
                </View>
            )}
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
});
