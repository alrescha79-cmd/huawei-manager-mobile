import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

/**
 * Skeleton loading component with shimmer animation
 */
export function Skeleton({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style
}: SkeletonProps) {
    const { colors, isDark } = useTheme();
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const shimmer = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        shimmer.start();

        return () => shimmer.stop();
    }, [shimmerAnim]);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    const backgroundColor = isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.08)';

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor,
                    opacity,
                },
                style,
            ]}
        />
    );
}

export function SkeletonText({
    lines = 1,
    lineHeight = 16,
    spacing = 8
}: {
    lines?: number;
    lineHeight?: number;
    spacing?: number;
}) {
    return (
        <View>
            {Array.from({ length: lines }).map((_, index) => (
                <Skeleton
                    key={index}
                    height={lineHeight}
                    width={index === lines - 1 && lines > 1 ? '60%' : '100%'}
                    style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
                />
            ))}
        </View>
    );
}

export function SkeletonCard({
    height = 120,
    style
}: {
    height?: number;
    style?: ViewStyle;
}) {
    const { colors } = useTheme();

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: colors.card,
                borderColor: colors.border,
                height
            },
            style
        ]}>
            <Skeleton width="40%" height={20} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
            <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
            <Skeleton width="60%" height={16} />
        </View>
    );
}

export function SkeletonSignalCard() {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
                <Skeleton width={60} height={60} borderRadius={30} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Skeleton width="50%" height={20} style={{ marginBottom: 8 }} />
                    <Skeleton width="80%" height={16} />
                </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                    <Skeleton width="80%" height={12} style={{ marginBottom: 4 }} />
                    <Skeleton width="60%" height={16} />
                </View>
                <View style={styles.gridItem}>
                    <Skeleton width="80%" height={12} style={{ marginBottom: 4 }} />
                    <Skeleton width="60%" height={16} />
                </View>
            </View>
            <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                    <Skeleton width="80%" height={12} style={{ marginBottom: 4 }} />
                    <Skeleton width="60%" height={16} />
                </View>
                <View style={styles.gridItem}>
                    <Skeleton width="80%" height={12} style={{ marginBottom: 4 }} />
                    <Skeleton width="60%" height={16} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    skeleton: {
        overflow: 'hidden',
    },
    card: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    gridRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    gridItem: {
        flex: 1,
    },
});

export default Skeleton;
