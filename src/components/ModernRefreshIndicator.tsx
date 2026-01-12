import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ModernRefreshIndicatorProps {
    refreshing: boolean;
}

export function ModernRefreshIndicator({ refreshing }: ModernRefreshIndicatorProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // Data packets animation - 3 dots moving from left to right
    const dot1X = useRef(new Animated.Value(0)).current;
    const dot2X = useRef(new Animated.Value(0)).current;
    const dot3X = useRef(new Animated.Value(0)).current;
    const dot1Opacity = useRef(new Animated.Value(0)).current;
    const dot2Opacity = useRef(new Animated.Value(0)).current;
    const dot3Opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (refreshing) {
            // Show animation
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Create data packet animation - dots moving from router to phone
            const createPacketAnim = (dotX: Animated.Value, dotOpacity: Animated.Value, delay: number) => {
                return Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        // Fade in and move
                        Animated.parallel([
                            Animated.timing(dotOpacity, {
                                toValue: 1,
                                duration: 100,
                                useNativeDriver: true,
                            }),
                            Animated.timing(dotX, {
                                toValue: 1,
                                duration: 500,
                                easing: Easing.linear,
                                useNativeDriver: true,
                            }),
                        ]),
                        // Fade out at end
                        Animated.timing(dotOpacity, {
                            toValue: 0,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        // Reset position instantly
                        Animated.timing(dotX, {
                            toValue: 0,
                            duration: 0,
                            useNativeDriver: true,
                        }),
                        // Wait for cycle
                        Animated.delay(300),
                    ])
                );
            };

            const anim1 = createPacketAnim(dot1X, dot1Opacity, 0);
            const anim2 = createPacketAnim(dot2X, dot2Opacity, 250);
            const anim3 = createPacketAnim(dot3X, dot3Opacity, 500);

            anim1.start();
            anim2.start();
            anim3.start();

            return () => {
                anim1.stop();
                anim2.stop();
                anim3.stop();
            };
        } else {
            // Hide animation
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Reset dot positions
            dot1X.setValue(0);
            dot2X.setValue(0);
            dot3X.setValue(0);
            dot1Opacity.setValue(0);
            dot2Opacity.setValue(0);
            dot3Opacity.setValue(0);
        }
    }, [refreshing]);

    if (!refreshing) return null;

    const dotTravelDistance = 50; // pixels to travel

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: opacityAnim,
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    top: insets.top + 10,
                },
            ]}
        >
            {/* Animation container: Router -> Data -> Phone */}
            <View style={styles.animationContainer}>
                {/* Router/Modem Icon */}
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <MaterialIcons name="router" size={22} color={colors.primary} />
                </View>

                {/* Data packets flowing */}
                <View style={styles.dataFlowContainer}>
                    {/* Dot 1 */}
                    <Animated.View
                        style={[
                            styles.dataDot,
                            {
                                backgroundColor: colors.primary,
                                opacity: dot1Opacity,
                                transform: [{
                                    translateX: dot1X.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, dotTravelDistance],
                                    }),
                                }],
                            },
                        ]}
                    />
                    {/* Dot 2 */}
                    <Animated.View
                        style={[
                            styles.dataDot,
                            {
                                backgroundColor: colors.primary,
                                opacity: dot2Opacity,
                                transform: [{
                                    translateX: dot2X.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, dotTravelDistance],
                                    }),
                                }],
                            },
                        ]}
                    />
                    {/* Dot 3 */}
                    <Animated.View
                        style={[
                            styles.dataDot,
                            {
                                backgroundColor: colors.primary,
                                opacity: dot3Opacity,
                                transform: [{
                                    translateX: dot3X.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, dotTravelDistance],
                                    }),
                                }],
                            },
                        ]}
                    />
                </View>

                {/* Phone Icon */}
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <MaterialIcons name="smartphone" size={20} color={colors.primary} />
                </View>
            </View>

            {/* Loading text */}
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Syncing...
            </Text>
        </Animated.View>
    );
}

// Custom RefreshControl wrapper for use in ScrollView
export function useCustomRefresh(refreshing: boolean, onRefresh: () => void) {
    return {
        refreshIndicator: <ModernRefreshIndicator refreshing={refreshing} />,
        refreshControlProps: {
            refreshing,
            onRefresh,
            colors: ['transparent'],
            tintColor: 'transparent',
            progressBackgroundColor: 'transparent',
            progressViewOffset: 50,
        },
    };
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: '50%',
        marginLeft: -80,
        width: 160,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    animationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dataFlowContainer: {
        width: 60,
        height: 20,
        marginHorizontal: 4,
        position: 'relative',
        overflow: 'hidden',
    },
    dataDot: {
        position: 'absolute',
        left: 0,
        top: 7,
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    loadingText: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 6,
    },
});

export default ModernRefreshIndicator;
