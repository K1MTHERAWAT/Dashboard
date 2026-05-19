// ─── DATE PARSING ─────────────────────────────
// Dataset uses DD/MM/YYYY format.
// Also handles YYYY-MM-DD (ISO) and DD-MM-YYYY variants.
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val) ? null : val;

  var s = String(val).trim();
  var d;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    // ISO: YYYY-MM-DD
    d = new Date(s.slice(0, 10));

  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    // DD/MM/YYYY
    var p  = s.split('/');
    var dd = p[0].padStart(2, '0'), mm = p[1].padStart(2, '0'), yyyy = p[2];
    d = new Date(yyyy + '-' + mm + '-' + dd);

  } else if (/^\d{1,2}-\d{1,2}-\d{4}/.test(s)) {
    // DD-MM-YYYY
    var p  = s.split('-');
    var dd = p[0].padStart(2, '0'), mm = p[1].padStart(2, '0'), yyyy = p[2];
    d = new Date(yyyy + '-' + mm + '-' + dd);

  } else {
    d = new Date(s);
  }

  return isNaN(d) ? null : d;
}

// ─── DATE FORMATTING ──────────────────────────
function toInputDate(d) {
  return d.toISOString().slice(0, 10);
}

// ─── PROVINCE NORMALIZER ──────────────────────
// Cleans dirty values in the 'Province' column (abbreviations, ASCII codes, etc.)
var PROV_MAP = { 'กท': 'กรุงเทพมหานคร', 'กทม': 'กรุงเทพมหานคร', 'bkk': 'กรุงเทพมหานคร' };
function normProv(v) {
  v = (v || '').trim();
  var mapped = PROV_MAP[v] || PROV_MAP[v.toLowerCase()];
  if (mapped) return mapped;
  if (v.length < 3) return '';          // too short to be a real province
  if (/^[a-zA-Z]/.test(v)) return '';  // starts with ASCII → invalid
  return v;
}

// ─── AGGREGATION HELPER ───────────────────────
// countBy(rows, keyFn) → { key: count } sorted desc
function countBy(rows, keyFn) {
  var map = {};
  rows.forEach(function(r) {
    var k = keyFn(r);
    if (k) map[k] = (map[k] || 0) + 1;
  });
  return map;
}
