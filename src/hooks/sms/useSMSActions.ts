import { useState } from 'react';
import { SMSService } from '@/services/sms.service';
import { ThemedAlertHelper } from '@/components';
import { SMSMessage } from '@/types';

interface UseSMSActionsProps {
    smsService: SMSService | null;
    messages: SMSMessage[];
    filteredMessages: SMSMessage[];
    removeMessage: (index: string) => void;
    handleRefresh: () => void;
    t: (key: string, options?: any) => string;
}

export function useSMSActions({
    smsService,
    messages,
    filteredMessages,
    removeMessage,
    handleRefresh,
    t,
}: UseSMSActionsProps) {
    // Compose state
    const [showCompose, setShowCompose] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Detail state
    const [selectedMessage, setSelectedMessage] = useState<SMSMessage | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');

    // Selection state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleDelete = async (index: string) => {
        if (!smsService) return;

        ThemedAlertHelper.alert(
            t('sms.deleteSms'),
            t('sms.deleteConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await smsService.deleteSMS(index);
                            removeMessage(index);
                            ThemedAlertHelper.alert(t('common.success'), t('sms.messageDeleted'));
                        } catch (error) {
                            ThemedAlertHelper.alert(t('common.error'), t('alerts.failedDeleteSms'));
                        }
                    },
                },
            ]
        );
    };

    const handleLongPress = (message: SMSMessage) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedIds(new Set([`${message.boxType}-${message.index}`]));
        }
    };

    const toggleSelect = (message: SMSMessage) => {
        const id = `${message.boxType}-${message.index}`;
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredMessages.length) {
            setSelectedIds(new Set());
        } else {
            const allIds = filteredMessages.map(m => `${m.boxType}-${m.index}`);
            setSelectedIds(new Set(allIds));
        }
    };

    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handleDeleteSelected = async () => {
        if (!smsService || selectedIds.size === 0) return;

        ThemedAlertHelper.alert(
            t('sms.deleteSelected'),
            t('sms.deleteSelectedConfirm', { count: selectedIds.size }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const idsToDelete = Array.from(selectedIds);
                            for (const id of idsToDelete) {
                                const index = id.split('-').slice(1).join('-');
                                await smsService.deleteSMS(index);
                                removeMessage(index);
                            }
                            ThemedAlertHelper.alert(
                                t('common.success'),
                                t('sms.messagesDeleted', { count: idsToDelete.length })
                            );
                            exitSelectionMode();
                        } catch (error) {
                            ThemedAlertHelper.alert(t('common.error'), t('alerts.failedDeleteSms'));
                        }
                    },
                },
            ]
        );
    };

    const handleSend = async () => {
        if (!smsService || !newPhone || !newMessage) {
            ThemedAlertHelper.alert(t('common.error'), t('sms.fillAllFields'));
            return;
        }

        setIsSending(true);
        try {
            await smsService.sendSMS(newPhone, newMessage);
            ThemedAlertHelper.alert(t('common.success'), t('sms.messageSent'));
            setShowCompose(false);
            setNewPhone('');
            setNewMessage('');
            handleRefresh();
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('alerts.failedSendSms'));
        } finally {
            setIsSending(false);
        }
    };

    const handleOpenDetail = async (message: SMSMessage) => {
        setSelectedMessage(message);
        setReplyMessage('');
        setShowDetail(true);

        if (smsService && message.smstat === '0') {
            try {
                await smsService.markAsRead(message.index);
            } catch (error) {
                console.error('Failed to mark SMS as read:', error);
            }
        }
    };

    const handleReply = async () => {
        if (!smsService || !selectedMessage || !replyMessage) {
            ThemedAlertHelper.alert(t('common.error'), t('sms.fillAllFields'));
            return;
        }

        setIsSending(true);
        try {
            await smsService.sendSMS(selectedMessage.phone, replyMessage);
            ThemedAlertHelper.alert(t('common.success'), t('sms.messageSent'));
            setReplyMessage('');
            setShowDetail(false);
            setSelectedMessage(null);
            handleRefresh();
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('alerts.failedSendSms'));
        } finally {
            setIsSending(false);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!smsService) return;
        const unreadMessages = messages.filter(m => m.smstat === '0');
        for (const msg of unreadMessages) {
            try {
                await smsService.markAsRead(msg.index);
            } catch (error) {
                console.error('Failed to mark SMS as read:', error);
            }
        }
        handleRefresh();
    };

    return {
        // Compose
        showCompose,
        setShowCompose,
        newPhone,
        setNewPhone,
        newMessage,
        setNewMessage,
        isSending,
        handleSend,

        // Detail
        selectedMessage,
        setSelectedMessage,
        showDetail,
        setShowDetail,
        replyMessage,
        setReplyMessage,
        handleOpenDetail,
        handleReply,

        // Selection
        isSelectionMode,
        selectedIds,
        handleLongPress,
        toggleSelect,
        handleSelectAll,
        exitSelectionMode,
        handleDeleteSelected,

        // Actions
        handleDelete,
        handleMarkAllAsRead,
    };
}
