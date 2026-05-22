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
  .then(geo => { thaiGeoJSON = geo; renderProvinceBorders({}); })
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
  var deathMap = countBy(data, r => (r[COL.province] || '').trim() || null);
  renderProvinceBorders(deathMap);

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
}

// ─── HEAT LAYER ───────────────────────────────
function _clearHeat() {
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
}

function _renderHeat(data) {
  _clearHeat();
  var [latMin, latMax] = MAP_CONFIG.latBounds;
  var [lngMin, lngMax] = MAP_CONFIG.lngBounds;
  var pts = [];
  data.forEach(function(r) {
    var lat = parseFloat(r[COL.lat]);
    var lng = parseFloat(r[COL.lng]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax)
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

  var markers = [];
  var presentTypes = {};

  data.forEach(function(r) {
    var lat = parseFloat(r[COL.lat]);
    var lng = parseFloat(r[COL.lng]);
    if (isNaN(lat) || isNaN(lng) || lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) return;

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

  var values = Object.values(deathMap);
  var maxVal  = values.length ? Math.max(...values) : 1;

  function norm(s) {
    return String(s || '').trim().replace(/^จังหวัด/, '').replace(/\s+/g, '');
  }
  var normMap = {};
  Object.entries(deathMap).forEach(([k, v]) => { normMap[norm(k)] = v; });

  geoLayer = L.geoJSON(thaiGeoJSON, {
    style: function(f) {
      var raw   = getPropName(f.properties);
      var count = normMap[norm(raw)] || 0;
      var ratio = maxVal > 0 ? count / maxVal : 0;
      var r = Math.round(51  + (239 - 51)  * ratio);
      var g = Math.round(65  + (68  - 65)  * ratio * 0.1);
      var b = Math.round(85  + (68  - 85)  * ratio * 0.1);
      return {
        color:       'rgb(' + r + ',' + g + ',' + b + ')',
        weight:      0.5 + ratio * 3.5,
        opacity:     0.25 + ratio * 0.75,
        fillColor:   '#ef4444',
        fillOpacity: ratio * 0.12
      };
    },
    onEachFeature: function(f, layer) {
      var raw   = getPropName(f.properties);
      var count = deathMap[raw] || 0;
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
  return (props || {}).PROV_NAMT
      || (props || {}).name_th
      || (props || {}).NAME_TH
      || (props || {}).name
      || '';
}
