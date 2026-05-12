// ─── INIT ─────────────────────────────────────
function initDashboard(data) {
  filteredData = data;
  buildHierMap(data);
  populateProvFilter(data);
  populateVehicleFilter(data);
  populateYearFilter(data);
  buildDistrictFilter('');
  updateStatus(true, data.length);
  renderAll(data);
  setTimeout(function() { map.invalidateSize(); }, 100);
}

// ─── RENDER ALL PANELS ────────────────────────
function renderAll(data) {
  updateStats(data);
  renderHeatmap(data);
  renderPie(data);
  renderTimeSeries(rawData);  // Time Series แสดงข้อมูลทั้งหมดเสมอ ไม่ถูก filter
  renderBar(data);
}

// ─── STATS CARDS ──────────────────────────────
function updateStats(data) {
  document.getElementById('statTotal').textContent = data.length.toLocaleString();

  var provMap = countBy(data, r => r[COL.province] || null);
  var topProv = Object.entries(provMap).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('statTopProv').textContent = topProv ? topProv[0] : '—';

  var vMap    = countBy(data, r => r[COL.vehicle] || null);
  var sortedV = Object.entries(vMap).sort((a, b) => b[1] - a[1]);
  var topV    = sortedV.find(([n]) => n.trim() !== 'ไม่ระบุพาหนะ') || sortedV[0];
  document.getElementById('statTopVehicle').textContent = topV ? topV[0] : '—';
}

// ─── PRIVATE HELPERS ──────────────────────────
function buildHierMap(data) {
  hierMap = {};
  data.forEach(function(r) {
    var dist = (r[COL.district]    || '').trim();
    var sub  = (r[COL.subdistrict] || '').trim();
    if (!dist) return;
    if (!hierMap[dist]) hierMap[dist] = new Set();
    if (sub) hierMap[dist].add(sub);
  });
}

function populateProvFilter(data) {
  var provs = [...new Set(data.map(r => r[COL.province]).filter(Boolean))].sort();
  fillSelect('provFilter', provs);
}

function populateVehicleFilter(data) {
  var vehs = [...new Set(data.map(r => r[COL.vehicle]).filter(Boolean))].sort();
  fillSelect('vehicleFilter', vehs);
}

function populateYearFilter(data) {
  var years = [...new Set(
    data.map(r => { var d = parseDate(r[COL.date]); return d ? d.getFullYear() : null; }).filter(Boolean)
  )].sort();
  var sel = document.getElementById('yearFilter');
  sel.innerHTML = '<option value="">ทั้งหมด</option>';
  years.forEach(function(y) {
    var o = document.createElement('option');
    o.value = y;
    o.textContent = y + 543;
    sel.appendChild(o);
  });
}


function fillSelect(id, values) {
  var sel = document.getElementById(id);
  sel.innerHTML = '<option value="">ทั้งหมด</option>';
  values.forEach(function(v) {
    var o = document.createElement('option'); o.value = o.textContent = v; sel.appendChild(o);
  });
}
