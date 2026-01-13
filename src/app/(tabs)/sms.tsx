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
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Card, CardHeader, Input, Button, ThemedAlertHelper, MeshGradientBackground, AnimatedScreen, BouncingDots, ModernRefreshIndicator, KeyboardAnimatedView } from '@/components';
import { SMSListItem, SMSStatsCard } from '@/components/sms';
import { formatTimeAgo } from '@/utils/formatters';
import { useAuthStore } from '@/stores/auth.store';
import { useSMSStore } from '@/stores/sms.store';
import { SMSService } from '@/services/sms.service';
import { checkNewSMSNotification } from '@/services/notification.service';
import { useTranslation } from '@/i18n';
import { SMSMessage } from '@/types';

export default function SMSScreen() {
  const { colors, typography, spacing, glassmorphism, isDark } = useTheme();
  const { t } = useTranslation();
  const { credentials } = useAuthStore();
  const insets = useSafeAreaInsets();
  const {
    messages,
    smsCount,
    setMessages,
    setSMSCount,
    removeMessage,
  } = useSMSStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [smsService, setSMSService] = useState<SMSService | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [smsSupported, setSmsSupported] = useState(true);

  const [selectedMessage, setSelectedMessage] = useState<SMSMessage | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');


  useEffect(() => {
    if (credentials?.modemIp) {
      const service = new SMSService(credentials.modemIp);
      setSMSService(service);

      service.resetSMSCache();

      loadData(service);

      const intervalId = setInterval(() => {
        loadDataSilent(service);
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
        const [messagesList, count] = await Promise.all([
          service.getSMSList(),
          service.getSMSCount(),
        ]);

        setMessages(messagesList);
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
        const [messagesList, count] = await Promise.all([
          service.getSMSList(),
          service.getSMSCount(),
        ]);

        setMessages(messagesList);
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

  const filteredMessages = messages.filter(msg => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.phone.toLowerCase().includes(query) ||
      msg.content.toLowerCase().includes(query)
    );
  });


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

  const renderMessageWithLinks = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

    const parts = content.split(urlRegex).filter(Boolean);

    if (parts.length === 1 && !urlRegex.test(content)) {
      return (
        <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
          {content}
        </Text>
      );
    }

    urlRegex.lastIndex = 0;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = urlRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        elements.push(
          <Text key={key++} style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
            {content.substring(lastIndex, match.index)}
          </Text>
        );
      }

      const url = match[0];
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;

      elements.push(
        <Text
          key={key++}
          style={[typography.body, { color: colors.primary, lineHeight: 22, textDecorationLine: 'underline' }]}
          onPress={() => Linking.openURL(fullUrl)}
        >
          {url}
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      elements.push(
        <Text key={key++} style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
          {content.substring(lastIndex)}
        </Text>
      );
    }

    return <Text>{elements}</Text>;
  };

  return (
    <>
      <AnimatedScreen>
        <MeshGradientBackground>
          <ModernRefreshIndicator refreshing={isRefreshing} />

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
                tintColor="transparent"
                colors={['transparent']}
                progressBackgroundColor="transparent"
                progressViewOffset={-1000}
              />
            }
          >

            {/* Stats Cards Row - Only show if SMS is supported */}
            {smsSupported && smsCount && (
              <SMSStatsCard
                t={t}
                total={smsCount.localInbox + smsCount.localOutbox}
                unread={smsCount.localUnread}
                sent={smsCount.localOutbox}
              />
            )}

            {/* Search Bar - Only show if SMS is supported */}
            {smsSupported && (
              <View style={[styles.searchContainer, {
                backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
                borderWidth: 1,
                borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
              }]}>
                <MaterialIcons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={t('sms.searchPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Recent Messages Header - Only show if SMS is supported */}
            {smsSupported && (
              <View style={styles.messagesHeader}>
                <Text style={[typography.caption1, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                  {t('sms.recentMessages')}
                </Text>
                {smsCount && smsCount.localUnread > 0 && (
                  <TouchableOpacity onPress={handleMarkAllAsRead}>
                    <Text style={[typography.caption1, { color: colors.primary }]}>
                      {t('sms.markAllAsRead')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Messages List */}
            {!smsSupported || filteredMessages.length === 0 ? (
              <View style={[styles.emptyState, {
                backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
                borderWidth: 1,
                borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
              }]}>
                <MaterialIcons name="sms" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
                  {isRefreshing ? t('sms.loadingMessages') : searchQuery ? t('sms.noSearchResults') : `${t('sms.noMessages')}\n${t('sms.smsNotSupported')}`}
                </Text>
              </View>
            ) : (
              <View style={[styles.messagesList, {
                backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
                borderWidth: 1,
                borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
              }]}>
                {filteredMessages.map((message, index) => (
                  <SMSListItem
                    key={message.index}
                    message={message}
                    isLast={index === filteredMessages.length - 1}
                    timeDisplay={formatTimeAgo(message.date)}
                    onPress={() => handleOpenDetail(message)}
                  />
                ))}
              </View>
            )}
          </ScrollView>

          {/* Floating Action Button for New Message - only show if SMS supported */}
          {smsSupported && (
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
          )}
        </MeshGradientBackground>
      </AnimatedScreen>

      {/* Compose Modal */}
      <Modal
        visible={showCompose}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompose(false)}
      >
        <StatusBar backgroundColor={colors.background} barStyle={isDark ? 'light-content' : 'dark-content'} />
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

          <View style={{ flex: 1 }}>
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

          <View style={[styles.composeSendBar, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 12) }]}>
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
                <BouncingDots size="small" color="#FFF" />
              ) : (
                <MaterialIcons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAnimatedView>
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
            <TouchableOpacity onPress={() => {
              setShowDetail(false);
              setSelectedMessage(null);
            }} style={{ width: 40 }}>
              <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>
              {selectedMessage?.phone || ''}
            </Text>
            <TouchableOpacity onPress={() => {
              if (selectedMessage) {
                handleDelete(selectedMessage.index);
                setShowDetail(false);
                setSelectedMessage(null);
              }
            }} style={{ width: 40, alignItems: 'flex-end' }}>
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
                      {renderMessageWithLinks(selectedMessage.content)}
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
                  onChangeText={setReplyMessage}
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
                onPress={handleReply}
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
  // Stats cards styles
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  statsCardHighlight: {
    transform: [{ scale: 1.05 }],
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Search bar styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  // Messages header styles
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
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
  // Modern reply bar styles
  modernReplyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  modernInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 80,
    padding: 0,
  },
  modernSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
