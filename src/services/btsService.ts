import { lookupCellTower, findByENodeB, findNearestSite, findNearestLac, lookupCellTowerAnyOperator, findNearbyTowers, TowerRadio } from './cellTowerDb';
import { calculateDistanceKm } from '@/utils/geoMath';

/** Search radius for nearby towers and the map's focus circle. */
export const BTS_SEARCH_RADIUS_KM = 25;

export interface BtsCoordinates {
    lat: number;
    lon: number;
    /** 'site'/'lac' mark estimates (same-site guess, guessed-TAC remote lookup). */
    source: 'api' | 'local' | 'enodeb' | 'site' | 'lac' | 'scrape';
}

export interface NearbyTower {
    lat: number;
    lon: number;
    cellId: number;
    eNodeB: number;
    radio: TowerRadio;
    operator: string;
    distanceKm: number;
}

export interface BtsLookupParams {
    mcc: string;
    mnc: string;
    cellId: number;
    tac?: string;
}

const OPENCELLID_URL = 'https://opencellid.org/cell/get';
const MLS_URL = 'https://location.services.mozilla.com/v1/geolocate';
const GOOGLE_GEOLOCATION_URL = 'https://www.googleapis.com/geolocation/v1/geolocate';

/** Known Indonesian operator brands per MNC (MCC 510). Unknown MNCs fall back to the PLMN code. */
const OPERATOR_NAMES: Record<string, string> = {
    '510-01': 'XL Axiata',
    '510-09': 'Smartfren',
    '510-10': 'Telkomsel',
    '510-11': 'Telkomsel',
    '510-21': 'Indosat Ooredoo',
    '510-22': '3 (Tri)',
    '510-28': 'Smartfren',
    '510-89': '3 (Tri)',
};

/** Human operator name for a PLMN, e.g. "Telkomsel" for 510-10. */
export const getOperatorName = (mcc: string, mnc: string): string => {
    if (!mcc) return mnc;
    // Try the zero-padded form first ('510-01'), then the raw form ('510-1').
    const padded = `${mcc}-${mnc.padStart(2, '0')}`;
    return OPERATOR_NAMES[padded] || OPERATOR_NAMES[`${mcc}-${mnc}`] || `${mcc}-${mnc}`;
};

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

/**
 * Google Geolocation API lookup (free tier, requires
 * EXPO_PUBLIC_GOOGLE_GEOLOCATION_KEY). Cell-based fallback when the local dump
 * and OpenCelliD miss.
 */
const scrapeGoogleGeolocation = async (
    mcc: string,
    mnc: string,
    cellId: number,
    lac?: number
): Promise<BtsCoordinates | null> => {
    const key = process.env.EXPO_PUBLIC_GOOGLE_GEOLOCATION_KEY;
    if (!key) {
        return null;
    }
    try {
        const cellTower: Record<string, unknown> = {
            cellId,
            mobileCountryCode: parseInt(mcc, 10),
            mobileNetworkCode: parseInt(mnc, 10),
        };
        if (lac) cellTower.locationAreaCode = lac;
        const response = await fetchWithTimeout(
            `${GOOGLE_GEOLOCATION_URL}?key=${encodeURIComponent(key)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ considerIp: false, cellTowers: [cellTower] }),
            },
            8000
        );
        const data = await response.json();
        if (data?.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number') {
            return { lat: data.location.lat, lon: data.location.lng, source: 'api' };
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
 * Parse a TAC/LAC value from the modem. Huawei firmwares sometimes report it
 * as hex (with or without a '0x' prefix); fall back to base 16 when the
 * decimal parse fails.
 */
const parseTac = (tac?: string): number | undefined => {
    if (!tac) return undefined;
    const trimmed = tac.trim();
    const raw = /^0x/i.test(trimmed) ? trimmed.slice(2) : trimmed;
    const dec = parseInt(raw, 10);
    if (!isNaN(dec)) return dec;
    const hex = parseInt(raw, 16);
    return isNaN(hex) ? undefined : hex;
};

/**
 * Resolve the connected BTS coordinates — anchored to the modem's own cell
 * data (cellId, and the TAC when the modem reports it). Exact matches first
 * (OpenCelliD API, local dump cell/eNodeB), then remote geolocation with the
 * modem's real TAC, then honest estimates: a same-site tower from the local
 * dump, and finally remote lookups with a guessed TAC. Returns null only when
 * every source misses, so the map almost always has a connected-tower marker.
 */
export const fetchBtsCoordinates = async (
    params: BtsLookupParams,
    userLat: number,
    userLon: number
): Promise<BtsCoordinates | null> => {
    const { mcc, mnc, cellId, tac } = params;
    const eNodeB = Math.floor(cellId / 256);
    const lac = parseTac(tac);

    // 1. OpenCelliD API with the real TAC from the modem — most accurate.
    if (lac) {
        const api = await scrapeOpenCellId(mcc, mnc, cellId, lac);
        if (api) {
            return api;
        }
    }

    // 2. Local dump, exact cell (scanned across operators when the MNC is unusable).
    const exact = mnc ? lookupCellTower(mnc, cellId) : lookupCellTowerAnyOperator(cellId, userLat, userLon);
    if (exact) {
        return { lat: exact.lat, lon: exact.lon, source: 'local' };
    }

    // 3. Local dump, same eNodeB (different sector of the same tower).
    const byEnodeB = findByENodeB(mnc, eNodeB, userLat, userLon);
    if (byEnodeB) {
        return { lat: byEnodeB.lat, lon: byEnodeB.lon, source: 'enodeb' };
    }

    // 4. Local dump, numerically-adjacent eNodeB (likely same physical site).
    //    An estimate, but instant and keeps the map useful when the exact cell
    //    isn't in the dump.
    const site = findNearestSite(mnc, eNodeB, userLat, userLon);
    if (site) {
        return { lat: site.lat, lon: site.lon, source: 'site' };
    }

    // 5. Remote geolocation — only with the modem's real TAC.
    const google = await scrapeGoogleGeolocation(mcc, mnc, cellId, lac);
    if (google) {
        return google;
    }

    const mozilla = await scrapeMozilla(mcc, mnc, cellId, lac);
    if (mozilla) {
        return mozilla;
    }

    // 6. Last resort — remote lookups with a guessed TAC (nearest tower in the dump).
    const guessedLac = findNearestLac(mnc, userLat, userLon);
    if (guessedLac && guessedLac !== lac) {
        const api = await scrapeOpenCellId(mcc, mnc, cellId, guessedLac);
        if (api) {
            return { ...api, source: 'lac' };
        }
        const mozillaGuessed = await scrapeMozilla(mcc, mnc, cellId, guessedLac);
        if (mozillaGuessed) {
            return { ...mozillaGuessed, source: 'lac' };
        }
    }

    return null;
};

/**
 * Towers around the user for map visualization — every operator and radio
 * (LTE + UMTS) within the radius, closest first. The connected tower stays
 * highlighted separately, so including other operators just fills the map with
 * the real site landscape.
 */
export const fetchNearbyTowers = (
    mcc: string,
    userLat: number,
    userLon: number,
    radiusKm = BTS_SEARCH_RADIUS_KM
): NearbyTower[] =>
    findNearbyTowers(userLat, userLon, radiusKm).map((t) => ({
        lat: t.lat,
        lon: t.lon,
        cellId: t.cellId,
        eNodeB: Math.floor(t.cellId / 256),
        radio: t.radio,
        operator: getOperatorName(mcc, t.mnc),
        distanceKm: calculateDistanceKm(userLat, userLon, t.lat, t.lon),
    }));
