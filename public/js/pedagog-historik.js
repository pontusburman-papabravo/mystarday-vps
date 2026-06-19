/**
 * Pedagog historik — senaste dagar med anteckningsstatus (§4.4.13, E12).
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function statusLabel(note) {
    if (!note) return 'Saknas';
    if (note.note_status === 'locked') return 'Låst';
    if (note.note_status === 'published' || note.is_draft === false) return 'Publicerad';
    return 'Utkast';
  }

  async function load() {
    const main = document.getElementById('pedagogHistorikMain');
    if (!main) return;

    main.innerHTML = '<p class="text-text-soft text-sm py-8 text-center">Laddar historik…</p>';

    const { children } = await Auth.api('/api/pedagog-notes/children');
    if (!children?.length) {
      main.innerHTML = '<p class="text-text-soft text-center py-12">Inga barn kopplade.</p>';
      return;
    }

    const child = children[0];
    const to = new Date().toLocaleDateString('sv-SE');
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 13);
    const from = fromDate.toLocaleDateString('sv-SE');

    const { notes } = await Auth.api(
      `/api/pedagog-notes?childId=${child.id}&from=${from}&to=${to}`
    );

    const byDate = {};
    (notes || []).forEach((n) => {
      const ds = String(n.date).slice(0, 10);
      byDate[ds] = n;
    });

    const rows = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toLocaleDateString('sv-SE');
      const note = byDate[ds];
      rows.push({ date: ds, note });
    }

    main.innerHTML = `
      <h1 class="text-2xl font-bold mb-2">Historik</h1>
      <p class="text-text-soft text-sm mb-4">${esc(child.name)} — senaste 14 dagarna</p>
      <div class="space-y-2">
        ${rows.map((r) => `
          <a href="/pedagog-dag?child=${child.id}&date=${r.date}" class="flex justify-between items-center bg-white border border-lavender rounded-xl px-4 py-3 hover:border-gold">
            <span class="text-sm font-medium">${r.date}</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-sky text-navy">${statusLabel(r.note)}</span>
          </a>
        `).join('')}
      </div>`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login?next=' + encodeURIComponent('/pedagog-historik');
      return;
    }
    try {
      await load();
    } catch (err) {
      document.getElementById('pedagogHistorikMain').innerHTML =
        `<p class="text-red-600 text-center py-12">${esc(err.message)}</p>`;
    }
  });
})();
