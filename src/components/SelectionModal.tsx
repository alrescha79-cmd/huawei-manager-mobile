import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';

// ... (keep interface SelectionOption)

export interface SelectionOption {
    label: string;
    value: string | number;
}

interface SelectionModalProps {
    visible: boolean;
    title: string;
    options: SelectionOption[];
    selectedValue: string | number;
    onSelect: (value: any) => void;
    onClose: () => void;
}

export function SelectionModal({
    visible,
    title,
    options,
    selectedValue,
    onSelect,
    onClose,
}: SelectionModalProps) {
    const { colors, typography, isDark } = useTheme();
    const { t } = useTranslation();

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <BlurView
                    intensity={30}
                    tint={isDark ? 'dark' : 'light'}
                    experimentalBlurMethod='dimezisBlurView'
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: isDark ? 'rgba(10, 10, 10, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            borderWidth: 1,
                        }
                    ]}
                >
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                    </View>

                    <View style={{ width: '100%', height: 1, backgroundColor: colors.border, marginBottom: 8 }} />

                    <ScrollView style={{ maxHeight: 300, paddingHorizontal: 16 }}>
                        {options.map((option) => {
                            const isSelected = selectedValue === option.value;
                            return (
                                <TouchableOpacity
                                    key={String(option.value)}
                                    style={[
                                        styles.modalItem,
                                        {
                                            backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                                            borderColor: isSelected ? colors.primary : 'transparent'
                                        }
                                    ]}
                                    onPress={() => onSelect(option.value)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.modalItemText,
                                        {
                                            color: isSelected ? colors.primary : colors.text,
                                            fontWeight: isSelected ? '700' : '500'
                                        }
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <MaterialIcons
                                        name={isSelected ? "check-circle" : "radio-button-unchecked"}
                                        size={24}
                                        color={isSelected ? colors.primary : colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={{ padding: 16 }}>
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: colors.error }]}
                            onPress={onClose}
                        >
                            <Text style={styles.buttonText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 16,
        overflow: 'hidden',
        maxHeight: 500, // Increased slightly to accommodate larger lists if needed
        width: '85%',
        borderWidth: 1,
        alignSelf: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    modalItemText: {
        fontSize: 16,
    },
    closeButton: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
