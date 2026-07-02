import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import {
    BannerAd,
    BannerAdSize,
    TestIds,
    NativeAd,
    NativeAdView,
    NativeAsset,
    NativeAssetType,
} from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { BouncingDots } from './ModernLoading';
import { AdblockAlertHelper } from './AdblockAlertModal';
import {
    initAdMob,
    isAdMobInitialized,
    getAdRequestDelay,
    recordAdRequest,
    activateAdRequestCooldown,
    BANNER_AD_UNIT_ID,
    NATIVE_AD_UNIT_ID,
} from '@/services/ad.service';

function triggerAdblockAlert(error: any) {
    if (!error) return;
    const errMsg = error?.message || String(error);
    if (errMsg.includes('doubleclick') || errMsg.includes('ad server') || errMsg.includes('Failed to connect') || errMsg.includes('Timeout')) {
        AdblockAlertHelper.show();
    }
}

function AdBlockerFallbackContent({ isNative = false }: { isNative?: boolean }) {
    const { colors, typography } = useTheme();
    const { t } = useTranslation();

    return (
        <View style={[styles.fallbackContent, { backgroundColor: 'transparent' }]}>
            <MaterialIcons name="info-outline" size={isNative ? 20 : 18} color={colors.warning} />
            <View style={[styles.fallbackTextContainer, { backgroundColor: 'transparent' }]}>
                <Text style={[isNative ? typography.body : typography.footnote, { color: colors.text, fontWeight: '600', backgroundColor: 'transparent' }]} numberOfLines={1}>
                    {t('ads.blockerDetected')}
                </Text>
                <Text style={[isNative ? typography.footnote : typography.caption1, { color: colors.textSecondary, marginTop: 2, backgroundColor: 'transparent' }]} numberOfLines={1}>
                    {t('ads.supportDeveloper')}
                </Text>
            </View>
        </View>
    );
}

