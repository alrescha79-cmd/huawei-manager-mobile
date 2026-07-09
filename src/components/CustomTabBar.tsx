import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, useWindowDimensions, StyleProp, ViewStyle } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Route } from '@react-navigation/native';
import Animated, {
    useSharedValue,
    withSpring,
    useAnimatedStyle,
    interpolate,
    SharedValue,
} from 'react-native-reanimated';
import { useTheme, Theme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const TABLET_BREAKPOINT = 500;
const TAB_BAR_MAX_WIDTH = 460;
const TAB_BAR_SIDE_MARGIN = 16;
const TAB_BAR_BOTTOM_MARGIN = 16;


const FOCUS_SPRING_CONFIG = {
    damping: 14,
    stiffness: 160,
    mass: 0.5,
} as const;


const AnimatedTabLabel = Animated.createAnimatedComponent(Text);


type ThemeColors = Theme['colors'];
type ThemeTypography = Theme['typography'];

type TabIconRenderer = (props: {
    focused: boolean;
    color: string;
    size: number;
}) => React.ReactNode;

interface TabItemProps {
    route: Route<string>;
    isFocused: boolean;
    label: string;
    onPress: () => void;
    onLongPress: () => void;
    icon?: TabIconRenderer;
    colors: ThemeColors;
    typography: ThemeTypography;
    isDark: boolean;
}


const TabItem: React.FC<TabItemProps> = ({
    route,
    isFocused,
    label,
    onPress,
    onLongPress,
    icon,
    colors,
    typography,
    isDark,
}) => {
    /**
     * focusProgress: animated 0 → 1 value.
     * 0 = tab is not selected, 1 = tab is selected.
     */
    const focusProgress = useSharedValue(0);

    useEffect(() => {
        focusProgress.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING_CONFIG);
    }, [isFocused]);

    const iconContainerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: interpolate(focusProgress.value, [0, 1], [0.95, 1.15]) as number },
            { translateY: interpolate(focusProgress.value, [0, 1], [0, -6]) as number },
        ] as any,
    }));

    const iconBackgroundStyle = useAnimatedStyle(() => ({
        opacity: focusProgress.value,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: focusProgress.value,
        transform: [
            { scale: interpolate(focusProgress.value, [0, 1], [0.8, 1.15]) as number },
        ] as any,
    }));

    const dotStyle = useAnimatedStyle(() => ({
        opacity: focusProgress.value,
        transform: [
            { scale: focusProgress.value as number },
            { translateY: interpolate(focusProgress.value, [0, 1], [4, 0]) as number },
        ] as any,
    }));

    const labelStyle = useAnimatedStyle(() => ({
        opacity: interpolate(focusProgress.value, [0, 1], [0.6, 1.0]),
        transform: [
            { scale: interpolate(focusProgress.value, [0, 1], [0.95, 1.0]) as number },
        ] as any,
    }));

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.8}
        >
            <Animated.View
                style={[
                    { backgroundColor: colors.primary, shadowColor: colors.primary },
                    glowStyle,
                ]}
            />

            <Animated.View style={[styles.iconWrapper, iconContainerStyle]}>
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        iconBackgroundStyle,
                        { borderRadius: 12, backgroundColor: colors.primary },
                    ]}
                />
                <View style={styles.iconContent}>
                    {icon?.({
                        focused: isFocused,
                        color: isFocused ? '#FFFFFF' : colors.textSecondary,
                        size: 22,
                    })}
                </View>
            </Animated.View>

            {isFocused && (
                <AnimatedTabLabel
                    style={[
                        typography.caption2,
                        styles.tabLabel,
                        {
                            color: colors.text,
                            fontWeight: '600',
                        },
                        labelStyle,
                    ]}
                >
                    {label}
                </AnimatedTabLabel>
            )}

            <Animated.View
                style={[
                    styles.indicatorDot,
                    { backgroundColor: colors.primary },
                    dotStyle,
                ]}
            />
        </TouchableOpacity>
    );
};


export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
    const { colors, typography, isDark } = useTheme();
    const { bottom: safeAreaBottom } = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();

    const tabBarWidth = screenWidth > TABLET_BREAKPOINT
        ? TAB_BAR_MAX_WIDTH
        : screenWidth - TAB_BAR_SIDE_MARGIN * 2;

    return (
        <View
            style={[
                styles.container,
                {
                    bottom: safeAreaBottom > 0 ? safeAreaBottom : TAB_BAR_BOTTOM_MARGIN,
                    width: tabBarWidth,
                },
            ]}
            pointerEvents="box-none"
        >
            <BlurView
                intensity={Platform.OS === 'ios' ? 85 : 95}
                tint={isDark ? 'dark' : 'light'}
                style={[
                    styles.blurContainer,
                    {
                        backgroundColor: isDark
                            ? 'rgba(28, 28, 30, 0.8)'
                            : 'rgba(255, 255, 255, 0.75)',
                        borderColor: isDark
                            ? 'rgba(255, 255, 255, 0.10)'
                            : 'rgba(0, 0, 0, 0.05)',
                    },
                ]}
            >
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];

                    const label =
                        typeof options.tabBarLabel === 'string'
                            ? options.tabBarLabel
                            : options.title ?? route.name;

                    const isFocused = state.index === index;

                    const handlePress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const handleLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    return (
                        <TabItem
                            key={route.key}
                            route={route}
                            isFocused={isFocused}
                            label={label}
                            onPress={handlePress}
                            onLongPress={handleLongPress}
                            icon={options.tabBarIcon as TabIconRenderer | undefined}
                            colors={colors}
                            typography={typography}
                            isDark={isDark}
                        />
                    );
                })}
            </BlurView>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        alignSelf: 'center',
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 8,
    },
    blurContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 42,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        height: 64,
    },
    iconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    iconContent: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    tabLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    indicatorDot: {
        width: 38,
        height: 4,
        borderRadius: 2,
        position: 'absolute',
        bottom: -2,
    },
});
