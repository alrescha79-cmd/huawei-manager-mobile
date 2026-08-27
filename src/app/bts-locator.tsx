import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation, TranslationKey } from '@/i18n';
import { useTheme } from '@/theme';
import { useModemStore } from '@/stores/modem.store';
import { AnimatedScreen, MeshGradientBackground, Card, BtsMapWebView, BouncingDots, ToastHelper, AdBanner } from '@/components';
import { PageHeader } from '@/components/settings';
import { parseCellIdString, calculateDistanceKm, calculateBearing, normalizeBearing, bearingToCompass } from '@/utils/geoMath';
import { fetchBtsCoordinates, fetchNearbyTowers, getBtsRateLimit, NearbyTower, BtsCoordinates, BTS_SEARCH_RADIUS_KM } from '@/services/btsService';
import { ModemService } from '@/services/modem.service';
import { useAuthStore } from '@/stores/auth.store';
import { estimateLteBand, getLteBandLabel } from '@/utils/helpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BtsLocatorScreen() {
    const { colors, typography, spacing, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const tRef = useRef(t);
    tRef.current = t;

    const signalInfo = useModemStore((state) => state.signalInfo);
    const networkInfo = useModemStore((state) => state.networkInfo);
    const credentials = useAuthStore((state) => state.credentials);

    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [btsLocation, setBtsLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [btsSource, setBtsSource] = useState<BtsCoordinates['source'] | null>(null);
    const [nearbyTowers, setNearbyTowers] = useState<NearbyTower[]>([]);
    const [userHeading, setUserHeading] = useState<number | null>(null);
    const [distanceM, setDistanceM] = useState<number | null>(null);
    const [bearing, setBearing] = useState<number | null>(null);
    const [showMore, setShowMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingNearby, setLoadingNearby] = useState(false);
    const [errorMsg, setErrorMsg] = useState<TranslationKey | ''>('');
    const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);

    const isFetchingNearbyRef = useRef(false);
    const nearbyFetchedLocationRef = useRef<{ lat: number; lon: number } | null>(null);

    const cellIds = useMemo(() => parseCellIdString(signalInfo?.cellId), [signalInfo?.cellId]);
    const numeric = networkInfo?.numeric || '';
    const mcc = numeric.slice(0, 3);
    const mnc = numeric.slice(3);
    const band = signalInfo?.band || estimateLteBand(signalInfo?.cellId, numeric) || '-';
    const operatorName = networkInfo?.networkName || networkInfo?.fullName || networkInfo?.shortName || networkInfo?.spnName || '-';

    // Real-time compass heading tracker
    useEffect(() => {
        let sub: Location.LocationSubscription | null = null;
        let isMounted = true;

        Location.watchHeadingAsync((headingData) => {
            if (!isMounted) return;
            const heading = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
            if (typeof heading === 'number' && !isNaN(heading)) {
                setUserHeading(heading);
            }
        })
            .then((subscription) => {
                sub = subscription;
            })
            .catch(() => {
                // Heading unavailable on device / simulator
            });

        return () => {
            isMounted = false;
            sub?.remove();
        };
    }, []);

    const fetchNearby = useCallback(
        async (centerLat: number, centerLon: number) => {
            if (isFetchingNearbyRef.current || !mcc) return;
            if (nearbyFetchedLocationRef.current) {
                const dist = calculateDistanceKm(
                    centerLat,
                    centerLon,
                    nearbyFetchedLocationRef.current.lat,
                    nearbyFetchedLocationRef.current.lon
                );
                // If user hasn't moved more than 5km from last fetched center, skip refetch
                if (dist < 5) return;
            }

            isFetchingNearbyRef.current = true;
            setLoadingNearby(true);
            try {
                const nearby = await fetchNearbyTowers(mcc, centerLat, centerLon, BTS_SEARCH_RADIUS_KM);
                setNearbyTowers(nearby);
                nearbyFetchedLocationRef.current = { lat: centerLat, lon: centerLon };
            } catch {
                // Ignore background nearby fetch errors
            } finally {
                isFetchingNearbyRef.current = false;
                setLoadingNearby(false);
            }
        },
        [mcc]
    );

    const handleZoomOut = useCallback(
        (center: { lat: number; lon: number }, zoom: number) => {
            // Only load nearby towers when user zooms out to view wider region (zoom <= 13)
            if (zoom <= 13) {
                fetchNearby(center.lat, center.lon);
            }
        },
        [fetchNearby]
    );

    const load = useCallback(async () => {
        setLoading(true);
        setErrorMsg('');
        setRateLimitSeconds(null);
        try {
            try {
                const netState = await Network.getNetworkStateAsync();
                if (netState.isInternetReachable === false) {
                    setErrorMsg('bts.noInternet');
                    setLoading(false);
                    return;
                }
            } catch {
                // network check unavailable — proceed
            }
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                ToastHelper.error(tRef.current('bts.locationDenied'));
                setErrorMsg('bts.locationDenied');
                setLoading(false);
                return;
            }
            let position;
            try {
                position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            } catch (error) {
                const last = await Location.getLastKnownPositionAsync();
                if (!last) throw error;
                position = last;
            }
            const user = { lat: position.coords.latitude, lon: position.coords.longitude };
            setUserLocation(user);

            if (!cellIds) {
                setErrorMsg('bts.noCellId');
                setLoading(false);
                return;
            }

            let cellId = cellIds.fullCellId;
            let tac = '';
            if (credentials?.modemIp) {
                const service = new ModemService(credentials.modemIp);
                try {
                    const cellInfo = await service.getCellInfo();
                    if (cellInfo.cellId) {
                        const parsed = parseCellIdString(cellInfo.cellId);
                        if (parsed) cellId = parsed.fullCellId;
                    }
                    tac = cellInfo.tac;
                } catch {
                }
            }

            const rateLimitBefore = getBtsRateLimit();
            if (rateLimitBefore) {
                setBtsLocation(null);
                setBtsSource(null);
                setDistanceM(null);
                setBearing(null);
                setRateLimitSeconds(rateLimitBefore.retryAfterSeconds);
                setErrorMsg('bts.rateLimited');
                ToastHelper.warning(
                    tRef.current('bts.rateLimited', { time: formatRetry(rateLimitBefore.retryAfterSeconds) })
                );
                return;
            }

            // Only fetch the connected BTS coordinate for fast initial render
            const bts = await fetchBtsCoordinates({ mcc, mnc, cellId, tac }, user.lat, user.lon);

            const rateLimitAfter = getBtsRateLimit();
            if (rateLimitAfter) {
                setBtsLocation(null);
                setBtsSource(null);
                setDistanceM(null);
                setBearing(null);
                setRateLimitSeconds(rateLimitAfter.retryAfterSeconds);
                setErrorMsg('bts.rateLimited');
                ToastHelper.warning(
                    tRef.current('bts.rateLimited', { time: formatRetry(rateLimitAfter.retryAfterSeconds) })
                );
                return;
            }

            if (!bts) {
                setBtsLocation(null);
                setBtsSource(null);
                setDistanceM(null);
                setBearing(null);
                setErrorMsg('bts.notFound');
                return;
            }
            setBtsLocation({ lat: bts.lat, lon: bts.lon });
            setBtsSource(bts.source);
            setDistanceM(calculateDistanceKm(user.lat, user.lon, bts.lat, bts.lon) * 1000);
            setBearing(normalizeBearing(calculateBearing(user.lat, user.lon, bts.lat, bts.lon)));

            const statusLabel = bts.source === 'api'
                ? 'Asli (Exact Cell Match)'
                : bts.source === 'enodeb'
                ? 'Asli (Sector eNodeB Match)'
                : bts.source === 'site'
                ? 'Estimasi/Terdekat (Near-miss Site Estimate)'
                : `Sumber Eksternal (${bts.source})`;

            console.log(`[BTS Locator] Koordinat BTS Terhubung: lat=${bts.lat}, lon=${bts.lon} | Status: ${statusLabel} | Source: ${bts.source}`);

            if (bts.source === 'site') {
                ToastHelper.warning(tRef.current('bts.estimatedAlertBody'));
            }
        } catch {
            ToastHelper.error(tRef.current('bts.locationError'));
            setErrorMsg('bts.locationError');
        } finally {
            setLoading(false);
        }
    }, [cellIds, mcc, mnc, credentials?.modemIp]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const sub = Network.addNetworkStateListener((state) => {
            if (state.isInternetReachable) {
                load();
            }
        });
        return () => sub.remove();
    }, [load]);

