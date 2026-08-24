import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { PageHeader } from '@/components/settings';
import { AnimatedScreen, WebViewSkeleton } from '@/components';
import { isSafeExternalUrl } from '@/utils/helpers';

export default function GenericWebViewScreen() {
  const { colors, typography, spacing } = useTheme();
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const [isLoading, setIsLoading] = useState(true);

  const safeUrl = typeof url === 'string' && isSafeExternalUrl(url) ? url : null;

  return (
    <AnimatedScreen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title={title || 'Browser'} showBackButton={true} />
        <View style={styles.content}>
          {safeUrl ? (
            <>
              <WebView
                source={{ uri: safeUrl }}
                style={styles.webview}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
              />
              {isLoading && <WebViewSkeleton />}
            </>
          ) : (
            <View style={[styles.errorContainer, { padding: spacing.lg }]}>
              {/* ponytail: hardcoded; i18n key requires syncing both en/id json */}
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                Invalid or unsupported URL
              </Text>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
