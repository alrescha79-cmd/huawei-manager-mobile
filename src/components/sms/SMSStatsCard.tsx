import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface SMSStatsCardProps {
    t: (key: string) => string;
    total: number;
    unread: number;
    sent: number;
}

/**
 * Stats card row showing SMS counts
 */
export function SMSStatsCard({ t, total, unread, sent }: SMSStatsCardProps) {
    const { colors, typography, glassmorphism, isDark } = useTheme();

    return (
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
                    {total}
                </Text>
            </View>

            <View style={[styles.statsCard, styles.statsCardHighlight, { backgroundColor: colors.primary }]}>
                <Text style={[typography.caption2, { color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                    {t('sms.unread')}
                </Text>
                <Text style={[typography.largeTitle, { color: '#FFF', marginTop: 4 }]}>
                    {unread}
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
                    {sent}
                </Text>
            </View>
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
