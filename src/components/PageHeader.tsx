import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface PageHeaderProps {
    title: string;
    showBackButton?: boolean;
    rightElement?: React.ReactNode;
}

export const PageHeader = ({ title, showBackButton = false, rightElement }: PageHeaderProps) => {
    const { colors, typography } = useTheme();
    const router = useRouter();

    return (
        <View style={[
            styles.container,
            { paddingTop: 16 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) }
        ]}>
            <View style={styles.content}>
                <View style={styles.left}>
                    {showBackButton && (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons name="arrow-back-ios" size={22} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={[styles.title, typography.headline, { color: colors.text }]} numberOfLines={1}>
                    {title}
                </Text>

                <View style={styles.right}>
                    {rightElement}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    left: {
        width: 40,
        alignItems: 'flex-start',
    },
    right: {
        width: 40,
        alignItems: 'flex-end',
    },
    title: {
        flex: 1,
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 18,
    },
    backButton: {
        padding: 4,
    },
});

export default PageHeader;
