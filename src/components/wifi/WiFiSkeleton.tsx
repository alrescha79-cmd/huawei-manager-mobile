import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonCard } from '@/components';
import { useTheme } from '@/theme';

/**
 * Skeleton for WiFi Settings card
 */
export function WiFiSettingsSkeleton() {
    const { colors, glassmorphism, isDark } = useTheme();

    return (
        <View style={[styles.card, {
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
        }]}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Skeleton width="50%" height={22} />
                <Skeleton width={50} height={30} borderRadius={15} />
            </View>

            {/* SSID Field */}
            <View style={styles.fieldContainer}>
                <Skeleton width="30%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={44} borderRadius={12} />
            </View>

            {/* Password Field */}
            <View style={styles.fieldContainer}>
                <Skeleton width="35%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={44} borderRadius={12} />
            </View>

            {/* Security Mode */}
            <View style={styles.fieldContainer}>
                <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={44} borderRadius={12} />
            </View>
        </View>
    );
}

/**
 * Skeleton for Connected Devices list
 */
export function ConnectedDevicesSkeleton() {
    const { colors, glassmorphism, isDark } = useTheme();

    return (
        <View style={[styles.card, {
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
        }]}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Skeleton width="55%" height={22} />
                <Skeleton width={30} height={22} />
            </View>

            {/* Device items */}
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.deviceRow}>
                    <Skeleton width={40} height={40} borderRadius={20} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Skeleton width="60%" height={16} style={{ marginBottom: 4 }} />
                        <Skeleton width="40%" height={12} />
                    </View>
                </View>
            ))}
        </View>
    );
}

/**
 * Skeleton for Guest WiFi card
 */
export function GuestWiFiSkeleton() {
    const { colors, glassmorphism, isDark } = useTheme();

    return (
        <View style={[styles.card, {
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
        }]}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Skeleton width="40%" height={22} />
                <Skeleton width={50} height={30} borderRadius={15} />
            </View>

            {/* Fields preview */}
            <View style={styles.fieldContainer}>
                <Skeleton width="30%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={44} borderRadius={12} />
            </View>
        </View>
    );
}

/**
 * Skeleton for Parental Control card
 */
export function ParentalControlSkeleton() {
    const { colors, glassmorphism, isDark } = useTheme();

    return (
        <View style={[styles.card, {
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
        }]}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Skeleton width="45%" height={22} />
                <Skeleton width={50} height={30} borderRadius={15} />
            </View>

            {/* Profile count */}
            <Skeleton width="60%" height={14} style={{ marginTop: 8 }} />
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    deviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
});

export default {
    WiFiSettingsSkeleton,
    ConnectedDevicesSkeleton,
    GuestWiFiSkeleton,
    ParentalControlSkeleton,
};
