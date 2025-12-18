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

interface PageSheetModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    onSave?: () => void;
    isSaving?: boolean;
    saveText?: string;
    cancelText?: string;
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
    children,
}: PageSheetModalProps) {
    const { colors, typography } = useTheme();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, {
                    borderBottomColor: colors.border,
                    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16
                }]}>
                    <TouchableOpacity onPress={onClose}>
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
            </View>
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
