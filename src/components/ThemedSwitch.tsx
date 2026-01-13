import React from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    Animated as RNAnimated,
    Platform
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

interface ThemedSwitchProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
}

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const THUMB_SIZE = 27;
const THUMB_MARGIN = 2;


export const ThemedSwitch: React.FC<ThemedSwitchProps> = ({
    value,
    onValueChange,
    disabled = false
}) => {
    const { colors, isDark } = useTheme();

    const progress = useSharedValue(value ? 1 : 0);

    React.useEffect(() => {
        progress.value = withSpring(value ? 1 : 0, {
            mass: 0.5,
            damping: 15,
            stiffness: 200,
        });
    }, [value]);

    const thumbStyle = useAnimatedStyle(() => {
        const translateX = progress.value * (TRACK_WIDTH - THUMB_SIZE - THUMB_MARGIN * 2);
        return {
            transform: [{ translateX }],
        };
    });

    const trackStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            progress.value,
            [0, 1],
            [
                isDark ? '#78787b65' : '#d5d5dcff',
                colors.primary,
            ]
        );
        return {
            backgroundColor,
        };
    });

    const handlePress = () => {
        if (!disabled) {
            onValueChange(!value);
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            disabled={disabled}
        >
            <Animated.View
                style={[
                    styles.track,
                    trackStyle,
                    disabled && styles.disabled
                ]}
            >
                <Animated.View
                    style={[
                        styles.thumb,
                        thumbStyle,
                        {
                            backgroundColor: '#FFFFFF',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 2.5,
                            elevation: 3,
                        }
                    ]}
                />
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    track: {
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        justifyContent: 'center',
        paddingHorizontal: THUMB_MARGIN,
    },
    thumb: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
    },
    disabled: {
        opacity: 0.5,
    },
});

export default ThemedSwitch;
