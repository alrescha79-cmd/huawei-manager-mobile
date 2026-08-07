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
import { fetchBtsCoordinates, fetchNearbyTowers, NearbyTower, BTS_SEARCH_RADIUS_KM } from '@/services/btsService';
import { ModemService } from '@/services/modem.service';
import { useAuthStore } from '@/stores/auth.store';
import { estimateLteBand, getLteBandLabel } from '@/utils/helpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BtsLocatorScreen() {
    const { colors, typography, spacing } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const tRef = useRef(t);
    tRef.current = t;

    const signalInfo = useModemStore((state) => state.signalInfo);
    const networkInfo = useModemStore((state) => state.networkInfo);
    const credentials = useAuthStore((state) => state.credentials);

    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [btsLocation, setBtsLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [nearbyTowers, setNearbyTowers] = useState<NearbyTower[]>([]);
    const [distanceM, setDistanceM] = useState<number | null>(null);
    const [bearing, setBearing] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<TranslationKey | ''>('');

    const cellIds = useMemo(() => parseCellIdString(signalInfo?.cellId), [signalInfo?.cellId]);
    const numeric = networkInfo?.numeric || '';
    const mcc = numeric.slice(0, 3);
    const mnc = numeric.slice(3);
    const band = signalInfo?.band || estimateLteBand(signalInfo?.cellId, numeric) || '-';
    const operatorName = networkInfo?.networkName || networkInfo?.fullName || networkInfo?.shortName || networkInfo?.spnName || '-';

    const load = useCallback(async () => {
        setLoading(true);
        setErrorMsg('');
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

            const bts = await fetchBtsCoordinates({ mcc, mnc, cellId, tac }, user.lat, user.lon);
            if (!bts) {
                setBtsLocation(null);
                setDistanceM(null);
                setBearing(null);
                setErrorMsg('bts.notFound');
                return;
            }
            setBtsLocation({ lat: bts.lat, lon: bts.lon });
            setDistanceM(calculateDistanceKm(user.lat, user.lon, bts.lat, bts.lon) * 1000);
            setBearing(normalizeBearing(calculateBearing(user.lat, user.lon, bts.lat, bts.lon)));
            const nearby = fetchNearbyTowers(mnc, user.lat, user.lon, BTS_SEARCH_RADIUS_KM);
            setNearbyTowers(nearby);
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
                        btsInfo={
                            cellIds
                                ? {
                                      eNodeB: cellIds.eNodeB,
                                      sectorId: cellIds.sectorId,
                                      band,
                                      rsrp: signalInfo?.rsrp,
                                      distanceKm: distanceM !== null ? distanceM / 1000 : undefined,
                                  }
                                : undefined
                        }
                    />
                    {loading && (
                        <View style={styles.mapOverlay}>
                            <BouncingDots color={colors.primary} />
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 8 }]}>
                                {t('bts.locating')}
                            </Text>
                        </View>
                    )}
                    {!loading && errorMsg !== '' && (
                        <View style={styles.mapOverlay}>
                            <MaterialIcons name="location-off" size={28} color={colors.warning} />
                            <Text style={[typography.body, { color: colors.text, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 }]}>
                                {t(errorMsg)}
                            </Text>
                        </View>
                    )}
                </View>

                <AdBanner />

                <Card style={[styles.card, { marginBottom: insets.bottom + spacing.md }]}>
                    <View style={styles.cardHeader}>
                        <Text style={[typography.headline, { color: colors.text }]}>{t('bts.summary')}</Text>
                    </View>

                    <View style={styles.row}>
                        <Text style={[typography.subheadline, { color: colors.textSecondary }]}>{t('bts.operator')}</Text>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{operatorName}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[typography.subheadline, { color: colors.textSecondary }]}>{t('bts.distance')}</Text>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{formatDistance(distanceM)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[typography.subheadline, { color: colors.textSecondary }]}>{t('bts.bearing')}</Text>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                            {bearing !== null ? `${bearing.toFixed(0)}° ${bearingToCompass(bearing)}` : '-'}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[typography.subheadline, { color: colors.textSecondary }]}>{t('bts.enodeb')}</Text>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{cellIds ? cellIds.eNodeB : '-'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[typography.subheadline, { color: colors.textSecondary }]}>{t('bts.sector')}</Text>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{cellIds ? cellIds.sectorId : '-'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[typography.subheadline, { color: colors.textSecondary }]}>{t('bts.rsrp')}</Text>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{signalInfo?.rsrp ? `${signalInfo.rsrp} dBm` : '-'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[typography.subheadline, { color: colors.textSecondary }]}>{t('bts.band')}</Text>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{getLteBandLabel(band)}</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.refreshButton, { backgroundColor: colors.primary }]}
                        onPress={load}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="my-location" size={18} color="#ffffff" />
                        <Text style={[typography.subheadline, { color: '#ffffff', fontWeight: '700', marginLeft: 8 }]}>
                            {t('bts.refresh')}
                        </Text>
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
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    card: {
        marginHorizontal: 16,
        marginTop: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 12,
        marginTop: 10,
    },
});
