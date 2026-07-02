import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { SMSMessage } from '@/types';
import { InlineAdNative } from '../AdBanner';

interface SMSListItemProps {
    message?: SMSMessage;
    isLast?: boolean;
    timeDisplay?: string;
    onPress?: () => void;
    onLongPress?: () => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    isAd?: boolean;
}

export function SMSListItem({
    message,
    isLast = false,
    timeDisplay = '',
    onPress,
    onLongPress,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
    isAd = false,
}: SMSListItemProps) {
    if (isAd) {
        return <InlineAdNative />;
    }

    if (!message) return null;

    const { colors, typography, isDark } = useTheme();

    const initials = message.phone.charAt(0).toUpperCase();
    const isUnread = message.smstat === '0';

    const handlePress = () => {
        if (isSelectionMode && onToggleSelect) {
            onToggleSelect();
        } else {
            onPress();
        }
    };

    const getAvatarBg = () => {
        return isUnread ? colors.primary : colors.itemBg;
    };

    const avatarBgColor = getAvatarBg();
    const avatarTextColor = isUnread ? colors.text : colors.textSecondary;

    return (
        <TouchableOpacity
            onPress={handlePress}
            onLongPress={onLongPress}
            activeOpacity={0.6}
            style={[
                styles.messageCard,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                }
            ]}
        >
            <View style={{ position: 'relative', marginRight: 12 }}>
                <View style={[
                    styles.avatar,
                    {
                        backgroundColor: avatarBgColor,
                    }
                ]}>
                    <Text style={[styles.avatarText, { color: avatarTextColor }]}>{initials}</Text>
                </View>

                {!isSelectionMode && isUnread && (
                    <View style={[
                        styles.unreadDotBadge,
                        {
                            backgroundColor: colors.primary,
                            borderColor: colors.card,
                        }
                    ]} />
                )}
            </View>

            <View style={styles.messageContent}>
                <View style={styles.messageTopRow}>
                    <Text style={[
                        typography.body,
                        {
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isUnread ? '700' : '600',
                            flex: 1,
                            backgroundColor: 'transparent',
                        }
                    ]} numberOfLines={1}>
                        {message.phone}
                    </Text>
                    <Text style={[
                        typography.caption2,
                        {
                            color: isUnread ? colors.primary : colors.textSecondary,
                            fontWeight: isUnread ? '600' : '400',
                            backgroundColor: 'transparent',
                        }
                    ]}>
                        {timeDisplay}
                    </Text>
                </View>
                <Text
                    style={[
                        typography.caption1,
                        {
                            color: isSelected ? colors.primary : (isUnread ? colors.text : colors.textSecondary),
                            fontWeight: isUnread ? '500' : '400',
                            marginTop: 4,
                            backgroundColor: 'transparent',
                        }
                    ]}
                    numberOfLines={2}
                >
                    {message.content}
                </Text>
            </View>

            {isSelectionMode ? (
                <View style={[
                    styles.circularCheckbox,
                    {
                        borderColor: isSelected ? colors.primary : colors.textSecondary,
                        backgroundColor: isSelected ? colors.primary : 'transparent'
                    }
                ]}>
                    {isSelected && (
                        <MaterialIcons name="check" size={16} color={colors.text} />
                    )}
                </View>
            ) : (
                <View style={styles.chevronContainer}>
                    <MaterialIcons name="chevron-right" size={16} color={colors.textSecondary} />
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    messageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontWeight: '700',
        fontSize: 18,
    },
    messageContent: {
        flex: 1,
        marginRight: 12,
        backgroundColor: 'transparent',
    },
    messageTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
    },
    circularCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadDotBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 13,
        height: 13,
        borderRadius: 6.5,
        borderWidth: 2.5,
    },
    chevronContainer: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});

export default SMSListItem;
