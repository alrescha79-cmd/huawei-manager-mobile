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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTheme } from '@/theme';
import { Card, CardHeader, Input, Button, ThemedAlertHelper, MeshGradientBackground, AnimatedScreen } from '@/components';
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
      <AnimatedScreen>
        <MeshGradientBackground>
          <ScrollView
            style={[styles.container, { backgroundColor: 'transparent' }]}
            contentContainerStyle={[
              styles.content,
              { paddingTop: 8 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0), paddingBottom: 80 }
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          >

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
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <MaterialIcons name="sms" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
                  {isRefreshing ? t('sms.loadingMessages') : `${t('sms.noMessages')}\n${t('sms.smsNotSupported')}`}
                </Text>
              </View>
            ) : (
              <View style={[styles.messagesList, { backgroundColor: colors.card }]}>
                {messages.map((message, index) => {
                  // Get initials from phone number (last 2 digits)
                  const initials = message.phone.slice(-2);
                  // Format relative time
                  const messageDate = dayjs(message.date);
                  const now = dayjs();
                  let timeDisplay = '';
                  if (now.diff(messageDate, 'day') === 0) {
                    timeDisplay = messageDate.format('h:mm A');
                  } else if (now.diff(messageDate, 'day') === 1) {
                    timeDisplay = t('sms.yesterday') || 'Yesterday';
                  } else if (now.diff(messageDate, 'day') < 7) {
                    timeDisplay = messageDate.format('ddd');
                  } else {
                    timeDisplay = messageDate.format('MMM D');
                  }
                  const isUnread = message.smstat === '0';
                  const isLast = index === messages.length - 1;

                  return (
                    <TouchableOpacity
                      key={message.index}
                      onPress={() => handleOpenDetail(message)}
                      activeOpacity={0.6}
                      style={[
                        styles.messageItem,
                        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }
                      ]}
                    >
                      {/* Avatar */}
                      <View style={[
                        styles.avatar,
                        { backgroundColor: isUnread ? colors.primary : colors.textSecondary }
                      ]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>

                      {/* Content */}
                      <View style={styles.messageContent}>
                        <View style={styles.messageTopRow}>
                          <Text style={[
                            typography.headline,
                            {
                              color: colors.text,
                              fontWeight: isUnread ? '700' : '500',
                              flex: 1,
                            }
                          ]} numberOfLines={1}>
                            {message.phone}
                          </Text>
                          <Text style={[
                            typography.caption1,
                            {
                              color: isUnread ? colors.primary : colors.textSecondary,
                              fontWeight: isUnread ? '600' : '400',
                              marginLeft: 8,
                            }
                          ]}>
                            {timeDisplay}
                          </Text>
                        </View>
                        <Text
                          style={[
                            typography.body,
                            {
                              color: isUnread ? colors.text : colors.textSecondary,
                              fontWeight: isUnread ? '500' : '400',
                              marginTop: 2,
                            }
                          ]}
                          numberOfLines={1}
                        >
                          {message.content}
                        </Text>
                      </View>

                      {/* Unread indicator */}
                      {isUnread && (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Floating Action Button for New Message */}
          <TouchableOpacity
            style={[
              styles.fab,
              { backgroundColor: colors.primary }
            ]}
            onPress={() => setShowCompose(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        </MeshGradientBackground>
      </AnimatedScreen>

      {/* Compose Modal */}
      <Modal
        visible={showCompose}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompose(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[
            styles.composeHeader,
            {
              borderBottomColor: colors.border,
              paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16
            }
          ]}>
            <TouchableOpacity
              onPress={() => setShowCompose(false)}
              style={styles.headerButton}
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[typography.headline, { color: colors.text, fontWeight: '600' }]}>
              {t('sms.newMessage')}
            </Text>
            <View style={styles.headerButton} />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            {/* To Field */}
            <View style={[styles.composeField, { borderBottomColor: colors.border }]}>
              <Text style={[typography.body, { color: colors.textSecondary, marginRight: 12 }]}>
                {t('sms.to')}:
              </Text>
              <TextInput
                style={[typography.body, { flex: 1, color: colors.text, padding: 0 }]}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder={t('sms.phoneNumberPlaceholder') || '+1234567890'}
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Send Bar */}
          <View style={[styles.composeSendBar, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[
                styles.composeSendInput,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }
              ]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={t('sms.typeMessage')}
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={160}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: (newPhone && newMessage) ? colors.primary : colors.textSecondary }
              ]}
              onPress={handleSend}
              disabled={isSending || !newPhone || !newMessage}
            >
              {isSending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <MaterialIcons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
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

          <ScrollView style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {selectedMessage && (
              <>
                {/* Chat bubble */}
                <View style={{ alignItems: 'flex-start', marginBottom: spacing.lg }}>
                  <View style={[
                    styles.chatBubble,
                    { backgroundColor: colors.card }
                  ]}>
                    <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
                      {selectedMessage.content}
                    </Text>
                  </View>
                  <Text style={[typography.caption2, { color: colors.textSecondary, marginTop: 4, marginLeft: 4 }]}>
                    {dayjs(selectedMessage.date).format('dddd, MMMM D, YYYY • h:mm A')}
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  countItem: {
    alignItems: 'center',
  },
  // New Android-style message list
  messagesList: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messageContent: {
    flex: 1,
  },
  messageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal styles
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
  // Chat bubble style for detail
  chatBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  replyContainer: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  // Compose modal styles
  composeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  composeMessageContainer: {
    flex: 1,
  },
  composeSendBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  composeSendInput: {
    flex: 1,
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
