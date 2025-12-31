import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/stores/theme.store';

export const Colors = {
  light: {
    primary: '#007AFF',
    background: '#E8E8F0',  // Fallback solid color
    backgroundGradient: ['#E8E8F0', '#D4D4E8', '#E0E0F0'],  // Subtle purple-gray gradient
    card: 'rgba(255, 255, 255, 0.40)',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    notification: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    tabBar: '#F9F9F9',
    tabBarInactive: '#8E8E93',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    primary: '#0A84FF',
    background: '#0D0D18',  // Fallback solid color
    backgroundGradient: ['#0D0D18', '#1A1A2E', '#16213E'],  // Deep purple-navy gradient (more visible)
    card: 'rgba(28, 28, 30, 0.40)',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    notification: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
    error: '#FF453A',
    tabBar: '#1C1C1E',
    tabBarInactive: '#8E8E93',
    shadow: 'rgba(255, 255, 255, 0.1)',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

export const Glassmorphism = {
  blur: {
    card: 40,
    modal: 50,
    overlay: 40,
    alert: 40,  // Reduced for better readability
    light: 25,
    heavy: 60,
  },
  // Background opacity for glassmorphism effect
  background: {
    dark: {
      card: 'rgba(10, 10, 10, 0.4)',
      modal: 'rgba(10, 10, 10, 0.6)',
      overlay: 'rgba(10, 10, 10, 0.5)',
      alert: 'rgba(28, 28, 30, 1.0)',  // Fully opaque for dark mode readability
    },
    light: {
      card: 'rgba(255, 255, 255, 0.4)',
      modal: 'rgba(255, 255, 255, 0.6)',
      overlay: 'rgba(255, 255, 255, 0.5)',
      alert: 'rgba(255, 255, 255, 0.98)',
    },
  },
  // Border opacity for subtle borders
  border: {
    dark: 'rgba(255, 255, 255, 0.1)',
    light: 'rgba(0, 0, 0, 0.05)',
  },
  // Inner element backgrounds 
  innerBackground: {
    dark: 'rgba(255, 255, 255, 0.05)',
    light: 'rgba(0, 0, 0, 0.03)',
  },
};

export const Typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 13,
  },
};

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useThemeStore();

  // Determine if dark mode should be used
  let isDark: boolean;
  if (themeMode === 'system') {
    isDark = systemColorScheme === 'dark';
  } else {
    isDark = themeMode === 'dark';
  }

  return {
    colors: isDark ? Colors.dark : Colors.light,
    spacing: Spacing,
    borderRadius: BorderRadius,
    typography: Typography,
    glassmorphism: Glassmorphism,
    isDark,
    themeMode,
  };
};

export type Theme = ReturnType<typeof useTheme>;
