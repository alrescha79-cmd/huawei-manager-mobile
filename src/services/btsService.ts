export type TowerRadio = 'LTE' | 'UMTS' | 'GSM' | 'NR';

/** Search radius for nearby towers and the map's focus circle (max 20 km). */
export const BTS_SEARCH_RADIUS_KM = 20;

export interface BtsCoordinates {
    lat: number;
    lon: number;
    /** 'site' marks near-eNodeB estimate; 'enodeb' marks sector match. */
    source: 'api' | 'enodeb' | 'site' | 'scrape';
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

interface ApiTower {
    id: number;
    mcc: string;
    mnc: string;
    lac: number;
    ci: number;
    network_type: TowerRadio;
    tower_lat: number;
    tower_lon: number;
    distance_m?: number;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: { code: string; message: string; retry_after_seconds?: number };
}

export interface BtsRateLimit {
    retryAfterSeconds: number;
}

// Read env vars at call-time, not at module load. In production builds,
// babel-preset-expo inlines EXPO_PUBLIC_* as string literals at build time,
// so these getters resolve to the inlined value. In development, they read
// process.env at runtime. Moving to getters (instead of module-scope consts)
// ensures the values are always fresh and avoids stale-undefined issues if
// the module is imported before env is populated.
const getBtsApiBase = (): string => process.env.EXPO_PUBLIC_BTS_API_URL || '';
const getBtsApiKey = (): string => process.env.EXPO_PUBLIC_BTS_API_KEY || '';
const ACTIVE_TOWER_URL = 'https://api.frexello.com/api/active-tower';
const GOOGLE_GEOLOCATION_URL = 'https://www.googleapis.com/geolocation/v1/geolocate';
const RATE_LIMIT_DEFAULT_MS = 60_000;

let rateLimitedUntil = 0;

export const getBtsRateLimit = (): BtsRateLimit | null => {
    const remaining = rateLimitedUntil - Date.now();
    return remaining > 0 ? { retryAfterSeconds: Math.ceil(remaining / 1000) } : null;
};

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

/**
 * OpenCelliD / D1 stores MNCs without leading zeros ('1'), while modems often report
 * them zero-padded ('01'). Normalize both sides so lookups always agree.
 */
const normalizeMnc = (mnc: string): string => mnc.replace(/^0+/, '') || mnc;

const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

const apiGet = async <T>(endpoint: string, params: Record<string, string | number | undefined>): Promise<T | null> => {
    // URL comes from env (EXPO_PUBLIC_BTS_API_URL) — without it the backend is
    // unavailable, so skip every bts.cakson call.
    const BTS_API_BASE = getBtsApiBase();
    if (!BTS_API_BASE) return null;
    const BTS_API_KEY = getBtsApiKey();
    // Respect the backend 30 req/min/IP limit locally so we stop hammering it
    // once the server told us we're out of quota.
    if (getBtsRateLimit()) return null;
    try {
        const query = Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&');
        const url = `${BTS_API_BASE}${endpoint}${query ? `?${query}` : ''}`;
        const headers: Record<string, string> = {};
        if (BTS_API_KEY) headers['X-API-Key'] = BTS_API_KEY;
        const res = await fetchWithTimeout(url, { method: 'GET', headers }, 8000);
        let json: ApiResponse<T> | null = null;
        try {
            json = await res.json();
        } catch {
        }
        if (res.status === 429 || json?.error?.code === 'RATE_LIMIT_EXCEEDED') {
            rateLimitedUntil = Date.now() + parseRateLimitRetryMs(res, json?.error);
            return null;
        }
        if (!res.ok) return null;
        return json && json.success && json.data ? json.data : null;
    } catch {
        return null;
    }
};

const parseRateLimitRetryMs = (
    res: Response,
    error?: { retry_after_seconds?: number }
): number => {
    if (error && typeof error.retry_after_seconds === 'number' && error.retry_after_seconds > 0) {
        return error.retry_after_seconds * 1000;
    }
    const resetHeader = res.headers.get('X-RateLimit-Reset');
    if (resetHeader) {
        const resetEpoch = parseInt(resetHeader, 10);
        if (Number.isFinite(resetEpoch)) {
            const delta = resetEpoch * 1000 - Date.now();
            if (delta > 0) return delta;
        }
    }
    return RATE_LIMIT_DEFAULT_MS;
};

/** Mozilla Location Services geolocation from a cell id (free, no key). */
const scrapeMozilla = async (_mcc: string, _mnc: string, _cellId: number, _lac?: number): Promise<BtsCoordinates | null> => {
    // Mozilla Location Services (MLS) has been retired in 2024. Return null immediately.
    return null;
};

/**
 * Google Geolocation API lookup (free tier, requires
 * EXPO_PUBLIC_GOOGLE_GEOLOCATION_KEY). Cell-based fallback when online services miss.
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

const scrapeActiveTower = async (mcc: string, mnc: string, cellId: number, lac?: number): Promise<BtsCoordinates | null> => {
    try {
        const queryParams = [`mcc=${encodeURIComponent(mcc)}`, `mnc=${encodeURIComponent(mnc)}`, `ci=${encodeURIComponent(String(cellId))}`];
        if (lac) queryParams.push(`lac=${encodeURIComponent(String(lac))}`);
        const query = queryParams.join('&');
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
 * Free geolocation services run first so the rate-limited bts API quota is
 * preserved; the bts API mirror and frexello are only consulted as a
 * last-resort fallback.
 *
 * 1. Google Geolocation API (free tier).
 * 2. Mozilla Location Services (free, no key).
 * 3. bts API mirror (MCC 510 only): exact /towers/lookup, then /towers/nearby
 *    matching exact cellId, eNodeB sector, or close site.
 * 4. frexello active-tower API (last resort).
 */
export const fetchBtsCoordinates = async (
    params: BtsLookupParams,
    userLat: number,
    userLon: number
): Promise<BtsCoordinates | null> => {
    const { mcc, mnc, cellId, tac } = params;
    const normMnc = normalizeMnc(mnc);
    const eNodeB = Math.floor(cellId / 256);
    const lac = parseTac(tac);
    const isIndonesia = mcc === '510';

    const google = await scrapeGoogleGeolocation(mcc, normMnc, cellId, lac);
    if (google) return google;

    const mozilla = await scrapeMozilla(mcc, normMnc, cellId, lac);
    if (mozilla) return mozilla;

    if (isIndonesia) {
        // Exact lookup if TAC is provided
        if (lac) {
            const tower = await apiGet<ApiTower>('/api/v1/towers/lookup', {
                mcc,
                mnc: normMnc,
                lac,
                ci: cellId,
            });
            if (tower && typeof tower.tower_lat === 'number' && typeof tower.tower_lon === 'number') {
                return { lat: tower.tower_lat, lon: tower.tower_lon, source: 'api' };
            }
        }

        // Search nearby towers around user to match cellId, eNodeB sector, or site estimate
        const nearby = await apiGet<ApiTower[]>('/api/v1/towers/nearby', {
            lat: userLat,
            lng: userLon,
            radius_km: BTS_SEARCH_RADIUS_KM,
            network_type: 'LTE',
            mcc,
            mnc: normMnc || undefined,
            limit: 200,
        });

        if (nearby && nearby.length > 0) {
            // Exact cell match (closest if duplicate)
            const exact = nearby.find((t) => t.ci === cellId);
            if (exact) {
                return { lat: exact.tower_lat, lon: exact.tower_lon, source: 'api' };
            }

            // Same eNodeB (sector match)
            const byEnodeB = nearby.find((t) => Math.floor(t.ci / 256) === eNodeB);
            if (byEnodeB) {
                return { lat: byEnodeB.tower_lat, lon: byEnodeB.tower_lon, source: 'enodeb' };
            }

            // Near-miss eNodeB (|delta| <= 50)
            const site = nearby.find((t) => Math.abs(Math.floor(t.ci / 256) - eNodeB) <= 50);
            if (site) {
                return { lat: site.tower_lat, lon: site.tower_lon, source: 'site' };
            }
        }
    }

    // Fallback: frexello active-tower lookup (works with or without TAC).
    const activeTower = await scrapeActiveTower(mcc, normMnc, cellId, lac);
    if (activeTower) return activeTower;

    return null;
};

/**
 * Towers around the user for map visualization — every operator and radio
 * (LTE + UMTS + GSM + NR) within the radius, closest first.
 */
export const fetchNearbyTowers = async (
    mcc: string,
    userLat: number,
    userLon: number,
    radiusKm = BTS_SEARCH_RADIUS_KM
): Promise<NearbyTower[]> => {
    const data = await apiGet<ApiTower[]>('/api/v1/towers/nearby', {
        lat: userLat,
        lng: userLon,
        radius_km: radiusKm,
        limit: 40,
    });

    if (!data) return [];

    return data.map((t) => ({
        lat: t.tower_lat,
        lon: t.tower_lon,
        cellId: t.ci,
        eNodeB: Math.floor(t.ci / 256),
        radio: t.network_type,
        operator: getOperatorName(t.mcc || mcc, t.mnc),
        distanceKm: typeof t.distance_m === 'number' ? t.distance_m / 1000 : 0,
    }));
};
