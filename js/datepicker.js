// ─── CALENDAR STATE ───────────────────────────
var CAL = {
  month: new Date().getMonth(),
  year:  new Date().getFullYear(),
  start: null,
  end:   null,
  hover: null
};

// ─── TOGGLE ───────────────────────────────────
function toggleCalendar(e) {
  if (e) e.stopPropagation();
  var p = document.getElementById('calPopup');
  if (p.classList.contains('cal-open')) { closeCalendar(); return; }

  var btn  = document.getElementById('dateRangeDisplay');
  var rect = btn.getBoundingClientRect();
  var pw   = p.offsetWidth || 310;
  var left = Math.min(rect.left, window.innerWidth - pw - 8);
  p.style.top  = (rect.bottom + 8) + 'px';
  p.style.left = Math.max(8, left) + 'px';
  p.classList.add('cal-open');
  renderCalendar();
}

function closeCalendar() {
  document.getElementById('calPopup').classList.remove('cal-open');
}

// ─── NAVIGATION ───────────────────────────────
function prevMonth() {
  if (CAL.month === 0) { CAL.month = 11; CAL.year--; }
  else { CAL.month--; }
  renderCalendar();
}
function nextMonth() {
  if (CAL.month === 11) { CAL.month = 0; CAL.year++; }
  else { CAL.month++; }
  renderCalendar();
}

// ─── RENDER GRID ──────────────────────────────
function renderCalendar() {
  document.getElementById('calMonthSel').value = CAL.month;
  document.getElementById('calYearSel').value  = CAL.year;

  var wrap    = document.getElementById('calDates');
  wrap.innerHTML = '';

  var firstDay = new Date(CAL.year, CAL.month, 1).getDay();
  var offset   = (firstDay + 6) % 7;          // Mon=0 … Sun=6
  var dim      = new Date(CAL.year, CAL.month + 1, 0).getDate();
  var prevDim  = new Date(CAL.year, CAL.month, 0).getDate();

  for (var i = offset - 1; i >= 0; i--) {
    var el = document.createElement('div');
    el.className = 'cal-date cal-date--grey';
    el.innerHTML = '<span>' + (prevDim - i) + '</span>';
    wrap.appendChild(el);
  }

  for (var d = 1; d <= dim; d++) {
    var el = document.createElement('div');
    el.className = 'cal-date';
    el.dataset.d = d;
    el.innerHTML = '<span>' + d + '</span>';
    wrap.appendChild(el);
  }

  var total  = offset + dim;
  var remain = (7 - (total % 7)) % 7;
  for (var i = 1; i <= remain; i++) {
    var el = document.createElement('div');
    el.className = 'cal-date cal-date--grey';
    el.innerHTML = '<span>' + i + '</span>';
    wrap.appendChild(el);
  }

  applyRangeClasses();
}

// ─── RANGE CLASSES ────────────────────────────
function applyRangeClasses() {
  var rS = CAL.start, rE = CAL.end;

  if (CAL.start && !CAL.end && CAL.hover) {
    if (CAL.hover >= CAL.start) { rE = CAL.hover; }
    else { rS = CAL.hover; rE = CAL.start; }
  }

  document.querySelectorAll('#calDates [data-d]').forEach(function(el) {
    var d    = +el.dataset.d;
    var date = new Date(CAL.year, CAL.month, d);
    var dow  = (date.getDay() + 6) % 7;    // 0=Mon 6=Sun

    var iS  = rS && eqDay(date, rS);
    var iE  = rE && eqDay(date, rE);
    var inR = rS && rE && date > rS && date < rE;

    var cls = ['cal-date'];
    if (iS && iE) {
      cls.push('cal-date--selected', 'cal-date--range-start',
               'cal-date--range-end', 'cal-date--first', 'cal-date--last');
    } else if (iS) {
      cls.push('cal-date--selected', 'cal-date--range-start', 'cal-date--first');
    } else if (iE) {
      cls.push('cal-date--selected', 'cal-date--range-end', 'cal-date--last');
    } else if (inR) {
      cls.push('cal-date--selected');
      if (dow === 0) cls.push('cal-date--first');
      if (dow === 6) cls.push('cal-date--last');
    }
    el.className = cls.join(' ');
  });

  updateLabel();
}

function eqDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();
}

// ─── LABEL ────────────────────────────────────
function updateLabel() {
  var t = CAL.start && CAL.end ? dmy(CAL.start) + '  →  ' + dmy(CAL.end)
        : CAL.start            ? dmy(CAL.start) + '  →  ...'
        : 'เลือกช่วงวันที่';
  document.getElementById('dateRangeText').textContent = t;
}

function dmy(d) { return pad(d.getDate()) + '/' + pad(d.getMonth()+1) + '/' + d.getFullYear(); }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function pad(n) { return String(n).padStart(2,'0'); }

// ─── CLICK ────────────────────────────────────
function handleCalClick(d) {
  var date = new Date(CAL.year, CAL.month, d);
  if (!CAL.start || (CAL.start && CAL.end)) {
    CAL.start = date; CAL.end = null;
  } else {
    if (date < CAL.start) { CAL.end = CAL.start; CAL.start = date; }
    else                  { CAL.end = date; }
  }
  CAL.hover = null;
  applyRangeClasses();
}

// ─── APPLY / CLEAR ────────────────────────────
function applyCalendar() {
  document.getElementById('dateStart').value = CAL.start ? iso(CAL.start) : '';
  document.getElementById('dateEnd').value   = CAL.end   ? iso(CAL.end)   : '';
  closeCalendar();
  if (typeof applyFilter === 'function') applyFilter();
}

function clearCalendar() {
  CAL.start = CAL.end = CAL.hover = null;
  document.getElementById('dateStart').value = '';
  document.getElementById('dateEnd').value   = '';
  updateLabel();
  if (document.getElementById('calDates').children.length) applyRangeClasses();
}

// ─── EVENTS (delegated, set up once) ──────────
document.addEventListener('DOMContentLoaded', function() {
(function() {
  var wrap = document.getElementById('calDates');

  wrap.addEventListener('click', function(e) {
    var cell = e.target.closest('[data-d]');
    if (!cell) return;
    e.stopPropagation();
    handleCalClick(+cell.dataset.d);
  });

  wrap.addEventListener('mouseover', function(e) {
    if (!CAL.start || CAL.end) return;
    var cell = e.target.closest('[data-d]');
    var h    = cell ? new Date(CAL.year, CAL.month, +cell.dataset.d) : null;
    if (CAL.hover && h && CAL.hover.getTime() === h.getTime()) return;
    CAL.hover = h;
    applyRangeClasses();
  });

  wrap.addEventListener('mouseleave', function() {
    if (!CAL.hover) return;
    CAL.hover = null;
    applyRangeClasses();
  });

  document.getElementById('calMonthSel').addEventListener('change', function() {
    CAL.month = +this.value; renderCalendar();
  });
  document.getElementById('calYearSel').addEventListener('change', function() {
    CAL.year  = +this.value; renderCalendar();
  });

  document.addEventListener('click', function(e) {
    var popup   = document.getElementById('calPopup');
    var trigger = document.getElementById('dateRangeDisplay');
    if (popup.classList.contains('cal-open') &&
        !popup.contains(e.target) &&
        !trigger.contains(e.target)) {
      closeCalendar();
    }
  });
})();
});
