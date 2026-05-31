// Admin: Waitlist — English landing page signups + survey responses
// ─── State ───────────────────────────────────────────────────────────
let wlOffset = 0;
let wlLimit = 50;
let wlTotal = 0;
let wlSearch = '';
let wlEntries = [];
let wlStats = {};
let wlSearchTimer = null;
let wlPendingDeleteId = null;

// ─── Init ────────────────────────────────────────────────────────────
function loadWaitlist() {
  wlOffset = 0;
  fetchWaitlistData();
  fetchWaitlistStats();
}

// ─── Fetch ──────────────────────────────────────────────────────────
async function fetchWaitlistData() {
  try {
    const params = new URLSearchParams({ limit: wlLimit, offset: wlOffset });
    if (wlSearch) params.set('search', wlSearch);
    const data = await Auth.api(`/api/admin/waitlist?${params}`);
    wlEntries = data.entries || [];
    wlTotal = data.total || 0;
    renderWaitlistTable(wlEntries);
    renderWaitlistPagination(wlTotal, wlLimit, wlOffset);
  } catch (err) {
    renderWaitlistTableError('Kunde inte ladda waitlist: ' + (err.message || 'Okänt fel'));
  }
}

async function fetchWaitlistStats() {
  try {
    const data = await Auth.api('/api/admin/waitlist/stats');
    wlStats = data;
    renderWaitlistStats(data);
  } catch (err) {
    console.error('[WAITLIST] stats error:', err);
  }
}

// ─── Stats renderer ──────────────────────────────────────────────────
function renderWaitlistStats(stats) {
  setEl('wlTotal', stats.total || 0);
  setEl('wlCompleted', stats.completed || 0);
  setEl('wlSkipped', stats.skipped || 0);
  setEl('wlPending', stats.pending || 0);

  renderQ1Bars(stats.q1 || [], stats.completed || 0);
  renderQ2Bars(stats.q2 || [], stats.completed || 0);
}

function renderQ1Bars(q1Data, completed) {
  const container = document.getElementById('wlQ1Bars');
  if (!container) return;
  const labels = {
    morning_routines: '🌅 Morning routines',
    bedtime: '🌙 Bedtime',
    screen_time: '📱 Screen time transitions',
    homework: '📚 Homework',
    other: '✨ Other',
  };
  const colors = {
    morning_routines: '#F5A623',
    bedtime: '#8B5CF6',
    screen_time: '#10B981',
    homework: '#3B82F6',
    other: '#6B7280',
  };
  if (!q1Data.length) {
    container.innerHTML = '<p class="text-text-soft text-sm italic">Inga svar ännu.</p>';
    return;
  }
  const maxCount = Math.max(...q1Data.map((r) => parseInt(r.count, 10)), 1);
  container.innerHTML = q1Data
    .map((r) => {
      const pct = completed > 0 ? Math.round((parseInt(r.count, 10) / completed) * 100) : 0;
      const barPct = maxCount > 0 ? (parseInt(r.count, 10) / maxCount) * 100 : 0;
      const label = labels[r.value] || r.value;
      const color = colors[r.value] || '#F5A623';
      return `
        <div class="flex items-center gap-2">
          <span class="text-xs text-text-soft w-36 shrink-0 truncate">${esc(label)}</span>
          <div class="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div class="h-full rounded-full transition-all" style="width:${barPct}%;background:${color};"></div>
          </div>
          <span class="text-xs font-semibold text-navy w-20 shrink-0">${r.count} <span class="text-text-soft font-normal">(${pct}%)</span></span>
        </div>`;
    })
    .join('');
}

function renderQ2Bars(q2Data, completed) {
  const container = document.getElementById('wlQ2Bars');
  if (!container) return;
  const labels = {
    paper: '📄 Paper / Whiteboard',
    other_apps: '📱 Other apps',
    verbal: '💬 Verbal reminders (nagging 😅)',
    nothing: '❌ Nothing yet',
  };
  const colors = {
    paper: '#F5A623',
    other_apps: '#8B5CF6',
    verbal: '#3B82F6',
    nothing: '#6B7280',
  };
  if (!q2Data.length) {
    container.innerHTML = '<p class="text-text-soft text-sm italic">Inga svar ännu.</p>';
    return;
  }
  const maxCount = Math.max(...q2Data.map((r) => parseInt(r.count, 10)), 1);
  container.innerHTML = q2Data
    .map((r) => {
      const pct = completed > 0 ? Math.round((parseInt(r.count, 10) / completed) * 100) : 0;
      const barPct = maxCount > 0 ? (parseInt(r.count, 10) / maxCount) * 100 : 0;
      const label = labels[r.value] || r.value;
      const color = colors[r.value] || '#F5A623';
      return `
        <div class="flex items-center gap-2">
          <span class="text-xs text-text-soft w-48 shrink-0 truncate">${esc(label)}</span>
          <div class="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div class="h-full rounded-full transition-all" style="width:${barPct}%;background:${color};"></div>
          </div>
          <span class="text-xs font-semibold text-navy w-20 shrink-0">${r.count} <span class="text-text-soft font-normal">(${pct}%)</span></span>
        </div>`;
    })
    .join('');
}

