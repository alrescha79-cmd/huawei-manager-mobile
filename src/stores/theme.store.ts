import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  refreshInterval: number;
  language: string;
  isLanguageInitialized: boolean;
  badgesEnabled: boolean;

  setThemeMode: (mode: ThemeMode) => void;
  usageCardStyle: 'split' | 'compact';
  setUsageCardStyle: (style: 'split' | 'compact') => void;
  setRefreshInterval: (interval: number) => void;
  setLanguage: (language: string) => void;
  initializeLanguage: () => void;
  setBadgesEnabled: (enabled: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      refreshInterval: 5000,
      language: 'en',
      isLanguageInitialized: false,
      badgesEnabled: true,

      setThemeMode: (mode) => {
        set({ themeMode: mode });
      },
      usageCardStyle: 'split',
      setUsageCardStyle: (style) => set({ usageCardStyle: style }),
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
      setLanguage: (language) => set({ language }),
      setBadgesEnabled: (enabled) => set({ badgesEnabled: enabled }),

      initializeLanguage: () => {
        const { isLanguageInitialized } = get();

        if (!isLanguageInitialized) {
          const locales = Localization.getLocales();
          const deviceLanguage = locales[0]?.languageCode || 'en';

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
