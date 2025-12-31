import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';

interface GradientBackgroundProps {
    children: React.ReactNode;
    style?: any;
}

export const GradientBackground = ({ children, style }: GradientBackgroundProps) => {
    const { colors } = useTheme();

    return (
        <LinearGradient
            colors={colors.backgroundGradient as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.container, style]}
        >
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default GradientBackground;
