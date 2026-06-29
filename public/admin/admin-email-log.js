// Admin Email Log: send log + approval panel for win-back emails.
// Owns: loading log, approve/reject actions, summary stats, return tracking.
// Does NOT own: email template editing, actual send delivery.

(function () {
  'use strict';

  let emailLogData = { records: [], summary: {} };
  let emailLogActiveTab = 'all';
  let emailLogPendingCount = 0;
  let emailLogLoading = false;
  let emailLogAutoApprove = true;

  const STATUS_LABELS = {
    pending_approval: { label: '⏳ Väntar godkännande', class: 'bg-yellow-100 text-yellow-800' },
    approved: { label: '✅ Godkänd', class: 'bg-green-100 text-green-800' },
    sent: { label: '📤 Skickat', class: 'bg-blue-100 text-blue-800' },
    rejected: { label: '❌ Avvisat', class: 'bg-gray-200 text-gray-600' },
    failed: { label: '⚠️ Misslyckades', class: 'bg-red-100 text-red-800' },
  };

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatGoalSlug(slug) {
    if (!slug) return '';
    return slug.replace(/-/g, ' ');
  }

  function formatShortDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
  }

  function apiWithTimeout(url, options, ms = 20000) {
    return Promise.race([
      Auth.api(url, options),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout efter ${ms / 1000}s — ${url}`)), ms);
      }),
    ]);
  }

  function renderEngagementCell(record) {
    if (record.status !== 'sent' || !record.sent_at) {
      return '<span class="text-xs text-text-soft">—</span>';
    }

    const e = record.engagement;
    if (!e) {
      return '<span class="text-xs text-text-soft">—</span>';
    }

    const parts = [];

    if (e.returned) {
      const days = e.days_to_return != null ? ` (${e.days_to_return}d)` : '';
      parts.push(`<span class="text-green-700 font-semibold">✓ ${e.completions_after_send} avbockning${e.completions_after_send === 1 ? '' : 'ar'}${days}</span>`);
      const when = e.first_completion_at || e.first_return_at;
      if (when) {
        parts.push(`<span class="block text-xs text-text-soft">${esc(formatShortDate(when))}</span>`);
      }
    } else if (e.had_diagnostic_activity) {
      const source = e.return_source_label ? ` via ${esc(e.return_source_label)}` : '';
      parts.push(`<span class="text-amber-700">Besök${source} — ingen avbockning</span>`);
      const when = e.first_login_at || e.first_return_at;
      if (when) {
        parts.push(`<span class="block text-xs text-text-soft">${esc(formatShortDate(when))}</span>`);
      }
    } else {
      parts.push('<span class="text-text-soft">Ingen avbockning</span>');
    }

    if (e.for_dig_goal_slug) {
      parts.push(`<span class="block text-xs text-navy mt-1">För dig: ${esc(formatGoalSlug(e.for_dig_goal_slug))}</span>`);
    }

    if (e.win_back_landings > 0) {
      parts.push(`<span class="block text-xs text-text-soft mt-0.5">Klickade mejllänken</span>`);
    }

    return parts.join('');
  }

  async function loadEmailLog(force) {
    const container = document.getElementById('emailLogContainer');
    if (!container) return;
    if (emailLogLoading && !force) return;

    emailLogLoading = true;
    container.innerHTML = '<div class="text-center py-12 text-text-soft">Laddar logg…</div>';

    try {
      const [data, pending, autoApprove] = await Promise.all([
        apiWithTimeout('/api/admin/email-log'),
        apiWithTimeout('/api/admin/email-log/pending'),
        apiWithTimeout('/api/admin/email-log/auto-approve').catch(() => null),
      ]);
      emailLogData = {
        records: Array.isArray(data?.records) ? data.records : [],
        summary: data?.summary || {},
      };
      emailLogPendingCount = Array.isArray(pending) ? pending.length : 0;
      if (autoApprove && typeof autoApprove.enabled === 'boolean') {
        emailLogAutoApprove = autoApprove.enabled;
      }
      renderEmailLogUI();
    } catch (err) {
      const detail = err.body?.detail;
      container.innerHTML = `<p class="text-red-500">Kunde inte ladda email-logg: ${esc(err.message)}${detail ? `<br><span class="text-xs font-mono">${esc(detail)}</span>` : ''}</p>`;
    } finally {
      emailLogLoading = false;
    }
  }

  function renderEmailLogUI() {
    const container = document.getElementById('emailLogContainer');
    if (!container) return;

    const s = emailLogData.summary || {};
    const eng = s.engagement || {};
    const records = emailLogData.records || [];
    const pending = emailLogPendingCount;
    const attrDays = eng.attribution_days || 14;
    const staleHours = eng.stale_pending_hours || 168;

    container.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div class="bg-white border-2 border-lavender rounded-2xl p-4 text-center">
        <div class="text-2xl font-bold text-navy">${s.sent_count || 0}</div>
        <div class="text-xs text-text-soft mt-1">Skickade mejl</div>
      </div>
      <div class="bg-white border-2 border-lavender rounded-2xl p-4 text-center">
        <div class="text-2xl font-bold text-yellow-700">${pending}</div>
        <div class="text-xs text-text-soft mt-1">Väntar godkännande</div>
      </div>
      <div class="bg-white border-2 border-lavender rounded-2xl p-4 text-center">
        <div class="text-2xl font-bold text-navy">${s.sent_7d || 0}</div>
        <div class="text-xs text-text-soft mt-1">Win-back (7 dagar)</div>
      </div>
      <div class="bg-white border-2 border-lavender rounded-2xl p-4 text-center">
        <div class="text-2xl font-bold text-navy">${s.sent_30d || 0}</div>
        <div class="text-xs text-text-soft mt-1">Win-back (30 dagar)</div>
      </div>
    </div>

    <div class="bg-sky/40 border-2 border-lavender rounded-2xl p-5 mb-6">
      <h4 class="text-sm font-bold text-navy mb-3">Uppföljning efter utskick <span class="font-normal text-text-soft">(${attrDays} dagar — primärt avbockningar)</span></h4>
      <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div class="bg-white rounded-xl p-3 text-center border-2 border-green-300">
          <div class="text-xl font-bold text-green-700">${eng.active_completions_14d ?? 0}</div>
          <div class="text-xs text-text-soft mt-1">Avbockningar inom ${attrDays}d</div>
        </div>
        <div class="bg-white rounded-xl p-3 text-center border-2 border-green-200">
          <div class="text-xl font-bold text-green-700">${eng.completion_rate_14d ?? 0}%</div>
          <div class="text-xs text-text-soft mt-1">Avbockningsgrad (${eng.sent_tracked ?? 0} skickade)</div>
        </div>
        <div class="bg-white rounded-xl p-3 text-center border border-lavender/50">
          <div class="text-xl font-bold text-navy">${eng.completions_within_7d ?? 0}</div>
          <div class="text-xs text-text-soft mt-1">Avbockning inom 7d</div>
        </div>
        <div class="bg-white rounded-xl p-3 text-center border border-lavender/50 opacity-80">
          <div class="text-xl font-bold text-navy">${eng.diagnostic_activity_14d ?? eng.returned_14d ?? 0}</div>
          <div class="text-xs text-text-soft mt-1">Besök/inloggning <span class="text-text-soft">(diagnostik)</span></div>
        </div>
        <div class="bg-white rounded-xl p-3 text-center border border-lavender/50 opacity-80">
          <div class="text-xl font-bold text-navy">${eng.win_back_landings_14d ?? 0}</div>
          <div class="text-xs text-text-soft mt-1">Klickade mejllänken</div>
        </div>
        <div class="bg-white rounded-xl p-3 text-center border border-lavender/50 opacity-80">
          <div class="text-xl font-bold text-navy">${eng.for_dig_14d ?? 0}</div>
          <div class="text-xs text-text-soft mt-1">Aktiverade För dig</div>
        </div>
      </div>
      <p class="text-xs text-text-soft mt-3">
        <strong>Primär KPI:</strong> avbockningar inom ${attrDays} dagar efter <code class="bg-white px-1 rounded">sent_at</code>.
        Inloggning och mejllänk är diagnostik — inte styr-KPI (se retention-migration-plan).
        Väntande poster auto-avvisas efter <strong>${staleHours}h</strong>.
      </p>
    </div>

    <div class="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-4">
      <div class="text-sm font-bold text-navy">Win-back v1 avvecklad</div>
      <p class="text-xs text-text-soft mt-1 max-w-2xl">
        Automatiska win-back-utskick är avstängda (<code class="bg-white px-1 rounded">WIN_BACK_ENABLED=false</code>).
        Historiska mejl visas nedan. Nya retention-utskick styrs av Journey Gate.
      </p>
    </div>

    <div class="bg-white border-2 border-lavender rounded-2xl p-4 mb-4 flex items-center justify-between gap-4 flex-wrap opacity-60">
      <div>
        <div class="text-sm font-bold text-navy">Auto-godkännande av win-back</div>
        <p class="text-xs text-text-soft mt-0.5 max-w-md">
          ${emailLogAutoApprove
    ? 'På — mejl skickas <strong>automatiskt</strong> till inaktiva familjer. Stäng av för att granska varje mejl manuellt.'
    : 'Av — mejl hamnar i fliken <strong>Väntar</strong> och skickas först när du godkänner dem.'}
        </p>
      </div>
      <button type="button" onclick="toggleWinBackAutoApprove()"
        role="switch" aria-checked="${emailLogAutoApprove ? 'true' : 'false'}"
        class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${emailLogAutoApprove ? 'bg-green-500' : 'bg-gray-300'}">
        <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${emailLogAutoApprove ? 'translate-x-6' : 'translate-x-1'}"></span>
      </button>
    </div>

    <div class="flex flex-wrap gap-3 mb-8 opacity-60">
      <button type="button" disabled title="Win-back v1 avvecklad — WIN_BACK_ENABLED=false"
        class="px-4 py-2 bg-gray-300 text-gray-500 rounded-xl text-sm font-semibold cursor-not-allowed">
        ↺ Kör win-back nu (avvecklad)
      </button>
      <button type="button" onclick="loadEmailLog(true)"
        class="px-4 py-2 border-2 border-lavender rounded-xl text-sm font-semibold hover:bg-sky transition-colors">
        ↺ Uppdatera
      </button>
      <p class="text-xs text-text-soft self-center max-w-xl">
        Win-back v1 körs inte längre automatiskt. Historiska mejl kan fortfarande godkännas manuellt om poster finns kvar.
      </p>
    </div>

    <div class="flex gap-2 mb-6 flex-wrap">
      ${['all', 'pending_approval', 'sent', 'failed', 'rejected'].map((tab) => {
    const count = tab === 'all'
      ? records.length
      : records.filter((r) => r.status === tab).length;
    const label = tab === 'all' ? 'Alla' : tab === 'pending_approval' ? '⏳ Väntar' : tab === 'sent' ? '📤 Skickade' : tab === 'failed' ? '⚠️ Misslyckade' : '❌ Avvisade';
    const isActive = emailLogActiveTab === tab;
    return `<button type="button" onclick="switchEmailLogTab('${tab}')"
          class="px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${isActive ? 'bg-gold text-navy' : 'bg-sky text-navy hover:bg-lavender'}">${label} <span class="opacity-70">${count}</span></button>`;
  }).join('')}
    </div>

    <div class="bg-white border-2 border-lavender rounded-2xl overflow-x-auto">
      <table class="w-full text-sm min-w-[900px]">
        <thead>
          <tr class="bg-sky text-text-soft text-xs font-semibold uppercase tracking-wide">
            <th class="px-4 py-3 text-left">Datum</th>
            <th class="px-4 py-3 text-left">Mottagare</th>
            <th class="px-4 py-3 text-left">Familj / barn</th>
            <th class="px-4 py-3 text-left">Status</th>
            <th class="px-4 py-3 text-left">Uppföljning</th>
            <th class="px-4 py-3 text-right">Åtgärder</th>
          </tr>
        </thead>
        <tbody id="emailLogTableBody">
          ${renderEmailLogRows()}
        </tbody>
      </table>
      ${records.length === 0 ? '<div class="text-center py-8 text-text-soft">Inga mejl hittades</div>' : ''}
    </div>
  `;
  }

  function renderEmailLogRows() {
    const records = (emailLogData.records || []).filter((r) =>
      emailLogActiveTab === 'all' || r.status === emailLogActiveTab
    );
    if (records.length === 0) {
      return '<tr><td colspan="6" class="text-center py-8 text-text-soft">Inga poster i denna kategori</td></tr>';
    }

    return records.map((r) => {
      const statusInfo = STATUS_LABELS[r.status] || { label: r.status, class: 'bg-gray-100 text-gray-700' };
      const created = r.created_at
        ? new Date(r.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })
        : '—';
      const sentLine = r.sent_at
        ? `<span class="block text-xs text-green-700">Skickat ${esc(formatShortDate(r.sent_at))}</span>`
        : '';

      const actions = r.status === 'pending_approval'
        ? `<div class="flex gap-2 justify-end">
           <button type="button" onclick="approveEmailLogRow('${r.id}')" class="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition">Godkänn</button>
           <button type="button" onclick="rejectEmailLogRow('${r.id}')" class="px-3 py-1 bg-red-400 text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition">Avvisa</button>
         </div>`
        : r.status === 'approved'
          ? '<span class="text-xs text-yellow-700">⏳ Skickas…</span>'
          : r.status === 'failed'
            ? `<div class="flex gap-2 justify-end items-center">
               <span class="text-xs text-red-600" title="${esc(r.error || '')}">⚠️ ${esc(r.error || 'Fel')}</span>
               <button type="button" onclick="approveEmailLogRow('${r.id}')" class="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition">Försök igen</button>
               <button type="button" onclick="rejectEmailLogRow('${r.id}')" class="px-3 py-1 bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-400 transition">Avvisa</button>
             </div>`
            : '<span class="text-xs text-gray-400">—</span>';

      return `<tr class="border-t border-lavender/30 hover:bg-sky/20 transition">
      <td class="px-4 py-3 text-text-soft">${esc(created)}${sentLine}</td>
      <td class="px-4 py-3">${esc(r.parent_name || '—')} <span class="text-xs text-text-soft block">${esc(r.parent_email || '')}</span></td>
      <td class="px-4 py-3 text-sm">${esc(r.family_name || '—')}<span class="block text-xs text-text-soft">${esc(r.child_name || '')}</span></td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded-lg text-xs font-semibold ${statusInfo.class}">${statusInfo.label}</span></td>
      <td class="px-4 py-3 text-sm">${renderEngagementCell(r)}</td>
      <td class="px-4 py-3 text-right">${actions}</td>
    </tr>`;
    }).join('');
  }

  function switchEmailLogTab(tab) {
    emailLogActiveTab = tab;
    renderEmailLogUI();
  }

  async function approveEmailLogRow(id) {
    if (!confirm('Godkänna och skicka detta win-back mejl nu?')) return;
    try {
      await apiWithTimeout(`/api/admin/email-log/${id}/approve`, { method: 'POST' }, 60000);
      await loadEmailLog(true);
    } catch (err) {
      alert(`Fel vid godkännande: ${err.message}`);
    }
  }

  async function rejectEmailLogRow(id) {
    if (!confirm('Avvisa detta mejl? Det kommer aldrig att skickas.')) return;
    try {
      await apiWithTimeout(`/api/admin/email-log/${id}/reject`, { method: 'POST' });
      await loadEmailLog(true);
    } catch (err) {
      alert(`Fel vid avvisande: ${err.message}`);
    }
  }

  async function triggerWinBackNow() {
    const msg = emailLogAutoApprove
      ? 'Auto-godkännande är PÅ — win-back-mejl skickas direkt till alla inaktiva familjer (>18 dagar). Fortsätta?'
      : 'Skapa win-back-poster för alla inaktiva familjer (>18 dagar)? Mejlen skickas inte förrän du godkänner dem.';
    if (!confirm(msg)) return;
    try {
      const data = await apiWithTimeout('/api/admin/email-log/trigger-winback', { method: 'POST' }, 120000);
      alert(emailLogAutoApprove
        ? 'Klart — win-back-jobbet kördes och mejlen skickades automatiskt.'
        : `Klart. ${data.pending_count ?? 0} poster väntar godkännande.`);
      await loadEmailLog(true);
      switchEmailLogTab(emailLogAutoApprove ? 'sent' : 'pending_approval');
    } catch (err) {
      alert(`Win-back: ${err.message}`);
    }
  }

  async function toggleWinBackAutoApprove() {
    const next = !emailLogAutoApprove;
    if (next && !confirm('Slå PÅ auto-godkännande? Framtida win-back-mejl skickas då automatiskt utan manuell granskning.')) return;
    try {
      const data = await apiWithTimeout('/api/admin/email-log/auto-approve', {
        method: 'PUT',
        body: JSON.stringify({ enabled: next }),
      });
      emailLogAutoApprove = typeof data?.enabled === 'boolean' ? data.enabled : next;
      renderEmailLogUI();
    } catch (err) {
      alert(`Kunde inte ändra auto-godkännande: ${err.message}`);
    }
  }

  window.loadEmailLog = loadEmailLog;
  window.switchEmailLogTab = switchEmailLogTab;
  window.approveEmailLogRow = approveEmailLogRow;
  window.rejectEmailLogRow = rejectEmailLogRow;
  window.triggerWinBackNow = triggerWinBackNow;
  window.toggleWinBackAutoApprove = toggleWinBackAutoApprove;
})();
