import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { MaterialIcons } from '@expo/vector-icons';

interface CardHeaderProps {
    title: string;
    icon?: keyof typeof MaterialIcons.glyphMap;
}

export function CardHeader({ title, icon }: CardHeaderProps) {
    const { colors, typography, spacing } = useTheme();

    return (
        <View style={styles.container}>
            <View style={styles.titleRow}>
                {icon && (
                    <MaterialIcons name={icon} size={20} color={colors.primary} style={styles.icon} />
                )}
                <Text style={[typography.headline, styles.title, { color: colors.text }]}>
                    {title}
                </Text>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    icon: {
        marginRight: 8,
    },
    title: {
        textAlign: 'center',
    },
    separator: {
        height: 1,
        width: '100%',
    },
});

export default CardHeader;
