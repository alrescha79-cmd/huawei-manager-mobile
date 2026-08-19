#!/usr/bin/env node
/**
 * Prepares the bundled cell-tower database from a raw OpenCelliD dump.
 *
 * The raw dump (openCell/510.csv, ~4.4 MB) is imported at build time as an
 * inlined JS string, so every byte directly inflates the APK. This script
 * produces a compact version (openCell/towers.min.csv) that:
 *
 *   - keeps LTE, UMTS, GSM, and NR (5G) rows,
 *   - strips unused columns (psc, range, samples, timestamps),
 *   - rounds coordinates to 4 decimals (~11 m precision — plenty for towers),
 *   - encodes the radio as a single character (L/U/G/N).
 *
 * The output format is: radio,mnc,lac,cellid,lon,lat
 *
 * Regenerate with: npm run towers
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve('openCell/510.csv');
const OUT = resolve('openCell/towers.min.csv');

const round4 = (n) => {
  const v = Math.round(n * 1e4) / 1e4;
  return Object.is(v, -0) ? '0' : String(v);
};

const lines = readFileSync(SRC, 'utf8').split('\n');
const out = [];
const seen = new Set();
let kept = 0;
let dropped = 0;
let duplicates = 0;

for (const line of lines) {
  if (!line) continue;
  const parts = line.split(',');
  const radio = parts[0];
  // OpenCelliD columns: radio,mcc,mnc,lac,cellid,psc,lon,lat,range,samples,...
  let radioCode = '';
  if (radio === 'LTE') radioCode = 'L';
  else if (radio === 'UMTS') radioCode = 'U';
  else if (radio === 'GSM') radioCode = 'G';
  else if (radio === 'NR') radioCode = 'N';
  else {
    dropped++;
    continue;
  }
  const mnc = parts[2];
  const lac = parts[3];
  const cellId = parts[4];
  const lon = parts[6];
  const lat = parts[7];
  if (!mnc || !cellId || !lon || !lat) {
    dropped++;
    continue;
  }
  const lonF = parseFloat(lon);
  const latF = parseFloat(lat);
  if (isNaN(lonF) || isNaN(latF)) {
    dropped++;
    continue;
  }
  const key = `${radioCode}|${mnc}|${cellId}`;
  if (seen.has(key)) {
    duplicates++;
    continue;
  }
  seen.add(key);
  out.push(`${radioCode},${mnc},${lac || '0'},${cellId},${round4(lonF)},${round4(latF)}`);
  kept++;
}

writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
const srcSize = (readFileSync(SRC).length / 1024 / 1024).toFixed(2);
const outSize = (readFileSync(OUT).length / 1024 / 1024).toFixed(2);
console.log(`towers: kept ${kept} (LTE+UMTS+GSM+NR), dropped ${dropped} (invalid), removed ${duplicates} duplicates`);
console.log(`openCell/510.csv        ${srcSize} MB -> openCell/towers.min.csv ${outSize} MB`);
