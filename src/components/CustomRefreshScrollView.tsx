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
    onRefresh: () => void;
    refreshing: boolean;
    onPullProgress?: (progress: number) => void;
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

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        isAtTop.current = offsetY <= 0;

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

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (e, gestureState) => {
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
                } else {
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

    const pullTransform = Platform.OS === 'android' ? {
        transform: [{ translateY: currentPullProgress * 30 }],
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
