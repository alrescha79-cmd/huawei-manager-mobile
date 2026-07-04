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
import { AdBlockAlertHelper } from '@/components/AdBlockAlertModal';
import { useThemeStore } from '@/stores/theme.store';
import en from '@/i18n/en.json';
import id from '@/i18n/id.json';

const INTERSTITIAL_ID =
    Constants.expoConfig?.extra?.admobInterstitialUnitId || TestIds.INTERSTITIAL;
const REWARDED_ID =
    Constants.expoConfig?.extra?.admobRewardedUnitId || TestIds.REWARDED;
const APP_OPEN_ID =
    Constants.expoConfig?.extra?.admobAppOpenUnitId || TestIds.APP_OPEN;

export const BANNER_AD_UNIT_ID =
    Constants.expoConfig?.extra?.admobBannerUnitId || TestIds.BANNER;
export const NATIVE_AD_UNIT_ID =
    Constants.expoConfig?.extra?.admobNativeAdvancedUnitId || TestIds.NATIVE;

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

let preloadedInterstitial: InterstitialAd | null = null;
let preloadedRewarded: RewardedAd | null = null;
let preloadedAppOpen: AppOpenAd | null = null;

let isInterstitialLoading = false;
let isRewardedLoading = false;
let isAppOpenLoading = false;

let globalAdRequestCooldownUntil = 0;
const COOLDOWN_DURATION_MS = 10 * 1000;
const GLOBAL_REQUEST_DEBOUNCE_MS = 15 * 1000;
const BANNER_NATIVE_DEBOUNCE_MS = 2 * 1000;

const lastRequestTimestamps: Record<string, number> = {};

export function isAdMobInitialized(): boolean {
    return isInitialized;
}

export function isAdRequestAllowed(adUnitId?: string): boolean {
    const now = Date.now();
    if (now < globalAdRequestCooldownUntil) {
        return false;
    }
    if (adUnitId) {
        const lastTime = lastRequestTimestamps[adUnitId] || 0;
        const debounceLimit = (adUnitId === BANNER_AD_UNIT_ID || adUnitId === NATIVE_AD_UNIT_ID)
            ? BANNER_NATIVE_DEBOUNCE_MS
            : GLOBAL_REQUEST_DEBOUNCE_MS;

        if (now - lastTime < debounceLimit) {
            return false;
        }
    }
    return true;
}

export function getAdRequestDelay(adUnitId?: string): number {
    const now = Date.now();
    let delay = 0;
    if (now < globalAdRequestCooldownUntil) {
        delay = Math.max(delay, globalAdRequestCooldownUntil - now);
    }
    if (adUnitId) {
        const lastTime = lastRequestTimestamps[adUnitId] || 0;
        const timeSinceLast = now - lastTime;
        const debounceLimit = (adUnitId === BANNER_AD_UNIT_ID || adUnitId === NATIVE_AD_UNIT_ID)
            ? BANNER_NATIVE_DEBOUNCE_MS
            : GLOBAL_REQUEST_DEBOUNCE_MS;

        if (timeSinceLast < debounceLimit) {
            delay = Math.max(delay, debounceLimit - timeSinceLast);
        }
    }
    return delay;
}

export function recordAdRequest(adUnitId: string): void {
    const lastTime = lastRequestTimestamps[adUnitId];
    const now = Date.now();
    lastRequestTimestamps[adUnitId] = now;
}

export function activateAdRequestCooldown(): void {
    globalAdRequestCooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
}

