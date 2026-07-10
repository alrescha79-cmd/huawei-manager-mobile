import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Modal,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MeshGradientBackground, AnimatedScreen, BouncingDots, RefreshIndicator, AdNative } from '@/components';
import { SMSListItem, SMSStatsCard, SMSDetailModal, SMSStatsSkeleton, SMSListSkeleton, SMSSearchSkeleton, smsStyles as styles, KeyboardAnimatedView } from '@/components/sms';
import { formatTimeAgo } from '@/utils/formatters';
import { useTranslation } from '@/i18n';
import { useSMSData, useSMSActions, useMessageLinks } from '@/hooks/sms';

export default function SMSScreen() {
  const { colors, typography, spacing, glassmorphism, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomOffset = 88 + (insets.bottom > 0 ? insets.bottom : 16);

  const smsData = useSMSData({ t });
  const smsActions = useSMSActions({
    smsService: smsData.smsService,
    messages: smsData.messages,
    filteredMessages: smsData.filteredMessages,
    removeMessage: smsData.removeMessage,
    handleRefresh: smsData.handleRefresh,
    t,
  });
  const { renderMessageWithLinks } = useMessageLinks();

  const {
    isRefreshing, smsSupported, searchQuery, setSearchQuery,
    messageFilter, setMessageFilter, smsCount, filteredMessages, handleRefresh,
  } = smsData;

  const {
    showCompose, setShowCompose, newPhone, setNewPhone, newMessage, setNewMessage,
    isSending, handleSend, selectedMessage, setSelectedMessage, showDetail, setShowDetail,
    replyMessage, setReplyMessage, handleOpenDetail, handleReply,
    isSelectionMode, selectedIds, handleLongPress, toggleSelect, handleSelectAll,
    exitSelectionMode, handleDeleteSelected, handleDelete, handleMarkAllAsRead,
  } = smsActions;

  return (
    <>
      <AnimatedScreen>
        <MeshGradientBackground>
          <RefreshIndicator refreshing={isRefreshing} />

          {isSelectionMode && (
            <View style={[
              styles.selectionHeader,
              { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 8 }
            ]}>
              <TouchableOpacity onPress={exitSelectionMode}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSelectAll}>
                <MaterialIcons name="checklist-rtl" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {isSelectionMode && (
            <View style={styles.selectionTitle}>
              <Text style={[typography.title1, { color: colors.text, fontWeight: '700' }]}>
                {t('sms.selected', { count: selectedIds.size })}
              </Text>
            </View>
          )}

          <ScrollView
            style={[styles.container, { backgroundColor: 'transparent' }]}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: isSelectionMode ? 0 : (8 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0)),
                paddingBottom: isSelectionMode ? 140 : 110 + (insets.bottom > 0 ? insets.bottom : 16)
              }
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

            {!smsCount && isRefreshing && (
              <>
                <SMSStatsSkeleton />
                <SMSSearchSkeleton />
                <SMSListSkeleton />
              </>
            )}

            {smsSupported && smsCount && (
              <SMSStatsCard
                t={t}
                total={smsCount.localInbox + smsCount.localOutbox}
                unread={smsCount.localUnread}
                sent={smsCount.localOutbox}
                activeFilter={messageFilter}
                onFilterChange={setMessageFilter}
              />
            )}

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

            {smsSupported && !isSelectionMode && (
              <View style={styles.messagesHeader}>
                <Text style={[typography.caption1, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                  {t('sms.recentMessages')}
                </Text>
                {smsCount && smsCount.localUnread > 0 && (
                  <TouchableOpacity onPress={handleMarkAllAsRead} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="check" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[typography.caption1, { color: colors.primary, fontWeight: '600' }]}>
                      {t('sms.markAllAsRead')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!smsSupported || filteredMessages.length === 0 ? (
              <>
                <View style={[styles.emptyState, {
                  backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
                  borderWidth: 1,
                  borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
                  marginBottom: spacing.md,
                }]}>
                  <MaterialIcons name="sms" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                  <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
                    {isRefreshing ? t('sms.loadingMessages') : searchQuery ? t('sms.noSearchResults') : `${t('sms.noMessages')}\n${t('sms.smsNotSupported')}`}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ marginBottom: spacing.md }}>
                {filteredMessages.map((message, index) => (
                  <React.Fragment key={`${message.boxType}-${message.index}`}>
                    <SMSListItem
                      message={message}
                      isLast={index === filteredMessages.length - 1}
                      timeDisplay={formatTimeAgo(message.date)}
                      onPress={() => handleOpenDetail(message)}
                      onLongPress={() => handleLongPress(message)}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.has(`${message.boxType}-${message.index}`)}
                      onToggleSelect={() => toggleSelect(message)}
                    />
                    {index === 3 && <SMSListItem isAd={true} />}
                  </React.Fragment>
                ))}
              </View>
            )}

            <AdNative />

          </ScrollView>

          {isSelectionMode && (
            <View style={[
              styles.selectionBottomBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: bottomOffset + 12,
              }
            ]}>
              <TouchableOpacity
                style={styles.selectionAction}
                onPress={handleMarkAllAsRead}
                disabled={selectedIds.size === 0}
              >
                <MaterialIcons
                  name="mark-chat-read"
                  size={24}
                  color={selectedIds.size === 0 ? colors.textSecondary : colors.primary}
                />
                <Text style={[
                  typography.caption1,
                  { color: selectedIds.size === 0 ? colors.textSecondary : colors.primary }
                ]}>
                  {t('sms.markAllAsRead')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectionAction}
                onPress={handleDeleteSelected}
                disabled={selectedIds.size === 0}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={24}
                  color={selectedIds.size === 0 ? colors.textSecondary : colors.error}
                />
                <Text style={[
                  typography.caption1,
                  { color: selectedIds.size === 0 ? colors.textSecondary : colors.error }
                ]}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {smsSupported && !isSelectionMode && (
            <TouchableOpacity
              style={[
                styles.fab,
                {
                  backgroundColor: colors.primary,
                  bottom: bottomOffset + 16,
                }
              ]}
              onPress={() => setShowCompose(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={28} color={colors.text} />
            </TouchableOpacity>
          )}
        </MeshGradientBackground>
      </AnimatedScreen>

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
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <AdNative />
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

      <SMSDetailModal
        visible={showDetail}
        selectedMessage={selectedMessage}
        replyMessage={replyMessage}
        isSending={isSending}
        t={t}
        onClose={() => {
          setShowDetail(false);
          setSelectedMessage(null);
        }}
        onDelete={handleDelete}
        onReply={handleReply}
        onReplyChange={setReplyMessage}
        renderMessageContent={renderMessageWithLinks}
      />
    </>
  );
}
