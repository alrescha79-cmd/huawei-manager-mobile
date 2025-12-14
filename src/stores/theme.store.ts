import { create } from 'zustand';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  refreshInterval: number;
  language: string;

  setThemeMode: (mode: ThemeMode) => void;
  setRefreshInterval: (interval: number) => void;
  setLanguage: (language: string) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'system',
  refreshInterval: 5000, // 5 seconds
  language: 'en',

  setThemeMode: (mode) => set({ themeMode: mode }),
  setRefreshInterval: (interval) => set({ refreshInterval: interval }),
  setLanguage: (language) => set({ language }),
}));
