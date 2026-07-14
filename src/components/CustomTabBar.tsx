import React, { useEffect, memo } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Route } from '@react-navigation/native';
import Animated, {
    useSharedValue,
    withSpring,
    withTiming,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { useTheme, Theme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const TABLET_BREAKPOINT = 500;
const TAB_BAR_MAX_WIDTH = 460;
const TAB_BAR_SIDE_MARGIN = 16;
const TAB_BAR_BOTTOM_MARGIN = 16;

const SPRING = { damping: 18, stiffness: 180, mass: 0.4 } as const;
const OPACITY_DURATION = 120;

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
}

const TabItem: React.FC<TabItemProps> = memo(({
    isFocused,
    label,
    onPress,
    onLongPress,
    icon,
    colors,
    typography,
}) => {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withSpring(isFocused ? 1 : 0, SPRING);
    }, [isFocused]);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: interpolate(progress.value, [0, 1], [0.95, 1.15], Extrapolation.CLAMP) },
            { translateY: interpolate(progress.value, [0, 1], [0, -8], Extrapolation.CLAMP) },
        ] as any,
    }));

    const bgFillStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    const bottomStyle = useAnimatedStyle(() => ({
        opacity: withTiming(isFocused ? 1 : 0, { duration: OPACITY_DURATION }),
        transform: [
            { translateY: interpolate(progress.value, [0, 1], [4, 0], Extrapolation.CLAMP) },
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
            <Animated.View style={[styles.iconWrapper, iconStyle]}>
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        bgFillStyle,
                        styles.iconBgFill,
                        { backgroundColor: colors.primary },
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

            <Animated.View style={[styles.bottomArea, bottomStyle]} pointerEvents="none">
                <Text
                    style={[
                        typography.caption2,
                        styles.tabLabel,
                        { color: colors.text, fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                >
                    {label}
                </Text>
                <View style={[styles.indicatorDot, { backgroundColor: colors.primary }]} />
            </Animated.View>
        </TouchableOpacity>
    );
});

TabItem.displayName = 'TabItem';

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
                experimentalBlurMethod="dimezisBlurView"
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
        width: 36,
        height: 36,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    iconBgFill: {
        borderRadius: 11,
    },
    iconContent: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    bottomArea: {
        position: 'absolute',
        bottom: 0,
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 12,
        marginBottom: 0,
    },
    indicatorDot: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
});

export default CustomTabBar;
