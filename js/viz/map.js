// ─── MAP INIT ─────────────────────────────────
const map = L.map('map', {
  center: MAP_CONFIG.center,
  zoom:   MAP_CONFIG.zoom,
  preferCanvas: true
});

L.tileLayer(MAP_CONFIG.tileUrl, {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// Load Thailand GeoJSON for province borders (non-blocking)
fetch(MAP_CONFIG.geoJsonUrl)
  .then(r => r.json())
  .then(geo => { thaiGeoJSON = geo; _buildProvPolygonMap(geo); renderProvinceBorders({}); })
  .catch(() => {});

// ─── MAP MODE TOGGLE ──────────────────────────
function setMapMode(mode) {
  mapMode = mode;
  document.getElementById('btnHeat').classList.toggle('active',      mode === 'heat');
  document.getElementById('btnHotspot').classList.toggle('active',   mode === 'hotspot');
  document.getElementById('btnHotspotAI').classList.toggle('active', mode === 'hotspotAI');

  if (mode === 'heat') {
    _clearHotspot();
    _renderHeat(filteredData);
  } else if (mode === 'hotspot') {
    _clearHeat();
    _renderHotspot(filteredData, COL.vehicle);
  } else {
    _clearHeat();
    _renderHotspot(filteredDataAI, COL.vehicleai);
  }
}

// ─── PUBLIC ENTRY (called by dashboard.js) ────
function renderHeatmap(data) {
  // Render dots first so filter changes are visible immediately
  if (mapMode === 'hotspot') {
    _clearHeat();
    _renderHotspot(data, COL.vehicle);
  } else if (mapMode === 'hotspotAI') {
    _clearHeat();
    _renderHotspot(filteredDataAI, COL.vehicleai);
  } else {
    _clearHotspot();
    _renderHeat(data);
  }

  // Province borders drawn after (non-blocking — won't delay dot render)
  var deathMap = countBy(data, r => (r[COL.province] || '').trim() || null);
  try { renderProvinceBorders(deathMap); } catch(e) { console.error('[borders]', e); }
}

// ─── PROVINCE POLYGON MAP ─────────────────────
function _normProv(s) {
  return String(s || '').trim()
    .replace(/^จังหวัด/, '')
    .replace(/^จ\./, '')
    .replace(/\s+/g, '');
}

function _buildProvPolygonMap(geo) {
  provPolygonMap = {};
  geo.features.forEach(function(f) {
    var name = getPropName(f.properties);
    if (!name) return;
    var key  = _normProv(name);
    var geom = f.geometry;
    var polys = [];
    if (geom.type === 'Polygon') {
      polys = [geom.coordinates];
    } else if (geom.type === 'MultiPolygon') {
      polys = geom.coordinates;
    }
    provPolygonMap[key] = polys;
  });
  console.log('[PIP] polygon map built:', Object.keys(provPolygonMap).length, 'provinces');
  console.log('[PIP] sample keys:', Object.keys(provPolygonMap).slice(0, 5));
}

// Ray-casting point-in-polygon (GeoJSON coords are [lng, lat])
function _pip(x, y, ring) {
  var inside = false;
  for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    var xi = ring[i][0], yi = ring[i][1];
    var xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// ─── PROVINCE BOUNDS CHECK (fast pre-filter) ──
function _inProvBounds(lat, lng, prov) {
  var b = PROV_BOUNDS[prov];
  if (!b) return true;
  return lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3];
}

// ─── GEOGRAPHIC CONSTRAIN TO SELECTED PROVINCES ──
// When province/region filter is active, only show dots whose coordinates
// actually fall inside the selected province polygons (accident coords ≠ death province).
function _buildEffectiveProvSet() {
  var regSet = (typeof msGet === 'function') ? msGet('region') : new Set();
  var pvSet  = (typeof msGet === 'function') ? msGet('prov')   : new Set();
  var eff = new Set();
  if (pvSet.size) {
    pvSet.forEach(function(p) { eff.add(p); });
  } else if (regSet.size) {
    regSet.forEach(function(reg) {
      (REGION_PROV[reg] || []).forEach(function(p) { eff.add(p); });
    });
  }
  return eff;
}

function _inSelectedPolygons(lat, lng, effSet) {
  if (!effSet.size) return true;  // no filter → allow all

  // Check if (lat, lng) falls within the bounding box of any selected province.
  // PROV_BOUNDS is a static lookup [latMin, latMax, lngMin, lngMax] — no GeoJSON needed.
  var found = false;
  effSet.forEach(function(prov) {
    if (found) return;
    var b = PROV_BOUNDS[_normProv(prov)];
    if (!b) { found = true; return; }  // no bounds for this province → allow through
    if (lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3]) found = true;
  });
  return found;
}

// ─── HEAT LAYER ───────────────────────────────
function _clearHeat() {
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
}

function _renderHeat(data) {
  _clearHeat();
  var [latMin, latMax] = MAP_CONFIG.latBounds;
  var [lngMin, lngMax] = MAP_CONFIG.lngBounds;
  var effSet = _buildEffectiveProvSet();
  console.log('[PIP] renderHeat effSet:', [...effSet], 'polygonMap size:', Object.keys(provPolygonMap).length);
  var pts = [];
  data.forEach(function(r) {
    var lat = parseFloat(r[COL.lat]);
    var lng = parseFloat(r[COL.lng]);
    if (isNaN(lat) || isNaN(lng) || lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) return;
    if (!_inSelectedPolygons(lat, lng, effSet)) return;
    pts.push([lat, lng, 1]);
  });
  document.getElementById('mapCount').textContent = pts.length.toLocaleString() + ' จุด';
  if (pts.length > 0) heatLayer = L.heatLayer(pts, MAP_CONFIG.heatOptions).addTo(map);
}

// ─── HOTSPOT LAYER (colored by vehicle type) ──
function _clearHotspot() {
  if (hotspotLayer)      { map.removeLayer(hotspotLayer);       hotspotLayer      = null; }
  if (hotspotLegendCtrl) { map.removeControl(hotspotLegendCtrl); hotspotLegendCtrl = null; }
}

function _renderHotspot(data, col) {
  _clearHotspot();
  var [latMin, latMax] = MAP_CONFIG.latBounds;
  var [lngMin, lngMax] = MAP_CONFIG.lngBounds;
  var effSet = _buildEffectiveProvSet();
  console.log('[PIP] renderHotspot effSet:', [...effSet], 'polygonMap size:', Object.keys(provPolygonMap).length);

  var markers = [];
  var presentTypes = {};

  data.forEach(function(r) {
    var lat = parseFloat(r[COL.lat]);
    var lng = parseFloat(r[COL.lng]);
    if (isNaN(lat) || isNaN(lng) || lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) return;
    if (!_inSelectedPolygons(lat, lng, effSet)) return;

    var veh   = normalizeVehicle(r[col]);
    var color = VEHICLE_COLOR_MAP[veh] || '#94a3b8';
    presentTypes[veh] = color;

    markers.push(
      L.circleMarker([lat, lng], {
        radius:      4,
        fillColor:   color,
        color:       'rgba(0,0,0,0.3)',
        weight:      0.5,
        fillOpacity: 0.75,
      }).bindTooltip(
        '<span style="font-family:Sarabun,sans-serif;font-size:12px;color:#f1f5f9">' + veh + '</span>',
        { sticky: true, opacity: 0.95, className: 'prov-tooltip' }
      )
    );
  });

  document.getElementById('mapCount').textContent = markers.length.toLocaleString() + ' จุด';
  hotspotLayer = L.layerGroup(markers).addTo(map);

  // ── In-map legend ──
  var HotspotLegend = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd: function() {
      var div = L.DomUtil.create('div', 'map-hotspot-legend');
      var entries = Object.entries(presentTypes)
        .sort(function(a, b) { return a[0].localeCompare(b[0], 'th'); });
      div.innerHTML =
        '<div class="mhl-title">ประเภทยานพาหนะ</div>' +
        entries.map(function(e) {
          return '<div class="mhl-row">' +
            '<span class="mhl-dot" style="background:' + e[1] + '"></span>' +
            '<span class="mhl-name">' + e[0] + '</span>' +
          '</div>';
        }).join('');
      return div;
    }
  });
  hotspotLegendCtrl = new HotspotLegend().addTo(map);
}