// ─── Table renderer ──────────────────────────────────────────────────
function renderWaitlistTable(entries) {
  const tbody = document.getElementById('waitlistTableBody');
  if (!tbody) return;
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-text-soft py-8">Inga resultat.</td></tr>';
    return;
  }
  tbody.innerHTML = entries
    .map((e, i) => {
      const rowNum = wlOffset + i + 1;
      const date = e.created_at
        ? new Date(e.created_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—';

      const q1Display =
        e.survey_completed_at
          ? (e.pain_points || []).map(ppToLabel).join(', ') +
            (e.pain_points_other ? ` (${esc(e.pain_points_other)})` : '')
          : '—';

      const q2Display = e.survey_completed_at ? (e.current_method ? pp2ToLabel(e.current_method) : '—') : '—';

      const statusDisplay = statusBadge(e.survey_status);
      return `<tr class="border-b border-lavender/50 hover:bg-sky/50 transition-colors">
        <td class="px-4 py-3 text-text-soft">${rowNum}</td>
        <td class="px-4 py-3 font-semibold text-navy">${esc(e.name || '')}</td>
        <td class="px-4 py-3"><a href="mailto:${esc(e.email || '')}" class="text-gold hover:underline text-sm">${esc(e.email || '')}</a></td>
        <td class="px-4 py-3 text-text-soft text-sm">${date}</td>
        <td class="px-4 py-3 text-sm text-text-soft max-w-40 truncate" title="${esc(q1Display)}">${q1Display || '—'}</td>
        <td class="px-4 py-3 text-sm text-text-soft">${q2Display || '—'}</td>
        <td class="px-4 py-3">${statusDisplay}</td>
        <td class="px-4 py-3">
          <button onclick="showWaitlistDeleteModal(${e.id})" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors border border-red-200" style="min-height:32px;min-width:44px;">
            🗑 Radera
          </button>
        </td>
      </tr>`;
    })
    .join('');
}

