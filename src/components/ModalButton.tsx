import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { BouncingDots } from './LoadingIndicators';

export type ModalButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';

interface ModalButtonProps {
    title: string;
    onPress: () => void;
    variant?: ModalButtonVariant;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
}

export function ModalButton({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
}: ModalButtonProps) {
    const { colors, typography, isDark } = useTheme();

    const isFilled = variant === 'primary' || variant === 'danger';

    const getBackgroundColor = () => {
        if (disabled && isFilled) return colors.border;
        switch (variant) {
            case 'primary': return colors.primary;
            case 'danger': return colors.error;
            case 'secondary': return isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
            default: return 'transparent';
        }
    };

    const getTextColor = () => {
        if (disabled && isFilled) return colors.textSecondary;
        if (isFilled) return '#FFF';
        if (variant === 'secondary') return colors.textSecondary;
        return colors.text;
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={variant === 'secondary' ? 0.6 : 0.8}
            style={[
                styles.base,
                {
                    backgroundColor: getBackgroundColor(),
                    borderRadius: 14,
                    borderWidth: variant === 'outline' ? 1 : 0,
                    borderColor: colors.border,
                },
                style,
            ]}
        >
            {loading ? (
                <BouncingDots size="small" color={getTextColor()} />
            ) : (
                <Text
                    style={[
                        typography.headline,
                        {
                            color: getTextColor(),
                            fontWeight: variant === 'secondary' ? '600' : 'bold',
                            textAlign: 'center',
                        },
                        styles.text,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        flexShrink: 1,
        textAlign: 'center',
    },
});
