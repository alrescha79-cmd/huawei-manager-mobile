const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export interface CellIds {
  eNodeB: number;
  sectorId: number;
}

export interface ParsedCellId extends CellIds {
  fullCellId: number;
}

/**
 * Parse a raw cell id string from the modem.
 * Handles both formats:
 *  - plain decimal full cell id (e.g. "104990981")
 *  - eNodeB-sector (e.g. "0234046-013" -> eNodeB 234046, sector 13)
 */
export const parseCellIdString = (raw: string | undefined | null): ParsedCellId | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const dash = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (dash) {
    const eNodeB = parseInt(dash[1], 10);
    const sectorId = parseInt(dash[2], 10);
    return { eNodeB, sectorId, fullCellId: eNodeB * 256 + sectorId };
  }
  const fullCellId = parseInt(trimmed, 10);
  if (isNaN(fullCellId) || fullCellId <= 0) return null;
  return { eNodeB: Math.floor(fullCellId / 256), sectorId: fullCellId % 256, fullCellId };
};

/**
 * Parse a 28-bit LTE Cell ID into eNodeB ID and sector ID.
 * eNodeB = Cell ID >> 8, Sector = Cell ID & 0xFF.
 */
export const parseCellId = (cellId: number): CellIds => ({
  eNodeB: Math.floor(cellId / 256),
  sectorId: cellId % 256,
});

/**
 * Haversine distance between two coordinates in kilometers.
 */
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

export const calculateDistance = calculateDistanceKm;

/**
 * Bearing (azimuth) in degrees from point 1 to point 2, 0-360.
 */
export const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180) / Math.PI;
};

export const normalizeBearing = (bearing: number): number => ((bearing % 360) + 360) % 360;

const COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const bearingToCompass = (bearing: number): string => {
    const normalized = normalizeBearing(bearing);
    return COMPASS_DIRS[Math.round(normalized / 45) % 8];
};

// Self-check: run with NODE_ENV=test to verify math utilities.
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    const assert = (cond: boolean, msg: string) => {
        if (!cond) throw new Error(msg);
    };
    const cid = parseCellId(282465665);
    assert(cid.eNodeB === 1103381 && cid.sectorId === 1, `parseCellId failed: ${JSON.stringify(cid)}`);
    const dash = parseCellIdString('0234046-013');
    assert(dash?.eNodeB === 234046 && dash.sectorId === 13 && dash.fullCellId === 59915789, `parseCellIdString dash failed: ${JSON.stringify(dash)}`);
    const plain = parseCellIdString('104990981');
    assert(plain?.fullCellId === 104990981 && plain.eNodeB === 409340, `parseCellIdString plain failed: ${JSON.stringify(plain)}`);
    assert(parseCellIdString('') === null && parseCellIdString('abc') === null, 'parseCellIdString invalid input failed');
    assert(Math.abs(calculateDistanceKm(-6.2, 106.816, -6.917, 107.619) - 109.4) < 1, 'distance wrong');
    assert(Math.abs(normalizeBearing(calculateBearing(-6.2, 106.816, -6.917, 107.619)) - 126) < 2, 'bearing wrong');
    assert(normalizeBearing(-90) === 270, 'normalizeBearing wrong');
}
