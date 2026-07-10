import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useSMSStore } from '@/stores/sms.store';
import { SMSService } from '@/services/sms.service';
import { checkNewSMSNotification } from '@/services/notification.service';
import { SMSMessage } from '@/types';

type SMSFilterType = 'all' | 'unread' | 'sent';

interface UseSMSDataProps {
    t: (key: string, options?: any) => string;
}

export function useSMSData({ t }: UseSMSDataProps) {
    const { credentials } = useAuthStore();
    const {
        messages,
        smsCount,
        setMessages,
        setSMSCount,
        removeMessage,
    } = useSMSStore();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [smsService, setSMSService] = useState<SMSService | null>(null);
    const [smsSupported, setSmsSupported] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [messageFilter, setMessageFilter] = useState<SMSFilterType>('all');

    useEffect(() => {
        if (credentials?.modemIp) {
            const service = new SMSService(credentials.modemIp);
            setSMSService(service);

            service.resetSMSCache();

            loadData(service);

            const intervalId = setInterval(() => {
                if (AppState.currentState === 'active') {
                    loadDataSilent(service);
                }
            }, 10000);

            return () => clearInterval(intervalId);
        }
    }, [credentials]);

    const loadData = async (service: SMSService) => {
        try {
            setIsRefreshing(true);

            let isSupported = false;
            try {
                isSupported = await service.isSMSSupported();
            } catch (error: any) {
                if (error?.message?.includes('125003') || error?.message?.includes('125002')) {
                    const { requestRelogin } = useAuthStore.getState();
                    requestRelogin();
                }
                setSmsSupported(false);
                return;
            }

            if (!isSupported) {
                setSmsSupported(false);
                setMessages([]);
                setSMSCount({
                    localUnread: 0,
                    localInbox: 0,
                    localOutbox: 0,
                    localDraft: 0,
                    simUnread: 0,
                    simInbox: 0,
                    simOutbox: 0,
                    simDraft: 0,
                    newMsg: 0,
                    localDeleted: 0,
                    simDeleted: 0,
                    localMax: 0,
                    simMax: 0,
                });
                return;
            }

            try {
                const [inboxMessages, count] = await Promise.all([
                    service.getSMSList(1, 20, 1),
                    service.getSMSCount(),
                ]);

                let sentMessages: typeof inboxMessages = [];
                try {
                    if (count.localOutbox > 0) {
                        sentMessages = await service.getSMSList(1, 20, 2);
                    }
                } catch (outboxError) {
                    console.log('Outbox loading skipped:', outboxError);
                }

                const allMessages = [...inboxMessages, ...sentMessages].sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                setMessages(allMessages);
                setSMSCount(count);
                setSmsSupported(true);

                if (count.localUnread > 0) {
                    checkNewSMSNotification(count.localUnread, {
                        title: t('notifications.newSms'),
                        body: (n) => t('notifications.newSmsBody', { count: n }),
                    });
                }
            } catch (error: any) {
                if (error?.message?.includes('125003') || error?.message?.includes('125002')) {
                    const { requestRelogin } = useAuthStore.getState();
                    requestRelogin();
                } else {
                    setSmsSupported(false);
                }
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    const loadDataSilent = async (service: SMSService) => {
        try {
            const isSupported = await service.isSMSSupported();
            if (!isSupported) {
                setSmsSupported(false);
                return;
            }

            try {
                const [inboxMessages, count] = await Promise.all([
                    service.getSMSList(1, 20, 1),
                    service.getSMSCount(),
                ]);

                let sentMessages: typeof inboxMessages = [];
                try {
                    if (count.localOutbox > 0) {
                        sentMessages = await service.getSMSList(1, 20, 2);
                    }
                } catch {
                }

                const allMessages = [...inboxMessages, ...sentMessages].sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                setMessages(allMessages);
                setSMSCount(count);
            } catch (error: any) {
                if (error?.message?.includes('125003') || error?.message?.includes('125002')) {
                    const { requestRelogin } = useAuthStore.getState();
                    requestRelogin();
                }
            }
        } catch (error: any) {
            if (error?.message?.includes('125003') || error?.message?.includes('125002')) {
                const { requestRelogin } = useAuthStore.getState();
                requestRelogin();
            }
        }
    };

    const handleRefresh = () => {
        if (smsService) {
            loadData(smsService);
        }
    };

    const filteredMessages = messages.filter(msg => {
        if (messageFilter === 'unread' && msg.smstat !== '0') return false;
        if (messageFilter === 'sent' && msg.boxType !== 2) return false;

        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            msg.phone.toLowerCase().includes(query) ||
            msg.content.toLowerCase().includes(query)
        );
    });

    return {
        isRefreshing,
        smsService,
        smsSupported,
        searchQuery,
        setSearchQuery,
        messageFilter,
        setMessageFilter,
        messages,
        smsCount,
        removeMessage,
        filteredMessages,
        handleRefresh,
    };
}
