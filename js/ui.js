// ─── LOADING OVERLAY ──────────────────────────
function showLoading(visible, msg) {
  document.getElementById('loadingOverlay').style.display = visible ? 'flex' : 'none';
  if (msg) document.getElementById('loadingMsg').textContent = msg;
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

// ─── STATUS INDICATOR ─────────────────────────
function updateStatus(active, count) {
  document.getElementById('statusDot').className = 'status-dot' + (active ? ' active' : '');
  document.getElementById('statusText').textContent = active
    ? 'โหลดแล้ว ' + count.toLocaleString() + ' รายการ'
    : 'ยังไม่มีข้อมูล';
}
