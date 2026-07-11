import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { PageHeader } from '@/components/settings';
import { AnimatedScreen } from '@/components';

export default function GenericWebViewScreen() {
    const { colors } = useTheme();
    const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
    const [isLoading, setIsLoading] = useState(true);

    return (
        <AnimatedScreen>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <PageHeader 
                    title={title || 'Browser'} 
                    showBackButton={true}
                />
                <View style={styles.content}>
                    <WebView
                        source={{ uri: url || 'https://google.com' }}
                        style={styles.webview}
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                    />
                    {isLoading && (
                        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )}
                </View>
            </View>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        position: 'relative',
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
});