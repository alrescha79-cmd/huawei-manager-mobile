import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import dayjs from 'dayjs';
import { useTheme } from '@/theme';
import { Card, CardHeader, Input, Button, ThemedAlertHelper } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useSMSStore } from '@/stores/sms.store';
import { SMSService } from '@/services/sms.service';
import { useTranslation } from '@/i18n';

export default function SMSScreen() {
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
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
  const [showCompose, setShowCompose] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);


  // Auto-refresh SMS every 10 seconds
  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new SMSService(credentials.modemIp);
      setSMSService(service);

      // Initial load
      loadData(service);

      // Setup auto-refresh interval
      const intervalId = setInterval(() => {
        loadDataSilent(service);
      }, 10000); // Update every 10 seconds

      return () => clearInterval(intervalId);
    }
  }, [credentials]);

  const loadData = async (service: SMSService) => {
    try {
      setIsRefreshing(true);

      const [messagesList, count] = await Promise.all([
        service.getSMSList(),
        service.getSMSCount(),
      ]);

      setMessages(messagesList);
      setSMSCount(count);

    } catch (error) {
      console.error('Error loading SMS data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Silent background refresh
  const loadDataSilent = async (service: SMSService) => {
    try {
      const [messagesList, count] = await Promise.all([
        service.getSMSList(),
        service.getSMSCount(),
      ]);

      setMessages(messagesList);
      setSMSCount(count);

    } catch (error) {
      console.error('Error in background SMS update:', error);
    }
  };

  const handleRefresh = () => {
    if (smsService) {
      loadData(smsService);
    }
  };

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

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: 8 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headerRow}>
          <View />
          <Button
            title={`+ ${t('sms.newMessage')}`}
            onPress={() => setShowCompose(true)}
            style={styles.newButton}
          />
        </View>

        {/* SMS Count Card */}
        {smsCount && (
          <Card style={{ marginBottom: spacing.md }}>
            <CardHeader title={t('sms.smsCount')} />
            <View style={styles.countRow}>
              <View style={styles.countItem}>
                <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                  {t('sms.unread')}
                </Text>
                <Text style={[typography.title2, { color: colors.primary }]}>
                  {smsCount.localUnread}
                </Text>
              </View>
              <View style={styles.countItem}>
                <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                  {t('sms.inbox')}
                </Text>
                <Text style={[typography.title2, { color: colors.text }]}>
                  {smsCount.localInbox}
                </Text>
              </View>
              <View style={styles.countItem}>
                <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                  {t('sms.sent')}
                </Text>
                <Text style={[typography.title2, { color: colors.text }]}>
                  {smsCount.localOutbox}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Messages List */}
        {messages.length === 0 ? (
          <Card>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl }]}>
              {isRefreshing ? t('sms.loadingMessages') : `${t('sms.noMessages')}\n${t('sms.smsNotSupported')}`}
            </Text>
          </Card>
        ) : (
          messages.map((message) => (
            <Card key={message.index} style={{ marginBottom: spacing.md }}>
              <View style={styles.messageHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.headline, { color: colors.text }]}>
                    {message.phone}
                  </Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                    {dayjs(message.date).format('MMM D, YYYY h:mm A')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(message.index)}>
                  <Text style={[typography.body, { color: colors.error }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[typography.body, { color: colors.text, marginTop: spacing.sm }]}>
                {message.content}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Compose Modal */}
      <Modal
        visible={showCompose}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompose(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCompose(false)}>
              <Text style={[typography.body, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[typography.headline, { color: colors.text }]}>
              New Message
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Phone Number"
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="+1234567890"
              keyboardType="phone-pad"
            />

            <Input
              label="Message"
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type your message..."
              multiline
              numberOfLines={6}
              style={{ height: 120 }}
            />

            <Button
              title="Send"
              onPress={handleSend}
              loading={isSending}
              disabled={isSending || !newPhone || !newMessage}
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  newButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  countItem: {
    alignItems: 'center',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
});
