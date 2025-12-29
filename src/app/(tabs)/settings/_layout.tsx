import { Stack } from 'expo-router';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function SettingsLayout() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: { color: colors.text },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.background },
                headerTitleAlign: 'center',
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: t('tabs.settings'),
                    headerLargeTitle: false,
                    headerShown: true
                }}
            />
            <Stack.Screen
                name="modem"
                options={{
                    title: t('settings.modemInfo'),
                    headerBackTitle: t('common.back'),
                }}
            />
            <Stack.Screen
                name="mobile-network"
                options={{
                    title: t('settings.mobileNetwork'),
                    headerBackTitle: t('common.back'),
                }}
            />
            <Stack.Screen
                name="lan"
                options={{
                    title: t('settings.lanSettings'),
                    headerBackTitle: t('common.back'),
                }}
            />
            <Stack.Screen
                name="system"
                options={{
                    title: t('settings.system'),
                    headerBackTitle: t('common.back'),
                }}
            />
            <Stack.Screen
                name="update"
                options={{
                    title: t('settings.checkUpdate'),
                    headerBackTitle: t('common.back'),
                }}
            />
        </Stack>
    );
}
