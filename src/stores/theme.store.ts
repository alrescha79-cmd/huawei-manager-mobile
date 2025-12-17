import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  refreshInterval: number;
  language: string;
  isLanguageInitialized: boolean; // Track if language was auto-detected

  setThemeMode: (mode: ThemeMode) => void;
  setRefreshInterval: (interval: number) => void;
  setLanguage: (language: string) => void;
  initializeLanguage: () => void; // Auto-detect device language on first install
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      refreshInterval: 5000, // 5 seconds
      language: 'en',
      isLanguageInitialized: false,

      setThemeMode: (mode) => {
        set({ themeMode: mode });
      },
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
      setLanguage: (language) => set({ language }),

      // Auto-detect device language on first install
      initializeLanguage: () => {
        const { isLanguageInitialized } = get();

        // Only auto-detect if not already initialized
        if (!isLanguageInitialized) {
          // Get device locale using getLocales()
          const locales = Localization.getLocales();
          const deviceLanguage = locales[0]?.languageCode || 'en';

          // Check if device language is Indonesian
          const isIndonesian = deviceLanguage.toLowerCase() === 'id';

          set({
            language: isIndonesian ? 'id' : 'en',
            isLanguageInitialized: true,
          });
        }
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
