/**
 * Tillväxt pipeline — Fas 3C unified lead view.
 */
(function () {
  const STATUS_LABELS = {
    ny: 'Ny',
    kontaktad: 'Kontaktad',
    kvalificerad: 'Kvalificerad',
    konverterad: 'Konverterad',
    avslutad: 'Avslutad',
  };

  const TYPE_LABELS = { package: 'Paket', pedagog: 'Pedagog', waitlist: 'Waitlist' };

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  async function loadGrowthPipeline() {
    const container = document.getElementById('growthPipelineContainer');
    if (!container) return;
    container.innerHTML = '<p class="text-text-soft text-sm">Laddar pipeline...</p>';

    try {
      const status = document.getElementById('pipelineStatusFilter')?.value || '';
      const type = document.getElementById('pipelineTypeFilter')?.value || '';
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      const data = await Auth.api('/api/admin/growth-pipeline?' + params.toString());

      const counts = (data.statusCounts || []).map((c) =>
        `<span class="px-2 py-1 rounded bg-sky text-xs font-semibold">${esc(STATUS_LABELS[c.lead_status] || c.lead_status)}: ${c.count}</span>`
      ).join(' ');

      const rows = (data.leads || []).map((lead) => `
        <tr class="border-b border-lavender/50">
          <td class="py-2 pr-3 text-sm">${esc(TYPE_LABELS[lead.source_type] || lead.source_type)}</td>
          <td class="py-2 pr-3 font-semibold text-navy">${esc(lead.title)}</td>
          <td class="py-2 pr-3 text-sm text-text-soft">${esc(lead.meta || '')}</td>
          <td class="py-2 pr-3">
            <select class="pipeline-status-select text-sm border border-lavender rounded px-2 py-1" data-type="${lead.source_type}" data-id="${lead.id}">
              ${Object.keys(STATUS_LABELS).map((s) => `<option value="${s}" ${lead.lead_status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
            </select>
          </td>
          <td class="py-2 pr-3 text-xs text-text-soft">${lead.created_at ? new Date(lead.created_at).toLocaleDateString('sv-SE') : ''}</td>
          <td class="py-2">${lead.family_id ? `<button type="button" onclick="openFamilyHub('${lead.family_id}')" class="text-xs font-bold text-gold">Familj</button>` : ''}</td>
        </tr>`).join('');

      container.innerHTML = `
        <div class="flex flex-wrap gap-2 mb-4">${counts || '<span class="text-text-soft text-sm">Inga leads ännu</span>'}</div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="text-left text-text-soft border-b">
              <th class="py-2">Typ</th><th class="py-2">Namn</th><th class="py-2">Meta</th><th class="py-2">Status</th><th class="py-2">Datum</th><th class="py-2"></th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="py-8 text-center text-text-soft">Inga leads</td></tr>'}</tbody>
          </table>
        </div>`;

      container.querySelectorAll('.pipeline-status-select').forEach((sel) => {
        sel.addEventListener('change', async () => {
          await Auth.api('/api/admin/growth-leads/' + sel.dataset.type + '/' + sel.dataset.id, {
            method: 'PATCH',
            body: JSON.stringify({ lead_status: sel.value }),
          });
        });
      });
    } catch (e) {
      console.error('[PIPELINE]', e);
      container.innerHTML = '<p class="text-red-500 text-sm">Kunde inte ladda pipeline</p>';
    }
  }

  window.loadGrowthPipeline = loadGrowthPipeline;
})();
