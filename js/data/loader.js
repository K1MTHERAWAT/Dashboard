// ─── INDEXEDDB CACHE ──────────────────────────
var _DB_NAME = 'road_accident_cache';
var _STORE   = 'data';
var _KEY     = 'rows';
var _MAX_AGE = 24 * 60 * 60 * 1000; // 24 ชั่วโมง

function _openDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(_DB_NAME, 1);
    req.onupgradeneeded = function(e) { e.target.result.createObjectStore(_STORE); };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror   = function(e) { reject(e.target.error); };
  });
}

async function _getCached() {
  try {
    var db = await _openDB();
    return new Promise(function(resolve) {
      var req = db.transaction(_STORE, 'readonly').objectStore(_STORE).get(_KEY);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror   = function() { resolve(null); };
    });
  } catch(e) { return null; }
}

async function _setCached(data) {
  try {
    var db = await _openDB();
    return new Promise(function(resolve) {
      var tx = db.transaction(_STORE, 'readwrite');
      tx.objectStore(_STORE).put({ data: data, ts: Date.now() }, _KEY);
      tx.oncomplete = resolve;
      tx.onerror    = resolve;
    });
  } catch(e) {}
}

// ─── SUPABASE LOADER ──────────────────────────
async function loadFromSupabase() {
  showLoading(true, 'กำลังตรวจสอบ cache...');
  var cached = await _getCached();
  if (cached && (Date.now() - cached.ts) < _MAX_AGE) {
    rawData = cached.data;
    initDashboard(rawData);
    showLoading(false);
    return;
  }

  var client   = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  var PAGE     = 1000;
  var PARALLEL = 10;   // requests in flight at once

  // only fetch columns the dashboard actually uses
  var COLS = [
    COL.date, COL.province, COL.vehicle, COL.vehicleai,
    COL.district, COL.subdistrict, COL.lat, COL.lng, COL.hierProv
  ].map(function(c) { return '"' + c + '"'; }).join(',');

  // 1. total count (lightweight HEAD request)
  showLoading(true, 'กำลังเชื่อมต่อ...');
  var countRes = await client.from(TABLE_NAME).select('*', { count: 'exact', head: true });
  if (countRes.error) {
    showError('<b>❌ โหลดข้อมูลไม่สำเร็จ</b><br/>' + countRes.error.message);
    return;
  }
  var total = countRes.count || 0;
  if (!total) {
    showError('<b>⚠️ ไม่พบข้อมูลใน table</b><br/>ตรวจสอบ TABLE_NAME ใน config.js');
    return;
  }

  // 2. build all page offsets upfront
  var offsets = [];
  for (var off = 0; off < total; off += PAGE) offsets.push(off);

  // 3. parallel batched fetch
  var all = [];
  for (var i = 0; i < offsets.length; i += PARALLEL) {
    showLoading(true, 'กำลังโหลด... ' + Math.round(all.length / total * 100) + '%');

    var batch   = offsets.slice(i, i + PARALLEL);
    var results = await Promise.all(batch.map(function(from) {
      return client.from(TABLE_NAME).select(COLS).range(from, from + PAGE - 1);
    }));

    for (var j = 0; j < results.length; j++) {
      if (results[j].error) {
        showError('<b>❌ โหลดข้อมูลไม่สำเร็จ</b><br/>' + results[j].error.message);
        return;
      }
      var chunk = results[j].data;
      for (var k = 0; k < chunk.length; k++) all.push(chunk[k]);
    }
  }

  showLoading(true, 'กำลังบันทึก cache...');
  await _setCached(all);

  rawData = all;
  initDashboard(rawData);
  showLoading(false);
}

// ─── BOOT ─────────────────────────────────────
loadFromSupabase();
