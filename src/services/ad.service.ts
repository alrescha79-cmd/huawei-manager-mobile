import mobileAds, {
    InterstitialAd,
    RewardedAd,
    AppOpenAd,
    AdEventType,
    RewardedAdEventType,
    TestIds,
    MaxAdContentRating,
    AdsConsent,
} from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';
import { ThemedAlertHelper } from '@/components/ThemedAlert';
import { AdblockAlertHelper } from '@/components/AdblockAlertModal';
import { useThemeStore } from '@/stores/theme.store';
import en from '@/i18n/en.json';
import id from '@/i18n/id.json';

const INTERSTITIAL_ID =
    Constants.expoConfig?.extra?.admobInterstitialUnitId || TestIds.INTERSTITIAL;
const REWARDED_ID =
    Constants.expoConfig?.extra?.admobRewardedUnitId || TestIds.REWARDED;
const APP_OPEN_ID =
    Constants.expoConfig?.extra?.admobAppOpenUnitId || TestIds.APP_OPEN;

const translations: Record<string, any> = { en, id };

function getTranslation(key: string): string {
    const language = useThemeStore.getState().language || 'en';
    const keys = key.split('.');
    let result: any = translations[language] || translations.en;
    for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
            result = result[k];
        } else {
            result = translations.en;
            for (const fallbackKey of keys) {
                if (result && typeof result === 'object' && fallbackKey in result) {
                    result = result[fallbackKey];
                } else {
                    return key;
                }
            }
            break;
        }
    }
    return typeof result === 'string' ? result : key;
}

let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Preloaded ad instances
let preloadedInterstitial: InterstitialAd | null = null;
let preloadedRewarded: RewardedAd | null = null;
let preloadedAppOpen: AppOpenAd | null = null;

// Tracks loading state to prevent duplicate parallel requests
let isInterstitialLoading = false;
let isRewardedLoading = false;
let isAppOpenLoading = false;

function handleAdError(error: any) {
    if (!error) return;
    const errMsg = error?.message || String(error);
    if (errMsg.includes('doubleclick') || errMsg.includes('ad server') || errMsg.includes('Failed to connect')) {
        AdblockAlertHelper.show();
    }
}

/**
 * Initializes AdMob SDK globally and preloads the first ads.
 * This should be called early at app startup (e.g. in RootLayout).
 */
export function initAdMob(): Promise<void> {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            try {
                await AdsConsent.requestInfoUpdate();
                await AdsConsent.loadAndShowConsentFormIfRequired();
            } catch (_) {}

            await mobileAds().setRequestConfiguration({
                maxAdContentRating: MaxAdContentRating.G,
                tagForChildDirectedTreatment: false,
                tagForUnderAgeOfConsent: false,
            });

            await mobileAds().initialize();
            isInitialized = true;
            console.log('✅ AdMob SDK Initialized');

            // Preload ads asynchronously after initialization
            preloadInterstitial();
            preloadRewarded();
            preloadAppOpenAd();
        } catch (error) {
            console.error('❌ AdMob initialization failed:', error);
        }
    })();

    return initPromise;
}

export function preloadInterstitial(): void {
    if (!isInitialized || preloadedInterstitial || isInterstitialLoading) return;

    isInterstitialLoading = true;
    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        preloadedInterstitial = ad;
        isInterstitialLoading = false;
        cleanup();
        console.log('✅ Interstitial ad preloaded and cached');
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        isInterstitialLoading = false;
        preloadedInterstitial = null;
        cleanup();
        console.warn('❌ Failed to preload Interstitial ad:', error);
    });

    function cleanup() {
        unsubLoaded();
        unsubError();
    }

    ad.load();
}

export function preloadRewarded(): void {
    if (!isInitialized || preloadedRewarded || isRewardedLoading) return;

    isRewardedLoading = true;
    const ad = RewardedAd.createForAdRequest(REWARDED_ID);

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        preloadedRewarded = ad;
        isRewardedLoading = false;
        cleanup();
        console.log('✅ Rewarded ad preloaded and cached');
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        isRewardedLoading = false;
        preloadedRewarded = null;
        cleanup();
        console.warn('❌ Failed to preload Rewarded ad:', error);
        handleAdError(error);
    });

    function cleanup() {
        unsubLoaded();
        unsubError();
    }

    ad.load();
}

/**
 * Shows an Interstitial Ad. If preloaded, displays instantly.
 * If not preloaded, attempts to load on-the-fly with a safety timeout.
 */
