// Shared: nyhetsbrev e-poststatistik (öppnat / klickat via Resend webhooks).
// Used by admin-newsletter.js and admin-dagensnyhet.js.

(function () {
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

  function buildTrackingNote(stats) {
    const tracking = stats.tracking || {};
    const lines = [];
    const domain = tracking.domain_tracking || {};
    const events = tracking.webhook_events_30d || {};

    if (stats.no_tracking) {
      lines.push('Ingen per-mottagare-spårning för detta utskick (skickat före spårning aktiverades). Antal mottagare från utskicksloggen.');
      return lines.join(' ');
    }

    if (!tracking.webhook_configured) {
      lines.push('Webhook saknas i servern (RESEND_WEBHOOK_SECRET). Öppningar och klick kan inte registreras förrän secret är satt och webhook är konfigurerad i Resend.');
    } else if (stats.sent > 0 && (stats.delivered || 0) === 0) {
      lines.push('Inga leveranshändelser mottagna från Resend ännu. Kontrollera att webhook i Resend Dashboard pekar på ' + (tracking.webhook_url || '/api/resend/webhook') + ' och lyssnar på email.delivered, email.opened och email.clicked.');
    } else if (tracking.tracking_likely_disabled) {
      const domainName = domain.domain || 'avsändardomänen';
      lines.push('Öppning/klick-spårning verkar vara avstängd i Resend för ' + domainName + '. Gå till Resend → Domains → Configuration: aktivera Open tracking och Click tracking, lägg till tracking-subdomän (t.ex. links) och verifiera CNAME-posten.');
    } else if (stats.sent > 0 && stats.opened_unique === 0 && stats.clicked_unique === 0
      && (events['email.delivered'] || 0) > 0
      && (events['email.opened'] || 0) === 0
      && (events['email.clicked'] || 0) === 0) {
      lines.push('Webhook tar emot leveranser men inga email.opened/email.clicked från Resend. Kontrollera att webhook lyssnar på dessa händelser och att spårning är aktiv för domänen.');
    } else if (stats.sent > 0 && stats.opened_unique === 0 && stats.clicked_unique === 0) {
      lines.push('Webhook verkar fungera (levererat registreras), men inga öppningar/klick ännu. Vissa mailklienter (t.ex. Apple Mail Privacy Protection) blockerar öppningsspårning. Klick på länkar i mailet ska dock registreras om tracking-subdomän är aktiv i Resend.');
    } else {
      lines.push('Öppningsfrekvens från Resend — kan vara lägre än verkligheten p.g.a. mailklienters integritetsskydd.');
    }

    if ((events['email.opened'] || 0) > 0 && stats.opened_unique === 0) {
      lines.push('Varning: webhook har mottagit öppningshändelser som inte matchar detta utskick — kontakta support om siffrorna verkar fel.');
    }

    if (domain.available && domain.tracking_active) {
      lines.push('Resend-spårning aktiv för ' + domain.domain + (domain.tracking_subdomain ? ' (' + domain.tracking_subdomain + ').' : '.'));
    } else if (domain.available === false && domain.reason) {
      lines.push('Kunde inte läsa Resend-domänstatus: ' + domain.reason);
    }

    if (tracking.webhook_url && !lines.some((l) => l.includes(tracking.webhook_url))) {
      lines.push('Webhook-URL: ' + tracking.webhook_url);
    }

    return lines.join(' ');
  }

  function statsButtonHtml(id, label) {
    return `<button type="button" id="${id}"
      class="text-xs text-sky-800 font-semibold px-2 py-0.5 rounded-lg bg-sky/40 hover:bg-sky border border-sky transition-colors"
      title="Visa vem som öppnat och klickat">${esc(label)}</button>`;
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
        tracking: {},
      };
    }
    await showDetailModal(title, stats, recipientsUrl);
  }

  async function loadBadge(el, statsUrl, recipientsUrl, title, fallbackSent) {
    if (!el) return;

    const open = () => openCampaign(statsUrl, recipientsUrl, title, fallbackSent);
    el.innerHTML = statsButtonHtml(el.id + '-btn', '📊 Statistik');
    el.classList.remove('hidden');
    const btn = el.querySelector('button');
    if (btn) btn.onclick = open;

    const stats = await fetchJson(statsUrl);
    if (stats && stats.sent > 0 && btn) {
      btn.textContent = formatBadge(stats);
    }
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
      ? '<p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">' + esc(buildTrackingNote(stats)) + '</p>'
      : '';

    const trackingNote = !stats.no_tracking
      ? '<p class="text-xs text-text-soft bg-sky/30 border border-sky rounded-lg px-3 py-2">' + esc(buildTrackingNote(stats)) + '</p>'
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
            ${trackingNote}
            <p><strong>Skickat:</strong> ${stats.sent} · <strong>Levererat:</strong> ${stats.delivered || 0} · <strong>Öppnat:</strong> ${stats.opened_unique} (${stats.open_rate}%) · <strong>Klick:</strong> ${stats.clicked_unique} (${stats.click_rate}%)</p>
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

  window.AdminEmailStats = {
    formatBadge,
    loadBadge,
    openCampaign,
    showDetailModal,
    closeModal,
  };
})();
