import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@/theme';

interface AnimatedScreenProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

/**
 * Animated screen wrapper for smooth tab transitions
 * Applies fade and subtle slide animation when screen becomes focused
 */
export const AnimatedScreen: React.FC<AnimatedScreenProps> = ({ children, style }) => {
    const isFocused = useIsFocused();
    const { colors } = useTheme();

    const opacity = useSharedValue(0);
    const translateY = useSharedValue(12);

    useEffect(() => {
        if (isFocused) {
            // Animate in when focused - slower for more fluid feel
            opacity.value = withTiming(1, {
                duration: 400,
                easing: Easing.bezier(0.4, 0, 0.2, 1), // Material Design standard easing
            });
            translateY.value = withTiming(0, {
                duration: 450,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
            });
        } else {
            // Reset for next focus
            opacity.value = 0;
            translateY.value = 12;
        }
    }, [isFocused]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View style={[styles.animatedContainer, style, animatedStyle]}>
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
