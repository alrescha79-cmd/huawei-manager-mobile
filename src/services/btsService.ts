import { lookupCellTower, findByENodeB, findNearestLac, findNearestSite, findNearbyTowers } from './cellTowerDb';

/** Search radius for nearby towers and the map's focus circle. */
export const BTS_SEARCH_RADIUS_KM = 25;

export interface BtsCoordinates {
    lat: number;
    lon: number;
    source: 'api' | 'local' | 'enodeb' | 'site' | 'scrape';
}

export interface NearbyTower {
    lat: number;
    lon: number;
    cellId: number;
    eNodeB: number;
}

export interface BtsLookupParams {
    mcc: string;
    mnc: string;
    cellId: number;
    tac?: string;
}

const OPENCELLID_URL = 'https://opencellid.org/cell/get';
const MLS_URL = 'https://location.services.mozilla.com/v1/geolocate';

const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

/** Mozilla Location Services geolocation from a cell id (free, no key). */
const scrapeMozilla = async (mcc: string, mnc: string, cellId: number, lac?: number): Promise<BtsCoordinates | null> => {
    try {
        const towers: Record<string, unknown> = {
            radioType: 'lte',
            mobileCountryCode: parseInt(mcc, 10),
            mobileNetworkCode: parseInt(mnc, 10),
            cellId,
        };
        if (lac) towers.locationAreaCode = lac;
        const response = await fetchWithTimeout(
            MLS_URL,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ radioType: 'lte', cellTowers: [towers], fallbackToIP: false }),
            },
            8000
        );
        const data = await response.json();
        if (data?.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number') {
            return { lat: data.location.lat, lon: data.location.lng, source: 'scrape' };
        }
    } catch {
    }
    return null;
};

/** OpenCelliD API lookup (requires key + LAC). */
const scrapeOpenCellId = async (mcc: string, mnc: string, cellId: number, lac: number): Promise<BtsCoordinates | null> => {
    const key = process.env.EXPO_PUBLIC_OPENCELLID_KEY;
    if (!key) {
        return null;
    }
    try {
        const query = `key=${encodeURIComponent(key)}&mcc=${encodeURIComponent(mcc)}&mnc=${encodeURIComponent(mnc)}&lac=${encodeURIComponent(String(lac))}&cellid=${encodeURIComponent(String(cellId))}&format=json`;
        const response = await fetchWithTimeout(`${OPENCELLID_URL}?${query}`, { method: 'GET' }, 8000);
        const data = await response.json();
        if (data?.status === 'ok' && typeof data.lat === 'number' && typeof data.lon === 'number') {
            return { lat: data.lat, lon: data.lon, source: 'api' };
        }
    } catch {
    }
    return null;
};

/**
 * Resolve BTS coordinates: local dump (exact cell), local dump (eNodeB), then
 * remote scrape sources. Returns null when every source misses.
 */
export const fetchBtsCoordinates = async (
    params: BtsLookupParams,
    userLat: number,
    userLon: number
): Promise<BtsCoordinates | null> => {
    const { mcc, mnc, cellId, tac } = params;
    const eNodeB = Math.floor(cellId / 256);

    // 1. OpenCelliD API with the real TAC from the modem — most accurate.
    if (tac) {
        const api = await scrapeOpenCellId(mcc, mnc, cellId, parseInt(tac, 10));
        if (api) {
            return api;
        }
    }

    // 2. Local dump, exact cell.
    const exact = lookupCellTower(mnc, cellId);
    if (exact) {
        return { lat: exact.lat, lon: exact.lon, source: 'local' };
    }

    // 3. Local dump, same eNodeB (different sector of the same tower).
    const byEnodeB = findByENodeB(mnc, eNodeB, userLat, userLon);
    if (byEnodeB) {
        return { lat: byEnodeB.lat, lon: byEnodeB.lon, source: 'enodeb' };
    }

    // 4. Local dump, numerically-adjacent eNodeB (likely same physical site).
    const site = findNearestSite(mnc, eNodeB, userLat, userLon);
    if (site) {
        return { lat: site.lat, lon: site.lon, source: 'site' };
    }

    // 5. Remote scrape with a guessed TAC (nearest tower in the dump).
    const lac = tac ? parseInt(tac, 10) : findNearestLac(mnc, userLat, userLon);

    const mozilla = await scrapeMozilla(mcc, mnc, cellId, lac);
    if (mozilla) {
        return mozilla;
    }

    if (lac) {
        const api = await scrapeOpenCellId(mcc, mnc, cellId, lac);
        if (api) {
            return api;
        }
    }

    return null;
};

/** Other towers of the operator around the user, for map visualization. */
export const fetchNearbyTowers = (
    mnc: string,
    userLat: number,
    userLon: number,
    radiusKm = BTS_SEARCH_RADIUS_KM
): NearbyTower[] =>
    findNearbyTowers(mnc, userLat, userLon, radiusKm).map((t) => ({
        lat: t.lat,
        lon: t.lon,
        cellId: t.cellId,
        eNodeB: Math.floor(t.cellId / 256),
    }));
