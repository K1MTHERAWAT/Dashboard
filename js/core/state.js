// ─── GLOBAL STATE ─────────────────────────────
// All mutable shared state lives here.
// Modules read/write these directly (small app — no need for a store).

let rawData        = [];   // full dataset from CSV
let filteredData   = [];   // filtered by Vehicle Merge Final (+ all filters)
let filteredDataAI = [];   // filtered by Vehicle Merge AI   (+ all filters)
let filteredDataBar = [];  // filtered by all filters EXCEPT province (for top-15 bar)
let hierMap      = {};   // { province: { district: Set<subdistrict> } }

// Leaflet layers
let heatLayer          = null;
let geoLayer           = null;
let thaiGeoJSON        = null;
let hotspotLayer       = null;
let hotspotLegendCtrl  = null;
let mapMode            = 'heat';   // 'heat' | 'hotspot'

// Chart.js instances (destroyed & recreated on each render)
let pieChart  = null;
let pieChart2 = null;
let tsChart   = null;
let barChart = null;

// Time-series UI state
let tsMode        = 'monthly';
let tsCurrentData = [];
