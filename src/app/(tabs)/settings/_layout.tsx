import { Stack } from 'expo-router';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { View, StyleSheet } from 'react-native';

export default function SettingsLayout() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'none',
                    contentStyle: { backgroundColor: colors.background },
                    freezeOnBlur: true,
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="modem" />
                <Stack.Screen name="mobile-network" />
                <Stack.Screen name="lan" />
                <Stack.Screen name="system" />
                <Stack.Screen name="update" />
                <Stack.Screen name="notifications" />
            </Stack>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