function handleAdError(error: any) {
    if (!error) return;
    const errMsg = error?.message || String(error);
    if (errMsg.includes('doubleclick') || errMsg.includes('ad server') || errMsg.includes('Failed to connect')) {
        AdBlockAlertHelper.show();
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
            } catch (_) { }

            await mobileAds().setRequestConfiguration({
                maxAdContentRating: MaxAdContentRating.G,
                tagForChildDirectedTreatment: false,
                tagForUnderAgeOfConsent: false,
            });

            await mobileAds().initialize();
            isInitialized = true;

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
    if (!isAdRequestAllowed(INTERSTITIAL_ID)) return;
    recordAdRequest(INTERSTITIAL_ID);

    isInterstitialLoading = true;
    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        preloadedInterstitial = ad;
        isInterstitialLoading = false;
        cleanup();
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        isInterstitialLoading = false;
        preloadedInterstitial = null;
        cleanup();
        activateAdRequestCooldown();
    });

    function cleanup() {
        unsubLoaded();
        unsubError();
    }

    ad.load();
}

export function preloadRewarded(): void {
    if (!isInitialized || preloadedRewarded || isRewardedLoading) return;
    if (!isAdRequestAllowed(REWARDED_ID)) return;
    recordAdRequest(REWARDED_ID);

    isRewardedLoading = true;
    const ad = RewardedAd.createForAdRequest(REWARDED_ID);

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        preloadedRewarded = ad;
        isRewardedLoading = false;
        cleanup();
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        isRewardedLoading = false;
        preloadedRewarded = null;
        cleanup();
        handleAdError(error);
        activateAdRequestCooldown();
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
        preloadedInterstitial = null;

        const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            unsubClosed();
            onDone();
            preloadInterstitial();
        });

        ad.show().catch((err) => {
            console.error('Failed to show preloaded interstitial ad:', err);
            unsubClosed();
            onDone();
            preloadInterstitial();
        });
    } else {
        if (!isAdRequestAllowed(INTERSTITIAL_ID)) {
            onDone();
            return;
        }
        recordAdRequest(INTERSTITIAL_ID);
        const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);
        let completed = false;

        const timer = setTimeout(() => {
            if (!completed) {
                completed = true;
                cleanup();
                onDone();
                preloadInterstitial();
                activateAdRequestCooldown();
            }
        }, 5000);

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
                activateAdRequestCooldown();
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
        onRewarded();
        return;
    }

    if (preloadedRewarded && preloadedRewarded.loaded) {
        const ad = preloadedRewarded;
        preloadedRewarded = null;
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
            preloadRewarded();
        });

        ad.show().catch((err) => {
            console.error('Failed to show preloaded rewarded ad:', err);
            unsubEarned();
            unsubClosed();
            handleAdError(err);
            onRewarded();
            preloadRewarded();
        });
    } else {
        if (!isAdRequestAllowed(REWARDED_ID)) {
            onRewarded();
            return;
        }
        recordAdRequest(REWARDED_ID);
        const ad = RewardedAd.createForAdRequest(REWARDED_ID);
        let completed = false;
        let earned = false;

        const timer = setTimeout(() => {
            if (!completed) {
                completed = true;
                cleanup();
                onRewarded();
                preloadRewarded();
                activateAdRequestCooldown();
            }
        }, 8000);

        const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
            if (!completed) {
                completed = true;
                clearTimeout(timer);
                ad.show().catch((err) => {
                    cleanup();
                    handleAdError(err);
                    onRewarded();
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
                onRewarded();
                preloadRewarded();
                activateAdRequestCooldown();
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
    if (!isAdRequestAllowed(APP_OPEN_ID)) return;
    recordAdRequest(APP_OPEN_ID);

    isAppOpenLoading = true;
    const ad = AppOpenAd.createForAdRequest(APP_OPEN_ID);

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        preloadedAppOpen = ad;
        isAppOpenLoading = false;
        cleanup();
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        isAppOpenLoading = false;
        preloadedAppOpen = null;
        cleanup();
        activateAdRequestCooldown();
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
        preloadedAppOpen = null;

        const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            unsubClosed();
            onDone?.();
            preloadAppOpenAd();
        });

        ad.show().catch((err) => {
            console.error('Failed to show preloaded app open ad:', err);
            unsubClosed();
            onDone?.();
            preloadAppOpenAd();
        });
    } else {
        onDone?.();
        preloadAppOpenAd();
    }
}
