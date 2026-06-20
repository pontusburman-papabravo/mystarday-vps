// Admin: Professional Interests — list, CSV export, delete
// ─── State ───────────────────────────────────────────────────────────
let intOffset = 0;
let intLimit = 100;
let intTotal = 0;
let intEntries = [];

// ─── Init ────────────────────────────────────────────────────────────
function loadInterests() {
  intOffset = 0;
  fetchInterests();
}

// ─── Fetch ──────────────────────────────────────────────────────────
async function fetchInterests() {
  try {
    const params = new URLSearchParams({ limit: intLimit, offset: intOffset });
    const data = await Auth.api(`/api/admin/professional-interests?${params}`);
    intEntries = data.interests || [];
    intTotal = data.total || 0;
    renderInterestsTable(intEntries);
    renderInterestsPagination(intTotal);
    const badge = document.getElementById('interestsBadge');
    if (badge) {
      badge.textContent = intTotal;
      badge.classList.remove('hidden');
    }
  } catch (err) {
    renderInterestsTableError('Kunde inte ladda intresseanmälningar: ' + (err.message || 'Okänt fel'));
  }
}

// ─── Table renderer ──────────────────────────────────────────────────
function renderInterestsTable(entries) {
  const tbody = document.getElementById('interestsTableBody');
  if (!tbody) return;
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-text-soft py-8"><p class="font-semibold text-navy mb-1">Inga pedagogintressen ännu</p><p class="text-sm">Nya intresseanmälningar från pedagogsidan visas här.</p></td></tr>';
    return;
  }
  tbody.innerHTML = entries.map((e, i) => {
    const rowNum = intOffset + i + 1;
    const date = e.created_at
      ? new Date(e.created_at).toLocaleDateString('sv-SE', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '—';
    return `<tr class="border-b border-lavender/50 hover:bg-sky/50 transition-colors">
      <td class="px-4 py-3 text-text-soft text-sm">${rowNum}</td>
      <td class="px-4 py-3 font-semibold text-navy">${esc(e.name || '')}</td>
      <td class="px-4 py-3"><a href="mailto:${esc(e.email || '')}" class="text-gold hover:underline text-sm">${esc(e.email || '')}</a></td>
      <td class="px-4 py-3 text-sm text-text-soft">${esc(e.role || '')}</td>
      <td class="px-4 py-3 text-sm text-text-soft max-w-36 truncate" title="${esc(e.organization || '')}">${esc(e.organization || '—')}</td>
      <td class="px-4 py-3 text-xs text-text-soft">${date}</td>
      <td class="px-4 py-3">
        <button
          onclick="confirmDeleteInterest(${e.id}, '${esc(e.name || '').replace(/'/g, "\\'")}')"
          class="px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors"
          style="min-height:44px;min-width:44px;"
          title="Radera"
        >🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function renderInterestsTableError(msg) {
  const tbody = document.getElementById('interestsTableBody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-8">${esc(msg)}</td></tr>`;
}

function renderInterestsPagination(total) {
  const container = document.getElementById('interestsPagination');
  if (!container) return;
  if (total <= intLimit) {
    container.innerHTML = `<p class="text-text-soft text-sm">Visar ${total} av ${total}</p>`;
    return;
  }
  const totalPages = Math.ceil(total / intLimit);
  const currentPage = Math.floor(intOffset / intLimit) + 1;
  const prevDisabled = intOffset === 0;
  const nextDisabled = intOffset + intLimit >= total;
  container.innerHTML = `
    <p class="text-text-soft text-sm">Visar ${intOffset + 1}–${Math.min(intOffset + intLimit, total)} av ${total}</p>
    <div class="flex gap-2">
      <button onclick="intGoPage(${currentPage - 2})" class="px-3 py-2 bg-navy text-white rounded-xl text-sm font-semibold transition-colors ${prevDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-navy-soft'}" ${prevDisabled ? 'disabled' : ''}>← Föregående</button>
      <button onclick="intGoPage(${currentPage})" class="px-3 py-2 bg-navy text-white rounded-xl text-sm font-semibold transition-colors ${nextDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-navy-soft'}" ${nextDisabled ? 'disabled' : ''}>Nästa →</button>
    </div>`;
}

function intGoPage(pageIndex) {
  intOffset = pageIndex * intLimit;
  fetchInterests();
}

// ─── CSV Export ─────────────────────────────────────────────────────
async function exportInterestsCsv() {
  try {
    const data = await Auth.api('/api/admin/professional-interests?limit=9999&offset=0');
    const entries = data.interests || [];

    const headers = ['#', 'Name', 'Email', 'Role', 'Organization', 'Message', 'Date'];
    const rows = entries.map((e, i) => [
      i + 1,
      e.name || '',
      e.email || '',
      e.role || '',
      e.organization || '',
      e.message || '',
      e.created_at ? new Date(e.created_at).toISOString().split('T')[0] : '',
    ]);

    const csvContent =
      headers.join(',') + '\n' +
      rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intresseanamlingar-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Kunde inte exportera: ' + (err.message || 'Okänt fel'));
  }
}

// ─── Delete ─────────────────────────────────────────────────────────
let pendingDeleteId = null;

function confirmDeleteInterest(id, name) {
  pendingDeleteId = id;
  const modal = document.getElementById('deleteInterestModal');
  const nameEl = document.getElementById('deleteInterestName');
  if (modal) {
    if (nameEl) nameEl.textContent = name || 'denna anmälan';
    modal.classList.remove('hidden');
  }
}

function closeDeleteInterestModal() {
  const modal = document.getElementById('deleteInterestModal');
  if (modal) modal.classList.add('hidden');
  pendingDeleteId = null;
}

async function executeDeleteInterest() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  pendingDeleteId = null;
  closeDeleteInterestModal();

  try {
    await Auth.api(`/api/admin/professional-interests/${id}`, { method: 'DELETE' });
    fetchInterests();
  } catch (err) {
    alert('Kunde inte ta bort: ' + (err.message || 'Okänt fel'));
  }
}

// ─── Init ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const exportBtn = document.getElementById('interestsExportCsv');
  if (exportBtn) exportBtn.addEventListener('click', exportInterestsCsv);

  const refreshBtn = document.getElementById('interestsRefreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadInterests);
});

// ─── Helper ─────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}