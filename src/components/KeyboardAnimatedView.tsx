import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';

interface KeyboardAnimatedViewProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    extraPadding?: number;
}

/**
 * Animated view that responds to keyboard height changes
 * Uses react-native-keyboard-controller for smooth keyboard animations
 * Wrap your TextInput containers with this for automatic keyboard avoidance
 */
export function KeyboardAnimatedView({
    children,
    style,
    extraPadding = 0,
}: KeyboardAnimatedViewProps) {
    const [keyboardHeight, setKeyboardHeight] = React.useState(0);

    useKeyboardHandler({
        onMove: (e) => {
            'worklet';
            setKeyboardHeight(e.height);
        },
        onEnd: (e) => {
            'worklet';
            setKeyboardHeight(e.height);
        },
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            paddingBottom: keyboardHeight + extraPadding,
        };
    });

    return (
        <Animated.View style={[styles.container, style, animatedStyle]}>
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default KeyboardAnimatedView;
