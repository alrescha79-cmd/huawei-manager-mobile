import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { BlurView } from 'expo-blur';
import { ModalMeshGradient } from './ModalMeshGradient';
import { ThemedAlertHelper } from './ThemedAlert';

interface PageSheetModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    onSave?: () => void;
    isSaving?: boolean;
    saveText?: string;
    cancelText?: string;
    hasChanges?: boolean;
    children: React.ReactNode;
}

export function PageSheetModal({
    visible,
    onClose,
    title,
    onSave,
    isSaving = false,
    saveText = 'Save',
    cancelText = 'Cancel',
    hasChanges = false,
    children,
}: PageSheetModalProps) {
    const { colors, typography, glassmorphism, isDark } = useTheme();
    const { t } = useTranslation();

    const handleClose = () => {
        if (hasChanges) {
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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="overFullScreen"
            transparent
            onRequestClose={handleClose}
        >
            <BlurView
                intensity={glassmorphism.blur.modal}
                tint={isDark ? 'dark' : 'light'}
                experimentalBlurMethod='dimezisBlurView'
                style={[
                    styles.container,
                    { backgroundColor: isDark ? glassmorphism.background.dark.modal : glassmorphism.background.light.modal }
                ]}
            >
                <ModalMeshGradient />
                <View style={[styles.header, {
                    borderBottomColor: colors.border,
                    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16
                }]}>
                    <TouchableOpacity onPress={handleClose}>
                        <Text style={[typography.body, { color: colors.primary }]}>{cancelText}</Text>
                    </TouchableOpacity>
                    <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                        {title}
                    </Text>
                    {onSave ? (
                        <TouchableOpacity onPress={onSave} disabled={isSaving}>
                            {isSaving ? (
                                <ActivityIndicator color={colors.primary} size="small" />
                            ) : (
                                <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>{saveText}</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 50 }} />
                    )}
                </View>
                {children}
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
});
