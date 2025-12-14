import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle,
  ActivityIndicator 
} from 'react-native';
import { useTheme } from '@/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({ 
  title, 
  onPress, 
  variant = 'primary',
  disabled = false,
  loading = false,
  style 
}) => {
  const { colors, borderRadius, typography } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.card;
      case 'danger':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textSecondary;
    return variant === 'secondary' ? colors.text : '#FFFFFF';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderRadius: borderRadius.md,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text
          style={[
            typography.headline,
            { 
              color: getTextColor(),
              textAlign: 'center',
            },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
});
