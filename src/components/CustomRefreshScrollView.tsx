import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
    ScrollView,
    ScrollViewProps,
    Animated,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Platform,
    PanResponder,
    View,
    StyleSheet,
    GestureResponderEvent,
    PanResponderGestureState,
} from 'react-native';
import { useTheme } from '@/theme';

interface CustomRefreshScrollViewProps extends ScrollViewProps {
    /** Called when user pulls down and releases */
    onRefresh: () => void;
    /** Whether currently refreshing */
    refreshing: boolean;
    /** Called with pull progress 0-1 */
    onPullProgress?: (progress: number) => void;
    /** Pull distance required to trigger refresh (default: 80) */
    pullThreshold?: number;
}

/**
 * Custom ScrollView with pull-to-refresh that allows custom refresh indicator
 * Uses PanResponder on Android to detect pull gesture when at top
 */
export const CustomRefreshScrollView: React.FC<CustomRefreshScrollViewProps> = ({
    onRefresh,
    refreshing,
    onPullProgress,
    pullThreshold = 80,
    children,
    onScroll,
    contentContainerStyle,
    ...props
}) => {
    const { colors } = useTheme();
    const scrollRef = useRef<ScrollView>(null);
    const isAtTop = useRef(true);
    const pullDistance = useRef(0);
    const startY = useRef(0);
    const [currentPullProgress, setCurrentPullProgress] = useState(0);

    // For iOS, use native bounces
    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        isAtTop.current = offsetY <= 0;

        // iOS: Use negative offset for pull progress
        if (Platform.OS === 'ios' && offsetY < 0 && !refreshing) {
            const progress = Math.min(Math.abs(offsetY) / pullThreshold, 1);
            setCurrentPullProgress(progress);
            onPullProgress?.(progress);
        } else if (Platform.OS === 'ios') {
            if (currentPullProgress > 0) {
                setCurrentPullProgress(0);
                onPullProgress?.(0);
            }
        }

        onScroll?.(event);
    }, [refreshing, onPullProgress, pullThreshold, onScroll, currentPullProgress]);

    // For Android, we need to track touch movement when at top
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (e, gestureState) => {
                // Only become responder if at top and pulling down on Android
                if (Platform.OS === 'android' && isAtTop.current && gestureState.dy > 10) {
                    return true;
                }
                return false;
            },
            onPanResponderGrant: (e, gestureState) => {
                startY.current = gestureState.y0;
            },
            onPanResponderMove: (e, gestureState) => {
                if (Platform.OS === 'android' && isAtTop.current && gestureState.dy > 0 && !refreshing) {
                    pullDistance.current = gestureState.dy;
                    const progress = Math.min(gestureState.dy / pullThreshold, 1);
                    setCurrentPullProgress(progress);
                    onPullProgress?.(progress);
                }
            },
            onPanResponderRelease: (e, gestureState) => {
                const shouldRefresh = Platform.OS === 'android' && pullDistance.current >= pullThreshold && !refreshing;
                if (shouldRefresh) {
                    onRefresh();
                    // Keep progress at 1 when refresh is triggered
                    // refreshing state in parent will control indicator
                } else {
                    // Only reset if not refreshing
                    setCurrentPullProgress(0);
                    onPullProgress?.(0);
                }
                pullDistance.current = 0;
            },
            onPanResponderTerminate: () => {
                pullDistance.current = 0;
                setCurrentPullProgress(0);
                onPullProgress?.(0);
            },
        })
    ).current;

    // iOS: Handle scroll end drag for refresh trigger
    const handleScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (Platform.OS === 'ios') {
            const offsetY = event.nativeEvent.contentOffset.y;
            if (offsetY <= -pullThreshold && !refreshing) {
                onRefresh();
            }
            setCurrentPullProgress(0);
            onPullProgress?.(0);
        }
    }, [pullThreshold, refreshing, onRefresh, onPullProgress]);

    // Create transformed content container for Android pull effect
    const pullTransform = Platform.OS === 'android' ? {
        transform: [{ translateY: currentPullProgress * 30 }], // Move content down during pull
    } : {};

    return (
        <View style={styles.container} {...(Platform.OS === 'android' ? panResponder.panHandlers : {})}>
            <ScrollView
                ref={scrollRef}
                {...props}
                onScroll={handleScroll}
                onScrollEndDrag={handleScrollEndDrag}
                scrollEventThrottle={16}
                bounces={Platform.OS === 'ios'}
                contentContainerStyle={[contentContainerStyle, pullTransform]}
            >
                {children}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default CustomRefreshScrollView;