// ─── PROVINCE BORDERS ─────────────────────────
function renderProvinceBorders(deathMap) {
  if (!thaiGeoJSON) return;
  if (geoLayer) { map.removeLayer(geoLayer); geoLayer = null; }

  // Only show choropleth borders when a region or province filter is active
  var effSet   = _buildEffectiveProvSet();
  var hasFilter = effSet.size > 0;
  if (!hasFilter) return;

  var values = Object.values(deathMap);
  var maxVal  = values.length ? Math.max(...values) : 1;

  function norm(s) {
    return String(s || '').trim().replace(/^จังหวัด/, '').replace(/^จ\./, '').replace(/\s+/g, '');
  }
  var normMap = {};
  Object.entries(deathMap).forEach(([k, v]) => { normMap[norm(k)] = v; });

  geoLayer = L.geoJSON(thaiGeoJSON, {
    style: function(f) {
      var raw     = getPropName(f.properties);
      var normKey = norm(raw);
      var inSel   = effSet.size === 0 || (function() {
        var found = false;
        effSet.forEach(function(p) { if (norm(p) === normKey) found = true; });
        return found;
      })();

      if (!inSel) {
        return { color: '#1e293b', weight: 0.5, opacity: 0.3, fillOpacity: 0 };
      }
      var count = normMap[normKey] || 0;
      var ratio = maxVal > 0 ? count / maxVal : 0;
      var r = Math.round(51  + (239 - 51)  * ratio);
      var g = Math.round(65  + (68  - 65)  * ratio * 0.1);
      var b = Math.round(85  + (68  - 85)  * ratio * 0.1);
      return {
        color:       'rgb(' + r + ',' + g + ',' + b + ')',
        weight:      1.5 + ratio * 2.5,
        opacity:     0.6 + ratio * 0.4,
        fillColor:   '#ef4444',
        fillOpacity: ratio * 0.12
      };
    },
    onEachFeature: function(f, layer) {
      var raw   = getPropName(f.properties);
      var count = normMap[norm(raw)] || 0;
      layer.bindTooltip(
        '<div style="font-family:Sarabun,sans-serif;font-size:13px;color:#f1f5f9">' +
          '<b>' + raw + '</b><br/>' +
          'ผู้เสียชีวิต: <b style="color:#f97316">' + count.toLocaleString() + '</b> ราย' +
        '</div>',
        { sticky: true, opacity: 0.95, className: 'prov-tooltip' }
      );
    }
  }).addTo(map);

  if (heatLayer)    heatLayer.bringToFront();
  if (hotspotLayer) hotspotLayer.bringToFront();
}

// ─── PRIVATE HELPER ───────────────────────────
function getPropName(props) {
  var p = props || {};
  // Prefer known Thai-name fields; fall back to English NAME_1 via lookup table
  return p.PROV_NAMT || p.name_th || p.NAME_TH || p.name
      || (p.NAME_1 && GEOJSON_EN_TO_TH[p.NAME_1])
      || '';
}
