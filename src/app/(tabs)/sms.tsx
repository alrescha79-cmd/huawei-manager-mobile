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
  const [searchQuery, setSearchQuery] = useState('');


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

        // Check for new SMS notification
        if (count.localUnread > 0) {
          checkNewSMSNotification(count.localUnread, {
            title: t('notifications.newSms'),
            body: (n) => t('notifications.newSmsBody', { count: n }),
          });
        }
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

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.phone.toLowerCase().includes(query) ||
      msg.content.toLowerCase().includes(query)
    );
  });

  // Format time as "Xm ago", "Xh ago", etc.
  const formatTimeAgo = (dateStr: string): string => {
    const messageDate = dayjs(dateStr);
    const now = dayjs();
    const diffMinutes = now.diff(messageDate, 'minute');
    const diffHours = now.diff(messageDate, 'hour');
    const diffDays = now.diff(messageDate, 'day');

    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.format('MMM D');
  };

  // Mark all messages as read
  const handleMarkAllAsRead = async () => {
    if (!smsService) return;
    const unreadMessages = messages.filter(m => m.smstat === '0');
    for (const msg of unreadMessages) {
      try {
        await smsService.markAsRead(msg.index);
      } catch (error) {
        // Silent fail for individual messages
      }
    }
    handleRefresh();
  };

  // Render message content with clickable links
  const renderMessageWithLinks = (content: string) => {
    // URL regex pattern - matches http, https, and www
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

    const parts = content.split(urlRegex).filter(Boolean);

    if (parts.length === 1 && !urlRegex.test(content)) {
      // No links found, return plain text
      return (
        <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
          {content}
        </Text>
      );
    }

    // Reset regex lastIndex
    urlRegex.lastIndex = 0;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = urlRegex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        elements.push(
          <Text key={key++} style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
            {content.substring(lastIndex, match.index)}
          </Text>
        );
      }

      // Add the URL as a clickable link
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

    // Add remaining text after last match
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
          {/* Modern Refresh Indicator */}
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
                // Hide native spinner completely - use ModernRefreshIndicator instead
                tintColor="transparent"
                colors={['transparent']}
                progressBackgroundColor="transparent"
                progressViewOffset={-1000}
                style={{ backgroundColor: 'transparent' }}
              />
            }
          >

            {/* Stats Cards Row - Only show if SMS is supported */}
            {smsSupported && smsCount && (
              <View style={styles.statsRow}>
                <View style={[styles.statsCard, {
                  backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
                  borderWidth: 1,
                  borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
                }]}>
                  <Text style={[typography.caption2, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                    {t('sms.total')}
                  </Text>
                  <Text style={[typography.largeTitle, { color: colors.text, marginTop: 4 }]}>
                    {smsCount.localInbox + smsCount.localOutbox}
                  </Text>
                </View>
                <View style={[styles.statsCard, styles.statsCardHighlight, { backgroundColor: colors.primary }]}>
                  <Text style={[typography.caption2, { color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                    {t('sms.unread')}
                  </Text>
                  <Text style={[typography.largeTitle, { color: '#FFF', marginTop: 4 }]}>
                    {smsCount.localUnread}
                  </Text>
                </View>
                <View style={[styles.statsCard, {
                  backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
                  borderWidth: 1,
                  borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
                }]}>
                  <Text style={[typography.caption2, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                    {t('sms.sent')}
                  </Text>
                  <Text style={[typography.largeTitle, { color: colors.text, marginTop: 4 }]}>
                    {smsCount.localOutbox}
                  </Text>
                </View>
              </View>
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
                {filteredMessages.map((message, index) => {
                  // Get first letter or icon for avatar
                  const initials = message.phone.charAt(0).toUpperCase();
                  // Use the formatTimeAgo helper
                  const timeDisplay = formatTimeAgo(message.date);
                  const isUnread = message.smstat === '0';
                  const isLast = index === filteredMessages.length - 1;

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
          {/* Header with centered phone */}
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
                  {/* Date above message */}
                  <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                      {dayjs(selectedMessage.date).format('dddd, MMMM D, YYYY')}
                    </Text>
                    <Text style={[typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                      {dayjs(selectedMessage.date).format('h:mm A')}
                    </Text>
                  </View>

                  {/* Chat bubble */}
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

            {/* Modern Reply Bar */}
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
