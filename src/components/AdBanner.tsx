import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import mobileAds, {
    BannerAd,
    BannerAdSize,
    TestIds,
    MaxAdContentRating,
    AdsConsent,
    NativeAd,
    NativeAdView,
    NativeAsset,
    NativeAssetType,
} from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';

const BANNER_AD_UNIT_ID = Constants.expoConfig?.extra?.admobBannerUnitId || TestIds.BANNER;
const NATIVE_AD_UNIT_ID = Constants.expoConfig?.extra?.admobNativeAdvancedUnitId || TestIds.NATIVE;

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
            adsInitialized = true;
        })().catch(() => {
            adsInitFailed = true;
        });
    }
    return adsInitPromise;
}

const MAX_RETRIES = 3;

function AdBlockerFallback() {
    const { colors, borderRadius, typography } = useTheme();
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

// 1) Standard Banner Ad Component
export const AdBanner: React.FC = () => {
    const [isReady, setIsReady] = useState(adsInitialized);
    const [adFailed, setAdFailed] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [adKey, setAdKey] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    const { colors, isDark } = useTheme();

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
                setIsLoaded(false);
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [adFailed, retryCount]);

    if (adsInitFailed) return null;

    if (adFailed && retryCount >= MAX_RETRIES) {
        return <AdBlockerFallback />;
    }

    const showPlaceholder = !isReady || adFailed || !isLoaded;

    return (
        <View style={[styles.bannerContainer, {
            height: 60,
            justifyContent: 'center',
            backgroundColor: showPlaceholder ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)') : 'transparent',
            borderColor: showPlaceholder ? colors.border : 'transparent',
            borderWidth: showPlaceholder ? 1 : 0,
            borderStyle: 'dashed',
        }]}>
            {showPlaceholder && (
                <View style={styles.placeholderContent}>
                    <ActivityIndicator size="small" color={colors.textSecondary} style={{ opacity: 0.5 }} />
                </View>
            )}
            {isReady && !adFailed && (
                <BannerAd
                    key={adKey}
                    unitId={BANNER_AD_UNIT_ID}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                    onAdLoaded={() => {
                        setIsLoaded(true);
                        setRetryCount(0);
                    }}
                    onAdFailedToLoad={() => {
                        setIsLoaded(false);
                        setAdFailed(true);
                    }}
                />
            )}
        </View>
    );
};

// 2) Premium Native Advanced Ad Component
export const AdNative: React.FC = () => {
    const [isReady, setIsReady] = useState(adsInitialized);
    const [adFailed, setAdFailed] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [adKey, setAdKey] = useState(0);
    const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { colors, typography, isDark } = useTheme();

    useEffect(() => {
        if (!adsInitialized && !adsInitFailed) {
            initializeAds().then(() => {
                if (adsInitialized) setIsReady(true);
            });
        }
    }, []);

    useEffect(() => {
        let active = true;
        let adInstance: NativeAd | null = null;

        const loadNativeAd = async () => {
            setIsLoading(true);
            setAdFailed(false);
            try {
                const ad = await NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID);
                if (active) {
                    adInstance = ad;
                    setNativeAd(ad);
                    setIsLoading(false);
                } else {
                    ad.destroy();
                }
            } catch (err) {
                console.error('Failed to load native ad:', err);
                if (active) {
                    setAdFailed(true);
                    setIsLoading(false);
                }
            }
        };

        if (isReady) {
            loadNativeAd();
        }

        return () => {
            active = false;
            if (adInstance) {
                adInstance.destroy();
            }
        };
    }, [isReady, adKey]);

    useEffect(() => {
        if (adFailed && retryCount < MAX_RETRIES) {
            const delay = 3000 * (retryCount + 1);
            const timeout = setTimeout(() => {
                setAdFailed(false);
                setAdKey((prev) => prev + 1);
                setRetryCount((prev) => prev + 1);
                setNativeAd(null);
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [adFailed, retryCount]);

    if (adsInitFailed) return null;

    if (adFailed && retryCount >= MAX_RETRIES) {
        return <AdBlockerFallback />;
    }

    const showPlaceholder = !isReady || adFailed || isLoading || !nativeAd;

    return (
        <View style={[styles.container, {
            minHeight: 90,
            justifyContent: 'center',
            backgroundColor: showPlaceholder ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)') : colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 8,
            elevation: 2,
        }]}>
            {showPlaceholder ? (
                <View style={styles.placeholderContent}>
                    <ActivityIndicator size="small" color={colors.textSecondary} style={{ opacity: 0.5 }} />
                </View>
            ) : (
                <NativeAdView
                    nativeAd={nativeAd}
                    style={styles.nativeAdContainer}
                >
                    {/* Left Column: Icon */}
                    {nativeAd.icon && (
                        <NativeAsset assetType={NativeAssetType.ICON}>
                            <Image
                                source={{ uri: nativeAd.icon.url }}
                                style={[styles.adIcon, { borderRadius: 10 }]}
                            />
                        </NativeAsset>
                    )}

                    {/* Middle Column: Text Assets */}
                    <View style={styles.textColumn}>
                        <View style={styles.headerRow}>
                            <View style={[styles.badgeContainer, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                                <Text style={[styles.badgeText, { color: colors.primary }]}>AD</Text>
                            </View>
                            <NativeAsset assetType={NativeAssetType.HEADLINE}>
                                <Text
                                    numberOfLines={1}
                                    style={[typography.body, { color: colors.text, fontWeight: '700', flex: 1 }]}
                                >
                                    {nativeAd.headline}
                                </Text>
                            </NativeAsset>
                        </View>

                        <NativeAsset assetType={NativeAssetType.BODY}>
                            <Text
                                numberOfLines={2}
                                style={[typography.caption1, { color: colors.textSecondary, marginTop: 4, lineHeight: 16 }]}
                            >
                                {nativeAd.body}
                            </Text>
                        </NativeAsset>
                    </View>

                    {/* Right Column: CTA Button */}
                    <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                        <Text style={[styles.ctaButton, {
                            backgroundColor: colors.primary,
                            color: '#FFFFFF',
                        }]}>
                            {nativeAd.callToAction || 'Open'}
                        </Text>
                    </NativeAsset>
                </NativeAdView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    bannerContainer: {
        alignItems: 'center',
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    container: {
        marginBottom: 16,
        overflow: 'hidden',
        width: '100%',
    },
    placeholderContent: {
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nativeAdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        minHeight: 90,
        width: '100%',
    },
    adIcon: {
        width: 50,
        height: 50,
        marginRight: 12,
    },
    textColumn: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badgeContainer: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 4,
        borderWidth: 0.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    ctaButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
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
