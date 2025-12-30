import React, { useEffect } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
    Easing,
    WithTimingConfig
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

interface PageTransitionProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, style }) => {
    const isFocused = useIsFocused();
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    const config: WithTimingConfig = {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
    };

    useEffect(() => {
        if (isFocused) {
            opacity.value = withTiming(1, config);
            translateY.value = withTiming(0, config);
        } else {
            // Instant reset when invisible so it's ready to animate in next time
            opacity.value = 0;
            translateY.value = 20;
        }
    }, [isFocused]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
            flex: 1, // Ensure it fills space
        };
    });

    return (
        <Animated.View style={[style, animatedStyle]}>
            {children}
        </Animated.View>
    );
};
