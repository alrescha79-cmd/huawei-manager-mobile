import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@/theme';

interface ModernLoadingProps {
    size?: 'small' | 'medium' | 'large';
    color?: string;
    style?: any;
}

export function ModernLoading({ size = 'medium', color, style }: ModernLoadingProps) {
    const { colors, isDark } = useTheme();
    const spinnerColor = color || colors.primary;

    // Animation values
    const rotation = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.8)).current;
    const opacity = useRef(new Animated.Value(0.6)).current;

    const sizeMap = {
        small: { container: 20, dot: 4, radius: 6 },
        medium: { container: 32, dot: 6, radius: 10 },
        large: { container: 48, dot: 8, radius: 16 },
    };

    const { container, dot, radius } = sizeMap[size];

    useEffect(() => {
        // Rotation animation
        const rotationAnim = Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        // Pulse animation
        const pulseAnim = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(scale, {
                        toValue: 1,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(scale, {
                        toValue: 0.8,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0.6,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );

        rotationAnim.start();
        pulseAnim.start();

        return () => {
            rotationAnim.stop();
            pulseAnim.stop();
        };
    }, []);

    const rotationInterpolation = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Create 8 dots around circle
    const dots = Array.from({ length: 8 }, (_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const dotOpacity = 1 - (i * 0.1);

        return (
            <View
                key={i}
                style={[
                    styles.dot,
                    {
                        width: dot,
                        height: dot,
                        borderRadius: dot / 2,
                        backgroundColor: spinnerColor,
                        opacity: dotOpacity,
                        transform: [
                            { translateX: x },
                            { translateY: y },
                        ],
                    },
                ]}
            />
        );
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    width: container,
                    height: container,
                    transform: [
                        { rotate: rotationInterpolation },
                        { scale },
                    ],
                    opacity,
                },
                style,
            ]}
        >
            {dots}
        </Animated.View>
    );
}

// Bouncing dots loading - alternative style
interface BouncingDotsProps {
    size?: 'small' | 'medium' | 'large';
    color?: string;
    style?: any;
}

export function BouncingDots({ size = 'medium', color, style }: BouncingDotsProps) {
    const { colors } = useTheme();
    const dotColor = color || colors.primary;

    const dot1Y = useRef(new Animated.Value(0)).current;
    const dot2Y = useRef(new Animated.Value(0)).current;
    const dot3Y = useRef(new Animated.Value(0)).current;

    const sizeMap = {
        small: { dot: 6, gap: 4 },
        medium: { dot: 8, gap: 6 },
        large: { dot: 12, gap: 8 },
    };

    const { dot, gap } = sizeMap[size];

    useEffect(() => {
        const createBounce = (animValue: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(animValue, {
                        toValue: -dot,
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(animValue, {
                        toValue: 0,
                        duration: 200,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.delay(400 - delay),
                ])
            );
        };

        const anim1 = createBounce(dot1Y, 0);
        const anim2 = createBounce(dot2Y, 150);
        const anim3 = createBounce(dot3Y, 300);

        anim1.start();
        anim2.start();
        anim3.start();

        return () => {
            anim1.stop();
            anim2.stop();
            anim3.stop();
        };
    }, []);

    return (
        <View style={[styles.bouncingContainer, style]}>
            <Animated.View
                style={[
                    styles.bouncingDot,
                    {
                        width: dot,
                        height: dot,
                        borderRadius: dot / 2,
                        backgroundColor: dotColor,
                        marginHorizontal: gap / 2,
                        transform: [{ translateY: dot1Y }],
                    },
                ]}
            />
            <Animated.View
                style={[
                    styles.bouncingDot,
                    {
                        width: dot,
                        height: dot,
                        borderRadius: dot / 2,
                        backgroundColor: dotColor,
                        marginHorizontal: gap / 2,
                        transform: [{ translateY: dot2Y }],
                    },
                ]}
            />
            <Animated.View
                style={[
                    styles.bouncingDot,
                    {
                        width: dot,
                        height: dot,
                        borderRadius: dot / 2,
                        backgroundColor: dotColor,
                        marginHorizontal: gap / 2,
                        transform: [{ translateY: dot3Y }],
                    },
                ]}
            />
        </View>
    );
}

// Pulse ring loading
interface PulseRingProps {
    size?: number;
    color?: string;
    style?: any;
}

export function PulseRing({ size = 40, color, style }: PulseRingProps) {
    const { colors } = useTheme();
    const ringColor = color || colors.primary;

    const scale1 = useRef(new Animated.Value(0.5)).current;
    const scale2 = useRef(new Animated.Value(0.5)).current;
    const opacity1 = useRef(new Animated.Value(1)).current;
    const opacity2 = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const createPulse = (scaleVal: Animated.Value, opacityVal: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(scaleVal, {
                            toValue: 1.5,
                            duration: 1000,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacityVal, {
                            toValue: 0,
                            duration: 1000,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.parallel([
                        Animated.timing(scaleVal, {
                            toValue: 0.5,
                            duration: 0,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacityVal, {
                            toValue: 1,
                            duration: 0,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            );
        };

        const anim1 = createPulse(scale1, opacity1, 0);
        const anim2 = createPulse(scale2, opacity2, 500);

        anim1.start();
        anim2.start();

        return () => {
            anim1.stop();
            anim2.stop();
        };
    }, []);

    return (
        <View style={[styles.pulseContainer, { width: size, height: size }, style]}>
            <Animated.View
                style={[
                    styles.pulseRing,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderColor: ringColor,
                        transform: [{ scale: scale1 }],
                        opacity: opacity1,
                    },
                ]}
            />
            <Animated.View
                style={[
                    styles.pulseRing,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderColor: ringColor,
                        transform: [{ scale: scale2 }],
                        opacity: opacity2,
                    },
                ]}
            />
            <View
                style={[
                    styles.pulseDot,
                    {
                        width: size / 4,
                        height: size / 4,
                        borderRadius: size / 8,
                        backgroundColor: ringColor,
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        position: 'absolute',
    },
    bouncingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bouncingDot: {},
    pulseContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseRing: {
        position: 'absolute',
        borderWidth: 2,
    },
    pulseDot: {},
});

export default ModernLoading;
