import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import mobileAds, {
    BannerAd,
    BannerAdSize,
    TestIds,
    MaxAdContentRating,
    AdsConsent,
} from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';

const AD_UNIT_ID = Constants.expoConfig?.extra?.admobBannerUnitId || TestIds.BANNER;

let adsInitialized = false;
let adsInitFailed = false;
let adsInitPromise: Promise<void> | null = null;

function initializeAds(): Promise<void> {
    if (!adsInitPromise) {
        adsInitPromise = (async () => {
            try {
                await AdsConsent.requestInfoUpdate();
                await AdsConsent.loadAndShowConsentFormIfRequired();
            } catch (_) { }

            await mobileAds().setRequestConfiguration({
                maxAdContentRating: MaxAdContentRating.G,
                tagForChildDirectedTreatment: false,
                tagForUnderAgeOfConsent: false,
            });

            await mobileAds().initialize();
            await new Promise<void>((resolve) => setTimeout(resolve, 2000));
            adsInitialized = true;
        })().catch(() => {
            adsInitFailed = true;
        });
    }
    return adsInitPromise;
}

const MAX_RETRIES = 3;

function AdBlockerFallback() {
    const { colors, borderRadius, typography, spacing } = useTheme();
    const { t } = useTranslation();

    return (
        <View style={[styles.fallback, {
            backgroundColor: colors.card,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
        }]}>
            <View style={styles.fallbackContent}>
                <MaterialIcons name="info-outline" size={20} color={colors.warning} />
                <View style={styles.fallbackTextContainer}>
                    <Text style={[typography.footnote, { color: colors.text, fontWeight: '600' }]}>
                        {t('ads.blockerDetected')}
                    </Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                        {t('ads.supportDeveloper')}
                    </Text>
                </View>
            </View>
        </View>
    );
}

export const AdBanner: React.FC = () => {
    const [isReady, setIsReady] = useState(adsInitialized);
    const [adFailed, setAdFailed] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [adKey, setAdKey] = useState(0);

    useEffect(() => {
        if (!adsInitialized && !adsInitFailed) {
            initializeAds().then(() => {
                if (adsInitialized) setIsReady(true);
            });
        }
    }, []);

    useEffect(() => {
        if (adFailed && retryCount < MAX_RETRIES) {
            const delay = 3000 * (retryCount + 1);
            const timeout = setTimeout(() => {
                setAdFailed(false);
                setAdKey((prev) => prev + 1);
                setRetryCount((prev) => prev + 1);
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [adFailed, retryCount]);

    if (!isReady || adsInitFailed) return null;

    // All retries exhausted — show fallback
    if (adFailed && retryCount >= MAX_RETRIES) {
        return <AdBlockerFallback />;
    }

    if (adFailed) return null;

    return (
        <View style={styles.container}>
            <BannerAd
                key={adKey}
                unitId={AD_UNIT_ID}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                onAdLoaded={() => setRetryCount(0)}
                onAdFailedToLoad={() => setAdFailed(true)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    fallback: {
        padding: 12,
        marginBottom: 16,
    },
    fallbackContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fallbackTextContainer: {
        flex: 1,
        marginLeft: 10,
    },
});
