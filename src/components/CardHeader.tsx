import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface CardHeaderProps {
    title: string;
}

export function CardHeader({ title }: CardHeaderProps) {
    const { colors, typography, spacing } = useTheme();

    return (
        <View style={styles.container}>
            <Text style={[typography.headline, styles.title, { color: colors.text }]}>
                {title}
            </Text>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    title: {
        textAlign: 'center',
        marginBottom: 8,
    },
    separator: {
        height: 1,
        width: '100%',
    },
});

export default CardHeader;
