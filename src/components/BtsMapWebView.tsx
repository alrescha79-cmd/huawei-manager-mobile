import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';
import { getLteBandLabel } from '@/utils/helpers';

export interface MapPoint {
    lat: number;
    lon: number;
}

export interface BtsMapInfo {
    eNodeB?: number;
    sectorId?: number;
    band?: string;
    rsrp?: string;
    distanceKm?: number;
    operator?: string;
    /** True when the marker is an estimate (same-site tower, guessed-TAC lookup). */
    estimated?: boolean;
}

export interface NearbyTowerPoint {
    lat: number;
    lon: number;
    cellId: number;
    eNodeB: number;
    radio?: 'LTE' | 'UMTS' | 'GSM' | 'NR';
    operator?: string;
    distanceKm?: number;
}

interface BtsMapWebViewProps {
    userLocation: MapPoint | null;
    btsLocation: MapPoint | null;
    btsInfo?: BtsMapInfo;
    nearbyTowers?: NearbyTowerPoint[];
    radiusMeters?: number;
    userHeading?: number | null;
    onZoomOut?: (center: { lat: number; lon: number }, zoom: number) => void;
}

const esc = (value: unknown): string =>
    String(value ?? '-')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

/** "±340 m from you" style label; '-' when the distance is unknown. */
const formatFromYou = (distanceKm: number | undefined, fromYou: string): string => {
    if (distanceKm === undefined) return '-';
    const value = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
    return `±${value} ${esc(fromYou)}`;
};

interface ThemeParams {
    isDark: boolean;
    bg: string;
    popupBg: string;
    text: string;
    textSecondary: string;
    primary: string;
    success: string;
    warning: string;
    error: string;
    barOff: string;
    tileUrl: string;
    modemFrameStroke: string;
    towerFrameStroke: string;
}

const buildHtml = (p: ThemeParams): string => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: ${p.bg}; }
  .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: ${p.popupBg}; color: ${p.text}; box-shadow: 0 4px 14px rgba(0,0,0,${p.isDark ? '0.5' : '0.15'}); }
  .leaflet-popup-content { font: 12px/1.5 system-ui, sans-serif; margin: 10px 12px; }
  .leaflet-container { background: ${p.bg}; }
  .bts-popup { min-width: 170px; }
  .bts-title { font-weight: 700; font-size: 13px; margin-bottom: 6px; color: ${p.primary}; }
  .bts-row { display: flex; justify-content: space-between; gap: 14px; margin-top: 4px; }
  .bts-row span { color: ${p.textSecondary}; }
  .bts-row b { color: ${p.text}; font-weight: 600; }
  .bts-bars { display: flex; align-items: flex-end; gap: 3px; height: 14px; margin: 7px 0 2px; }
  .bts-bars i { width: 6px; background: ${p.barOff}; border-radius: 1px; }
  .bts-bars i:nth-child(1){height:5px} .bts-bars i:nth-child(2){height:8px}
  .bts-bars i:nth-child(3){height:11px} .bts-bars i:nth-child(4){height:14px}
  .bts-bars i.on { background: ${p.success}; }
  .modem-marker-container { position: relative; width: 64px; height: 64px; margin-left: -17px; margin-top: -14px; display: flex; align-items: center; justify-content: center; }
  .modem-heading-beam { position: absolute; width: 64px; height: 64px; top: 0; left: 0; pointer-events: none; transform-origin: 32px 32px; transition: transform 0.15s ease-out; opacity: 0; }
  .modem-heading-beam.active { opacity: 1; }
  .modem-svg { position: relative; z-index: 2; }
  #offline-badge { position: absolute; top: 10px; right: 10px; z-index: 1000;
    background: ${p.isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.85)'}; color: ${p.warning}; font: 11px/1.4 system-ui, sans-serif;
    padding: 4px 8px; border-radius: 6px; border: 1px solid ${p.warning}40; display: none; }
