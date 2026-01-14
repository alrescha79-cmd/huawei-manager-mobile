import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components';
import { useTheme } from '@/theme';

/**
 * Skeleton for Connection Status card (signal info)
 */
export function ConnectionStatusSkeleton() {
    const { glassmorphism, isDark } = useTheme();

    return (
        <View style={[styles.card, {
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
        }]}>
            <View style={styles.row}>
                <Skeleton width={60} height={60} borderRadius={30} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Skeleton width="50%" height={20} style={{ marginBottom: 8 }} />
                    <Skeleton width="70%" height={16} />
                </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                    <Skeleton width="80%" height={12} style={{ marginBottom: 4 }} />
                    <Skeleton width="50%" height={18} />
                </View>
                <View style={styles.gridItem}>
                    <Skeleton width="80%" height={12} style={{ marginBottom: 4 }} />
                    <Skeleton width="50%" height={18} />
                </View>
            </View>
            <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                    <Skeleton width="80%" height={12} style={{ marginBottom: 4 }} />
                    <Skeleton width="50%" height={18} />
                </View>
                <View style={styles.gridItem}>
                    <Skeleton width="80%" height={12} style={{ marginBottom: 4 }} />
                    <Skeleton width="50%" height={18} />
                </View>
            </View>
        </View>
    );
}

/**
 * Skeleton for Quick Actions card
 */
export function QuickActionsSkeleton() {
    const { glassmorphism, isDark } = useTheme();

    return (
        <View style={[styles.card, {
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
        }]}>
            <Skeleton width="40%" height={20} style={{ marginBottom: 16 }} />
            <View style={styles.actionsRow}>
                <View style={[styles.actionCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                }]}>
                    <Skeleton width={40} height={40} borderRadius={10} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Skeleton width="60%" height={14} style={{ marginBottom: 4 }} />
                        <Skeleton width="40%" height={12} />
                    </View>
                </View>
                <View style={[styles.actionCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                }]}>
                    <Skeleton width={40} height={40} borderRadius={10} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Skeleton width="60%" height={14} style={{ marginBottom: 4 }} />
                        <Skeleton width="40%" height={12} />
                    </View>
                </View>
            </View>
            <View style={styles.smallActionsRow}>
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.smallActionCard, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    }]}>
                        <Skeleton width={22} height={22} borderRadius={11} />
                        <Skeleton width="60%" height={12} style={{ marginTop: 8 }} />
                    </View>
                ))}
            </View>
        </View>
    );
}

/**
 * Skeleton for Traffic Stats card
 */
export function TrafficStatsSkeleton() {
    const { glassmorphism, isDark } = useTheme();

    return (
        <View style={[styles.card, {
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
        }]}>
            <Skeleton width="50%" height={20} style={{ marginBottom: 16 }} />
            <View style={styles.trafficRow}>
                <View style={styles.trafficItem}>
                    <Skeleton width={32} height={32} borderRadius={16} />
                    <View style={{ marginLeft: 12 }}>
                        <Skeleton width={80} height={24} style={{ marginBottom: 4 }} />
                        <Skeleton width={60} height={12} />
                    </View>
                </View>
                <View style={styles.trafficItem}>
                    <Skeleton width={32} height={32} borderRadius={16} />
                    <View style={{ marginLeft: 12 }}>
                        <Skeleton width={80} height={24} style={{ marginBottom: 4 }} />
                        <Skeleton width={60} height={12} />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 12,
    },
    gridRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    gridItem: {
        flex: 1,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    actionCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    smallActionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    smallActionCard: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 12,
        alignItems: 'center',
    },
    trafficRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    trafficItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
