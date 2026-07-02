import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ConnectedDevice } from '@/types';

interface ConnectedDevicesListProps {
    t: (key: string) => string;
    devices: ConnectedDevice[];
    onDevicePress: (device: ConnectedDevice) => void;
}

function getDeviceIcon(hostName: string): string {
    const name = (hostName || '').toLowerCase();
    if (
        name.includes('pc') ||
        name.includes('workstation') ||
        name.includes('desktop') ||
        name.includes('computer') ||
        name.includes('macbook') ||
        name.includes('laptop') ||
        name.includes('server')
    ) {
        return 'computer';
    }
    return 'smartphone';
}

function formatElapsedTime(secondsStr: string, t: (key: string) => string): string {
    const seconds = parseInt(secondsStr, 10) || 0;
    if (seconds <= 0) return t('wifi.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return t('wifi.justNow');
    if (minutes < 60) return `${minutes} ${t('wifi.minsAgo')}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${t('wifi.hoursAgo')}`;
    const days = Math.floor(hours / 24);
    return `${days} ${t('wifi.daysAgo')}`;
}

export function ConnectedDevicesList({
    t,
    devices,
    onDevicePress,
}: ConnectedDevicesListProps) {
    const { colors, typography, spacing, isDark } = useTheme();

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 14 }]}>
                    {t('wifi.connectedDevices')}
                </Text>
                <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>{devices.length}</Text>
                </View>
            </View>

            {devices.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md }]}>
                        {t('wifi.noDevices')}
                    </Text>
                </View>
            ) : (
                devices.map((device) => {
                    const isComputer = getDeviceIcon(device.hostName) === 'computer';
                    const iconName = isComputer ? 'desktop-windows' : 'smartphone';
                    const iconColor = isComputer ? '#a855f7' : colors.primary;
                    const iconBg = isComputer ? '#a855f715' : colors.primary + '15';

                    const band = parseInt(device.macAddress.replace(/[^0-9]/g, '').slice(-1) || '0', 10) % 2 === 0 ? '5 GHz' : '2.4 GHz';

                    const timeText = formatElapsedTime(device.associatedTime, t);

                    return (
                        <TouchableOpacity
                            key={device.macAddress}
                            style={[
                                styles.deviceCard,
                                {
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                }
                            ]}
                            onPress={() => onDevicePress(device)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                                <MaterialIcons name={iconName} size={22} color={iconColor} />
                            </View>

                            <View style={styles.middleColumn}>
                                <View style={styles.titleRow}>
                                    <Text style={[typography.body, { color: colors.text, fontWeight: '700', flexShrink: 1 }]} numberOfLines={1}>
                                        {device.hostName || 'Unknown Device'}
                                    </Text>
                                    <View style={[styles.bandBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                        <Text style={[styles.bandText, { color: colors.textSecondary }]}>
                                            {band}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
                                    {device.ipAddress}
                                </Text>
                            </View>

                            <View style={styles.rightColumn}>
                                <View style={styles.timeRow}>
                                    <View style={[styles.statusDot, { backgroundColor: '#34c759' }]} />
                                    <Text style={[typography.caption2, { color: colors.textSecondary, marginLeft: 4 }]}>
                                        {timeText}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.chevronContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                                <MaterialIcons name="chevron-right" size={16} color={colors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    );
                })
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    badge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    emptyCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        marginBottom: 10,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    middleColumn: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
    },
    bandBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 6,
    },
    bandText: {
        fontSize: 9,
        fontWeight: '700',
    },
    rightColumn: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginRight: 8,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    chevronContainer: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ConnectedDevicesList;
