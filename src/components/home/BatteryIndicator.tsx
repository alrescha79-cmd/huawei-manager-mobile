import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface BatteryIndicatorProps {
    batteryStatus?: string;
    batteryLevel?: string;
    batteryPercent?: string;
    size?: 'small' | 'medium' | 'large';
}

/**
 * Battery indicator component for MiFi modems
 * - Shows battery icon with percentage inside
 * - Shows charging indicator when plugged in (bolt icon + "Charging" text)
 * - Shows "On Battery" text when not charging
 * - Shows adaptor icon for non-battery modems (CPE)
 * 
 * Battery Status values:
 * - 0: Not charging (on battery)
 * - 1: Charging
 * - Empty/undefined: No battery (CPE/router with adaptor)
 */
export function BatteryIndicator({
    batteryStatus,
    batteryLevel,
    batteryPercent,
    size = 'medium',
}: BatteryIndicatorProps) {
    const { colors, typography } = useTheme();

    const sizes = {
        small: { width: 32, height: 16, fontSize: 9, iconSize: 12 },
        medium: { width: 44, height: 22, fontSize: 11, iconSize: 14 },
        large: { width: 56, height: 28, fontSize: 14, iconSize: 18 },
    };

    const sizeConfig = sizes[size];
    const percent = parseInt(batteryPercent || '0', 10);
    const isCharging = batteryStatus === '1';
    const hasBattery = batteryPercent !== undefined && batteryPercent !== '' && batteryPercent !== null;

    const getBatteryColor = () => {
        if (percent <= 20) return colors.error;
        if (percent <= 50) return colors.warning;
        return colors.success;
    };

    if (!hasBattery) {
        return (
            <View style={styles.container}>
                <MaterialIcons
                    name="power"
                    size={18}
                    color={colors.primary}
                />
                <Text style={[typography.subheadline, { color: colors.text, fontWeight: '700', marginLeft: 8 }]}>
                    AC Power
                </Text>
            </View>
        );
    }

    const batteryColor = getBatteryColor();
    const fillWidth = Math.max(0, Math.min(100, percent)) / 100 * (sizeConfig.width - 4);

    return (
        <View style={styles.container}>
            {isCharging && (
                <MaterialIcons
                    name="bolt"
                    size={sizeConfig.iconSize}
                    color={colors.warning}
                    style={{ marginRight: 2 }}
                />
            )}

            <View style={[
                styles.batteryBody,
                {
                    width: sizeConfig.width,
                    height: sizeConfig.height,
                    borderColor: colors.text,
                    backgroundColor: colors.background,
                }
            ]}>
                <View style={[
                    styles.batteryFill,
                    {
                        width: fillWidth,
                        height: sizeConfig.height - 4,
                        backgroundColor: batteryColor,
                    }
                ]} />

                <Text style={[
                    styles.percentText,
                    {
                        fontSize: sizeConfig.fontSize,
                        color: colors.text,
                        textShadowColor: colors.background,
                        textShadowOffset: { width: 0.5, height: 0.5 },
                        textShadowRadius: 1,
                    }
                ]}>
                    {percent}%
                </Text>
            </View>

            <View style={[
                styles.batteryTip,
                {
                    width: 2,
                    height: sizeConfig.height * 0.5,
                    backgroundColor: colors.text,
                }
            ]} />

            <Text style={[
                typography.subheadline,
                {
                    color: isCharging ? colors.warning : colors.text,
                    fontWeight: '700',
                    marginLeft: 8,
                }
            ]}>
                {isCharging ? 'Charging' : 'Battery'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    batteryBody: {
        borderWidth: 1.2,
        borderRadius: 4,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    batteryFill: {
        position: 'absolute',
        left: 0,
        top: 1,
        bottom: 0,
        borderRadius: 2,
    },
    percentText: {
        fontWeight: '800',
        zIndex: 1,
    },
    batteryTip: {
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
        marginLeft: 1,
    },
});

export default BatteryIndicator;
