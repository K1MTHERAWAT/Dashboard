// ─── LOADING (header inline, ไม่บัง dashboard) ──
function showLoading(visible, msg) {
  var dot  = document.getElementById('statusDot');
  var text = document.getElementById('statusText');
  if (visible) {
    dot.className    = 'status-dot loading';
    text.textContent = msg || 'กำลังโหลด...';
  } else {
    dot.className    = 'status-dot';
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

// ─── STATUS INDICATOR ─────────────────────────
function updateStatus(active, count) {
  document.getElementById('statusDot').className = 'status-dot' + (active ? ' active' : '');
  document.getElementById('statusText').textContent = active ? '' : 'ยังไม่มีข้อมูล';
}
