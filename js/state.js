// ─── GLOBAL STATE ─────────────────────────────
// All mutable shared state lives here.
// Modules read/write these directly (small app — no need for a store).

let rawData      = [];   // full dataset from CSV
let filteredData = [];   // current filtered view
let hierMap      = {};   // { province: { district: Set<subdistrict> } }

// Leaflet layers
let heatLayer = null;
let geoLayer  = null;
let thaiGeoJSON = null;

// Chart.js instances (destroyed & recreated on each render)
let pieChart = null;
let tsChart  = null;
let barChart = null;

// Time-series UI state
let tsMode        = 'monthly';
let tsCurrentData = [];
