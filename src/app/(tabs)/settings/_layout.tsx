import { Stack } from 'expo-router';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function SettingsLayout() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <Stack
            screenOptions={{
                headerShown: false,  // Hide all headers for consistency
                contentStyle: { backgroundColor: 'transparent' },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="modem" />
            <Stack.Screen name="mobile-network" />
            <Stack.Screen name="lan" />
            <Stack.Screen name="system" />
            <Stack.Screen name="update" />
        </Stack>
    );
}