</style>
</head>
<body>
<div id="map"></div>
<div id="offline-badge">Offline</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = null, userMarker = null, btsMarker = null, line = null, nearbyLayer = null, radiusCircle = null, lastFitKey = '', lastRadius = null, lastNearbyKey = '', offlineText = 'Offline';
  function updateOfflineBadge() {
    var b = document.getElementById('offline-badge');
    if (!b) return;
    b.textContent = offlineText;
    b.style.display = navigator.onLine ? 'none' : 'block';
  }
  window.addEventListener('online', updateOfflineBadge);
  window.addEventListener('offline', updateOfflineBadge);
  function modemIcon() {
    return L.divIcon({
      className: '', iconSize: [30, 36], iconAnchor: [15, 33],
      html: '<div class="modem-marker-container">' +
        '<div id="modem-beam" class="modem-heading-beam">' +
          '<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
            '<defs>' +
              '<linearGradient id="beam-grad" x1="0%" y1="100%" x2="0%" y2="0%">' +
                '<stop offset="0%" stop-color="${p.primary}" stop-opacity="0.05"/>' +
                '<stop offset="60%" stop-color="${p.primary}" stop-opacity="0.25"/>' +
                '<stop offset="100%" stop-color="${p.primary}" stop-opacity="0.75"/>' +
              '</linearGradient>' +
            '</defs>' +
            '<path d="M32 32 L14 4 A 32 32 0 0 1 50 4 Z" fill="url(#beam-grad)"/>' +
            '<path d="M32 32 L32 2" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" opacity="0.9"/>' +
          '</svg>' +
        '</div>' +
        '<svg class="modem-svg" width="30" height="36" viewBox="0 0 30 36" xmlns="http://www.w3.org/2000/svg">' +
          '<g stroke="${p.textSecondary}" stroke-width="1.8" stroke-linecap="round" fill="none">' +
          '<path d="M10 11 L7 3.5"/><path d="M20 11 L23 3.5"/></g>' +
          '<circle cx="7" cy="3" r="1.6" fill="${p.textSecondary}"/>' +
          '<circle cx="23" cy="3" r="1.6" fill="${p.textSecondary}"/>' +
          '<rect x="4" y="11" width="22" height="20" rx="3.5" fill="${p.isDark ? '#f6f8fb' : '#ffffff'}" stroke="${p.modemFrameStroke}" stroke-width="1.2"/>' +
          '<rect x="4" y="11" width="22" height="5.5" rx="3.5" fill="${p.isDark ? '#e8edf3' : '#f1f5f9'}"/>' +
          '<circle cx="8.5" cy="23.5" r="1.6" fill="${p.success}"/>' +
          '<circle cx="12.5" cy="23.5" r="1.6" fill="${p.success}"/>' +
          '<circle cx="16.5" cy="23.5" r="1.6" fill="${p.success}"/>' +
          '<circle cx="20.5" cy="23.5" r="1.6" fill="${p.warning}"/>' +
          '<path d="M9 28.5 l1.3 1.3 -1.3 1.3 M12 27 l1.6 1.6 -1.6 1.6" stroke="${p.primary}" stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
        '</svg>' +
      '</div>',
    });
  }
  function towerIcon() {
    return L.divIcon({
      className: '', iconSize: [34, 42], iconAnchor: [17, 40],
      html: '<svg width="34" height="42" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1px 5px ${p.primary}99)">' +
        '<g stroke="${p.towerFrameStroke}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
        '<line x1="5" y1="29" x2="10" y2="7.5"/><line x1="19" y1="29" x2="14" y2="7.5"/>' +
        '<line x1="5" y1="29" x2="19" y2="29"/>' +
        '<line x1="6.2" y1="24" x2="17.8" y2="24"/>' +
        '<line x1="7.4" y1="19" x2="16.6" y2="19"/>' +
        '<line x1="8.6" y1="14" x2="15.4" y2="14"/>' +
        '<line x1="6.2" y1="24" x2="16.6" y2="19"/>' +
        '<line x1="7.4" y1="19" x2="15.4" y2="14"/>' +
        '</g>' +
        '<line x1="12" y1="7.5" x2="12" y2="3" stroke="${p.towerFrameStroke}" stroke-width="1.4"/>' +
        '<g fill="${p.primary}">' +
        '<rect x="8.8" y="8.2" width="6.4" height="3.8" rx="0.9"/>' +
        '<rect x="8" y="12.8" width="2.8" height="3.6" rx="0.9"/>' +
        '<rect x="13.2" y="12.8" width="2.8" height="3.6" rx="0.9"/>' +
        '</g>' +
        '<circle cx="12" cy="2.2" r="2.1" fill="${p.primary}55"/>' +
        '<circle cx="12" cy="2.2" r="1" fill="${p.primary}"/>' +
      '</svg>',
    });
  }
  function smallTowerIcon() {
    return L.divIcon({
      className: '', iconSize: [24, 30], iconAnchor: [12, 29],
      html: '<svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">' +
        '<g stroke="${p.textSecondary}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
        '<line x1="5" y1="29" x2="10" y2="7.5"/><line x1="19" y1="29" x2="14" y2="7.5"/>' +
        '<line x1="5" y1="29" x2="19" y2="29"/>' +
        '<line x1="6.2" y1="24" x2="17.8" y2="24"/>' +
        '<line x1="7.4" y1="19" x2="16.6" y2="19"/>' +
        '<line x1="8.6" y1="14" x2="15.4" y2="14"/>' +
        '<line x1="6.2" y1="24" x2="16.6" y2="19"/>' +
        '<line x1="7.4" y1="19" x2="15.4" y2="14"/>' +
        '</g>' +
        '<line x1="12" y1="7.5" x2="12" y2="3" stroke="${p.textSecondary}" stroke-width="1.2"/>' +
        '<g fill="${p.textSecondary}">' +
        '<rect x="8.8" y="8.2" width="6.4" height="3.8" rx="0.9"/>' +
        '<rect x="8" y="12.8" width="2.8" height="3.6" rx="0.9"/>' +
        '<rect x="13.2" y="12.8" width="2.8" height="3.6" rx="0.9"/>' +
        '</g>' +
        '<circle cx="12" cy="2.2" r="1" fill="${p.primary}"/>' +
      '</svg>',
    });
  }
  function initMap() {
    if (map) return;
    map = L.map('map', { zoomControl: true, attributionControl: false }).setView([-6.2, 106.816], 6);
    L.tileLayer('${p.tileUrl}', { maxZoom: 19 }).addTo(map);
    userMarker = L.marker([-6.2, 106.816], { icon: modemIcon() }).addTo(map);
    btsMarker = L.marker([-6.2, 106.816], { icon: towerIcon() }).addTo(map);
    line = L.polyline([], { color: '${p.primary}', dashArray: '6,8', weight: 2, opacity: 0.9 }).addTo(map);
    map.on('zoomend', function() {
      var z = map.getZoom();
      var c = map.getCenter();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'zoom_change',
          zoom: z,
          center: { lat: c.lat, lon: c.lng }
        }));
      }
    });
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
  }
  function ensureRadiusGradient() {
    var svg = map.getPane('overlayPane').querySelector('svg');
    if (!svg || document.getElementById('radius-grad')) return;
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var grad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    grad.setAttribute('id', 'radius-grad');
    [[0, 0.35], [0.55, 0.14], [0.85, 0.05], [1, 0]].forEach(function (s) {
      var stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop.setAttribute('offset', s[0] * 100 + '%');
      stop.setAttribute('stop-color', '${p.primary}');
      stop.setAttribute('stop-opacity', s[1]);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
    svg.appendChild(defs);
  }
  function addRadiusCircle(user, meters) {
    if (radiusCircle) map.removeLayer(radiusCircle);
    radiusCircle = L.circle([user.lat, user.lon], {
      radius: meters || 20000,
      stroke: true, color: '${p.primary}', weight: 1, opacity: 0.6, dashArray: '4,8', fill: false,
    }).addTo(map);
    ensureRadiusGradient();
    radiusCircle._path.setAttribute('fill', 'url(#radius-grad)');
  }
  function updateMap(p) {
    initMap();
    if (!map || !p) return;
    offlineText = p.offlineLabel || offlineText;
    updateOfflineBadge();
    var user = p.user, bts = p.bts, pts = [];
    var nearbyKey = JSON.stringify(p.nearby || []);
    if (nearbyKey !== lastNearbyKey) {
      if (nearbyLayer) map.removeLayer(nearbyLayer);
      nearbyLayer = L.layerGroup([]).addTo(map);
      (p.nearby || []).forEach(function (t) {
        L.marker([t.lat, t.lon], { icon: smallTowerIcon() })
          .addTo(nearbyLayer)
          .bindPopup(t.popup);
      });
      lastNearbyKey = nearbyKey;
    }
    if (user) {
      var radius = p.radiusMeters || 20000;
      if (radius !== lastRadius) {
        addRadiusCircle(user, radius);
        lastRadius = radius;
      }
      userMarker.setLatLng([user.lat, user.lon]);
      userMarker.setPopupContent(p.userPopup || 'User');
      pts.push([user.lat, user.lon]);
    }
    if (bts) {
      btsMarker.setLatLng([bts.lat, bts.lon]);
      btsMarker.setPopupContent(p.btsPopup || 'BTS');
      pts.push([bts.lat, bts.lon]);
    }
    line.setLatLngs(pts);
    if (user) {
      var fitKey = user.lat.toFixed(5) + ',' + user.lon.toFixed(5) + ':' + (p.radiusMeters || 20000);
      if (fitKey !== lastFitKey) {
        map.setView([user.lat, user.lon], 14, { animate: false });
        lastFitKey = fitKey;
      }
    }
  }
  function updateHeading(deg) {
    var beam = document.getElementById('modem-beam');
    if (!beam) return;
    if (typeof deg === 'number' && !isNaN(deg) && deg >= 0) {
      beam.classList.add('active');
      beam.style.transform = 'rotate(' + deg + 'deg)';
    } else {
      beam.classList.remove('active');
    }
  }
  try {
    if (navigator.onLine) initMap();
  } catch (e) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('error:' + (e && e.message));
  }
  window.addEventListener('online', function () {
    if (!map && typeof L === 'undefined') {
      window.location.reload();
    } else if (!map) {
      try { initMap(); } catch (e) {}
    }
  });
</script>
</body>
</html>
`;

export function BtsMapWebView({ userLocation, btsLocation, btsInfo, nearbyTowers, radiusMeters, userHeading, onZoomOut }: BtsMapWebViewProps) {
    const { colors, isDark } = useTheme();
    const webRef = useRef<WebView>(null);
    const [ready, setReady] = useState(false);
    const [webError, setWebError] = useState<string | null>(null);

    const themeParams: ThemeParams = useMemo(
        () => ({
            isDark,
            bg: colors.background,
            popupBg: isDark ? '#1c1c22' : '#ffffff',
            text: colors.text,
            textSecondary: colors.textSecondary,
            primary: colors.primary,
            success: colors.success,
            warning: colors.warning,
            error: colors.error,
            barOff: isDark ? '#3a3a44' : '#cbd5e1',
            tileUrl: isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            modemFrameStroke: isDark ? '#8a95a5' : '#cbd5e1',
            towerFrameStroke: isDark ? '#ffffff' : '#0f172a',
        }),
        [isDark, colors]
    );

    const html = useMemo(() => buildHtml(themeParams), [themeParams]);
    const { t } = useTranslation();
    const tRef = useRef(t);
    tRef.current = t;

    const payload = useMemo(() => {
        const user = userLocation ? { lat: userLocation.lat, lon: userLocation.lon } : null;
        const bts = btsLocation ? { lat: btsLocation.lat, lon: btsLocation.lon } : null;
        const nearby = (nearbyTowers || []).map((t) => {
            const operatorLabel = esc(tRef.current('bts.operator'));
            const networkLabel = esc(tRef.current('bts.network'));
            const distanceLabel = esc(tRef.current('bts.distance'));
            const operator = esc(t.operator || '-');
            let network = esc(tRef.current('bts.networkLte'));
            if (t.radio === 'UMTS') network = esc(tRef.current('bts.networkUmts'));
            else if (t.radio === 'GSM') network = esc(tRef.current('bts.networkGsm'));
            else if (t.radio === 'NR') network = esc(tRef.current('bts.networkNr'));
            const dist = formatFromYou(t.distanceKm, tRef.current('bts.fromYou'));
            return {
                lat: t.lat,
                lon: t.lon,
                cellId: t.cellId,
                eNodeB: t.eNodeB,
                popup: `
                <div class="bts-popup">
                  <div class="bts-title">${esc(tRef.current('bts.nearbyTitle'))}</div>
                  <div class="bts-row"><span>${operatorLabel}</span><b>${operator}</b></div>
                  <div class="bts-row"><span>${networkLabel}</span><b>${network}</b></div>
                  <div class="bts-row"><span>${distanceLabel}</span><b>${dist}</b></div>
                </div>`,
            };
        });

        const rsrp = Number(btsInfo?.rsrp);
        let quality: string;
        let bars: number;
        if (Number.isFinite(rsrp)) {
            if (rsrp >= -90) {
                quality = tRef.current('bts.signalExcellent');
                bars = 4;
            } else if (rsrp >= -105) {
                quality = tRef.current('bts.signalGood');
                bars = 3;
            } else if (rsrp >= -120) {
                quality = tRef.current('bts.signalFair');
                bars = 2;
            } else {
                quality = tRef.current('bts.signalPoor');
                bars = 1;
            }
        } else {
            quality = '-';
            bars = 0;
        }

        const distanceKm = btsInfo?.distanceKm;
        const distanceLabel = formatFromYou(distanceKm, tRef.current('bts.fromYou'));

        const signalBars = [0, 1, 2, 3].map((i) => `<i${i < bars ? ' class="on"' : ''}></i>`).join('');
        const bandLabel = esc(getLteBandLabel(btsInfo?.band));
        const operator = esc(btsInfo?.operator);
        // Only render the operator row when the modem actually reported a name.
        const operatorRow =
            operator && operator !== '-' ? `<div class="bts-row"><span>${esc(tRef.current('bts.operator'))}</span><b>${operator}</b></div>` : '';
        // (≈) marks an estimated marker, mirroring the '±' on the distance label.
        const titleSuffix = btsInfo?.estimated ? ' (≈)' : '';

        return {
            user,
            bts,
            nearby,
            radiusMeters: radiusMeters ?? 20000,
            userPopup: 'You',
            offlineLabel: tRef.current('bts.offline'),
            btsPopup: `
                <div class="bts-popup">
                  <div class="bts-title">${esc(tRef.current('bts.popupTitle'))}${titleSuffix}</div>
                  ${operatorRow}
                  <div class="bts-row"><span>${esc(tRef.current('bts.distance'))}</span><b>${distanceLabel}</b></div>
                  <div class="bts-bars">${signalBars}</div>
                  <div class="bts-row"><span>${esc(tRef.current('bts.signal'))}</span><b>${bars ? `${esc(btsInfo?.rsrp)} dBm · ${esc(quality)}` : '-'}</b></div>
                  <div class="bts-row"><span>${esc(tRef.current('bts.network'))}</span><b>${esc(tRef.current('bts.networkLte'))}${bandLabel !== '-' ? ` · ${bandLabel}` : ''}</b></div>
                  <div class="bts-row"><span>${esc(tRef.current('bts.towerId'))}</span><b>${esc(btsInfo?.eNodeB) || '-'} · S${esc(btsInfo?.sectorId) || '-'}</b></div>
                </div>`,
        };
    }, [userLocation, btsLocation, btsInfo, nearbyTowers, radiusMeters]);

    const push = useCallback((p: typeof payload) => {
        webRef.current?.injectJavaScript(`updateMap(${JSON.stringify(p)});true;`);
    }, []);

    useEffect(() => {
        if (ready) push(payload);
    }, [ready, push, payload]);

    useEffect(() => {
        if (ready) {
            const deg = typeof userHeading === 'number' && !isNaN(userHeading) ? Math.round(userHeading) : null;
            webRef.current?.injectJavaScript(`updateHeading(${deg !== null ? deg : 'null'});true;`);
        }
    }, [ready, userHeading]);

    return (
        <View style={styles.container}>
            <WebView
                ref={webRef}
                originWhitelist={['*']}
                source={{ html }}
                javaScriptEnabled
                domStorageEnabled
                style={[styles.webview, { backgroundColor: colors.background }]}
                onLoadEnd={() => {
                    setReady(true);
                }}
                onMessage={(event) => {
                    const data = event.nativeEvent.data;
                    if (data === 'ready') setReady(true);
                    else if (typeof data === 'string' && data.startsWith('error:')) {
                        setWebError(data);
                    } else if (typeof data === 'string' && data.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.type === 'zoom_change' && onZoomOut) {
                                onZoomOut(parsed.center, parsed.zoom);
                            }
                        } catch {
                            // ignore json parse error
                        }
                    }
                }}
                onError={() => setWebError('webview-error')}
                onHttpError={() => setWebError('webview-http-error')}
            />
            {webError && (
                <View style={[styles.errorOverlay, { backgroundColor: colors.background + 'D9' }]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{webError}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    errorText: {
        fontSize: 13,
        textAlign: 'center',
    },
});
