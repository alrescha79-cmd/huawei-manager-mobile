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
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTheme } from '@/theme';
import { Card, CardHeader, Input, Button, ThemedAlertHelper, MeshGradientBackground } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useSMSStore } from '@/stores/sms.store';
import { SMSService } from '@/services/sms.service';
import { useTranslation } from '@/i18n';
import { SMSMessage } from '@/types';

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
  const [smsSupported, setSmsSupported] = useState(true);

  // Detail view state
  const [selectedMessage, setSelectedMessage] = useState<SMSMessage | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');


  // Auto-refresh SMS every 10 seconds
  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new SMSService(credentials.modemIp);
      setSMSService(service);

      // Reset SMS cache when credentials change (happens after re-login)
      service.resetSMSCache();

      // Initial load with SMS support check
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

      // First, check if SMS is supported on this modem
      let isSupported = false;
      try {
        isSupported = await service.isSMSSupported();
      } catch (error: any) {
        // Session error during support check - trigger re-login
        if (error?.message?.includes('125003') || error?.message?.includes('125002')) {
          const { requestRelogin } = useAuthStore.getState();
          requestRelogin();
        }
        setSmsSupported(false);
        return;
      }

      // If SMS is not supported, just show unsupported message
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

      // SMS is supported, load the data
      try {
        const [messagesList, count] = await Promise.all([
          service.getSMSList(),
          service.getSMSCount(),
        ]);

        setMessages(messagesList);
        setSMSCount(count);
        setSmsSupported(true);
      } catch (error: any) {
        // Check if this is a session error
        if (error?.message?.includes('125003') || error?.message?.includes('125002')) {
          const { requestRelogin } = useAuthStore.getState();
          requestRelogin();
        } else {
          // Some other error - mark SMS as unsupported rather than crashing
          setSmsSupported(false);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Silent background refresh
  const loadDataSilent = async (service: SMSService) => {
    try {
      // Check if SMS is still supported
      const isSupported = await service.isSMSSupported();
      if (!isSupported) {
        setSmsSupported(false);
        return;
      }

      // Load SMS data silently
      try {
        const [messagesList, count] = await Promise.all([
          service.getSMSList(),
          service.getSMSCount(),
        ]);

        setMessages(messagesList);
        setSMSCount(count);
      } catch (error: any) {
        // Check for session errors - trigger re-login silently
        if (error?.message?.includes('125003') || error?.message?.includes('125002')) {
          const { requestRelogin } = useAuthStore.getState();
          requestRelogin();
        }
        // Otherwise silently ignore - keep showing existing data
      }
    } catch (error: any) {
      // Support check failed - silently ignore in background
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

  // Open message detail
  const handleOpenDetail = async (message: SMSMessage) => {
    setSelectedMessage(message);
    setReplyMessage('');
    setShowDetail(true);

    // Mark as read if unread (smstat === '0')
    if (smsService && message.smstat === '0') {
      try {
        await smsService.markAsRead(message.index);
      } catch (error) {
        // Silently fail
      }
    }
  };

  // Send reply
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

  return (
    <>
      <MeshGradientBackground>
        <ScrollView
          style={[styles.container, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[
            styles.content,
            { paddingTop: 8 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) }
          ]}
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
          {!smsSupported || messages.length === 0 ? (
            <Card>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl }]}>
                {isRefreshing ? t('sms.loadingMessages') : `${t('sms.noMessages')}\n${t('sms.smsNotSupported')}`}
              </Text>
            </Card>
          ) : (
            messages.map((message) => (
              <TouchableOpacity
                key={message.index}
                onPress={() => handleOpenDetail(message)}
                activeOpacity={0.7}
              >
                <Card style={{ marginBottom: spacing.md }}>
                  <View style={styles.messageHeader}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      {/* Unread indicator */}
                      {message.smstat === '0' && (
                        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          typography.headline,
                          {
                            color: colors.text,
                            fontWeight: message.smstat === '0' ? '700' : '600'
                          }
                        ]}>
                          {message.phone}
                        </Text>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                          {dayjs(message.date).format('MMM D, YYYY h:mm A')}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                  </View>
                  <Text
                    style={[
                      typography.body,
                      { color: colors.textSecondary, marginTop: spacing.sm }
                    ]}
                    numberOfLines={2}
                  >
                    {message.content}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </MeshGradientBackground>

      {/* Compose Modal */}
      <Modal
        visible={showCompose}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompose(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[
            styles.modalHeader,
            {
              borderBottomColor: colors.border,
              paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16
            }
          ]}>
            <TouchableOpacity onPress={() => setShowCompose(false)}>
              <Text style={[typography.body, { color: colors.primary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <Text style={[typography.headline, { color: colors.text }]}>
              {t('sms.newMessage')}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label={t('sms.phoneNumber')}
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="+1234567890"
              keyboardType="phone-pad"
            />

            <Input
              label={t('sms.message')}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={t('sms.typeMessage')}
              multiline
              numberOfLines={6}
              style={{ height: 120 }}
            />

            <Button
              title={t('sms.send')}
              onPress={handleSend}
              loading={isSending}
              disabled={isSending || !newPhone || !newMessage}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowDetail(false);
          setSelectedMessage(null);
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[
            styles.modalHeader,
            {
              borderBottomColor: colors.border,
              paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16
            }
          ]}>
            <TouchableOpacity onPress={() => {
              setShowDetail(false);
              setSelectedMessage(null);
            }}>
              <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[typography.headline, { color: colors.text, flex: 1, marginLeft: spacing.md }]}>
              {selectedMessage?.phone || ''}
            </Text>
            <TouchableOpacity onPress={() => {
              if (selectedMessage) {
                handleDelete(selectedMessage.index);
                setShowDetail(false);
                setSelectedMessage(null);
              }
            }}>
              <MaterialIcons name="delete" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedMessage && (
              <>
                <View style={[styles.detailContent, { backgroundColor: colors.card }]}>
                  <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                    {dayjs(selectedMessage.date).format('dddd, MMMM D, YYYY • h:mm A')}
                  </Text>
                  <Text style={[typography.body, { color: colors.text, lineHeight: 24 }]}>
                    {selectedMessage.content}
                  </Text>
                </View>

                <View style={[styles.replyContainer, { borderTopColor: colors.border }]}>
                  <Text style={[typography.subheadline, { color: colors.text, marginBottom: spacing.sm }]}>
                    {t('sms.reply')}
                  </Text>
                  <Input
                    value={replyMessage}
                    onChangeText={setReplyMessage}
                    placeholder={t('sms.typeMessage')}
                    multiline
                    numberOfLines={4}
                    style={{ height: 100 }}
                  />
                  <Button
                    title={t('sms.send')}
                    onPress={handleReply}
                    loading={isSending}
                    disabled={isSending || !replyMessage}
                    style={{ marginTop: spacing.sm }}
                  />
                </View>
              </>
            )}
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
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  detailContent: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  replyContainer: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
  },
});
