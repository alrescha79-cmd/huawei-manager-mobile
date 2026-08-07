import rawCsv from '../../openCell/510.csv';

export interface CellTower {
    mnc: string;
    cellId: number;
    lat: number;
    lon: number;
    range: number;
    samples: number;
    lac: number;
}

// OpenCelliD dump columns: radio,mcc,mnc,lac,cellid,psc,lon,lat,range,samples,...
const TOWERS = new Map<string, CellTower>();
const TOWERS_BY_ENODEB = new Map<string, CellTower[]>();

const enodebOf = (cellId: number): number => Math.floor(cellId / 256);

const buildIndex = () => {
    for (const line of rawCsv.split('\n')) {
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length < 8 || parts[0] !== 'LTE') continue;
        const mnc = parts[2];
        const cellId = parseInt(parts[4], 10);
        const lon = parseFloat(parts[6]);
        const lat = parseFloat(parts[7]);
        if (isNaN(cellId) || isNaN(lon) || isNaN(lat)) continue;
        const tower: CellTower = {
            mnc,
            cellId,
            lat,
            lon,
            range: parseInt(parts[8], 10) || 0,
            samples: parseInt(parts[9], 10) || 0,
            lac: parseInt(parts[3], 10) || 0,
        };
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

export const lookupCellTower = (mnc: string, cellId: number): CellTower | undefined =>
    TOWERS.get(`${mnc}|${cellId}`);

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
    const list = TOWERS_BY_ENODEB.get(`${mnc}|${eNodeB}`);
    if (!list || list.length === 0) return undefined;
    return list.reduce((best, tower) =>
        distanceSq(tower, userLat, userLon) < distanceSq(best, userLat, userLon) ? tower : best
    );
};

/**
 * Nearest LTE tower of the operator whose eNodeB ID is numerically close to the
 * target (|delta| <= 50). Operators allocate eNodeB IDs in contiguous blocks per
 * physical site, so a near-miss eNodeB is usually the same tower.
 */
export const findNearestSite = (mnc: string, eNodeB: number, userLat: number, userLon: number): CellTower | undefined => {
    let best: CellTower | undefined;
    let bestDist = Infinity;
    for (const tower of TOWERS.values()) {
        if (tower.mnc !== mnc) continue;
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
    let best: CellTower | undefined;
    let bestDist = Infinity;
    for (const tower of TOWERS.values()) {
        if (tower.mnc !== mnc || tower.lac <= 0) continue;
        const d = distanceSq(tower, userLat, userLon);
        if (d < bestDist) {
            bestDist = d;
            best = tower;
        }
    }
    return best?.lac;
};

/**
 * LTE towers of the operator within a radius, sorted by distance (closest first).
 */
export const findNearbyTowers = (mnc: string, userLat: number, userLon: number, radiusKm: number): CellTower[] => {
    const radiusDeg = radiusKm / 111;
    const results: CellTower[] = [];
    for (const tower of TOWERS.values()) {
        if (tower.mnc !== mnc) continue;
        const dLat = tower.lat - userLat;
        const dLon = tower.lon - userLon;
        if (Math.abs(dLat) > radiusDeg || Math.abs(dLon) > radiusDeg) continue;
        if (dLat * dLat + dLon * dLon <= radiusDeg * radiusDeg) results.push(tower);
    }
    results.sort((a, b) => distanceSq(a, userLat, userLon) - distanceSq(b, userLat, userLon));
    return results.slice(0, 30);
};
