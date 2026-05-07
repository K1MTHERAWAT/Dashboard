// ─── CASCADE: DISTRICT ────────────────────────
function buildDistrictFilter(prov) {
  var dists = !prov
    ? [...new Set(Object.values(hierMap).flatMap(d => Object.keys(d)))].sort()
    : Object.keys(hierMap[prov] || {}).sort();

  var sel = document.getElementById('distFilter');
  sel.innerHTML = '<option value="">ทั้งหมด</option>';
  dists.forEach(function(d) {
    var o = document.createElement('option'); o.value = o.textContent = d; sel.appendChild(o);
  });
  buildSubdistFilter(prov, '');
}

// ─── CASCADE: SUBDISTRICT ─────────────────────
function buildSubdistFilter(prov, dist) {
  var subs;

  if (!prov && !dist) {
    var all = new Set();
    Object.values(hierMap).forEach(d => Object.values(d).forEach(s => s.forEach(v => all.add(v))));
    subs = [...all].sort();

  } else if (prov && !dist) {
    var set2 = new Set();
    Object.values(hierMap[prov] || {}).forEach(s => s.forEach(v => set2.add(v)));
    subs = [...set2].sort();

  } else {
    var src  = prov ? (hierMap[prov] || {}) : Object.assign({}, ...Object.values(hierMap));
    subs = [...(src[dist] || new Set())].sort();
  }

  var sel = document.getElementById('subdistFilter');
  sel.innerHTML = '<option value="">ทั้งหมด</option>';
  subs.forEach(function(s) {
    var o = document.createElement('option'); o.value = o.textContent = s; sel.appendChild(o);
  });
}

// ─── CASCADE EVENT LISTENERS ──────────────────
document.getElementById('provFilter').addEventListener('change', function() {
  buildDistrictFilter(this.value);
  applyFilter();
});
document.getElementById('distFilter').addEventListener('change', function() {
  buildSubdistFilter(document.getElementById('provFilter').value, this.value);
  applyFilter();
});

// ─── APPLY FILTER ─────────────────────────────
function applyFilter() {
  if (!rawData.length) return;

  var yr = document.getElementById('yearFilter').value;
  var s  = document.getElementById('dateStart').value;
  var e  = document.getElementById('dateEnd').value;
  var pv = document.getElementById('provFilter').value;
  var vh = document.getElementById('vehicleFilter').value;
  var di = document.getElementById('distFilter').value;
  var sb = document.getElementById('subdistFilter').value;

  filteredData = rawData.filter(function(r) {
    var d = parseDate(r[COL.date]);

    // year filter
    if (yr) {
      if (!d) return false;
      if (d.getFullYear() !== parseInt(yr)) return false;
    }

    // date range filter (only when at least one bound is set)
    if (s || e) {
      if (!d) return false;
      if (s && d < new Date(s))               return false;
      if (e && d > new Date(e + 'T23:59:59')) return false;
    }

    if (pv && r[COL.province]                  !== pv) return false;
    if (vh && r[COL.vehicle]                    !== vh) return false;
    if (di && (r[COL.district]    || '').trim() !== di) return false;
    if (sb && (r[COL.subdistrict] || '').trim() !== sb) return false;

    return true;
  });

  renderAll(filteredData);
}

// ─── RESET FILTER ─────────────────────────────
function resetFilter() {
  if (!rawData.length) return;

  document.getElementById('yearFilter').value    = '';
  if (typeof clearCalendar === 'function') clearCalendar();
  document.getElementById('provFilter').value    = '';
  document.getElementById('vehicleFilter').value = '';
  document.getElementById('distFilter').value    = '';
  document.getElementById('subdistFilter').value = '';
  buildDistrictFilter('');

  filteredData = rawData;
  renderAll(filteredData);
}