const formatDistance = (meters: number | null): string => {
    if (meters === null) return '-';
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
};

const formatRetry = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
};

    // 'site' results are estimates — the UI labels them so users know the
    // marker is approximate instead of the exact connected cell.
    const estimated = btsSource === 'site';

    return (
        <AnimatedScreen noAnimation>
            <MeshGradientBackground>
                <PageHeader title={t('bts.title')} showBackButton />
                <View style={styles.mapWrapper}>
                    <BtsMapWebView
                        userLocation={userLocation}
                        btsLocation={btsLocation}
                        nearbyTowers={nearbyTowers}
                        radiusMeters={BTS_SEARCH_RADIUS_KM * 1000}
                        userHeading={userHeading}
                        onZoomOut={handleZoomOut}
                        btsInfo={
                            cellIds
                                ? {
                                      eNodeB: cellIds.eNodeB,
                                      sectorId: cellIds.sectorId,
                                      band,
                                      rsrp: signalInfo?.rsrp,
                                      distanceKm: distanceM !== null ? distanceM / 1000 : undefined,
                                      // Operator name straight from the modem (networkInfo), not from a lookup table.
                                      operator: operatorName,
                                      estimated,
                                  }
                                : undefined
                        }
                    />
                    {loading && (
                        <View style={[styles.mapOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)' }]}>
                            <BouncingDots color={colors.primary} />
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 8 }]}>
                                {t('bts.locating')}
                            </Text>
                        </View>
                    )}
                    {!loading && loadingNearby && (
                        <View style={[styles.nearbyBadge, { backgroundColor: isDark ? 'rgba(20,20,24,0.92)' : 'rgba(255,255,255,0.95)', borderColor: colors.border, borderWidth: 1 }]}>
                            <Text style={[typography.caption2, { color: colors.text, marginRight: 8, fontWeight: '600' }]}>
                                {t('bts.loadingNearby')}
                            </Text>
                            <BouncingDots size="small" color={colors.primary} />
                        </View>
                    )}
                    {!loading && errorMsg === 'bts.notFound' && (
                        <View style={[styles.mapNotice, { backgroundColor: isDark ? 'rgba(20,20,24,0.92)' : 'rgba(255,255,255,0.95)', borderColor: colors.border, borderWidth: 1 }]}>
                            <MaterialIcons name="info-outline" size={18} color={colors.warning} />
                            <Text style={[typography.caption1, { color: colors.text, marginLeft: 6, flex: 1 }]}>
                                {t('bts.notFoundShort')}
                            </Text>
                        </View>
                    )}
                    {!loading && errorMsg !== '' && errorMsg !== 'bts.notFound' && (
                        <View style={[styles.mapOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)' }]}>
                            <MaterialIcons name="location-off" size={28} color={colors.warning} />
                            <Text style={[typography.body, { color: colors.text, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 }]}>
                                {errorMsg === 'bts.rateLimited' && rateLimitSeconds !== null
                                    ? t('bts.rateLimited', { time: formatRetry(rateLimitSeconds) })
                                    : t(errorMsg)}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={{ marginTop: spacing.sm }}>
                    <AdBanner />
                </View>

                <Card style={[styles.card, { marginBottom: insets.bottom + spacing.sm }]}>
                    <View style={styles.cardHeader}>
                        <Text style={[typography.headline, { color: colors.text, fontSize: 16 }]}>{t('bts.summary')}</Text>
                        <TouchableOpacity
                            style={[styles.refreshIconBtn, { backgroundColor: colors.primary + '18' }]}
                            onPress={load}
                            activeOpacity={0.7}
                        >
                            <MaterialIcons name="my-location" size={16} color={colors.primary} />
                            <Text style={[typography.caption1, { color: colors.primary, fontWeight: '700', marginLeft: 4 }]}>
                                {t('bts.refresh')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.disclaimerContainer, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '35' }]}>
                        <MaterialIcons name="info-outline" size={14} color={colors.warning} style={{ marginTop: 1 }} />
                        <Text style={[typography.caption2, { color: colors.warning, marginLeft: 6, flex: 1, lineHeight: 14 }]}>
                            {t('bts.betaDisclaimer')}
                        </Text>
                    </View>

                    {estimated && (
                        <Text style={[typography.caption2, { color: colors.warning, marginBottom: 6 }]}>
                            {t('bts.estimated')}
                        </Text>
                    )}

                    <View style={styles.row}>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('bts.operator')}</Text>
                        <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>{operatorName}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('bts.distance')}</Text>
                        <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>{formatDistance(distanceM)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('bts.rsrp')}</Text>
                        <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>{signalInfo?.rsrp ? `${signalInfo.rsrp} dBm` : '-'}</Text>
                    </View>

                    {showMore && (
                        <>
                            <View style={styles.row}>
                                <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('bts.bearing')}</Text>
                                <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>
                                    {bearing !== null ? `${bearing.toFixed(0)}° ${bearingToCompass(bearing)}` : '-'}
                                </Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('bts.enodeb')}</Text>
                                <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>{cellIds ? cellIds.eNodeB : '-'}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('bts.sector')}</Text>
                                <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>{cellIds ? cellIds.sectorId : '-'}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('bts.band')}</Text>
                                <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>{getLteBandLabel(band)}</Text>
                            </View>
                        </>
                    )}

                    <TouchableOpacity style={styles.expandToggle} onPress={() => setShowMore((prev) => !prev)} activeOpacity={0.7}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginRight: 2 }]}>
                            {t(showMore ? 'bts.lessDetails' : 'bts.moreDetails')}
                        </Text>
                        <MaterialIcons name={showMore ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                </Card>
            </MeshGradientBackground>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    mapWrapper: {
        flex: 1,
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapNotice: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    nearbyBadge: {
        position: 'absolute',
        top: 16,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    card: {
        marginHorizontal: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    disclaimerContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 3,
    },
    refreshIconBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    expandToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 6,
        marginTop: 2,
    },
});
