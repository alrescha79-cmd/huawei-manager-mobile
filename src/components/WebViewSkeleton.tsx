import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { useTheme } from '@/theme';

export function WebViewSkeleton() {
    const { colors, isDark } = useTheme();
    const bg = isDark ? '#1a1a1a' : '#ffffff';
    const surfaceBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <View style={[styles.navbar, { backgroundColor: surfaceBg }]}>
                <Skeleton width={24} height={24} borderRadius={4} />
                <Skeleton width="40%" height={16} borderRadius={4} />
                <Skeleton width={24} height={24} borderRadius={12} />
            </View>

            <View style={styles.body}>
                <Skeleton width="70%" height={22} borderRadius={4} style={{ marginBottom: 14 }} />
                <Skeleton width="100%" height={12} borderRadius={3} style={{ marginBottom: 8 }} />
                <Skeleton width="90%" height={12} borderRadius={3} style={{ marginBottom: 8 }} />
                <Skeleton width="60%" height={12} borderRadius={3} style={{ marginBottom: 20 }} />

                <View style={styles.cardRow}>
                    <View style={[styles.card, { backgroundColor: surfaceBg }]}>
                        <Skeleton width="100%" height={80} borderRadius={8} />
                        <Skeleton width="70%" height={12} borderRadius={3} style={{ marginTop: 10 }} />
                        <Skeleton width="50%" height={10} borderRadius={3} style={{ marginTop: 6 }} />
                    </View>
                    <View style={[styles.card, { backgroundColor: surfaceBg }]}>
                        <Skeleton width="100%" height={80} borderRadius={8} />
                        <Skeleton width="60%" height={12} borderRadius={3} style={{ marginTop: 10 }} />
                        <Skeleton width="45%" height={10} borderRadius={3} style={{ marginTop: 6 }} />
                    </View>
                </View>

                <Skeleton width="50%" height={18} borderRadius={4} style={{ marginTop: 20, marginBottom: 14 }} />
                <Skeleton width="100%" height={12} borderRadius={3} style={{ marginBottom: 8 }} />
                <Skeleton width="95%" height={12} borderRadius={3} style={{ marginBottom: 8 }} />
                <Skeleton width="85%" height={12} borderRadius={3} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={12} borderRadius={3} style={{ marginBottom: 20 }} />

                <Skeleton width="100%" height={140} borderRadius={10} style={{ marginBottom: 16 }} />

                <Skeleton width="100%" height={12} borderRadius={3} style={{ marginBottom: 8 }} />
                <Skeleton width="80%" height={12} borderRadius={3} style={{ marginBottom: 8 }} />
                <Skeleton width="55%" height={12} borderRadius={3} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    navbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    body: {
        flex: 1,
        padding: 16,
    },
    cardRow: {
        flexDirection: 'row',
        gap: 12,
    },
    card: {
        flex: 1,
        borderRadius: 10,
        padding: 10,
    },
});

export default WebViewSkeleton;
