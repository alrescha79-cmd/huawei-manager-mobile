import {
    InterstitialAd,
    RewardedAd,
    AdEventType,
    RewardedAdEventType,
    TestIds,
} from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

const INTERSTITIAL_ID =
    Constants.expoConfig?.extra?.admobInterstitialUnitId || TestIds.INTERSTITIAL;
const REWARDED_ID =
    Constants.expoConfig?.extra?.admobRewardedUnitId || TestIds.REWARDED;

export function showInterstitial(onDone: () => void): void {
    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        ad.show();
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        cleanup();
        onDone();
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        cleanup();
        onDone();
    });

    function cleanup() {
        unsubLoaded();
        unsubClosed();
        unsubError();
    }

    ad.load();
}

export function showRewarded(onRewarded: () => void, onSkipped: () => void): void {
    const ad = RewardedAd.createForAdRequest(REWARDED_ID);

    let earned = false;

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        ad.show();
    });

    const unsubEarned = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
            earned = true;
        },
    );

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        cleanup();
        if (earned) {
            onRewarded();
        } else {
            onSkipped();
        }
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        cleanup();
        onSkipped();
    });

    function cleanup() {
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        unsubError();
    }

    ad.load();
}
