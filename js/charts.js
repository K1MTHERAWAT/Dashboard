// ─── SHARED CHART DEFAULTS ────────────────────
const FONT = { family: 'Sarabun', size: 11 };

// ─── VEHICLE LABEL NORMALIZER ─────────────────
// Repair encoding artifacts then map to canonical names.
const VEHICLE_PATTERNS = [
  [/จักรยานยนต์|จักรยา.{0,3}ยนต์|.{0,2}จักรยานยนต์/, 'รถจักรยานยนต์'],
  [/ไม่.{0,3}บุพาหนะ|ไม่ระบุพาหนะ/,                   'ไม่ระบุพาหนะ'],
  [/รถยนต์/,                                             'รถยนต์'],
  [/คนเดินเท้า/,                                         'คนเดินเท้า'],
  [/บรรทุกขนาดเล็ก|บรรทุก.{0,4}เล็ก|เล็ก.{0,3}รถตู้/, 'รถบรรทุกขนาดเล็ก/รถตู้'],
  [/บรรทุกหนัก/,                                         'รถบรรทุกหนัก'],
  [/โดยสาร/,                                             'รถโดยสาร'],
  [/เพื่อการเกษตร/,                                      'รถเพื่อการเกษตร'],
  [/สามล้อ/,                                             'สามล้อ'],
];
function normalizeVehicle(v) {
  v = (v || '').replace(/�/g, '').trim();
  if (!v) return 'ไม่ระบุ';
  for (var i = 0; i < VEHICLE_PATTERNS.length; i++) {
    if (VEHICLE_PATTERNS[i][0].test(v)) return VEHICLE_PATTERNS[i][1];
  }
  return v;
}

