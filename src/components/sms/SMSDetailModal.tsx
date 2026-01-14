import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    StatusBar,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { BouncingDots, KeyboardAnimatedView } from '@/components';
import { SMSMessage } from '@/types';
import { smsStyles as styles } from './smsStyles';

interface SMSDetailModalProps {
    visible: boolean;
    selectedMessage: SMSMessage | null;
    replyMessage: string;
    isSending: boolean;
    t: (key: string) => string;
    onClose: () => void;
    onDelete: (index: string) => void;
    onReply: () => void;
    onReplyChange: (text: string) => void;
    renderMessageContent: (content: string) => React.ReactNode;
}

export function SMSDetailModal({
    visible,
    selectedMessage,
    replyMessage,
    isSending,
    t,
    onClose,
    onDelete,
    onReply,
    onReplyChange,
    renderMessageContent,
}: SMSDetailModalProps) {
    const { colors, typography, spacing, glassmorphism, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const handleClose = () => {
        onClose();
    };

    const handleDelete = () => {
        if (selectedMessage) {
            onDelete(selectedMessage.index);
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <StatusBar backgroundColor={colors.background} barStyle={isDark ? 'light-content' : 'dark-content'} />
            <KeyboardAnimatedView
                style={[styles.modalContainer, { backgroundColor: colors.background }]}
            >
                <View style={[
                    styles.modalHeader,
                    {
                        borderBottomColor: colors.border,
                        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16
                    }
                ]}>
                    <TouchableOpacity onPress={handleClose} style={{ width: 40 }}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>
                        {selectedMessage?.phone || ''}
                    </Text>
                    <TouchableOpacity onPress={handleDelete} style={{ width: 40, alignItems: 'flex-end' }}>
                        <MaterialIcons name="delete" size={24} color={colors.error} />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                    <ScrollView
                        style={[styles.modalContent, { backgroundColor: colors.background }]}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        {selectedMessage && (
                            <>
                                <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
                                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                        {dayjs(selectedMessage.date).format('dddd, MMMM D, YYYY')}
                                    </Text>
                                    <Text style={[typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                                        {dayjs(selectedMessage.date).format('h:mm A')}
                                    </Text>
                                </View>

                                <View style={{ alignItems: 'flex-start' }}>
                                    <View style={[
                                        styles.chatBubble,
                                        {
                                            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
                                            borderWidth: 1,
                                            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
                                        }
                                    ]}>
                                        {renderMessageContent(selectedMessage.content)}
                                    </View>
                                </View>
                            </>
                        )}
                    </ScrollView>

                    <View style={[styles.modernReplyBar, {
                        backgroundColor: colors.background,
                        borderTopColor: colors.border,
                        paddingBottom: Math.max(insets.bottom, 16)
                    }]}>
                        <View style={[styles.modernInputContainer, {
                            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
                            borderWidth: 1,
                            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
                        }]}>
                            <TextInput
                                style={[styles.modernInput, { color: colors.text }]}
                                placeholder={t('sms.typeMessage')}
                                placeholderTextColor={colors.textSecondary}
                                value={replyMessage}
                                onChangeText={onReplyChange}
                                multiline
                                maxLength={160}
                            />
                            <Text style={[typography.caption2, { color: colors.textSecondary }]}>
                                {replyMessage.length} / 160
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.modernSendButton, {
                                backgroundColor: replyMessage.trim() ? colors.primary : colors.textSecondary,
                                opacity: isSending ? 0.6 : 1,
                            }]}
                            onPress={onReply}
                            disabled={isSending || !replyMessage.trim()}
                        >
                            {isSending ? (
                                <BouncingDots size="small" color="#FFF" />
                            ) : (
                                <MaterialIcons name="send" size={20} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAnimatedView>
        </Modal>
    );
}

export default SMSDetailModal;
