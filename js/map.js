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

// ─── HEATMAP ──────────────────────────────────
function renderHeatmap(data) {
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }

  var deathMap = countBy(data, r => (r[COL.province] || '').trim() || null);
  renderProvinceBorders(deathMap);

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
  if (pts.length > 0) {
    heatLayer = L.heatLayer(pts, MAP_CONFIG.heatOptions).addTo(map);
  }
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

  if (heatLayer) heatLayer.bringToFront();
}

// ─── PRIVATE HELPER ───────────────────────────
function getPropName(props) {
  return (props || {}).PROV_NAMT
      || (props || {}).name_th
      || (props || {}).NAME_TH
      || (props || {}).name
      || '';
}