function renderWaitlistTableError(msg) {
  const tbody = document.getElementById('waitlistTableBody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-8">${esc(msg)}</td></tr>`;
}

function renderWaitlistPagination(total, limit, offset) {
  const container = document.getElementById('waitlistPagination');
  if (!container) return;
  if (total <= limit) {
    container.innerHTML = `<p class="text-text-soft text-sm">Visar ${total} av ${total}</p>`;
    return;
  }
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const prevDisabled = offset === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-navy-soft';
  const nextDisabled = offset + limit >= total ? 'opacity-40 cursor-not-allowed' : 'hover:bg-navy-soft';
  container.innerHTML = `
    <p class="text-text-soft text-sm">Visar ${offset + 1}–${Math.min(offset + limit, total)} av ${total}</p>
    <div class="flex gap-2">
      <button onclick="wlGoPage(${currentPage - 2})" class="px-3 py-2 bg-navy text-white rounded-xl text-sm font-semibold ${prevDisabled} transition-colors ${currentPage <= 1 ? 'opacity-40 cursor-not-allowed' : ''}" ${currentPage <= 1 ? 'disabled' : ''}>← Föregående</button>
      <button onclick="wlGoPage(${currentPage})" class="px-3 py-2 bg-navy text-white rounded-xl text-sm font-semibold ${nextDisabled} transition-colors ${currentPage >= totalPages ? 'opacity-40 cursor-not-allowed' : ''}" ${currentPage >= totalPages ? 'disabled' : ''}>Nästa →</button>
    </div>`;
}

function wlGoPage(pageIndex) {
  wlOffset = pageIndex * wlLimit;
  fetchWaitlistData();
}

// ─── Delete ─────────────────────────────────────────────────────────
function wlConfirmDelete(id, email) {
  wlPendingDeleteId = id;
  const modal = document.getElementById('deleteWaitlistModal');
  const nameEl = document.getElementById('deleteWaitlistName');
  if (modal) {
    if (nameEl) nameEl.textContent = email || 'denna anmälan';
    modal.classList.remove('hidden');
  }
}

function closeWlDeleteModal() {
  const modal = document.getElementById('deleteWaitlistModal');
  if (modal) modal.classList.add('hidden');
  wlPendingDeleteId = null;
}

async function executeWlDelete() {
  if (!wlPendingDeleteId) return;
  const id = wlPendingDeleteId;
  wlPendingDeleteId = null;
  closeWlDeleteModal();

  try {
    await Auth.api(`/api/admin/waitlist/${id}`, { method: 'DELETE' });
    wlTotal = Math.max(0, wlTotal - 1);
    fetchWaitlistData();
  } catch (err) {
    alert('Kunde inte radera: ' + (err.message || 'Okänt fel'));
  }
}

// ─── Status badge ───────────────────────────────────────────────────
function statusBadge(status) {
  if (status === 'completed') return '<span class="inline-block bg-green-100 text-green-700 text-xs font-bold rounded-full px-2 py-0.5">✓ Svarat</span>';
  if (status === 'skipped') return '<span class="inline-block bg-gray-100 text-gray-500 text-xs font-bold rounded-full px-2 py-0.5">Skipped</span>';
  return '<span class="inline-block bg-amber-100 text-amber-700 text-xs font-bold rounded-full px-2 py-0.5">Väntar</span>';
}

// ─── Label helpers ───────────────────────────────────────────────────
function ppToLabel(value) {
  const map = {
    morning_routines: 'Morgonrutiner',
    bedtime: 'Läggdags',
    screen_time: 'Skärmtid',
    homework: 'Läxor',
    other: 'Annat',
  };
  return map[value] || value;
}

function pp2ToLabel(value) {
  const map = {
    paper: '📄 Papper',
    other_apps: '📱 Appar',
    verbal: '💬 Verbalt',
    nothing: '❌ Inget',
  };
  return map[value] || value;
}

// ─── Search ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('waitlistSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(wlSearchTimer);
      wlSearchTimer = setTimeout(function () {
        wlSearch = searchInput.value.trim();
        wlOffset = 0;
        fetchWaitlistData();
      }, 400);
    });
  }

  const refreshBtn = document.getElementById('waitlistRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadWaitlist);
  }

  const exportBtn = document.getElementById('waitlistExportCsv');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportWaitlistCsv);
  }
});

// ─── CSV Export ─────────────────────────────────────────────────────
async function exportWaitlistCsv() {
  try {
    const params = new URLSearchParams({ limit: 9999, offset: 0 });
    if (wlSearch) params.set('search', wlSearch);
    const data = await Auth.api(`/api/admin/waitlist?${params}`);
    const entries = data.entries || [];

    const headers = ['#', 'Name', 'Email', 'Signed up', 'Q1: Pain Points', 'Q1: Other text', 'Q2: Current Method', 'Survey Status', 'Completed At'];
    const rows = entries.map((e, i) => [
      i + 1,
      e.name || '',
      e.email || '',
      e.created_at ? new Date(e.created_at).toISOString().split('T')[0] : '',
      (e.pain_points || []).map(ppToLabel).join('; '),
      e.pain_points_other || '',
      e.current_method ? pp2ToLabel(e.current_method) : '',
      e.survey_status || 'pending',
      e.survey_completed_at || '',
    ]);

    const csvContent =
      headers.join(',') + '\n' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `waitlist-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Kunde inte exportera: ' + (err.message || 'Okänt fel'));
  }
}

// ─── Helper ─────────────────────────────────────────────────────────
function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function esc(str) {
  if (str == null) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ─── Delete ─────────────────────────────────────────────────────────
function showWaitlistDeleteModal(id) {
  wlPendingDeleteId = id;
  const modal = document.getElementById('waitlistDeleteModal');
  if (modal) modal.classList.remove('hidden');
}

function hideWaitlistDeleteModal() {
  wlPendingDeleteId = null;
  const modal = document.getElementById('waitlistDeleteModal');
  if (modal) modal.classList.add('hidden');
}

async function executeWaitlistDelete() {
  if (!wlPendingDeleteId) return;
  const btn = document.getElementById('waitlistDeleteConfirmBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Tar bort...';
  }
  try {
    await Auth.api(`/api/admin/waitlist/${wlPendingDeleteId}`, { method: 'DELETE' });
    hideWaitlistDeleteModal();
    fetchWaitlistData();
    fetchWaitlistStats();
  } catch (err) {
    alert('Kunde inte ta bort: ' + (err.message || 'Okänt fel'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Ta bort';
    }
  }
}