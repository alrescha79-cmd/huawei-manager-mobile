import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/stores/theme.store';

export const Colors = {
  light: {
    primary: '#2563EB',
    background: '#F0F2F5',
    backgroundGradient: ['#F8FAFC', '#E2E8F0', '#CBD5E1'],
    card: 'rgba(255, 255, 255, 0.50)',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: 'rgba(255, 255, 255, 0.6)',
    notification: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    tabBar: 'rgba(255, 255, 255, 0.9)',
    tabBarInactive: '#94A3B8',
    shadow: 'rgba(37, 99, 235, 0.10)',
  },
  dark: {
    primary: '#3B82F6',
    background: '#111111',
    backgroundGradient: ['#111111', '#1A1A1A', '#222222'],
    card: 'rgba(255, 255, 255, 0.08)',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    border: 'rgba(255, 255, 255, 0.04)',
    notification: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
    error: '#FF453A',
    tabBar: '#1C1C1E',
    tabBarInactive: '#8E8E93',
    shadow: 'rgba(0, 0, 0, 0.0)',
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
    alert: 40,
    light: 25,
    heavy: 60,
  },
  background: {
    dark: {
      card: 'rgba(10, 10, 10, 0.4)',
      modal: 'rgba(10, 10, 10, 0.6)',
      overlay: 'rgba(10, 10, 10, 0.5)',
      alert: 'rgba(28, 28, 30, 1.0)',
    },
    light: {
      card: 'rgba(255, 255, 255, 0.4)',
      modal: 'rgba(255, 255, 255, 0.6)',
      overlay: 'rgba(255, 255, 255, 0.5)',
      alert: 'rgba(255, 255, 255, 0.98)',
    },
  },
  border: {
    dark: 'rgba(255, 255, 255, 0.1)',
    light: 'rgba(0, 0, 0, 0.05)',
  },
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
