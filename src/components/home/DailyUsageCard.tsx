import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TextTicker from 'react-native-text-ticker';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { Card } from '../Card';

/*
  Daily Usage Card
  Displays daily usage with a large blue value and a digital-clock style duration.
*/

interface DailyUsageCardProps {
    usage: number;
    duration: number;
    dailyLimit?: number;
    style?: StyleProp<ViewStyle>;
}

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

export function DailyUsageCard({ usage, duration, dailyLimit, style }: DailyUsageCardProps) {
    const { colors, typography, glassmorphism, isDark } = useTheme();
    const { t } = useTranslation();

    const formattedUsage = formatBytesWithUnit(usage);
    const formattedDailyLimit = dailyLimit && dailyLimit > 0 ? formatBytesWithUnit(dailyLimit) : null;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const primaryColor = colors.primary;
    const dailyPercent = dailyLimit && dailyLimit > 0
        ? Math.min(Math.round((usage / dailyLimit) * 100), 100)
        : 0;
    const progressColor = dailyPercent >= 90
        ? '#ef4444'
        : dailyPercent >= 75
            ? '#f97316'
            : dailyPercent >= 50
                ? '#eab308'
                : '#22c55e';

    return (
        <Card style={[styles.container, style]}>
            <View style={styles.content}>
                <View style={styles.leftSide}>
                    <View style={styles.titleRow}>
                        <View style={[styles.titleIcon, { backgroundColor: `${primaryColor}1F` }]}>
                            <MaterialIcons name="today" size={16} color={primaryColor} />
                        </View>
                        <TextTicker
                            style={[typography.headline, { color: colors.text, fontWeight: '700', fontSize: 16, flex: 1 }]}
                            duration={4000}
                            loop
                            bounce
                            repeatSpacer={50}
                            marqueeDelay={1000}
                        >
                            {t('home.dailyUsage')}
                        </TextTicker>
                    </View>
                    <View style={styles.usageRow}>
                        <Text style={[styles.usageValue, { color: primaryColor }]}>{formattedUsage.value}</Text>
                        <Text style={[styles.usageUnit, { color: colors.textSecondary }]}>{formattedUsage.unit}</Text>
                    </View>
                    {formattedDailyLimit && (
                        <View style={styles.limitSection}>
                            <View style={styles.limitLabelRow}>
                                <Text style={[styles.dailyLimit, { color: colors.textSecondary }]}>{t('home.dailyLimit')}</Text>
                                <Text style={[styles.percentLabel, { color: progressColor }]}>{dailyPercent}%</Text>
                            </View>
                            <View style={[styles.progressTrack, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
                                <View style={[styles.progressFill, { width: `${dailyPercent}%`, backgroundColor: progressColor }]} />
                            </View>
                            <Text style={[styles.limitValue, { color: colors.primary }]}>{formattedDailyLimit.value} {formattedDailyLimit.unit}</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.timeBox, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light, borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light }]}>
                    <View style={styles.timeRow}>
                        <Text style={[styles.digitalText, { color: primaryColor }]}>{hh}</Text>
                        <Text style={[styles.digitalLabel, { color: colors.textSecondary }]}>{t('common.hoursFull')}</Text>
                    </View>
                    <View style={styles.timeRow}>
                        <Text style={[styles.digitalText, { color: primaryColor }]}>{mm}</Text>
                        <Text style={[styles.digitalLabel, { color: colors.textSecondary }]}>{t('common.minutesFull')}</Text>
                    </View>
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderRadius: 20,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
    },
    leftSide: {
        flex: 1,
        minWidth: 0,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    titleIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    usageRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    usageValue: {
        fontSize: 42,
        fontWeight: 'bold',
        letterSpacing: 0,
        lineHeight: 48,
    },
    usageUnit: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 6,
    },
    limitSection: {
        marginTop: 8,
    },
    limitLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    dailyLimit: {
        fontSize: 11,
        fontWeight: '600',
    },
    percentLabel: {
        fontSize: 11,
        fontWeight: '700',
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    limitValue: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    timeBox: {
        minWidth: 106,
        height: 94,
        borderRadius: 14,
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        marginBottom: 2,
    },
    digitalText: {
        fontSize: 26,
        fontWeight: '700',
        fontFamily: 'Doto_700Bold',
        fontVariant: ['tabular-nums'],
        letterSpacing: 1,
    },
    digitalLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
    }
});