// 1) Standard Banner Ad Component
export const AdBanner: React.FC = React.memo(() => {
    const [isReady, setIsReady] = useState(isAdMobInitialized());
    const [adFailed, setAdFailed] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [shouldLoad, setShouldLoad] = useState(false);
    const [triggerKey, setTriggerKey] = useState(0);

    const { colors, isDark } = useTheme();

    useEffect(() => {
        if (!isAdMobInitialized()) {
            initAdMob().then(() => {
                setIsReady(isAdMobInitialized());
            });
        } else {
            setIsReady(true);
        }
    }, []);

    const delay = isReady ? getAdRequestDelay(BANNER_AD_UNIT_ID) : 0;

    useEffect(() => {
        if (!isReady) return;

        if (delay === 0) {
            setShouldLoad(true);
        } else {
            setShouldLoad(false);
            const timer = setTimeout(() => {
                setShouldLoad(true);
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [isReady, triggerKey, delay]);

    const renderAd = isReady && shouldLoad && !adFailed;
    const showFallback = !renderAd || !isLoaded;

    return (
        <View style={[
            styles.bannerContainer,
            {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
            }
        ]}>
            {showFallback ? (
                <AdBlockerFallbackContent isNative={false} />
            ) : (
                <View style={{ height: 58, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <BannerAd
                        key={triggerKey}
                        unitId={BANNER_AD_UNIT_ID}
                        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                        onAdLoaded={() => {
                            setIsLoaded(true);
                            recordAdRequest(BANNER_AD_UNIT_ID);
                        }}
                        onAdFailedToLoad={(error) => {
                            setIsLoaded(false);
                            setAdFailed(true);
                            setShouldLoad(false);
                            triggerAdblockAlert(error);
                            activateAdRequestCooldown();

                            // Retry loading after cooldown expires
                            const cooldownMs = getAdRequestDelay(BANNER_AD_UNIT_ID) || 30000;
                            setTimeout(() => {
                                setAdFailed(false);
                                setTriggerKey(prev => prev + 1);
                            }, cooldownMs + 5000);
                        }}
                    />
                </View>
            )}
        </View>
    );
});

// 2) Premium Native Advanced Ad Component
export const AdNative: React.FC = React.memo(() => {
    const [isReady, setIsReady] = useState(isAdMobInitialized());
    const [adFailed, setAdFailed] = useState(false);
    const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [triggerKey, setTriggerKey] = useState(0);

    const { colors, typography, isDark } = useTheme();

    useEffect(() => {
        if (!isAdMobInitialized()) {
            initAdMob().then(() => {
                setIsReady(isAdMobInitialized());
            });
        } else {
            setIsReady(true);
        }
    }, []);

    useEffect(() => {
        if (!isReady) return;

        let active = true;
        let adInstance: NativeAd | null = null;
        let timer: NodeJS.Timeout | null = null;

        const loadNativeAd = async () => {
            const delay = getAdRequestDelay(NATIVE_AD_UNIT_ID);
            if (delay > 0) {
                setIsLoading(true);
                timer = setTimeout(() => {
                    setTriggerKey(prev => prev + 1);
                }, delay);
                return;
            }

            setIsLoading(true);
            setAdFailed(false);
            try {
                recordAdRequest(NATIVE_AD_UNIT_ID);
                const adRequestPromise = NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID);
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout loading native ad')), 5000)
                );

                const ad = await Promise.race([adRequestPromise, timeoutPromise]);
                if (active) {
                    adInstance = ad;
                    setNativeAd(ad);
                    setIsLoading(false);
                } else {
                    ad.destroy();
                }
            } catch (err) {
                if (active) {
                    setAdFailed(true);
                    setIsLoading(false);
                    triggerAdblockAlert(err);
                    activateAdRequestCooldown();
                }
            }
        };

        loadNativeAd();

        return () => {
            active = false;
            if (adInstance) {
                adInstance.destroy();
            }
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [isReady, triggerKey]);

    const showAd = isReady && !isLoading && nativeAd;
    const showPlaceholder = !isReady || isLoading;

    return (
        <View style={[styles.container, {
            justifyContent: 'center',
            backgroundColor: showPlaceholder ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)') : colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            overflow: 'hidden',
        }]}>
            {showPlaceholder ? (
                <View style={styles.placeholderContent}>
                    <BouncingDots size="small" color={colors.textSecondary} style={{ opacity: 0.5 }} />
                </View>
            ) : !showAd ? (
                <AdBlockerFallbackContent isNative={true} />
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
});

// 3) Inline Native Ad Component (loaded in background, hidden if loading or failed)
export const InlineAdNative: React.FC = React.memo(() => {
    const [isReady, setIsReady] = useState(isAdMobInitialized());
    const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [triggerKey, setTriggerKey] = useState(0);

    const { colors, typography, isDark } = useTheme();

    useEffect(() => {
        if (!isAdMobInitialized()) {
            initAdMob().then(() => {
                setIsReady(isAdMobInitialized());
            });
        } else {
            setIsReady(true);
        }
    }, []);

    useEffect(() => {
        if (!isReady) return;

        let active = true;
        let adInstance: NativeAd | null = null;
        let timer: NodeJS.Timeout | null = null;

        const loadNativeAd = async () => {
            const delay = getAdRequestDelay(NATIVE_AD_UNIT_ID);
            if (delay > 0) {
                timer = setTimeout(() => {
                    setTriggerKey(prev => prev + 1);
                }, delay);
                return;
            }

            try {
                recordAdRequest(NATIVE_AD_UNIT_ID);
                const adRequestPromise = NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID);
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout loading native ad')), 5000)
                );

                const ad = await Promise.race([adRequestPromise, timeoutPromise]);
                if (active) {
                    adInstance = ad;
                    setNativeAd(ad);
                    setIsLoaded(true);
                } else {
                    ad.destroy();
                }
            } catch (err) {
                if (active) {
                    setIsLoaded(false);
                    triggerAdblockAlert(err);
                    activateAdRequestCooldown();
                }
            }
        };

        loadNativeAd();

        return () => {
            active = false;
            if (adInstance) {
                adInstance.destroy();
            }
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [isReady, triggerKey]);

    if (!isLoaded || !nativeAd) {
        return null; // Keep it completely hidden to prevent empty slots / jumping UI
    }

    return (
        <View style={[styles.container, {
            justifyContent: 'center',
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            overflow: 'hidden',
        }]}>
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
        </View>
    );
});


const styles = StyleSheet.create({
    bannerContainer: {
        alignItems: 'center',
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
        height: 60,
        width: '100%',
        justifyContent: 'center',
    },
    container: {
        marginBottom: 16,
        overflow: 'hidden',
        width: '100%',
        height: 90,
    },
    placeholderContent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nativeAdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        height: 90,
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
    fallbackContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingHorizontal: 16,
    },
    fallbackTextContainer: {
        flex: 1,
        marginLeft: 10,
    },
});
