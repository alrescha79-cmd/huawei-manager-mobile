import React from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { KeyboardAnimatedView, BouncingDots } from '@/components';

interface SMSComposeModalProps {
    visible: boolean;
    phoneNumber: string;
    onPhoneNumberChange: (value: string) => void;
    message: string;
    onMessageChange: (value: string) => void;
    isSending: boolean;
    t: (key: string) => string;
    onClose: () => void;
    onSend: () => void;
}

/**
 * Modal for composing new SMS messages
 */
export function SMSComposeModal({
    visible,
    phoneNumber,
    onPhoneNumberChange,
    message,
    onMessageChange,
    isSending,
    t,
    onClose,
    onSend,
}: SMSComposeModalProps) {
    const { colors, typography, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const canSend = phoneNumber.trim() && message.trim() && !isSending;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <StatusBar
                backgroundColor={colors.background}
                barStyle={isDark ? 'light-content' : 'dark-content'}
            />
            <KeyboardAnimatedView
                style={[styles.modalContainer, { backgroundColor: colors.background }]}
            >
                <View style={[
                    styles.composeHeader,
                    {
                        borderBottomColor: colors.border,
                        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16
                    }
                ]}>
                    <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                        <MaterialIcons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[typography.headline, { color: colors.text, fontWeight: '600' }]}>
                        {t('sms.newMessage')}
                    </Text>
                    <View style={styles.headerButton} />
                </View>

                <View style={{ flex: 1 }}>
                    <View style={[styles.composeField, { borderBottomColor: colors.border }]}>
                        <Text style={[typography.body, { color: colors.textSecondary, marginRight: 12 }]}>
                            {t('sms.to')}:
                        </Text>
                        <TextInput
                            style={[typography.body, { flex: 1, color: colors.text, padding: 0 }]}
                            value={phoneNumber}
                            onChangeText={onPhoneNumberChange}
                            placeholder={t('sms.phoneNumberPlaceholder') || '+1234567890'}
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                <View style={[
                    styles.composeSendBar,
                    {
                        borderTopColor: colors.border,
                        backgroundColor: colors.card,
                        paddingBottom: Math.max(insets.bottom, 12)
                    }
                ]}>
                    <TextInput
                        style={[
                            styles.composeSendInput,
                            { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }
                        ]}
                        value={message}
                        onChangeText={onMessageChange}
                        placeholder={t('sms.typeMessage')}
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        maxLength={160}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            { backgroundColor: canSend ? colors.primary : colors.textSecondary }
                        ]}
                        onPress={onSend}
                        disabled={!canSend}
                    >
                        {isSending ? (
                            <BouncingDots size="small" color="#FFF" />
                        ) : (
                            <MaterialIcons name="send" size={20} color="#FFF" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAnimatedView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
    },
    composeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    composeField: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    composeSendBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingTop: 12,
        paddingHorizontal: 12,
        borderTopWidth: 1,
    },
    composeSendInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        marginRight: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SMSComposeModal;
