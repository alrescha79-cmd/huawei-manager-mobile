import type { ConfigContext, ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';

// Widget configuration
const widgetConfig: WithAndroidWidgetsParams = {
    widgets: [
        {
            name: 'ModemStatus',
            label: 'Modem Status',
            description: 'Display modem speed and usage statistics',
            minWidth: '180dp',
            minHeight: '110dp',
            // Default size: 3x2 cells
            targetCellWidth: 3,
            targetCellHeight: 2,
            // Max resize: 5x4 cells
            maxResizeWidth: '320dp',
            maxResizeHeight: '280dp',
            // Widget preview image
            previewImage: './assets/widget-preview/modem_status.png',
            // Update every 30 minutes (minimum allowed)
            updatePeriodMillis: 1800000,
            // Allow widget to be resized
            resizeMode: 'horizontal|vertical',
        },
    ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'Huawei Manager',
    slug: 'hm-mobile',
    version: '1.0.75',
    orientation: 'portrait',
    icon: './assets/logo.png',
    userInterfaceStyle: 'automatic',
    scheme: 'hm-mobile',
    plugins: [
        'expo-router',
        [
            'expo-build-properties',
            {
                android: {
                    usesCleartextTraffic: true,
                },
            },
        ],
        'expo-localization',
        ['react-native-android-widget', widgetConfig],
    ],
    splash: {
        image: './assets/logo.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
    },
    ios: {
        supportsTablet: true,
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/logo.png',
            backgroundColor: '#ffffff',
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        package: 'com.alrescha79.hmmobile',
    },
    web: {
        favicon: './assets/logo.png',
    },
    extra: {
        eas: {
            projectId: '930db156-f012-4b37-809c-d023a044d3b3',
        },
    },
});
