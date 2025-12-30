import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { Card } from './Card';

/*
  Daily Usage Card
  Displays daily usage with a large blue value and a digital-clock style duration.
*/

interface DailyUsageCardProps {
    usage: number; // in bytes
    duration: number; // in seconds
    style?: StyleProp<ViewStyle>;
}

// Helper to format bytes
const formatBytesWithUnit = (bytes: number): { value: string; unit: string } => {
    if (!bytes || isNaN(bytes) || bytes === 0) return { value: '0', unit: 'B' };
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return {
        value: (bytes / Math.pow(k, i)).toFixed(2),
        unit: sizes[i],
    };
};

export function DailyUsageCard({ usage, duration, style }: DailyUsageCardProps) {
    const { colors, typography, glassmorphism, isDark } = useTheme();
    const { t } = useTranslation();

    const formattedUsage = formatBytesWithUnit(usage);

    // Calculate hours and minutes
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);

    // Format with leading zeros
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');

    // Colors from mockup
    const blueColor = '#007AFF'; // Standard iOS Blue or custom bright blue

    return (
        <Card style={[styles.container, style]}>
            <View style={styles.content}>
                {/* Left Side: Title + Usage */}
                <View style={styles.leftSide}>
                    <Text style={[typography.headline, { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }]}>
                        {t('home.dailyUsage')}
                    </Text>
                    <View style={styles.usageRow}>
                        <Text style={[styles.usageValue, { color: blueColor }]}>
                            {formattedUsage.value}
                        </Text>
                        <Text style={[styles.usageUnit, { color: colors.textSecondary }]}>
                            {formattedUsage.unit}
                        </Text>
                    </View>
                </View>

                {/* Right Side: Digital Clock Duration */}
                <View style={[styles.timeBox, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light, borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light }]}>
                    <View style={styles.timeRow}>
                        <Text style={[styles.digitalText, { color: blueColor }]}>{hh}</Text>
                        <Text style={[styles.digitalLabel, { color: colors.textSecondary }]}>{t('common.hoursShort')}</Text>
                    </View>
                    <View style={styles.timeRow}>
                        <Text style={[styles.digitalText, { color: blueColor }]}>{mm}</Text>
                        <Text style={[styles.digitalLabel, { color: colors.textSecondary }]}>{t('common.minutesShort')}</Text>
                    </View>
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderRadius: 24, // Rounded corners as per image
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftSide: {
        flex: 1,
        justifyContent: 'center',
    },
    usageRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    usageValue: {
        fontSize: 48,
        fontWeight: 'bold',
        letterSpacing: -1,
        lineHeight: 56, // Adjust to preventing clipping
    },
    usageUnit: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    timeBox: {
        width: 90,
        height: 90,
        borderRadius: 18,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    digitalText: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: 'Doto_700Bold', // Custom Digital Font
        fontVariant: ['tabular-nums'],
        letterSpacing: 2,
    },
    digitalLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    }
});
