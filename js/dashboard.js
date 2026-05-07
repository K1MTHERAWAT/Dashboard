// ─── INIT ─────────────────────────────────────
function initDashboard(data) {
  filteredData = data;
  buildHierMap(data);
  populateProvFilter(data);
  populateVehicleFilter(data);
  populateYearFilter(data);
  buildDistrictFilter('');
  // date inputs start empty — flatpickr initialises with no date by default
  updateStatus(true, data.length);
  renderAll(data);
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
    var prov = (r[COL.hierProv]    || '').trim();
    var dist = (r[COL.district]    || '').trim();
    var sub  = (r[COL.subdistrict] || '').trim();
    if (!prov || !dist) return;
    if (!hierMap[prov])       hierMap[prov] = {};
    if (!hierMap[prov][dist]) hierMap[prov][dist] = new Set();
    if (sub) hierMap[prov][dist].add(sub);
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
  fillSelect('yearFilter', years);
}


function fillSelect(id, values) {
  var sel = document.getElementById(id);
  sel.innerHTML = '<option value="">ทั้งหมด</option>';
  values.forEach(function(v) {
    var o = document.createElement('option'); o.value = o.textContent = v; sel.appendChild(o);
  });
}
