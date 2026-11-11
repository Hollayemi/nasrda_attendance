import { forwardRef, type ComponentRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { BASE_URL } from '@/lib/api';
import { colors } from '@/theme';

/**
 * OpenStreetMap (Leaflet) map inside a WebView. No Google Maps SDK and no API key, so it behaves
 * the same in Expo Go, development builds and release APKs.
 *
 * The page is loaded once. Everything after that (shapes, handles, camera moves) is pushed into
 * it with injectJavaScript, and taps / drags come back through postMessage.
 *
 * Tiles: OpenStreetMap standard tiles, or Esri World Imagery for the satellite view. OSM's public
 * tile server is meant for light use (a few admins editing boundaries is fine). For heavy use,
 * point TILES.street at a tile provider or your own tile server.
 */

export type MapPt = [number, number]; // [latitude, longitude]
export type MapShape = { id: string; points: MapPt[]; color: string; fill: string; fillOpacity: number; weight: number };
export type MapScene = {
  /** Polygons to draw (2 points are drawn as a line while a boundary is being started). */
  shapes: MapShape[];
  /** Numbered, draggable vertex handles for the shape being edited. */
  handles: MapPt[];
  satellite: boolean;
};
export type MapPadding = { top: number; right: number; bottom: number; left: number };
export type OsmMapHandle = {
  fitTo: (points: MapPt[], padding?: MapPadding) => void;
  flyTo: (point: MapPt, zoom?: number) => void;
};

type Props = {
  center: MapPt;
  zoom?: number;
  /** Points to frame on first load (e.g. the campus boundary). Falls back to center + zoom. */
  initialFit?: MapPt[];
  scene: MapScene;
  onTap?: (point: MapPt) => void;
  onMovePoint?: (index: number, point: MapPt) => void;
  style?: StyleProp<ViewStyle>;
};

const TILES = {
  street: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxNativeZoom: 19 },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics', maxNativeZoom: 18 },
};

const LEAFLET_VERSION = '1.9.4';

const HTML = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="referrer" content="origin-when-cross-origin">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.css">
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #e8ecf3; }
  body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  /* keep the (required) attribution visible below the app's round toggle button */
  .leaflet-top.leaflet-right .leaflet-control-attribution { margin-top: 64px; margin-right: 6px; font-size: 10px; }
  .pin { width: 28px; height: 28px; border-radius: 14px; background: ${colors.navy}; border: 3px solid #fff; color: #fff;
         font: 800 11px/22px -apple-system, Roboto, sans-serif; text-align: center; box-sizing: border-box;
         box-shadow: 0 1px 5px rgba(0,0,0,.45); }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.min.js"></script>
