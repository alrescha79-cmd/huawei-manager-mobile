import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/stores/theme.store';

export const ACCENT_PRESETS: Record<string, { light: string; dark: string; label: string }> = {
  default: { light: '#2563EB', dark: '#3B82F6', label: 'Blue' },
  indigo: { light: '#4F46E5', dark: '#818CF8', label: 'Indigo' },
  slate: { light: '#475569', dark: '#94A3B8', label: 'Slate' },
  violet: { light: '#7C3AED', dark: '#A78BFA', label: 'Violet' },
  purple: { light: '#9333EA', dark: '#C084FC', label: 'Purple' },
  fuchsia: { light: '#C026D3', dark: '#E879F9', label: 'Fuchsia' },
  pink: { light: '#DB2777', dark: '#F472B6', label: 'Pink' },
  rose: { light: '#E11D48', dark: '#FB7185', label: 'Rose' },
  red: { light: '#DC2626', dark: '#F87171', label: 'Red' },
  orange: { light: '#EA580C', dark: '#FB923C', label: 'Orange' },
  amber: { light: '#D97706', dark: '#FBBF24', label: 'Amber' },
  lime: { light: '#65A30D', dark: '#A3E635', label: 'Lime' }, 
  emerald: { light: '#059669', dark: '#34D399', label: 'Emerald' },
  teal: { light: '#0D9488', dark: '#2DD4BF', label: 'Teal' },
  cyan: { light: '#0891B2', dark: '#22D3EE', label: 'Cyan' },
  sky: { light: '#0284C7', dark: '#38BDF8', label: 'Sky' },
};

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
  const { themeMode, accentColor } = useThemeStore();

  let isDark: boolean;
  if (themeMode === 'system') {
    isDark = systemColorScheme === 'dark';
  } else {
    isDark = themeMode === 'dark';
  }

  const baseColors = isDark ? { ...Colors.dark } : { ...Colors.light };

  const accent = ACCENT_PRESETS[accentColor] || ACCENT_PRESETS.default;
  baseColors.primary = isDark ? accent.dark : accent.light;
  baseColors.shadow = `${baseColors.primary}1A`;

  return {
    colors: baseColors,
    spacing: Spacing,
    borderRadius: BorderRadius,
    typography: Typography,
    glassmorphism: Glassmorphism,
    isDark,
    themeMode,
  };
};

export type Theme = ReturnType<typeof useTheme>;

