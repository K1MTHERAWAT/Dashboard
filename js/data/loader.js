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
  // ตรวจ cache ก่อน
  showLoading(true, 'กำลังตรวจสอบ cache...');
  var cached = await _getCached();
  if (cached && (Date.now() - cached.ts) < _MAX_AGE) {
    showLoading(true, 'กำลังโหลดจาก cache...');
    rawData = cached.data;
    initDashboard(rawData);
    showLoading(false);
    return;
  }

  // ไม่มี cache หรือหมดอายุ → ดึงจาก Supabase
  showLoading(true, 'กำลังเชื่อมต่อ Supabase...');
  var client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  var all    = [];
  var from   = 0;
  var PAGE   = 1000;

  var countRes = await client.from(TABLE_NAME).select('*', { count: 'exact', head: true });
  var total    = countRes.count || 0;

  while (true) {
    var pct = total ? Math.round(all.length / total * 100) : 0;
    showLoading(true, 'กำลังโหลด... ' + pct + '%');

    var res = await client
      .from(TABLE_NAME)
      .select('*')
      .range(from, from + PAGE - 1);

    if (res.error) {
      showError(
        '<b>❌ โหลดข้อมูลจาก Supabase ไม่สำเร็จ</b><br/>' +
        res.error.message + '<br/><br/>' +
        'ตรวจสอบ SUPABASE_URL และ SUPABASE_KEY ใน config.js<br/>' +
        'หรือเลือกไฟล์โดยตรงด้านล่าง:'
      );
      return;
    }

    all = all.concat(res.data);
    if (res.data.length < PAGE) break;
    from += PAGE;
  }

  if (!all.length) {
    showError('<b>⚠️ ไม่พบข้อมูลใน table</b><br/>ตรวจสอบชื่อ TABLE_NAME ใน config.js<br/>หรือเลือกไฟล์โดยตรงด้านล่าง:');
    return;
  }

  showLoading(true, 'กำลังบันทึก cache...');
  await _setCached(all);

  rawData = all;
  initDashboard(rawData);
  showLoading(false);
}

// ─── FILE PICKER FALLBACK ─────────────────────
document.getElementById('fallbackFile').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  hideError();
  showLoading(true, 'กำลังอ่านไฟล์...');

  if (file.name.endsWith('.csv')) {
    Papa.parse(file, {
      header: true, skipEmptyLines: true, dynamicTyping: false,
      complete: function(r) { rawData = r.data; initDashboard(rawData); showLoading(false); },
      error:   function(err) { showError('❌ อ่าน CSV ไม่ได้: ' + err.message); }
    });
  } else {
    var reader = new FileReader();
    reader.onload = function(evt) {
      try {
        var wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array', cellDates: true });
        rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        initDashboard(rawData);
        showLoading(false);
      } catch(err) { showError('❌ อ่าน Excel ไม่ได้: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  }
});

// ─── BOOT ─────────────────────────────────────
loadFromSupabase();
