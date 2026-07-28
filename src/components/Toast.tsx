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
    _id?: number;
}

let toastListener: ((config: ToastConfig) => void) | null = null;
let toastIdCounter = 0;

// Deduplication: suppress identical messages within this window
let lastToastMessage = '';
let lastToastTime = 0;
const DEDUP_WINDOW_MS = 2 * 60 * 1000; // 2 minutes — prevents repeated ad/toast spam

function isDuplicateToast(message: string): boolean {
    const now = Date.now();
    if (message === lastToastMessage && now - lastToastTime < DEDUP_WINDOW_MS) {
        return true;
    }
    lastToastMessage = message;
    lastToastTime = now;
    return false;
}

// --- Toast queue (prevents overlapping toasts) ---
let toastQueue: ToastConfig[] = [];
let activeToastId: number | null = null;

function processQueue() {
    if (activeToastId !== null) return;
    const next = toastQueue.shift();
    if (next) {
        activeToastId = next._id ?? null;
        toastListener?.(next);
    } else {
        toastListener?.(null as any);
    }
}

export const showNextFromQueue = () => {
    activeToastId = null;
    processQueue();
};

export const setToastListener = (listener: (config: ToastConfig | null) => void) => {
    toastListener = listener;
};

export const ToastHelper = {
    show: (type: ToastType, message: string, duration = 3000) => {
        if (isDuplicateToast(message)) return;
        toastQueue.push({ visible: true, type, message, duration, _id: ++toastIdCounter });
        processQueue();
    },
    success: (message: string, duration?: number) => {
        if (isDuplicateToast(message)) return;
        toastQueue.push({ visible: true, type: 'success', message, duration: duration ?? 3500, _id: ++toastIdCounter });
        processQueue();
    },
    error: (message: string, duration?: number) => {
        if (isDuplicateToast(message)) return;
        toastQueue.push({ visible: true, type: 'error', message, duration: duration ?? 4000, _id: ++toastIdCounter });
        processQueue();
    },
    info: (message: string, duration?: number) => {
        if (isDuplicateToast(message)) return;
        toastQueue.push({ visible: true, type: 'info', message, duration: duration ?? 3500, _id: ++toastIdCounter });
        processQueue();
    },
    warning: (message: string, duration?: number) => {
        if (isDuplicateToast(message)) return;
        toastQueue.push({ visible: true, type: 'warning', message, duration: duration ?? 3500, _id: ++toastIdCounter });
        processQueue();
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
    return <ToastItem key={config._id ?? 0} config={config} onDismiss={onDismiss} />;
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
        flex: 1,
        flexShrink: 1,
        maxWidth: '100%',
    },
});

export default ToastContainer;
