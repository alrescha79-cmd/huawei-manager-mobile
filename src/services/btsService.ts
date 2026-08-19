import { lookupCellTower, findByENodeB, findNearestSite, findNearestLac, lookupCellTowerAnyOperator, findNearbyTowers, TowerRadio } from './cellTowerDb';
import { calculateDistanceKm } from '@/utils/geoMath';

/** Search radius for nearby towers and the map's focus circle (max 20 km). */
export const BTS_SEARCH_RADIUS_KM = 20;

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

const ACTIVE_TOWER_URL = 'https://api.frexello.com/api/active-tower';
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
 * EXPO_PUBLIC_GOOGLE_GEOLOCATION_KEY). Cell-based fallback when local dump
 * and online services miss.
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

const scrapeActiveTower = async (mcc: string, mnc: string, cellId: number, lac: number): Promise<BtsCoordinates | null> => {
    try {
        const query = `mcc=${encodeURIComponent(mcc)}&mnc=${encodeURIComponent(mnc)}&lac=${encodeURIComponent(String(lac))}&ci=${encodeURIComponent(String(cellId))}`;
        const response = await fetchWithTimeout(`${ACTIVE_TOWER_URL}?${query}`, { method: 'GET' }, 8000);
        if (!response.ok) return null;
        const data = await response.json();
        if (typeof data?.tower_lat === 'number' && typeof data?.tower_lon === 'number') {
            return { lat: data.tower_lat, lon: data.tower_lon, source: 'api' };
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
 * data (cellId, and the TAC when the modem reports it).
 *
 * MCC 510 (Indonesia): local exact/eNodeB first, then online active-tower API,
 * then local nearest-site estimate, then Google/Mozilla, then guessed-TAC online lookup.
 *
 * Other MCCs: online active-tower API first, then Google/Mozilla.
 */
export const fetchBtsCoordinates = async (
    params: BtsLookupParams,
    userLat: number,
    userLon: number
): Promise<BtsCoordinates | null> => {
    const { mcc, mnc, cellId, tac } = params;
    const eNodeB = Math.floor(cellId / 256);
    const lac = parseTac(tac);
    const isIndonesia = mcc === '510';

    if (isIndonesia) {
        const exact = mnc ? lookupCellTower(mnc, cellId) : lookupCellTowerAnyOperator(cellId, userLat, userLon);
        if (exact) {
            return { lat: exact.lat, lon: exact.lon, source: 'local' };
        }

        const byEnodeB = findByENodeB(mnc, eNodeB, userLat, userLon);
        if (byEnodeB) {
            return { lat: byEnodeB.lat, lon: byEnodeB.lon, source: 'enodeb' };
        }

        if (lac) {
            const api = await scrapeActiveTower(mcc, mnc, cellId, lac);
            if (api) {
                return api;
            }
        }

        const site = findNearestSite(mnc, eNodeB, userLat, userLon);
        if (site) {
            return { lat: site.lat, lon: site.lon, source: 'site' };
        }

        const google = await scrapeGoogleGeolocation(mcc, mnc, cellId, lac);
        if (google) {
            return google;
        }

        const mozilla = await scrapeMozilla(mcc, mnc, cellId, lac);
        if (mozilla) {
            return mozilla;
        }

        const guessedLac = findNearestLac(mnc, userLat, userLon);
        if (guessedLac && guessedLac !== lac) {
            const api = await scrapeActiveTower(mcc, mnc, cellId, guessedLac);
            if (api) {
                return { ...api, source: 'lac' };
            }
            const mozillaGuessed = await scrapeMozilla(mcc, mnc, cellId, guessedLac);
            if (mozillaGuessed) {
                return { ...mozillaGuessed, source: 'lac' };
            }
        }

        return null;
    }

    if (lac) {
        const api = await scrapeActiveTower(mcc, mnc, cellId, lac);
        if (api) {
            return api;
        }
    }

    const google = await scrapeGoogleGeolocation(mcc, mnc, cellId, lac);
    if (google) {
        return google;
    }

    const mozilla = await scrapeMozilla(mcc, mnc, cellId, lac);
    if (mozilla) {
        return mozilla;
    }

    return null;
};

/**
 * Towers around the user for map visualization — every operator and radio
 * (LTE + UMTS + GSM + NR) within the radius, closest first.
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
