// Admin Email Log: send log + approval panel for win-back emails.
// Owns: loading log, approve/reject actions, summary stats.
// Does NOT own: email template editing, actual send delivery.

let emailLogData = { records: [], summary: {} };
let emailLogFilter = '';
let emailLogActiveTab = 'all';

const STATUS_LABELS = {
  pending_approval: { label: '⏳ Väntar godkännande', class: 'bg-yellow-100 text-yellow-800' },
  approved:         { label: '✅ Godkänd',           class: 'bg-green-100 text-green-800' },
  sent:             { label: '📤 Skickat',            class: 'bg-blue-100 text-blue-800' },
  rejected:         { label: '❌ Avvisat',             class: 'bg-gray-200 text-gray-600' },
};

// ── Entry point ─────────────────────────────────────────────────────────────
async function loadEmailLog() {
  const container = document.getElementById('emailLogContainer');
  if (!container) return;
  container.innerHTML = `<div class="text-center py-12 text-text-soft">Laddar logg…</div>`;

  try {
    const [data, pending] = await Promise.all([
      Auth.api('/api/admin/email-log'),
      Auth.api('/api/admin/email-log/pending'),
    ]);
    emailLogData = data;
    emailLogPendingCount = pending.length;
    renderEmailLogUI();
  } catch (err) {
    const detail = err.body?.detail;
    container.innerHTML = `<p class="text-red-500">Kunde inte ladda email-logg: ${esc(err.message)}${detail ? `<br><span class="text-xs font-mono">${esc(detail)}</span>` : ''}</p>`;
  }
}

let emailLogPendingCount = 0;

function renderEmailLogUI() {
  const container = document.getElementById('emailLogContainer');
  if (!container) return;

  const s = emailLogData.summary || {};
  const pending = emailLogPendingCount;

  container.innerHTML = `
    <!-- Summary cards -->
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

    <div class="flex flex-wrap gap-3 mb-8">
      <button type="button" onclick="triggerWinBackNow()"
        class="px-4 py-2 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy-soft transition-colors">
        ↺ Kör win-back nu
      </button>
      <p class="text-xs text-text-soft self-center max-w-xl">
        Skapar <strong>väntande</strong> poster för familjer inaktiva &gt;18 dagar. Du godkänner och skickar under fliken Väntar.
      </p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 flex-wrap">
      ${['all','pending_approval','sent','rejected'].map(tab => {
        const count = tab === 'all' ? (emailLogData.records || []).length
                   : (emailLogData.records || []).filter(r => r.status === tab).length;
        const label = tab === 'all' ? 'Alla' : tab === 'pending_approval' ? '⏳ Väntar' : tab === 'sent' ? '📤 Skickade' : '❌ Avvisade';
        const isActive = emailLogActiveTab === tab;
        return `<button onclick="switchEmailLogTab('${tab}')"
          class="px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${isActive ? 'bg-gold text-navy' : 'bg-sky text-navy hover:bg-lavender'}">${label} <span class="opacity-70">${count}</span></button>`;
      }).join('')}
    </div>

    <!-- Table -->
    <div class="bg-white border-2 border-lavender rounded-2xl overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-sky text-text-soft text-xs font-semibold uppercase tracking-wide">
            <th class="px-4 py-3 text-left">Datum</th>
            <th class="px-4 py-3 text-left">Typ</th>
            <th class="px-4 py-3 text-left">Mottagare</th>
            <th class="px-4 py-3 text-left">Familj</th>
            <th class="px-4 py-3 text-left">Status</th>
            <th class="px-4 py-3 text-right">Åtgärder</th>
          </tr>
        </thead>
        <tbody id="emailLogTableBody">
          ${renderEmailLogRows()}
        </tbody>
      </table>
      ${emailLogData.records.length === 0 ? `<div class="text-center py-8 text-text-soft">Inga mejl hittades</div>` : ''}
    </div>
  `;
}

function renderEmailLogRows() {
  const records = emailLogData.records.filter(r =>
    emailLogActiveTab === 'all' || r.status === emailLogActiveTab
  );
  if (records.length === 0) return `<tr><td colspan="6" class="text-center py-8 text-text-soft">Inga poster i denna kategori</td></tr>`;

  return records.map(r => {
    const statusInfo = STATUS_LABELS[r.status] || { label: r.status, class: 'bg-gray-100 text-gray-700' };
    const date = r.created_at ? new Date(r.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '—';
    const actions = r.status === 'pending_approval'
      ? `<div class="flex gap-2 justify-end">
           <button onclick="approveEmailLogRow('${r.id}')" class="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition">Godkänn</button>
           <button onclick="rejectEmailLogRow('${r.id}')" class="px-3 py-1 bg-red-400 text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition">Avvisa</button>
         </div>`
      : r.status === 'approved'
      ? `<span class="text-xs text-yellow-700">⏳ Skickas…</span>`
      : r.status === 'sent'
      ? `<span class="text-xs text-green-700">✓ Skickat ${r.sent_at ? new Date(r.sent_at).toLocaleString('sv-SE', { dateStyle: 'short' }) : ''}</span>`
      : r.error
      ? `<span class="text-xs text-red-600" title="${esc(r.error)}">❌ Fel</span>`
      : `<span class="text-xs text-gray-400">—</span>`;

    return `<tr class="border-t border-lavender/30 hover:bg-sky/20 transition">
      <td class="px-4 py-3 text-text-soft">${date}</td>
      <td class="px-4 py-3 font-semibold text-navy">${r.email_type || 'win-back'}</td>
      <td class="px-4 py-3">${esc(r.parent_name || '—')} <span class="text-xs text-text-soft">${esc(r.parent_email || '')}</span></td>
      <td class="px-4 py-3 text-sm">${esc(r.family_name || r.family_id || '—')}</td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded-lg text-xs font-semibold ${statusInfo.class}">${statusInfo.label}</span></td>
      <td class="px-4 py-3 text-right">${actions}</td>
    </tr>`;
  }).join('');
}

// ── Tab switching ────────────────────────────────────────────────────────────
function switchEmailLogTab(tab) {
  emailLogActiveTab = tab;
  renderEmailLogUI();
}

// ── Approve / Reject ─────────────────────────────────────────────────────────
async function approveEmailLogRow(id) {
  if (!confirm('Godkänna och skicka detta win-back mejl nu?')) return;
  try {
    await Auth.api(`/api/admin/email-log/${id}/approve`, { method: 'POST' });
    await loadEmailLog();
  } catch (err) {
    alert(`Fel vid godkännande: ${err.message}`);
  }
}

async function rejectEmailLogRow(id) {
  if (!confirm('Avvisa detta mejl? Det kommer aldrig att skickas.')) return;
  try {
    await Auth.api(`/api/admin/email-log/${id}/reject`, { method: 'POST' });
    await loadEmailLog();
  } catch (err) {
    alert(`Fel vid avvisande: ${err.message}`);
  }
}

async function triggerWinBackNow() {
  if (!confirm('Skapa win-back-poster för alla inaktiva familjer (>18 dagar)? Mejlen skickas inte förrän du godkänner dem.')) return;
  try {
    const data = await Auth.api('/api/admin/email-log/trigger-winback', { method: 'POST' });
    alert(`Klart. ${data.pending_count ?? 0} poster väntar godkännande.`);
    await loadEmailLog();
    switchEmailLogTab('pending_approval');
  } catch (err) {
    alert(`Win-back: ${err.message}`);
  }
}

// ── Escape helpers ──────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}