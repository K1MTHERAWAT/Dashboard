// ─── LOADING (header inline, ไม่บัง dashboard) ──
function showLoading(visible, msg) {
  var dot  = document.getElementById('statusDot');
  var text = document.getElementById('statusText');
  if (visible) {
    dot.className    = 'status-dot loading';
    text.textContent = msg || 'กำลังโหลด...';
  } else {
    text.textContent = '';
  }
}

// ─── ERROR TOAST ──────────────────────────────
function showError(html) {
  document.getElementById('errorMsg').innerHTML = html;
  document.getElementById('errorToast').style.display = 'flex';
  showLoading(false);
}

function hideError() {
  document.getElementById('errorToast').style.display = 'none';
}

// ─── PIE PANEL EXPAND ─────────────────────────
var PIE_EXPAND_ICON   = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg><span>ขยาย</span>';
var PIE_COLLAPSE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="10" y1="14" x2="3" y2="21"></line><line x1="21" y1="3" x2="14" y2="10"></line></svg><span>ปิด</span>';

function togglePieExpand() {
  var panel = document.querySelector('.pie-panel');
  var btn   = document.getElementById('pieExpandBtn');
  var isExp = panel.classList.toggle('is-expanded');

  if (isExp) {
    btn.innerHTML = PIE_COLLAPSE_ICON;
    document.addEventListener('keydown', _pieEscHandler);
  } else {
    btn.innerHTML = PIE_EXPAND_ICON;
    document.removeEventListener('keydown', _pieEscHandler);
  }

  setTimeout(function() {
    renderPie(filteredData);
  }, 50);
}

function _pieEscHandler(e) {
  if (e.key === 'Escape') togglePieExpand();
}

// ─── STATUS INDICATOR ─────────────────────────
function updateStatus(active, count) {
  document.getElementById('statusDot').className = 'status-dot' + (active ? ' active' : '');
  document.getElementById('statusText').textContent = active ? '' : 'ยังไม่มีข้อมูล';
}
