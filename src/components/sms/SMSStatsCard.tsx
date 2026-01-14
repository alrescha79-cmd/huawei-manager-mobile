import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';

export type SMSFilterType = 'all' | 'unread' | 'sent';

interface SMSStatsCardProps {
    t: (key: string) => string;
    total: number;
    unread: number;
    sent: number;
    activeFilter?: SMSFilterType;
    onFilterChange?: (filter: SMSFilterType) => void;
}

/**
 * Stats card row showing SMS counts - clickable to filter messages
 */
export function SMSStatsCard({
    t,
    total,
    unread,
    sent,
    activeFilter = 'all',
    onFilterChange
}: SMSStatsCardProps) {
    const { colors, typography, glassmorphism, isDark } = useTheme();

    const isActive = (filter: SMSFilterType) => activeFilter === filter;

    const getCardStyle = (filter: SMSFilterType) => {
        if (isActive(filter)) {
            return { backgroundColor: colors.primary };
        }
        return {
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
            borderWidth: 1,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
        };
    };

    const getTextColor = (filter: SMSFilterType) => {
        return isActive(filter) ? '#FFF' : colors.textSecondary;
    };

    const getValueColor = (filter: SMSFilterType) => {
        return isActive(filter) ? '#FFF' : colors.text;
    };

    return (
        <View style={styles.statsRow}>
            <TouchableOpacity
                style={[styles.statsCard, getCardStyle('all'), isActive('all') && styles.statsCardHighlight]}
                onPress={() => onFilterChange?.('all')}
                activeOpacity={0.7}
            >
                <Text style={[typography.caption2, { color: getTextColor('all'), textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                    {t('sms.total')}
                </Text>
                <Text style={[typography.largeTitle, { color: getValueColor('all'), marginTop: 4 }]}>
                    {total}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.statsCard, getCardStyle('unread'), isActive('unread') && styles.statsCardHighlight]}
                onPress={() => onFilterChange?.('unread')}
                activeOpacity={0.7}
            >
                <Text style={[typography.caption2, { color: getTextColor('unread'), textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                    {t('sms.unread')}
                </Text>
                <Text style={[typography.largeTitle, { color: getValueColor('unread'), marginTop: 4 }]}>
                    {unread}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.statsCard, getCardStyle('sent'), isActive('sent') && styles.statsCardHighlight]}
                onPress={() => onFilterChange?.('sent')}
                activeOpacity={0.7}
            >
                <Text style={[typography.caption2, { color: getTextColor('sent'), textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                    {t('sms.sent')}
                </Text>
                <Text style={[typography.largeTitle, { color: getValueColor('sent'), marginTop: 4 }]}>
                    {sent}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    statsCard: {
        flex: 1,
        padding: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    statsCardHighlight: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});

export default SMSStatsCard;