<script>
(function () {
  var TILES = ${JSON.stringify(TILES)};
  function post(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  if (typeof L === 'undefined') { post({ t: 'error' }); return; }

  var map = L.map('map', { zoomControl: false, attributionControl: false, zoomSnap: 0.5 }).setView([9.0765, 7.3986], 17);
  L.control.attribution({ position: 'topright', prefix: false }).addTo(map);
  var base = null, baseKind = null, layer = L.layerGroup().addTo(map);

  function setBase(kind) {
    if (kind === baseKind) return;
    if (base) map.removeLayer(base);
    var t = TILES[kind];
    base = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: 20, maxNativeZoom: t.maxNativeZoom }).addTo(map);
    baseKind = kind;
  }
  function pin(n) { return L.divIcon({ className: '', html: '<div class="pin">' + n + '</div>', iconSize: [28, 28], iconAnchor: [14, 14] }); }

  window.setScene = function (s) {
    setBase(s.satellite ? 'satellite' : 'street');
    layer.clearLayers();
    s.shapes.forEach(function (sh) {
      if (sh.points.length >= 3) L.polygon(sh.points, { color: sh.color, weight: sh.weight, fillColor: sh.fill, fillOpacity: sh.fillOpacity, interactive: false }).addTo(layer);
      else if (sh.points.length === 2) L.polyline(sh.points, { color: sh.color, weight: sh.weight, interactive: false }).addTo(layer);
    });
    s.handles.forEach(function (p, i) {
      var m = L.marker(p, { draggable: true, icon: pin(i + 1), keyboard: false }).addTo(layer);
      m.on('dragend', function () { var ll = m.getLatLng(); post({ t: 'move', i: i, p: [ll.lat, ll.lng] }); });
    });
  };

  function pad(p) { p = p || {}; return { tl: [p.left || 40, p.top || 40], br: [p.right || 40, p.bottom || 40] }; }
  window.cmd = function (c) {
    if (c.k === 'init') {
      if (c.fit && c.fit.length) map.fitBounds(L.latLngBounds(c.fit), { paddingTopLeft: [40, 40], paddingBottomRight: [40, 40], maxZoom: 19, animate: false });
      else map.setView(c.center, c.zoom, { animate: false });
    } else if (c.k === 'fit' && c.pts.length) {
      var p = pad(c.pad);
      map.fitBounds(L.latLngBounds(c.pts), { paddingTopLeft: p.tl, paddingBottomRight: p.br, maxZoom: 19, animate: true });
    } else if (c.k === 'fly') {
      map.flyTo(c.pt, c.zoom, { duration: 0.5 });
    } else if (c.k === 'size') {
      map.invalidateSize();
    }
  };

  map.on('click', function (e) { post({ t: 'tap', p: [e.latlng.lat, e.latlng.lng] }); });
  post({ t: 'ready' });
})();
</script>
</body></html>`;

export const OsmMap = forwardRef<OsmMapHandle, Props>(function OsmMap(props, ref) {
  const { center, zoom = 17, initialFit, scene, style } = props;
  const web = useRef<ComponentRef<typeof WebView>>(null);
  const ready = useRef(false);
  const queue = useRef<string[]>([]);
  const latest = useRef(props);
  latest.current = props;
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const run = useCallback((js: string) => {
    if (ready.current) web.current?.injectJavaScript(`${js};true;`);
    else queue.current.push(js);
  }, []);
  const cmd = useCallback((c: object) => run(`window.cmd(${JSON.stringify(c)})`), [run]);

  useImperativeHandle(ref, () => ({
    fitTo: (pts, pad) => cmd({ k: 'fit', pts, pad }),
    flyTo: (pt, z = 17) => cmd({ k: 'fly', pt, zoom: z }),
  }), [cmd]);

  // Push the scene whenever it changes.
  useEffect(() => { run(`window.setScene(${JSON.stringify(scene)})`); }, [scene, run]);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: any;
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.t === 'ready') {
      ready.current = true;
      const { center: c, zoom: z, initialFit: fit, scene: s } = latest.current;
      const js = [`window.cmd(${JSON.stringify({ k: 'init', center: c, zoom: z ?? 17, fit: fit ?? [] })})`, `window.setScene(${JSON.stringify(s)})`, ...queue.current];
      queue.current = [];
      web.current?.injectJavaScript(`${js.join(';')};true;`);
      setLoading(false); setFailed(false);
    } else if (m.t === 'tap') latest.current.onTap?.(m.p as MapPt);
    else if (m.t === 'move') latest.current.onMovePoint?.(m.i as number, m.p as MapPt);
    else if (m.t === 'error') { setFailed(true); setLoading(false); }
  };

  const retry = () => { ready.current = false; setFailed(false); setLoading(true); setAttempt((n) => n + 1); };

  return (
    <View style={[{ flex: 1, backgroundColor: '#e8ecf3' }, style]} onLayout={() => cmd({ k: 'size' })}>
      <WebView
        key={attempt}
        ref={web}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        // baseUrl gives the page a real https origin, so tile servers receive a Referer (OSM requires one).
        source={{ html: HTML, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="never"
        bounces={false}
        overScrollMode="never"
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        onMessage={onMessage}
        onError={() => { setFailed(true); setLoading(false); }}
        onHttpError={() => { setFailed(true); setLoading(false); }}
      />
      {loading ? (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : null}
      {failed ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F6FA', paddingHorizontal: 32 }}>
          <Text style={{ textAlign: 'center', color: colors.ink, fontWeight: '700', marginBottom: 6 }}>The map could not load</Text>
          <Text style={{ textAlign: 'center', color: colors.muted, marginBottom: 14 }}>Check your internet connection and try again.</Text>
          <Pressable onPress={retry} style={{ backgroundColor: colors.navy, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});