import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components';
import { useTheme } from '@/theme';

/**
 * Skeleton for SMS Stats cards row
 */
export function SMSStatsSkeleton() {
    const { glassmorphism, isDark } = useTheme();

    return (
        <View style={styles.statsRow}>
            {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.statsCard, {
                    backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
                    borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
                }]}>
                    <Skeleton width="60%" height={12} style={{ marginBottom: 8 }} />
                    <Skeleton width="40%" height={28} />
                </View>
            ))}
        </View>
    );
}

/**
 * Skeleton for SMS message list
 */
export function SMSListSkeleton() {
    const { glassmorphism, isDark } = useTheme();

    return (
        <View style={[styles.messagesList, {
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
        }]}>
            {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.messageItem}>
                    <Skeleton width={48} height={48} borderRadius={24} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.messageTopRow}>
                            <Skeleton width="50%" height={16} />
                            <Skeleton width="20%" height={12} />
                        </View>
                        <Skeleton width="80%" height={14} style={{ marginTop: 6 }} />
                    </View>
                </View>
            ))}
        </View>
    );
}

/**
 * Skeleton for search bar
 */
export function SMSSearchSkeleton() {
    const { glassmorphism, isDark } = useTheme();

    return (
        <View style={[styles.searchContainer, {
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
        }]}>
            <Skeleton width={20} height={20} borderRadius={10} />
            <Skeleton width="70%" height={16} style={{ marginLeft: 12 }} />
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
        borderWidth: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    messagesList: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    messageTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