// ─── PIE / DOUGHNUT ───────────────────────────
function renderPieSingle(data, col, canvasId, legendId, colorMap) {
  var vMap   = countBy(data, r => normalizeVehicle(r[col]));
  var sorted = Object.entries(vMap).sort((a, b) => b[1] - a[1]);
  var top    = sorted.slice(0, 10);

  var othersSum = sorted.slice(10).reduce((s, [, v]) => s + v, 0);
  if (othersSum > 0) top.push(['อื่นๆ', othersSum]);

  var labels = top.map(x => x[0]);
  var vals   = top.map(x => x[1]);
  var colors = labels.map(l => colorMap[l] || '#888888');
  var total  = vals.reduce((a, b) => a + b, 0);

  var chart = new Chart(document.getElementById(canvasId), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: vals, backgroundColor: colors, borderColor: '#111827', borderWidth: 2, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw.toLocaleString()} ราย (${((ctx.raw / total) * 100).toFixed(1)}%)`
          }
        }
      }
    }
  });

  document.getElementById(legendId).innerHTML = labels.map((l, i) =>
    `<div class="legend-item">` +
      `<div class="legend-color" style="background:${colors[i]}"></div>` +
      `<span class="legend-name">${l}</span>` +
      `<span class="legend-count">${vals[i].toLocaleString()}</span>` +
      `<span class="legend-pct">${((vals[i] / total) * 100).toFixed(1)}%</span>` +
    `</div>`
  ).join('');

  return chart;
}

function renderPie(data) {
  if (pieChart)  pieChart.destroy();
  if (pieChart2) pieChart2.destroy();

  // Build a shared label→color map so the same category gets the same color in both charts.
  // Assign colors in order of frequency from the first (Final) column.
  var seedMap = countBy(data, r => normalizeVehicle(r[COL.vehicle]));
  var seedOrder = Object.keys(seedMap).sort((a, b) => seedMap[b] - seedMap[a]);
  var colorMap = {};
  var ci = 0;
  seedOrder.forEach(function(l) { colorMap[l] = COLORS[ci++]; });
  // Any label that only appears in the AI column gets the next available color
  var aiLabels = Object.keys(countBy(data, r => normalizeVehicle(r[COL.vehicleai])));
  aiLabels.forEach(function(l) { if (!colorMap[l]) colorMap[l] = COLORS[ci++ % COLORS.length]; });
  colorMap['อื่นๆ'] = colorMap['อื่นๆ'] || COLORS[ci % COLORS.length];

  pieChart  = renderPieSingle(data, COL.vehicle,   'pieChart',  'pieLegend',  colorMap);
  pieChart2 = renderPieSingle(data, COL.vehicleai, 'pieChart2', 'pieLegend2', colorMap);
}

// ─── TIME SERIES ──────────────────────────────
function setTsMode(mode) {
  tsMode = mode;
  document.getElementById('btnYearly').classList.toggle('active',  mode === 'yearly');
  document.getElementById('btnMonthly').classList.toggle('active', mode === 'monthly');
  document.getElementById('btnDaily').classList.toggle('active',   mode === 'daily');
  document.getElementById('tsYearSel').style.display  = mode === 'monthly' ? 'block' : 'none';
  document.getElementById('tsMonthSel').style.display = mode === 'daily'   ? 'block' : 'none';
  renderTimeSeries(tsCurrentData);
}

// Populate year selector (used by monthly mode) — years present in data, displayed as พ.ศ.
function populateTsYears(data) {
  var years = [...new Set(
    data.map(r => { var d = parseDate(r[COL.date]); return d ? d.getFullYear() : null; }).filter(Boolean)
  )].sort();

  var sel  = document.getElementById('tsYearSel');
  var prev = sel.value;

  sel.innerHTML = '<option value="">-- ทุกปี --</option>';
  years.forEach(function(y) {
    var o = document.createElement('option');
    o.value = y;
    o.textContent = y + 543;       // display as Thai Buddhist Era year
    sel.appendChild(o);
  });
  if (prev && years.map(String).includes(String(prev))) sel.value = prev;
  sel.onchange = function() { renderTimeSeries(tsCurrentData); };
}

// Populate month selector (used by daily mode)
function populateTsMonths(data) {
  var months = [...new Set(
    data.map(r => {
      var d = parseDate(r[COL.date]); if (!d) return null;
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }).filter(Boolean)
  )].sort();

  var sel  = document.getElementById('tsMonthSel');
  var prev = sel.value;
  var thM  = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  sel.innerHTML = '<option value="">-- เลือกเดือน --</option>';
  months.forEach(function(m) {
    var o = document.createElement('option');
    o.value = m;
    var pts = m.split('-');
    o.textContent = thM[parseInt(pts[1]) - 1] + ' ' + (parseInt(pts[0]) + 543);
    sel.appendChild(o);
  });
  if (prev && months.includes(prev)) sel.value = prev;
  sel.onchange = function() { renderTimeSeries(tsCurrentData); };
}

function renderTimeSeries(data) {
  tsCurrentData = data;
  populateTsYears(data);
  populateTsMonths(data);

  var labels, vals, color;

  if (tsMode === 'yearly') {
    var yearMap = {};
    data.forEach(function(r) {
      var d = parseDate(r[COL.date]); if (!d) return;
      var key = String(d.getFullYear());
      yearMap[key] = (yearMap[key] || 0) + 1;
    });
    labels = Object.keys(yearMap).sort();
    vals   = labels.map(k => yearMap[k]);
    color  = '#a78bfa';

  } else if (tsMode === 'daily') {
    var selMonth = document.getElementById('tsMonthSel').value;
    var dayMap   = {};
    data.forEach(function(r) {
      var d = parseDate(r[COL.date]); if (!d) return;
      var mKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (selMonth && mKey !== selMonth) return;
      var dKey = String(d.getDate()).padStart(2, '0');
      dayMap[dKey] = (dayMap[dKey] || 0) + 1;
    });
    labels = Object.keys(dayMap).sort();
    vals   = labels.map(k => dayMap[k]);
    color  = '#22d3ee';

  } else {
    // monthly — filter by selected year if any
    var selYear = document.getElementById('tsYearSel').value;
    var monthMap = {};
    data.forEach(function(r) {
      var d = parseDate(r[COL.date]); if (!d) return;
      if (selYear && d.getFullYear() !== parseInt(selYear)) return;
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      monthMap[key] = (monthMap[key] || 0) + 1;
    });
    labels = Object.keys(monthMap).sort();
    vals   = labels.map(k => monthMap[k]);
    color  = '#facc15';
  }

  if (tsChart) tsChart.destroy();
  tsChart = new Chart(document.getElementById('tsChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'จำนวน', data: vals,
        borderColor:     color,
        backgroundColor: color + '18',
        fill: true, tension: 0.4,
        pointRadius: labels.length < 50 ? 4 : 0,
        pointBackgroundColor: color,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { ticks: { color: TICK_COLOR, font: FONT, maxTicksLimit: 31 }, grid: { color: GRID_COLOR } },
        y: { ticks: { color: TICK_COLOR, font: FONT },                     grid: { color: GRID_COLOR } }
      }
    }
  });
}

// ─── BAR CHART ────────────────────────────────
function renderBar(data) {
  var pMap   = countBy(data, r => (r[COL.province] || '').trim() || null);
  var sorted = Object.entries(pMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
  var labels = sorted.map(x => x[0]);
  var vals   = sorted.map(x => x[1]);
  var colors = vals.map((v, i) => `rgba(${Math.round(239 - i * 8)},${Math.round(68 + i * 6)},68,0.85)`);

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'ผู้เสียชีวิต', data: vals, backgroundColor: colors, borderRadius: 4, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw.toLocaleString()} ราย` } }
      },
      scales: {
        x: { ticks: { color: TICK_COLOR, font: FONT },                                                            grid: { color: GRID_COLOR } },
        y: { ticks: { color: '#e2e8f0', font: { family: 'Sarabun', size: 12 }, autoSkip: false, maxTicksLimit: 20 }, grid: { display: false } }
      }
    }
  });
}
