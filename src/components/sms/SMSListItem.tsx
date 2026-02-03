import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { SMSMessage } from '@/types';

interface SMSListItemProps {
    message: SMSMessage;
    isLast: boolean;
    timeDisplay: string;
    onPress: () => void;
    onLongPress?: () => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
}

/**
 * Individual SMS message list item
 */
export function SMSListItem({
    message,
    isLast,
    timeDisplay,
    onPress,
    onLongPress,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
}: SMSListItemProps) {
    const { colors, typography } = useTheme();

    const initials = message.phone.charAt(0).toUpperCase();
    const isUnread = message.smstat === '0';

    const handlePress = () => {
        if (isSelectionMode && onToggleSelect) {
            onToggleSelect();
        } else {
            onPress();
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            onLongPress={onLongPress}
            activeOpacity={0.6}
            style={[
                styles.messageItem,
                !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                isSelected && { backgroundColor: colors.primary + '20' }
            ]}
        >
            {isSelectionMode ? (
                <View style={[
                    styles.checkbox,
                    {
                        borderColor: isSelected ? colors.primary : colors.textSecondary,
                        backgroundColor: isSelected ? colors.primary : 'transparent'
                    }
                ]}>
                    {isSelected && (
                        <MaterialIcons name="check" size={16} color="#FFF" />
                    )}
                </View>
            ) : (
                <View style={[
                    styles.avatar,
                    { backgroundColor: isUnread ? colors.primary : colors.textSecondary }
                ]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
            )}

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

            {!isSelectionMode && isUnread && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]} />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
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
        fontWeight: '600',
        fontSize: 18,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    messageContent: {
        flex: 1,
    },
    messageTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    unreadBadge: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 8,
    },
});

export default SMSListItem;
