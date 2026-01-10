import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
    onFinish?: () => void;
    isLoading?: boolean;
}

export function AnimatedSplashScreen({ onFinish, isLoading = true }: AnimatedSplashScreenProps) {
    const { colors, isDark } = useTheme();

    // Theme-aware colors
    const bgColors = isDark
        ? ['#0a0a1a', '#0f1a2e', '#1a2540', '#0f1a2e', '#0a0a1a'] as const
        : ['#f8fafc', '#e2e8f0', '#cbd5e1', '#e2e8f0', '#f8fafc'] as const;
    const textColor = isDark ? '#ffffff' : '#1e293b';
    const subtitleColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(30, 41, 59, 0.6)';
    const starColor = isDark ? '#ffffff' : '#64748b';
    const accentColor = colors.primary || '#3b82f6';
    // Animation values
    const logoScale = useRef(new Animated.Value(0.3)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoRotate = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(30)).current;
    const pulseScale = useRef(new Animated.Value(1)).current;
    const glowOpacity = useRef(new Animated.Value(0.3)).current;
    const ringScale = useRef(new Animated.Value(0.8)).current;
    const ringOpacity = useRef(new Animated.Value(0)).current;
    const dotsOpacity = useRef(new Animated.Value(0)).current;
    const dot1Opacity = useRef(new Animated.Value(0.3)).current;
    const dot2Opacity = useRef(new Animated.Value(0.3)).current;
    const dot3Opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Initial animation sequence
        Animated.sequence([
            // Logo fade in & scale up with slight rotate
            Animated.parallel([
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 40,
                    friction: 6,
                    useNativeDriver: true,
                }),
                Animated.timing(logoRotate, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.back(1.5)),
                }),
                Animated.timing(ringOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(ringScale, {
                    toValue: 1,
                    tension: 30,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]),
            // Text slide up & fade in
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(textTranslateY, {
                    toValue: 0,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]),
            // Loading dots fade in
            Animated.timing(dotsOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Continuous pulse animation for logo
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseScale, {
                    toValue: 1.08,
                    duration: 1200,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
                Animated.timing(pulseScale, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
            ])
        );
        pulseAnimation.start();

        // Glow animation
        const glowAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(glowOpacity, {
                    toValue: 0.6,
                    duration: 1500,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
                Animated.timing(glowOpacity, {
                    toValue: 0.3,
                    duration: 1500,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
            ])
        );
        glowAnimation.start();

        // Loading dots animation
        const dotAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(dot1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.parallel([
                    Animated.timing(dot1Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot2Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot3Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
                ]),
            ])
        );
        dotAnimation.start();

        return () => {
            pulseAnimation.stop();
            glowAnimation.stop();
            dotAnimation.stop();
        };
    }, []);

    const rotateInterpolation = logoRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['-180deg', '0deg'],
    });

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={bgColors}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Background particles/stars effect */}
                <View style={styles.starsContainer}>
                    {[...Array(20)].map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.star,
                                {
                                    backgroundColor: starColor,
                                    left: Math.random() * width,
                                    top: Math.random() * height,
                                    opacity: Math.random() * 0.5 + 0.1,
                                    width: Math.random() * 3 + 1,
                                    height: Math.random() * 3 + 1,
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* Animated Glow Ring */}
                <Animated.View
                    style={[
                        styles.glowRing,
                        {
                            opacity: glowOpacity,
                            transform: [{ scale: pulseScale }],
                        },
                    ]}
                />

                {/* Outer Ring */}
                <Animated.View
                    style={[
                        styles.outerRing,
                        {
                            opacity: ringOpacity,
                            transform: [{ scale: ringScale }],
                        },
                    ]}
                />

                {/* Logo Container with Icon */}
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            opacity: logoOpacity,
                            transform: [
                                { scale: Animated.multiply(logoScale, pulseScale) },
                                { rotate: rotateInterpolation },
                            ],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['#3b82f6', '#1d4ed8', '#1e40af']}
                        style={styles.iconBackground}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <MaterialIcons name="router" size={50} color="#ffffff" />
                    </LinearGradient>
                </Animated.View>

                {/* App Name */}
                <Animated.View
                    style={[
                        styles.textContainer,
                        {
                            opacity: textOpacity,
                            transform: [{ translateY: textTranslateY }],
                        },
                    ]}
                >
                    <Text style={[styles.title, { color: textColor }]}>Huawei Manager</Text>
                    <Text style={[styles.subtitle, { color: subtitleColor }]}>Smart Modem Control</Text>
                </Animated.View>

                {/* Loading Dots */}
                {isLoading && (
                    <Animated.View style={[styles.loadingContainer, { opacity: dotsOpacity }]}>
                        <View style={styles.dotsContainer}>
                            <Animated.View style={[styles.dot, { opacity: dot1Opacity, backgroundColor: accentColor }]} />
                            <Animated.View style={[styles.dot, { opacity: dot2Opacity, backgroundColor: accentColor }]} />
                            <Animated.View style={[styles.dot, { opacity: dot3Opacity, backgroundColor: accentColor }]} />
                        </View>
                        <Text style={[styles.loadingText, { color: subtitleColor }]}>Connecting to modem</Text>
                    </Animated.View>
                )}

                {/* Bottom branding */}
                <Animated.View style={[styles.bottomBranding, { opacity: textOpacity }]}>
                    <Text style={[styles.versionText, { color: subtitleColor }]}>v1.1.0</Text>
                </Animated.View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    starsContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    star: {
        position: 'absolute',
        backgroundColor: '#ffffff',
        borderRadius: 10,
    },
    glowRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: 'rgba(59, 130, 246, 0.3)',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    outerRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.4)',
    },
    logoContainer: {
        marginBottom: 40,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    iconBackground: {
        width: 100,
        height: 100,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    loadingContainer: {
        position: 'absolute',
        bottom: 120,
        alignItems: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
        marginHorizontal: 4,
    },
    loadingText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        letterSpacing: 0.5,
    },
    bottomBranding: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center',
    },
    versionText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.3)',
    },
});

export default AnimatedSplashScreen;
