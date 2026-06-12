// Shared: nyhetsbrev e-poststatistik (öppnat / klickat via Resend webhooks).
// Used by admin-newsletter.js and admin-dagensnyhet.js.

(function () {
  function esc(s) {
    if (typeof window.esc === 'function') return window.esc(s);
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function formatBadge(stats) {
    if (!stats || !stats.sent) return '';
    let text = `📬 ${stats.open_rate}% öppnat (${stats.opened_unique}/${stats.sent})`;
    if (stats.clicked_unique > 0) {
      text += ` · 👆 ${stats.click_rate}% klick (${stats.clicked_unique}/${stats.sent})`;
    }
    return text;
  }

  async function fetchJson(url) {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) return null;
    return r.json();
  }

  async function loadBadge(el, statsUrl, recipientsUrl, title) {
    if (!el) return;
    const stats = await fetchJson(statsUrl);
    if (!stats || !stats.sent) {
      el.textContent = '';
      el.classList.add('hidden');
      return;
    }
    el.textContent = formatBadge(stats);
    el.classList.remove('hidden');
    el.classList.add('cursor-pointer', 'underline', 'decoration-dotted');
    el.onclick = () => showDetailModal(title, stats, recipientsUrl);
  }

  async function showDetailModal(title, stats, recipientsUrl) {
    const existing = document.getElementById('emailStatsDetailModal');
    if (existing) existing.remove();

    const recipients = await fetchJson(recipientsUrl) || [];
    const rows = recipients.map((r) => {
      const opened = r.first_opened_at
        ? new Date(r.first_opened_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })
        : '—';
      const clicked = r.first_clicked_at
        ? `${r.click_count || 1}×`
        : '—';
      return `<tr class="border-b border-lavender/40">
        <td class="py-2 pr-3 font-medium text-navy">${esc(r.name)}</td>
        <td class="py-2 pr-3 text-text-soft text-xs">${esc(r.email)}</td>
        <td class="py-2 pr-3 text-xs">${opened}</td>
        <td class="py-2 text-xs">${clicked}</td>
      </tr>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'emailStatsDetailModal';
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onclick="AdminEmailStats.closeModal(event)">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden" onclick="event.stopPropagation()">
          <div class="bg-gradient-to-r from-sky to-lavender px-6 py-4 flex items-center justify-between">
            <div>
              <h3 class="font-heading font-bold text-navy text-lg">📊 E-poststatistik</h3>
              <p class="text-navy/70 text-xs mt-0.5">${esc(title)}</p>
            </div>
            <button type="button" onclick="AdminEmailStats.closeModal()" class="text-navy/60 hover:text-navy text-2xl leading-none font-bold">&times;</button>
          </div>
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50 text-sm text-navy space-y-1">
            <p><strong>Skickat:</strong> ${stats.sent} · <strong>Öppnat:</strong> ${stats.opened_unique} (${stats.open_rate}%) · <strong>Klick:</strong> ${stats.clicked_unique} (${stats.click_rate}%)</p>
            <p class="text-xs text-text-soft">Öppningsfrekvens från Resend — kan vara lägre än verkligheten (t.ex. Apple Mail Privacy).</p>
          </div>
          <div class="flex-1 overflow-y-auto px-4 py-3">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-text-soft border-b border-lavender">
                  <th class="pb-2 pr-3">Namn</th>
                  <th class="pb-2 pr-3">E-post</th>
                  <th class="pb-2 pr-3">Öppnat</th>
                  <th class="pb-2">Klick</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="4" class="py-6 text-center text-text-soft">Ingen per-mottagare-data</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  function closeModal(event) {
    if (event && event.target && !event.target.id && event.target.closest('.bg-white')) return;
    const m = document.getElementById('emailStatsDetailModal');
    if (m) m.remove();
  }

  window.AdminEmailStats = {
    formatBadge,
    loadBadge,
    showDetailModal,
    closeModal,
  };
})();
