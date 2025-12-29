import { useThemeStore } from '@/stores/theme.store';
import en from './en.json';
import id from './id.json';

type TranslationKeys = typeof en;
type NestedKeyOf<T> = T extends object
    ? {
        [K in keyof T]: K extends string
        ? T[K] extends object
        ? `${K}.${NestedKeyOf<T[K]>}`
        : K
        : never;
    }[keyof T]
    : never;

export type TranslationKey = NestedKeyOf<TranslationKeys>;

const translations: Record<string, typeof en> = {
    en,
    id,
};

/**
 * Hook to get translated strings based on current language setting
 * 
 * Usage:
 * const { t } = useTranslation();
 * <Text>{t('home.connectionStatus')}</Text>
 */
export function useTranslation() {
    const { language } = useThemeStore();

    const t = (key: string): string => {
        const keys = key.split('.');
        const translation = translations[language] || translations.en;

        let result: unknown = translation;
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = (result as Record<string, unknown>)[k];
            } else {
                // Fallback to English if key not found
                result = translations.en;
                for (const fallbackKey of keys) {
                    if (result && typeof result === 'object' && fallbackKey in result) {
                        result = (result as Record<string, unknown>)[fallbackKey];
                    } else {
                        return key; // Return key if not found
                    }
                }
                break;
            }
        }

        return typeof result === 'string' ? result : key;
    };

    return { t, language };
}

export { en, id };
