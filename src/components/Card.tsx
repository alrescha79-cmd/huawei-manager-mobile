import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  blur?: boolean;
  intensity?: number;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  blur = false, 
  intensity = 20 
}) => {
  const { colors, borderRadius, isDark } = useTheme();

  if (blur) {
    return (
      <BlurView 
        intensity={intensity} 
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.card,
          {
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
});
