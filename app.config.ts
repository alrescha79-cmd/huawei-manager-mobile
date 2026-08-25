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
        version: '1.1.80',
        orientation: 'portrait',
        icon: './assets/logo.png',
        userInterfaceStyle: 'automatic',
        scheme: 'hm-mobile',
        plugins: [
            './plugins/with-clear-dim-flags',
            'expo-router',
            [
                'expo-build-properties',
                {
                    android: {
                        usesCleartextTraffic: true,
                        // Shrink release APKs: R8 code shrinking + resource stripping.
                        enableProguardInReleaseBuilds: true,
                        enableShrinkResourcesInReleaseBuilds: true,
                        // Keep critical library classes from being stripped by R8.
                        extraProguardRules: `# React Native core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.module.annotations.** { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }

# React Native Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.internal.ads.** { *; }
-keep class com.google.android.** { *; }
-keep class com.google.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# Expo modules
-keep class expo.modules.** { *; }
-keep class org.unimodules.** { *; }
-dontwarn expo.modules.**

# React Native Firebase
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**

# React Native WebView
-keep class com.reactnativecommunity.webview.** { *; }
-keep class com.reactnative.webview.** { *; }

# React Native Android Widget
-keep class com.reactnativeandroidwidget.** { *; }

# React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# React Native SVG
-keep class com.horcrux.svg.** { *; }

# Keep enums, annotations, and Kotlin metadata
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# App package
-keep class com.alrescha79.hmmobile.** { *; }
`,
                    },
                },
            ],
            'expo-localization',
            [
                'expo-location',
                {
                    locationWhenInUsePermission: 'Allow $(PRODUCT_NAME) to use your location to find the nearest BTS tower.',
                },
            ],
            'expo-font',
            ['react-native-android-widget', widgetConfig],
            'expo-mail-composer',
            [
                'react-native-google-mobile-ads',
                {
                    androidAppId: process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
                },
            ],
            [
                'expo-splash-screen',
                {
                    image: './assets/logo.png',
                    resizeMode: 'contain',
                    backgroundColor: '#ffffff',
                },
            ],
            '@react-native-firebase/app',
            '@react-native-firebase/messaging',
        ],
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
            versionCode: parseInt(process.env.ANDROID_VERSION_CODE || '1', 10),
            googleServicesFile: './google-services.json',
            permissions: [
                'android.permission.REQUEST_INSTALL_PACKAGES',
            ],
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
