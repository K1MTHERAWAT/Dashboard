// ─── CHART COLORS ─────────────────────────────
const COLORS = [
  '#f97316','#ef4444','#facc15','#22d3ee','#a78bfa',
  '#34d399','#fb923c','#f472b6','#60a5fa','#4ade80',
  '#fbbf24','#e879f9','#38bdf8','#f87171','#86efac'
];

// ─── SUPABASE ─────────────────────────────────
const SUPABASE_URL = 'https://ajvvyfjhtxgipoztgtym.supabase.co';   // ← ใส่ URL ของคุณ
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqdnZ5ZmpodHhnaXBvenRndHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjg1MDIsImV4cCI6MjA5Mzc0NDUwMn0.gtY8wTXThcV9UiAdaeMkCpce_qPRNFFYKNc8878kS1M';                      // ← ใส่ anon key
const TABLE_NAME   = 'road_accident';                      // ← ชื่อ table ใน Supabase

// ─── COLUMN NAMES ─────────────────────────────
const COL = {
  date:        'Dead Date Final',
  province:    'จ.ที่เสียชีวิต',
  vehicle:     'Vehicle Merge Final',
  district:    'Acc Dist',
  subdistrict: 'Acc Sub Dist',
  lat:         'Acc La',
  lng:         'Acclong',
  // hierarchy source (Province col, not death province)
  hierProv:    'Province',
};

// ─── MAP CONFIG ───────────────────────────────
const MAP_CONFIG = {
  center:   [13.0, 101.5],
  zoom:     6,
  tileUrl:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  geoJsonUrl: 'https://cdn.jsdelivr.net/gh/apisit/thailand.js@master/thailand.json',
  heatOptions: {
    radius: 8, blur: 6, maxZoom: 10,
    gradient: { 0.0:'#1e40af', 0.3:'#7c3aed', 0.5:'#f97316', 0.7:'#ef4444', 1.0:'#ffffff' }
  },
  latBounds: [5, 21],
  lngBounds: [97, 106],
};

// ─── CHART GRID COLORS ────────────────────────
const GRID_COLOR = '#1e293b';
const TICK_COLOR = '#64748b';
