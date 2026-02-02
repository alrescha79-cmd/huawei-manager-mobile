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
    const { colors } = useTheme();

    const sizes = {
        small: { width: 32, height: 16, fontSize: 9, iconSize: 12 },
        medium: { width: 44, height: 22, fontSize: 11, iconSize: 14 },
        large: { width: 56, height: 28, fontSize: 14, iconSize: 18 },
    };

    const sizeConfig = sizes[size];
    const percent = parseInt(batteryPercent || '0', 10);
    const isCharging = batteryStatus === '1';
    const hasBattery = batteryPercent !== undefined && batteryPercent !== '' && batteryPercent !== null;

    // Determine battery color based on percentage
    const getBatteryColor = () => {
        if (percent <= 20) return colors.error;
        if (percent <= 50) return colors.warning;
        return colors.success;
    };

    // If no battery info, show adaptor icon (for CPE/routers)
    if (!hasBattery) {
        return (
            <View style={styles.container}>
                <MaterialIcons
                    name="power"
                    size={sizeConfig.iconSize + 6}
                    color={colors.success}
                />
                <Text style={[styles.statusText, { color: colors.textSecondary, fontSize: sizeConfig.fontSize }]}>
                    AC Power
                </Text>
            </View>
        );
    }

    const batteryColor = getBatteryColor();
    const fillWidth = Math.max(0, Math.min(100, percent)) / 100 * (sizeConfig.width - 4);

    return (
        <View style={styles.container}>
            {/* Charging icon before battery */}
            {isCharging && (
                <MaterialIcons
                    name="bolt"
                    size={sizeConfig.iconSize}
                    color={colors.warning}
                    style={{ marginRight: 2 }}
                />
            )}

            {/* Battery body */}
            <View style={[
                styles.batteryBody,
                {
                    width: sizeConfig.width,
                    height: sizeConfig.height,
                    borderColor: colors.text,
                    backgroundColor: colors.background,
                }
            ]}>
                {/* Battery fill */}
                <View style={[
                    styles.batteryFill,
                    {
                        width: fillWidth,
                        height: sizeConfig.height - 4,
                        backgroundColor: batteryColor,
                    }
                ]} />

                {/* Percentage text - theme-aware color */}
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

            {/* Battery tip */}
            <View style={[
                styles.batteryTip,
                {
                    width: 2,
                    height: sizeConfig.height * 0.5,
                    backgroundColor: colors.text,
                }
            ]} />

            {/* Status text */}
            <Text style={[
                styles.statusText,
                {
                    color: isCharging ? colors.warning : colors.textSecondary,
                    fontSize: sizeConfig.fontSize - 1,
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
    statusText: {
        marginLeft: 6,
        fontWeight: '600',
    },
});

export default BatteryIndicator;
