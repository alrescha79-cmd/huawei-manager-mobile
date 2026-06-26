import type { ConfigContext, ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';
import { withGradleProperties } from '@expo/config-plugins';
import fs from 'fs';

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

const isDev = process.env.APP_ENV === 'development';

const getJavaHome = () => {
    if (process.env.JAVA_HOME) {
        return process.env.JAVA_HOME;
    }
    const linuxPath = '/usr/lib/jvm/java-21-openjdk-amd64';
    if (fs.existsSync(linuxPath)) {
        return linuxPath;
    }
    return undefined;
};

export default ({ config }: ConfigContext): ExpoConfig => {
    const expoConfig: ExpoConfig = {
        ...config,
        name: isDev ? 'HM Mobile [DEV]' : 'Huawei Manager',
        slug: 'hm-mobile',
        version: '1.1.30',
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
            [
                'react-native-google-mobile-ads',
                {
                    androidAppId: process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
                },
            ],
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
            package: isDev ? 'com.alrescha79.hmmobile.dev' : 'com.alrescha79.hmmobile',
            googleServicesFile: './google-services.json',
        },
        web: {
            favicon: './assets/logo.png',
        },
        extra: {
            eas: {
                projectId: '930db156-f012-4b37-809c-d023a044d3b3',
            },
            admobBannerUnitId: process.env.ADMOB_BANNER_UNIT_ID || '',
            admobNativeAdvancedUnitId: process.env.ADMOB_NATIVE_ADVANCED_UNIT_ID || '',
            admobInterstitialUnitId: process.env.ADMOB_INTERSTITIAL_UNIT_ID || '',
            admobRewardedUnitId: process.env.ADMOB_REWARDED_UNIT_ID || '',
            admobAppOpenUnitId: process.env.ADMOB_APP_OPEN_UNIT_ID || '',
        },
    };

    const javaHome = getJavaHome();
    if (!javaHome) {
        return expoConfig;
    }

    return withGradleProperties(expoConfig, (cfg) => {
        cfg.modResults.push({
            type: 'property',
            key: 'org.gradle.java.home',
            value: javaHome,
        });
        return cfg;
    });
};
