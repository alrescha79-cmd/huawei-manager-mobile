import rawCsv from '../../openCell/towers.min.csv';

export type TowerRadio = 'LTE' | 'UMTS' | 'GSM' | 'NR';

export interface CellTower {
    radio: TowerRadio;
    mnc: string;
    cellId: number;
    lat: number;
    lon: number;
    lac: number;
}

// Compact dump columns: radio(L|U|G|N),mnc,lac,cellid,lon,lat
// Regenerate from the raw OpenCelliD dump with: npm run towers
const TOWERS = new Map<string, CellTower>(); // LTE exact tower lookups
const TOWERS_BY_ENODEB = new Map<string, CellTower[]>(); // LTE sectors
const ALL_TOWERS: CellTower[] = []; // All radios — nearby tower map visualization

/**
 * OpenCelliD stores MNCs without leading zeros ('1'), while modems often report
 * them zero-padded ('01'). Normalize both sides so lookups always agree.
 */
export const normalizeMnc = (mnc: string): string => mnc.replace(/^0+/, '') || mnc;

const enodebOf = (cellId: number): number => Math.floor(cellId / 256);

const parseRadio = (code: string): TowerRadio => {
    switch (code) {
        case 'G':
            return 'GSM';
        case 'U':
            return 'UMTS';
        case 'N':
            return 'NR';
        case 'L':
        default:
            return 'LTE';
    }
};

const buildIndex = () => {
    for (const line of rawCsv.split('\n')) {
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length < 6) continue;
        const radio: TowerRadio = parseRadio(parts[0]);
        const mnc = normalizeMnc(parts[1]);
        const cellId = parseInt(parts[3], 10);
        const lon = parseFloat(parts[4]);
        const lat = parseFloat(parts[5]);
        if (isNaN(cellId) || isNaN(lon) || isNaN(lat)) continue;
        const tower: CellTower = {
            radio,
            mnc,
            cellId,
            lat,
            lon,
            lac: parseInt(parts[2], 10) || 0,
        };
        ALL_TOWERS.push(tower);
        if (radio !== 'LTE') continue;
        TOWERS.set(`${mnc}|${cellId}`, tower);
        const enbKey = `${mnc}|${enodebOf(cellId)}`;
        const list = TOWERS_BY_ENODEB.get(enbKey);
        if (list) {
            list.push(tower);
        } else {
            TOWERS_BY_ENODEB.set(enbKey, [tower]);
        }
    }
};

buildIndex();

/** Exact LTE tower lookup by operator MNC + full cell id. */
export const lookupCellTower = (mnc: string, cellId: number): CellTower | undefined =>
    TOWERS.get(`${normalizeMnc(mnc)}|${cellId}`);

const distanceSq = (a: CellTower, lat: number, lon: number): number => {
    const dLat = a.lat - lat;
    const dLon = a.lon - lon;
    return dLat * dLat + dLon * dLon;
};

/**
 * Nearest tower to the user's position sharing the same eNodeB ID.
 * Different sectors of one tower sit meters apart, so the closest row is the
 * best position estimate.
 */
export const findByENodeB = (mnc: string, eNodeB: number, userLat: number, userLon: number): CellTower | undefined => {
    const list = TOWERS_BY_ENODEB.get(`${normalizeMnc(mnc)}|${eNodeB}`);
    if (!list || list.length === 0) return undefined;
    return list.reduce((best, tower) =>
        distanceSq(tower, userLat, userLon) < distanceSq(best, userLat, userLon) ? tower : best
    );
};

/**
 * Nearest LTE tower of the operator whose eNodeB ID is numerically close to the
 * target (|delta| <= 50). Operators allocate eNodeB IDs in contiguous blocks per
 * physical site, so a near-miss eNodeB is usually the same tower. Last-resort
 * estimate so the map stays useful when the exact cell isn't in the dump.
 */
export const findNearestSite = (mnc: string, eNodeB: number, userLat: number, userLon: number): CellTower | undefined => {
    const normMnc = normalizeMnc(mnc);
    let best: CellTower | undefined;
    let bestDist = Infinity;
    for (const tower of TOWERS.values()) {
        if (tower.mnc !== normMnc) continue;
        const delta = Math.abs(enodebOf(tower.cellId) - eNodeB);
        if (delta > 50) continue;
        const d = distanceSq(tower, userLat, userLon);
        if (d < bestDist) {
            bestDist = d;
            best = tower;
        }
    }
    return best;
};

/** LAC (TAC) of the nearest LTE tower of the given operator, used as a guess for remote lookups. */
export const findNearestLac = (mnc: string, userLat: number, userLon: number): number | undefined => {
    const normMnc = normalizeMnc(mnc);
    let best: CellTower | undefined;
    let bestDist = Infinity;
    for (const tower of TOWERS.values()) {
        if (tower.mnc !== normMnc || tower.lac <= 0) continue;
        const d = distanceSq(tower, userLat, userLon);
        if (d < bestDist) {
            bestDist = d;
            best = tower;
        }
    }
    return best?.lac;
};

/**
 * Exact cell-id match across every operator, nearest to the user — used when
 * the modem reports no usable MNC. Cell ids are unique per operator, so the
 * closest row is almost certainly the connected tower.
 */
export const lookupCellTowerAnyOperator = (cellId: number, userLat: number, userLon: number): CellTower | undefined => {
    let best: CellTower | undefined;
    let bestDist = Infinity;
    for (const tower of ALL_TOWERS) {
        if (tower.radio !== 'LTE' || tower.cellId !== cellId) continue;
        const d = distanceSq(tower, userLat, userLon);
        if (d < bestDist) {
            bestDist = d;
            best = tower;
        }
    }
    return best;
};

/**
 * Towers (all operators, LTE + UMTS) within a radius of the user, sorted by
 * distance (closest first). Other operators' sites are included so the map
 * shows the full tower landscape instead of only the connected operator's
 * sector rows.
 */
export const findNearbyTowers = (userLat: number, userLon: number, radiusKm: number, limit = 40): CellTower[] => {
    const radiusDeg = radiusKm / 111;
    const results: CellTower[] = [];
    for (const tower of ALL_TOWERS) {
        const dLat = tower.lat - userLat;
        const dLon = tower.lon - userLon;
        if (Math.abs(dLat) > radiusDeg || Math.abs(dLon) > radiusDeg) continue;
        if (dLat * dLat + dLon * dLon <= radiusDeg * radiusDeg) results.push(tower);
    }
    results.sort((a, b) => distanceSq(a, userLat, userLon) - distanceSq(b, userLat, userLon));
    return results.slice(0, limit);
};