export function showInterstitial(onDone: () => void): void {
    if (!isInitialized) {
        initAdMob();
        onDone();
        return;
    }

    if (preloadedInterstitial && preloadedInterstitial.loaded) {
        const ad = preloadedInterstitial;
        preloadedInterstitial = null; // Consume the preloaded instance

        const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            unsubClosed();
            onDone();
            preloadInterstitial(); // Cache next ad
        });

        ad.show().catch((err) => {
            console.error('Failed to show preloaded interstitial ad:', err);
            unsubClosed();
            onDone();
            preloadInterstitial();
        });
    } else {
        // Fallback: load on-the-fly with a timeout
        console.log('Interstitial ad not cached, loading on-the-fly...');
        const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);
        let completed = false;

        const timer = setTimeout(() => {
            if (!completed) {
                completed = true;
                cleanup();
                onDone();
                preloadInterstitial();
            }
        }, 5000); // 5-second timeout

        const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
            if (!completed) {
                completed = true;
                clearTimeout(timer);
                ad.show().catch(() => {
                    cleanup();
                    onDone();
                    preloadInterstitial();
                });
            }
        });

        const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            cleanup();
            onDone();
            preloadInterstitial();
        });

        const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
            if (!completed) {
                completed = true;
                clearTimeout(timer);
                cleanup();
                onDone();
                preloadInterstitial();
            }
        });

        function cleanup() {
            unsubLoaded();
            unsubClosed();
            unsubError();
        }

        ad.load();
    }
}

/**
 * Shows a Rewarded Ad. If preloaded, displays instantly.
 * If not preloaded, attempts to load on-the-fly with a safety timeout.
 */
export function showRewarded(onRewarded: () => void, onSkipped: () => void): void {
    if (!isInitialized) {
        initAdMob();
        // Fallback: Proceed silently if AdMob is not initialized
        onRewarded();
        return;
    }

    if (preloadedRewarded && preloadedRewarded.loaded) {
        const ad = preloadedRewarded;
        preloadedRewarded = null; // Consume the preloaded instance
        let earned = false;

        const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            earned = true;
        });

        const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            unsubEarned();
            unsubClosed();
            if (earned) {
                onRewarded();
            } else {
                onSkipped();
            }
            preloadRewarded(); // Cache next ad
        });

        ad.show().catch((err) => {
            console.error('Failed to show preloaded rewarded ad:', err);
            unsubEarned();
            unsubClosed();
            handleAdError(err);
            onRewarded(); // Fallback: Proceed silently on show error
            preloadRewarded();
        });
    } else {
        // Fallback: load on-the-fly with a timeout
        console.log('Rewarded ad not cached, loading on-the-fly...');
        const ad = RewardedAd.createForAdRequest(REWARDED_ID);
        let completed = false;
        let earned = false;

        const timer = setTimeout(() => {
            if (!completed) {
                completed = true;
                cleanup();
                onRewarded(); // Fallback: Proceed silently on timeout
                preloadRewarded();
            }
        }, 8000); // 8-second timeout for rewarded video

        const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
            if (!completed) {
                completed = true;
                clearTimeout(timer);
                ad.show().catch((err) => {
                    cleanup();
                    handleAdError(err);
                    onRewarded(); // Fallback: Proceed silently on show error
                    preloadRewarded();
                });
            }
        });

        const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            earned = true;
        });

        const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            cleanup();
            if (earned) {
                onRewarded();
            } else {
                onSkipped();
            }
            preloadRewarded();
        });

        const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
            if (!completed) {
                completed = true;
                clearTimeout(timer);
                cleanup();
                handleAdError(error);
                onRewarded(); // Fallback: Proceed silently on load error
                preloadRewarded();
            }
        });

        function cleanup() {
            unsubLoaded();
            unsubEarned();
            unsubClosed();
            unsubError();
        }

        ad.load();
    }
}

function showLoadErrorAlert() {
    ThemedAlertHelper.alert(
        getTranslation('common.error') || 'Error',
        getTranslation('ads.failedToLoad') || 'Failed to load advertisement. Please check your internet connection or disable your ad blocker.'
    );
}

export function preloadAppOpenAd(): void {
    if (!isInitialized || preloadedAppOpen || isAppOpenLoading) return;

    isAppOpenLoading = true;
    const ad = AppOpenAd.createForAdRequest(APP_OPEN_ID);

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        preloadedAppOpen = ad;
        isAppOpenLoading = false;
        cleanup();
        console.log('✅ App Open ad preloaded and cached');
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        isAppOpenLoading = false;
        preloadedAppOpen = null;
        cleanup();
        console.warn('❌ Failed to preload App Open ad:', error);
    });

    function cleanup() {
        unsubLoaded();
        unsubError();
    }

    ad.load();
}

export function showAppOpenAd(onDone?: () => void): void {
    if (!isInitialized) {
        initAdMob();
        onDone?.();
        return;
    }

    if (preloadedAppOpen && preloadedAppOpen.loaded) {
        const ad = preloadedAppOpen;
        preloadedAppOpen = null; // Consume the preloaded instance

        const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            unsubClosed();
            onDone?.();
            preloadAppOpenAd(); // Cache next ad
        });

        ad.show().catch((err) => {
            console.error('Failed to show preloaded app open ad:', err);
            unsubClosed();
            onDone?.();
            preloadAppOpenAd();
        });
    } else {
        // Fallback: load on-the-fly or just callback
        onDone?.();
        preloadAppOpenAd();
    }
}
