// Shared: nyhetsbrev e-poststatistik (öppnat / klickat via Resend webhooks).
// Used by admin-newsletter.js and admin-dagensnyhet.js.

(function () {
  const BTN_CLASS = 'js-email-stats-btn text-xs px-2 py-1 rounded-lg bg-gold hover:bg-yellow-500 text-navy font-semibold transition-colors border border-gold cursor-pointer inline-flex items-center gap-1';

  function esc(s) {
    if (typeof window.esc === 'function') return window.esc(s);
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  async function fetchJson(url) {
    try {
      if (typeof Auth !== 'undefined' && Auth.api) {
        return await Auth.api(url);
      }
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) return null;
      return r.json();
    } catch (_) {
      return null;
    }
  }

  function formatBadge(stats) {
    if (!stats || !stats.sent) return '📊 Statistik';
    let text = `📬 ${stats.open_rate}% öppnat (${stats.opened_unique}/${stats.sent})`;
    if (stats.clicked_unique > 0) {
      text += ` · 👆 ${stats.click_rate}% klick (${stats.clicked_unique}/${stats.sent})`;
    }
    return text;
  }

  /** Inline HTML — synlig direkt i listan, ingen async-span behövs. */
  function renderButton(statsUrl, recipientsUrl, title, fallbackSent) {
    return `<button type="button"
      class="${BTN_CLASS}"
      data-stats-url="${esc(statsUrl)}"
      data-recipients-url="${esc(recipientsUrl)}"
      data-title="${esc(title || 'Nyhetsbrev')}"
      data-fallback-sent="${esc(String(fallbackSent || 0))}"
      title="Visa vem som öppnat och klickat">📊 Statistik</button>`;
  }

  async function openCampaign(statsUrl, recipientsUrl, title, fallbackSent) {
    let stats = await fetchJson(statsUrl);
    if (!stats || !stats.sent) {
      stats = {
        sent: fallbackSent || 0,
        delivered: 0,
        opened_unique: 0,
        opened_total: 0,
        clicked_unique: 0,
        clicked_total: 0,
        open_rate: 0,
        click_rate: 0,
        no_tracking: true,
      };
    }
    await showDetailModal(title, stats, recipientsUrl);
  }

  function openFromButton(btn) {
    if (!btn || !btn.dataset) return;
    return openCampaign(
      btn.dataset.statsUrl,
      btn.dataset.recipientsUrl,
      btn.dataset.title,
      parseInt(btn.dataset.fallbackSent, 10) || 0
    );
  }

  async function enrichButton(btn) {
    if (!btn || !btn.dataset.statsUrl) return;
    const stats = await fetchJson(btn.dataset.statsUrl);
    if (stats && stats.sent > 0) {
      btn.textContent = formatBadge(stats);
    }
  }

  async function enrichButtons(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const buttons = scope.querySelectorAll('.js-email-stats-btn');
    await Promise.all(Array.from(buttons).map(enrichButton));
  }

  /** @deprecated — use renderButton + enrichButtons */
  async function loadBadge(el, statsUrl, recipientsUrl, title, fallbackSent) {
    if (!el) return;
    el.innerHTML = renderButton(statsUrl, recipientsUrl, title, fallbackSent);
    el.classList.remove('hidden');
    const btn = el.querySelector('.js-email-stats-btn');
    if (btn) await enrichButton(btn);
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

    const noTrackingNote = stats.no_tracking
      ? '<p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Ingen per-mottagare-spårning för detta utskick (skickat före spårning aktiverades). Antal mottagare från utskicksloggen.</p>'
      : '';

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
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50 text-sm text-navy space-y-2">
            ${noTrackingNote}
            <p><strong>Skickat:</strong> ${stats.sent} · <strong>Öppnat:</strong> ${stats.opened_unique} (${stats.open_rate}%) · <strong>Klick:</strong> ${stats.clicked_unique} (${stats.click_rate}%)</p>
            <p class="text-xs text-text-soft">Öppningsfrekvens från Resend — kräver tracking-subdomän + webhook. Kan vara lägre än verkligheten.</p>
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
              <tbody>${rows || '<tr><td colspan="4" class="py-6 text-center text-text-soft">Ingen per-mottagare-data för detta utskick</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  function closeModal(event) {
    if (event && event.target && event.target.closest && event.target.closest('.bg-white')) return;
    const m = document.getElementById('emailStatsDetailModal');
    if (m) m.remove();
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.js-email-stats-btn');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    openFromButton(btn);
  });

  window.AdminEmailStats = {
    formatBadge,
    renderButton,
    enrichButtons,
    loadBadge,
    openCampaign,
    showDetailModal,
    closeModal,
  };
})();
