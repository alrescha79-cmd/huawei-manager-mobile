import React from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@/theme';

interface AnimatedScreenProps {
    children: React.ReactNode;
    style?: ViewStyle;
    /** Animation duration in ms */
    duration?: number;
    /** Disable animation (for nested Stack navigators like settings) */
    noAnimation?: boolean;
}

/**
 * Animated screen wrapper for smooth tab/page transitions
 * Uses Entering/Exiting animations from react-native-reanimated
 * Simple fade in/out animation for clean transitions
 */
export const AnimatedScreen: React.FC<AnimatedScreenProps> = ({
    children,
    style,
    duration = 350,
    noAnimation = false,
}) => {
    const isFocused = useIsFocused();
    const { colors } = useTheme();

    // No animation mode - just render with themed background (for settings sub-pages)
    if (noAnimation) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }, style]}>
                {children}
            </View>
        );
    }

    // Only render with animation when focused
    if (!isFocused) {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View
                entering={FadeIn.duration(duration)}
                exiting={FadeOut.duration(200)}
                style={[styles.animatedContainer, style]}
            >
                {children}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    animatedContainer: {
        flex: 1,
    },
});

export default AnimatedScreen;
