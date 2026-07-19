import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSequence,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastConfig {
    visible: boolean;
    type: ToastType;
    message: string;
    duration?: number;
}

let toastListener: ((config: ToastConfig) => void) | null = null;

export const setToastListener = (listener: (config: ToastConfig) => void) => {
    toastListener = listener;
};

export const ToastHelper = {
    show: (type: ToastType, message: string, duration = 3000) => {
        toastListener?.({ visible: true, type, message, duration });
    },
    success: (message: string, duration?: number) => {
        toastListener?.({ visible: true, type: 'success', message, duration: duration ?? 3500 });
    },
    error: (message: string, duration?: number) => {
        toastListener?.({ visible: true, type: 'error', message, duration: duration ?? 4000 });
    },
    info: (message: string, duration?: number) => {
        toastListener?.({ visible: true, type: 'info', message, duration: duration ?? 3500 });
    },
    warning: (message: string, duration?: number) => {
        toastListener?.({ visible: true, type: 'warning', message, duration: duration ?? 3500 });
    },
};

const ICON_MAP: Record<ToastType, keyof typeof MaterialIcons.glyphMap> = {
    success: 'check-circle',
    error: 'error',
    info: 'info',
    warning: 'warning',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ToastProps {
    config: ToastConfig;
    onDismiss: () => void;
}

const ToastItem: React.FC<ToastProps> = ({ config, onDismiss }) => {
    const { colors, typography, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(-100);
    const opacity = useSharedValue(0);

    const getTintColor = (type: ToastType): string => {
        switch (type) {
            case 'success': return '#34C759';
            case 'error': return '#FF3B30';
            case 'warning': return '#FF9500';
            case 'info': return colors.primary;
        }
    };

    useEffect(() => {
        const dismissDelay = config.duration || 3000;

        translateY.value = withSequence(
            withTiming(0, {
                duration: 350,
                easing: Easing.out(Easing.back(1.2)),
            }),
            withDelay(
                dismissDelay,
                withTiming(-100, {
                    duration: 300,
                    easing: Easing.in(Easing.ease),
                }, (finished) => {
                    if (finished) {
                        runOnJS(onDismiss)();
                    }
                })
            )
        );

        opacity.value = withSequence(
            withTiming(1, { duration: 250 }),
            withDelay(
                dismissDelay + 350,
                withTiming(0, { duration: 200 })
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const tintColor = getTintColor(config.type);

    return (
        <Animated.View
            style={[
                styles.toastWrapper,
                animatedStyle,
                { top: insets.top + 10 },
            ]}
            pointerEvents="none"
        >
            <View style={[
                styles.toastContainer,
                {
                    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    shadowColor: tintColor,
                },
            ]}>
                <View style={[styles.iconContainer, { backgroundColor: tintColor + '18' }]}>
                    <MaterialIcons
                        name={ICON_MAP[config.type]}
                        size={20}
                        color={tintColor}
                    />
                </View>
                <Text
                    style={[
                        typography.body,
                        styles.message,
                        { color: colors.text },
                    ]}
                    numberOfLines={3}
                >
                    {config.message}
                </Text>
            </View>
        </Animated.View>
    );
};

interface ToastContainerProps {
    config: ToastConfig | null;
    onDismiss: () => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ config, onDismiss }) => {
    if (!config || !config.visible) return null;
    return <ToastItem key={Date.now()} config={config} onDismiss={onDismiss} />;
};

const styles = StyleSheet.create({
    toastWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 99999,
        elevation: 99999,
        alignItems: 'center',
    },
    toastContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 28,
        borderWidth: 1,
        maxWidth: SCREEN_WIDTH - 80,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    message: {
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default ToastContainer;
