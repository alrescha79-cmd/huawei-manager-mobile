import type { ConfigContext, ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';

const widgetConfig: WithAndroidWidgetsParams = {
    widgets: [
        {
            name: 'ModemStatus',
            label: 'Modem Status',
            description: 'Display modem speed and usage statistics',
            minWidth: '180dp',
            minHeight: '110dp',
            targetCellWidth: 3,
            targetCellHeight: 2,
            maxResizeWidth: '320dp',
            maxResizeHeight: '280dp',
            previewImage: './assets/widget-preview/modem_status.png',
            updatePeriodMillis: 1800000,
            resizeMode: 'horizontal|vertical',
        },
    ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'Huawei Manager',
    slug: 'hm-mobile',
    version: '1.1.10',
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
        'expo-font',
        ['react-native-android-widget', widgetConfig],
        'expo-mail-composer',
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
        predictiveBackGestureEnabled: false,
        package: 'com.alrescha79.hmmobile',
        googleServicesFile: './google-services.json',
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
