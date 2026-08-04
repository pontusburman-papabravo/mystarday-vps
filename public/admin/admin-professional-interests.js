/**
 * Admin — pedagog/professional interest signups (Pedagogintresse).
 */
(function () {
  'use strict';

  let intEntries = [];
  let intTotal = 0;
  let intOffset = 0;
  const intLimit = 50;
  let intPendingDeleteId = null;
  let domBound = false;

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  async function loadInterests() {
    intOffset = 0;
    fetchInterestsData();
  }

  async function fetchInterestsData() {
    const container = document.getElementById('interestsContainer');
    if (!container) return;
    container.innerHTML = '<p class="text-text-soft text-sm">Laddar...</p>';
    try {
      const params = new URLSearchParams({ limit: intLimit, offset: intOffset });
      const data = await Auth.api(`/api/admin/professional-interests?${params}`);
      intEntries = data.interests || [];
      intTotal = data.total || 0;
      const badge = document.getElementById('interestsBadge');
      if (badge) {
        badge.textContent = intTotal;
        badge.classList.remove('hidden');
      }
      renderInterestsTable(intEntries);
      renderInterestsPagination(intTotal, intLimit, intOffset);
    } catch (err) {
      if (container) {
        container.innerHTML =
          '<p class="text-red-500 text-sm">Kunde inte ladda intresseanmälningar: ' +
          esc(err.message || 'Okänt fel') +
          '</p>';
      }
    }
  }

  function renderInterestsTable(entries) {
    const container = document.getElementById('interestsContainer');
    if (!container) return;
    if (!entries.length) {
      container.innerHTML = '<p class="text-text-soft text-sm italic">Inga intresseanmälningar ännu.</p>';
      return;
    }
    container.innerHTML = `
        <div class="overflow-x-auto rounded-2xl border-2 border-lavender mb-4">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-sky text-text-soft text-xs font-semibold uppercase tracking-wide">
                <th class="px-4 py-3 text-left">#</th>
                <th class="px-4 py-3 text-left">Namn</th>
                <th class="px-4 py-3 text-left">E-post</th>
                <th class="px-4 py-3 text-left">Roll</th>
                <th class="px-4 py-3 text-left">Organisation</th>
                <th class="px-4 py-3 text-left">Datum</th>
                <th class="px-4 py-3 text-left">Radera</th>
              </tr>
            </thead>
            <tbody>
              ${entries
                .map(
                  (e, i) => `
                <tr class="border-b border-lavender/50 hover:bg-sky/50 transition-colors">
                  <td class="px-4 py-3 text-text-soft">${intOffset + i + 1}</td>
                  <td class="px-4 py-3 font-semibold text-navy">${esc(e.name || '')}</td>
                  <td class="px-4 py-3"><a href="mailto:${esc(e.email || '')}" class="text-gold hover:underline text-sm">${esc(e.email || '')}</a></td>
                  <td class="px-4 py-3 text-sm text-text-soft">${esc(e.role || '')}</td>
                  <td class="px-4 py-3 text-sm text-text-soft">${esc(e.organization || '—')}</td>
                  <td class="px-4 py-3 text-sm text-text-soft">${e.created_at ? new Date(e.created_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                  <td class="px-4 py-3">
                    <button onclick="showInterestsDeleteModal(${e.id})" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors border border-red-200" style="min-height:32px;min-width:44px;">
                      🗑 Radera
                    </button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>`;
  }

  function renderInterestsPagination(total, limit, offset) {
    const container = document.getElementById('interestsPagination');
    if (!container) return;
    if (total <= limit) {
      container.innerHTML = `<p class="text-text-soft text-sm">Visar ${total} av ${total}</p>`;
      return;
    }
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    container.innerHTML = `
        <p class="text-text-soft text-sm">Visar ${offset + 1}–${Math.min(offset + limit, total)} av ${total}</p>
        <div class="flex gap-2">
          <button onclick="intGoPage(${currentPage - 2})" class="px-3 py-2 bg-navy text-white rounded-xl text-sm font-semibold transition-colors" ${currentPage <= 1 ? 'disabled' : ''}>← Föregående</button>
          <button onclick="intGoPage(${currentPage})" class="px-3 py-2 bg-navy text-white rounded-xl text-sm font-semibold transition-colors" ${currentPage >= totalPages ? 'disabled' : ''}>Nästa →</button>
        </div>`;
  }

  function intGoPage(pageIndex) {
    intOffset = pageIndex * intLimit;
    fetchInterestsData();
  }

  async function exportInterestsCsv() {
    try {
      const data = await Auth.api('/api/admin/professional-interests?limit=9999&offset=0');
      const entries = data.interests || [];
      const headers = ['#', 'Namn', 'E-post', 'Roll', 'Organisation', 'Meddelande', 'Datum'];
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
        headers.join(',') +
        '\n' +
        rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `intresseanmalningar-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Kunde inte exportera: ' + (err.message || 'Okänt fel'));
    }
  }

  function showInterestsDeleteModal(id) {
    intPendingDeleteId = id;
    const modal = document.getElementById('interestsDeleteModal');
    if (modal) modal.classList.remove('hidden');
  }

  function hideInterestsDeleteModal() {
    intPendingDeleteId = null;
    const modal = document.getElementById('interestsDeleteModal');
    if (modal) modal.classList.add('hidden');
  }

  async function executeInterestsDelete() {
    if (!intPendingDeleteId) return;
    const btn = document.getElementById('interestsDeleteConfirmBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Tar bort...';
    }
    try {
      await Auth.api(`/api/admin/professional-interests/${intPendingDeleteId}`, { method: 'DELETE' });
      hideInterestsDeleteModal();
      fetchInterestsData();
    } catch (err) {
      alert('Kunde inte ta bort: ' + (err.message || 'Okänt fel'));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Ta bort';
      }
    }
  }

  function bindProfessionalInterestsDom() {
    if (domBound) return;
    domBound = true;
    const exportBtn = document.getElementById('interestsExportCsv');
    if (exportBtn) exportBtn.addEventListener('click', exportInterestsCsv);
    const refreshBtn = document.getElementById('interestsRefreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadInterests);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindProfessionalInterestsDom);
  } else {
    bindProfessionalInterestsDom();
  }

  window.loadInterests = loadInterests;
  window.intGoPage = intGoPage;
  window.showInterestsDeleteModal = showInterestsDeleteModal;
  window.hideInterestsDeleteModal = hideInterestsDeleteModal;
  window.executeInterestsDelete = executeInterestsDelete;
})();
