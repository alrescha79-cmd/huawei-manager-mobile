import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blur?: boolean;
  intensity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  blur = false,
  intensity
}) => {
  const { colors, borderRadius, glassmorphism, isDark } = useTheme();

  const blurIntensity = intensity ?? glassmorphism.blur.card;

  if (blur) {
    return (
      <BlurView
        intensity={blurIntensity}
        tint={isDark ? 'dark' : 'light'}
        experimentalBlurMethod='dimezisBlurView'
        style={[
          styles.card,
          {
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: isDark ? glassmorphism.border.dark : glassmorphism.border.light,
            backgroundColor: isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card,
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
