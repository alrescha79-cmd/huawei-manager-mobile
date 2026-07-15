import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface ModalHeaderProps {
    title: string;
    onClose: () => void;
    subtitle?: string;
}

export function ModalHeader({ title, onClose, subtitle }: ModalHeaderProps) {
    const { colors, typography, isDark, glassmorphism } = useTheme();
    const cardBorder = isDark ? glassmorphism.border.dark : glassmorphism.border.light;

    return (
        <View style={[styles.header, {
            borderBottomColor: cardBorder,
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16,
        }]}>
            <View style={{ width: 44 }} />
            <View style={styles.titleContainer}>
                <Text style={[typography.headline, { color: colors.text, textAlign: 'center' }]} numberOfLines={1}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginTop: 2 }]} numberOfLines={1}>
                        {subtitle}
                    </Text>
                )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={30} color={colors.primary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    titleContainer: {
        flex: 1,
    },
});
