
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Dimensions, Platform, TouchableOpacity, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle, Defs, LinearGradient, RadialGradient, Stop, Rect, Line } from 'react-native-svg';
import Animated, {
    useAnimatedProps,
    useDerivedValue,
    withSpring,
    withTiming,
    useSharedValue,
    Easing,
    useAnimatedStyle,
    interpolate,
    interpolateColor,
    Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
// Import only specific icons we need or allow dynamic icon rendering
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);

const TAB_HEIGHT = 50;
const SVG_TOP_OFFSET = 30; // Extra space at top for circle overflow

// Helper to generate path
const getPath = (width: number, tabWidth: number, currentX: number) => {
    'worklet';
    'worklet';


    return `
      M0,${SVG_TOP_OFFSET} 
      L${width},${SVG_TOP_OFFSET} 
      L${width},${TAB_HEIGHT + 100 + SVG_TOP_OFFSET} 
      L0,${TAB_HEIGHT + 100 + SVG_TOP_OFFSET} 
      Z
    `;
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
    const { colors, typography, isDark } = useTheme();
    const { bottom } = useSafeAreaInsets();
    const [layout, setLayout] = useState({ width: Dimensions.get('window').width, height: 0 });

    const activeIndex = useSharedValue(state.index);

    useEffect(() => {
        activeIndex.value = withSpring(state.index, {
            damping: 25,
            stiffness: 300,
            mass: 0.5,
        });
    }, [state.index]);

    const tabWidth = useMemo(() => layout.width / state.routes.length, [layout.width, state.routes.length]);

    const animatedPathProps = useAnimatedProps(() => {
        const currentX = (activeIndex.value * tabWidth) + (tabWidth / 2);
        return {
            d: getPath(layout.width, tabWidth, currentX),
        };
    });

    const animatedCircleProps = useAnimatedProps(() => {
        const currentX = (activeIndex.value * tabWidth) + (tabWidth / 2);
        return {
            cx: currentX,
        };
    });

    const onLayout = (e: LayoutChangeEvent) => {
        setLayout(e.nativeEvent.layout);
    };

    return (
        <View
            style={[styles.container, { paddingBottom: bottom + 10 }]}
            onLayout={onLayout}
            pointerEvents="box-none"
        >
            {/* The SVG Background */}
            <View style={styles.svgContainer} pointerEvents="none">
                <Svg width={layout.width} height={TAB_HEIGHT + 100 + SVG_TOP_OFFSET} style={styles.svg}>
                    {/* Gradient Definitions */}
                    <Defs>
                        <LinearGradient id="tabBarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={isDark ? '#1A1A2E' : '#FFFFFF'} stopOpacity="1" />
                            <Stop offset="50%" stopColor={isDark ? '#16213E' : '#F8F9FC'} stopOpacity="1" />
                            <Stop offset="100%" stopColor={isDark ? '#0D0D18' : '#F0F2F8'} stopOpacity="1" />
                        </LinearGradient>
                        <RadialGradient id="tabBarBlob1" cx="20%" cy="30%" rx="40%" ry="60%">
                            <Stop offset="0%" stopColor={isDark ? '#2A1A4E' : '#E8ECFF'} stopOpacity={isDark ? '0.4' : '0.6'} />
                            <Stop offset="100%" stopColor={isDark ? '#2A1A4E' : '#E8ECFF'} stopOpacity="0" />
                        </RadialGradient>
                        <RadialGradient id="tabBarBlob2" cx="80%" cy="50%" rx="35%" ry="50%">
                            <Stop offset="0%" stopColor={isDark ? '#0A84FF' : '#D8E0FF'} stopOpacity={isDark ? '0.2' : '0.5'} />
                            <Stop offset="100%" stopColor={isDark ? '#0A84FF' : '#D8E0FF'} stopOpacity="0" />
                        </RadialGradient>
                    </Defs>

                    {/* Base gradient */}
                    <AnimatedPath
                        animatedProps={animatedPathProps}
                        fill="url(#tabBarGradient)"
                        stroke="none"
                    />
                    {/* Mesh blob overlays */}
                    <Rect x="0" y={SVG_TOP_OFFSET} width={layout.width} height={TAB_HEIGHT + 100} fill="url(#tabBarBlob1)" />
                    <Rect x="0" y={SVG_TOP_OFFSET} width={layout.width} height={TAB_HEIGHT + 100} fill="url(#tabBarBlob2)" />

                    {/* Top border line */}
                    <Line
                        x1="0"
                        y1={SVG_TOP_OFFSET}
                        x2={layout.width}
                        y2={SVG_TOP_OFFSET}
                        stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
                        strokeWidth="0.5"
                    />

                    <AnimatedCircle
                        animatedProps={animatedCircleProps}
                        cy={12 + SVG_TOP_OFFSET}
                        r={23}
                        fill={colors.primary}
                        stroke="none"
                    />
                </Svg>
            </View>

            {/* Tab Items */}
            <View style={[styles.tabsContainer, { height: TAB_HEIGHT }]}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label =
                        options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;

                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    // Icon setup
                    // We assume options.tabBarIcon is a function that returns a component
                    const IconComp = options.tabBarIcon;

                    // Animations
                    const animatedIconStyle = useAnimatedStyle(() => {
                        // If focused, move up into the "hill"
                        const isActive = activeIndex.value === index; // This is a bit jumpy if exact
                        // Better: interpolate based on distance from activeIndex
                        const diff = Math.abs(activeIndex.value - index);
                        // If diff is 0 => -25 (up), if diff is 1 => 0
                        const translateY = interpolate(diff, [0, 1], [-20, 0], Extrapolation.CLAMP);
                        const opacity = interpolate(diff, [0.5, 1], [0, 1], Extrapolation.CLAMP); // Text opacity

                        return {
                            transform: [{ translateY }],
                        }
                    });

                    // We need separate anim for Icon and Text
                    // Icon moves UP and turns WHITE if active
                    const animatedIconContainerStyle = useAnimatedStyle(() => {
                        const diff = Math.abs(activeIndex.value - index);
                        const translateY = interpolate(diff, [0, 1], [-4, 6], Extrapolation.CLAMP);
                        return {
                            transform: [{ translateY }]
                        };
                    });

                    const animatedTextStyle = useAnimatedStyle(() => {
                        const diff = Math.abs(activeIndex.value - index);
                        const color = interpolateColor(
                            diff,
                            [0, 1],
                            [colors.primary, colors.textSecondary]
                        );
                        return {
                            color,
                        };
                    });

                    // Icon Color interpolation
                    // Since color is passed to IconComp, we can't easily animate the prop inside usage without context.
                    // But we can just use conditional rendering or "active" color prop.
                    // The "active" icon sits in the cloud, so it should be white.
                    // The "inactive" icon sits in the bar, so it should be gray.

                    // BUT: The circle moves. If we put the icon in the tab item, it needs to move with the circle? 
                    // No, the icon STAYS in its column, but moves UP vertically.
                    // The circle horizontally moves to catch it.

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.tabItem}
                            activeOpacity={0.8}
                        >
                            <AnimatedView style={[styles.iconContainer, animatedIconContainerStyle]}>
                                {options.tabBarIcon
                                    ? options.tabBarIcon({
                                        focused: isFocused,
                                        color: isFocused ? '#FFF' : colors.textSecondary,
                                        size: 24,
                                    })
                                    : null}
                            </AnimatedView>

                            <AnimatedText style={[
                                typography.caption2,
                                { marginTop: 6, fontWeight: isFocused ? '600' : '400' },
                                animatedTextStyle
                            ]}>
                                {typeof label === 'string' ? label : route.name}
                            </AnimatedText>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        elevation: 0,
        backgroundColor: 'transparent',
    },
    svgContainer: {
        position: 'absolute',
        top: -30,
        left: 0,
        right: 0,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    svg: {
        // backgroundColor: 'transparent'
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    }
});
