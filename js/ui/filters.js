// ─── MULTI-SELECT ENGINE ──────────────────────
var _msSel = { prov: new Set(), vehicle: new Set(), dist: new Set(), subdist: new Set() };

function msToggle(id, ev) {
  if (ev) ev.stopPropagation();
  var wrap = document.getElementById(id + 'Wrap');
  var drop = document.getElementById(id + 'Drop');
  var wasOpen = drop.classList.contains('open');

  // close all
  document.querySelectorAll('.ms-drop.open').forEach(function(d) { d.classList.remove('open'); });
  document.querySelectorAll('.ms-wrap.open').forEach(function(w) { w.classList.remove('open'); });

  if (!wasOpen) {
    // portal: move drop to body so it escapes all stacking contexts
    if (drop.parentElement !== document.body) document.body.appendChild(drop);
    var rect = wrap.querySelector('.ms-btn').getBoundingClientRect();
    drop.style.top      = (rect.bottom + 4) + 'px';
    drop.style.left     = rect.left + 'px';
    drop.style.minWidth = rect.width + 'px';
    drop.classList.add('open');
    wrap.classList.add('open');
    // clear search on open
    var srch = document.getElementById(id + 'Search');
    if (srch) { srch.value = ''; _msSearch(id, ''); }
  }
}

function _msSearch(id, query) {
  var q = query.toLowerCase().trim();
  document.getElementById(id + 'List').querySelectorAll('.ms-item').forEach(function(item) {
    var text = item.querySelector('span').textContent.toLowerCase();
    item.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
}

document.addEventListener('click', function() {
  document.querySelectorAll('.ms-drop.open').forEach(function(d) { d.classList.remove('open'); });
  document.querySelectorAll('.ms-wrap.open').forEach(function(w) { w.classList.remove('open'); });
});

function msBuild(id, options) {
  _msSel[id] = new Set();
  document.getElementById(id + 'Label').textContent = 'ทั้งหมด';
  var html = options.map(function(v) {
    var esc = String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    return '<label class="ms-item"><input type="checkbox" value="' + esc +
      '" onchange="_msChange(\'' + id + '\')"><span>' + esc + '</span></label>';
  }).join('');
  document.getElementById(id + 'List').innerHTML = html;
}

function _msSync(id) {
  var checked = [];
  document.getElementById(id + 'List').querySelectorAll('input:checked').forEach(function(cb) {
    checked.push(cb.value);
  });
  _msSel[id] = new Set(checked);
  document.getElementById(id + 'Label').textContent = checked.length === 0 ? 'ทั้งหมด' : checked.length + ' รายการ';
  document.getElementById(id + 'List').querySelectorAll('.ms-item').forEach(function(item) {
    item.classList.toggle('checked', item.querySelector('input').checked);
  });
}

function _msChange(id) {
  _msSync(id);
  if      (id === 'prov') buildDistrictFilter();
  else if (id === 'dist') buildSubdistFilter();
  applyFilter();
}

function msAll(id) {
  document.getElementById(id + 'List').querySelectorAll('input').forEach(function(cb) { cb.checked = true; });
  _msSync(id);
  if      (id === 'prov') buildDistrictFilter();
  else if (id === 'dist') buildSubdistFilter();
  applyFilter();
}

function msClear(id, silent) {
  document.getElementById(id + 'List').querySelectorAll('input').forEach(function(cb) { cb.checked = false; });
  _msSync(id);
  if (!silent) {
    if      (id === 'prov') buildDistrictFilter();
    else if (id === 'dist') buildSubdistFilter();
    applyFilter();
  }
}

function msGet(id) { return _msSel[id] || new Set(); }

// ─── CASCADE: DISTRICT ────────────────────────
function buildDistrictFilter() {
  var provSet = msGet('prov');
  var dists;
  if (!provSet.size) {
    dists = [...new Set(Object.keys(hierMap))].sort();
  } else {
    var s = new Set();
    provSet.forEach(function(p) {
      (PROV_DIST[p] || []).forEach(function(d) {
        // PROV_DIST uses "อำเภอXX"/"เขตXX" prefix; data may store bare name
        var bare = d.replace(/^อำเภอ|^เขต/, '');
        if      (hierMap[d])    s.add(d);
        else if (hierMap[bare]) s.add(bare);
      });
    });
    dists = s.size ? [...s].sort() : [...new Set(Object.keys(hierMap))].sort();
  }
  msBuild('dist', dists);
  buildSubdistFilter();
}

// ─── CASCADE: SUBDISTRICT ─────────────────────
function buildSubdistFilter() {
  var distSet = msGet('dist');
  var subs;
  if (!distSet.size) {
    var all = new Set();
    Object.values(hierMap).forEach(function(s) { s.forEach(function(v) { all.add(v); }); });
    subs = [...all].sort();
  } else {
    var all = new Set();
    distSet.forEach(function(d) { (hierMap[d] || new Set()).forEach(function(v) { all.add(v); }); });
    subs = [...all].sort();
  }
  msBuild('subdist', subs);
}

// ─── APPLY FILTER ─────────────────────────────
function applyFilter() {
  if (!rawData.length) return;

  var yr    = document.getElementById('yearFilter').value;
  var s     = document.getElementById('dateStart').value;
  var e     = document.getElementById('dateEnd').value;
  var pvSet = msGet('prov');
  var vhSet = msGet('vehicle');
  var diSet = msGet('dist');
  var sbSet = msGet('subdist');

  function baseMatch(r) {
    var d = parseDate(r[COL.date]);
    if (yr && (!d || d.getFullYear() !== parseInt(yr))) return false;
    if (s || e) {
      if (!d) return false;
      if (s && d < new Date(s))               return false;
      if (e && d > new Date(e + 'T23:59:59')) return false;
    }
    if (diSet.size && !diSet.has((r[COL.district]    || '').trim())) return false;
    if (sbSet.size && !sbSet.has((r[COL.subdistrict] || '').trim())) return false;
    return true;
  }

  filteredData = rawData.filter(function(r) {
    if (!baseMatch(r)) return false;
    if (pvSet.size && !pvSet.has((r[COL.province] || '').trim())) return false;
    if (vhSet.size && !vhSet.has(normalizeVehicle(r[COL.vehicle]))) return false;
    return true;
  });

  filteredDataAI = rawData.filter(function(r) {
    if (!baseMatch(r)) return false;
    if (pvSet.size && !pvSet.has((r[COL.province] || '').trim())) return false;
    if (vhSet.size && !vhSet.has(normalizeVehicle(r[COL.vehicleai]))) return false;
    return true;
  });

  filteredDataBar = rawData.filter(function(r) {
    if (!baseMatch(r)) return false;
    if (vhSet.size && !vhSet.has(normalizeVehicle(r[COL.vehicle]))) return false;
    return true;
  });

  renderAll(filteredData);
}

// ─── RESET FILTER ─────────────────────────────
function resetFilter() {
  if (!rawData.length) return;

  document.getElementById('yearFilter').value = '';
  if (typeof clearCalendar === 'function') clearCalendar();
  msClear('prov',    true);
  msClear('vehicle', true);
  buildDistrictFilter(); // resets dist + subdist

  filteredData    = rawData;
  filteredDataAI  = rawData;
  filteredDataBar = rawData;
  renderAll(filteredData);
}
