import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  refreshInterval: number;
  language: string;

  setThemeMode: (mode: ThemeMode) => void;
  setRefreshInterval: (interval: number) => void;
  setLanguage: (language: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      refreshInterval: 5000, // 5 seconds
      language: 'en',

      setThemeMode: (mode) => {
        set({ themeMode: mode });
      },
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
