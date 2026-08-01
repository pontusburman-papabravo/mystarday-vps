// Admin Email Templates: edit the four built-in email templates.
// Owns: loading/saving undersokning, valkomstmail, nyhetsbrev, win-back templates.
// Does NOT own: actual email send logic, subscriber management, approval flow.

const EMAIL_TEMPLATE_TYPES = [
  { type: 'undersokning', label: '📧 Undersökningsmail', variables: ['{{foralderns_namn}}', '{{tyck_lank}}', '{{presentkort_belopp}}'] },
  { type: 'valkomstmail',  label: '🌟 Välkomstmail',       variables: ['{{foralderns_namn}}', '{{barnets_namn}}'] },
  { type: 'nyhetsbrev',    label: '📰 Nyhetsbrev',          variables: ['{{foralderns_namn}}', '{{tyck_lank}}', '{{presentkort_belopp}}'] },
  { type: 'win-back',      label: '⭐ Återaktivering',     variables: ['{{foralderns_namn}}', '{{barnets_namn}}'] },
];

let emailTemplatesData = {}; // type → { subject, body_text, ... }
let emailActiveTab = 'undersokning';

// ── Entry point ─────────────────────────────────────────────────────────────
async function loadEmailTemplates() {
  const container = document.getElementById('emailTemplatesContainer');
  if (!container) return;
  container.innerHTML = `<div class="text-center py-12 text-text-soft">Laddar mallar…</div>`;

  try {
    const templates = await Auth.api('/api/admin/email-templates');
    emailTemplatesData = {};
    for (const t of templates) {
      emailTemplatesData[t.template_type] = t;
    }
    renderEmailTemplatesUI();
  } catch (err) {
    container.innerHTML = `<p class="text-red-500">Kunde inte ladda email-mallar: ${esc(err.message)}</p>`;
  }
}

// ── Render main UI ───────────────────────────────────────────────────────────
function renderEmailTemplatesUI() {
  const container = document.getElementById('emailTemplatesContainer');
  if (!container) return;

  container.innerHTML = `
    <!-- Tab bar -->
    <div class="flex gap-2 mb-6 flex-wrap" id="emailTemplateTabs">
      ${EMAIL_TEMPLATE_TYPES.map(t => `
        <button
          id="etab-${t.type}"
          onclick="switchEmailTab('${t.type}')"
          class="px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${emailActiveTab === t.type ? 'bg-gold text-navy' : 'bg-sky text-navy hover:bg-lavender'}"
        >${t.label}</button>
      `).join('')}
    </div>

    <!-- Editor panels (one per type, only active one shown) -->
    ${EMAIL_TEMPLATE_TYPES.map(t => renderTemplatePanel(t)).join('')}
  `;

  // Show only the active panel
  EMAIL_TEMPLATE_TYPES.forEach(t => {
    const panel = document.getElementById(`epanel-${t.type}`);
    if (panel) panel.classList.toggle('hidden', t.type !== emailActiveTab);
  });
}

function renderTemplatePanel(typeDef) {
  const { type, label, variables } = typeDef;
  const data = emailTemplatesData[type] || { subject: '', body_text: '' };
  const updatedAt = data.updated_at
    ? `Senast sparad: ${new Date(data.updated_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}`
    : 'Ej sparad ännu';

  const varButtons = variables.map(v => `
    <button type="button" onclick="insertVariable('etbody-${type}', '${v}')"
      class="px-2 py-1 bg-lavender text-navy text-xs font-mono rounded hover:bg-gold/20 transition">${v}</button>
  `).join('');

  return `
  <div id="epanel-${type}" class="hidden">
    <div class="bg-white border-2 border-lavender rounded-2xl p-6 mb-6">
      <div class="flex items-center justify-between mb-5">
        <h4 class="text-lg font-heading font-bold text-navy">${label}</h4>
        <span class="text-xs text-text-soft">${updatedAt}</span>
      </div>

      <!-- Subject -->
      <div class="mb-4">
        <label class="block text-sm font-semibold text-navy mb-1">Ämnesrad</label>
        <input
          id="etsub-${type}"
          type="text"
          value="${escAttr(data.subject)}"
          class="w-full border-2 border-lavender rounded-xl px-4 py-2.5 text-sm font-body focus:outline-none focus:border-gold transition"
          placeholder="Ämnesrad…"
        />
      </div>

      <!-- Variable picker -->
      <div class="mb-3">
        <label class="block text-xs font-semibold text-text-soft mb-2">Infoga variabel i brödtext</label>
        <div class="flex gap-2 flex-wrap">${varButtons}</div>
      </div>

      <!-- Body textarea -->
      <div class="mb-4">
        <label class="block text-sm font-semibold text-navy mb-1">Brödtext (plain text)</label>
        <textarea
          id="etbody-${type}"
          rows="14"
          class="w-full border-2 border-lavender rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-gold transition resize-y"
          placeholder="Skriv email-texten här…"
        >${escHtml(data.body_text)}</textarea>
        <p class="text-xs text-text-soft mt-1">Stöder **fetstil**, radbrytningar och variabler. Dubbla radbrytningar = nytt stycke.</p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 flex-wrap">
        <button onclick="saveEmailTemplate('${type}')"
          class="px-5 py-2.5 bg-gold text-navy font-semibold rounded-xl hover:bg-gold/80 transition text-sm">
          💾 Spara mall
        </button>
        <button onclick="toggleEmailPreview('${type}')"
          class="px-4 py-2.5 bg-sky text-navy font-semibold rounded-xl hover:bg-lavender transition text-sm">
          👁 Förhandsgranska
        </button>
        <span id="etsave-msg-${type}" class="text-sm font-semibold hidden"></span>
      </div>
    </div>

    <!-- Preview pane (toggled) -->
    <div id="epreview-${type}" class="hidden bg-white border-2 border-lavender rounded-2xl overflow-hidden mb-6">
      <div class="bg-sky px-6 py-3 flex items-center justify-between">
        <span class="font-semibold text-navy text-sm">Förhandsgranskning</span>
        <button onclick="toggleEmailPreview('${type}')" class="text-text-soft hover:text-navy text-sm">✕ Stäng</button>
      </div>
      <div id="epreview-body-${type}" class="p-6 text-sm text-navy">
        <!-- populated by renderEmailPreview() -->
      </div>
    </div>
  </div>
  `;
}

// ── Tab switching ────────────────────────────────────────────────────────────
function switchEmailTab(type) {
  emailActiveTab = type;
  EMAIL_TEMPLATE_TYPES.forEach(t => {
    const btn = document.getElementById(`etab-${t.type}`);
    const panel = document.getElementById(`epanel-${t.type}`);
    if (btn) {
      btn.className = `px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${t.type === type ? 'bg-gold text-navy' : 'bg-sky text-navy hover:bg-lavender'}`;
    }
    if (panel) panel.classList.toggle('hidden', t.type !== type);
  });
}

// ── Save ─────────────────────────────────────────────────────────────────────
async function saveEmailTemplate(type) {
  const subEl  = document.getElementById(`etsub-${type}`);
  const bodyEl = document.getElementById(`etbody-${type}`);
  const msgEl  = document.getElementById(`etsave-msg-${type}`);
  if (!subEl || !bodyEl) return;

  const subject   = subEl.value.trim();
  const body_text = bodyEl.value;

  if (!subject) { showEtMsg(msgEl, 'Ämnesrad krävs.', false); return; }
  if (!body_text.trim()) { showEtMsg(msgEl, 'Brödtext krävs.', false); return; }

  try {
    const result = await Auth.api(`/api/admin/email-templates/${type}`, {
      method: 'PUT',
      body: JSON.stringify({ subject, body_text }),
    });
    emailTemplatesData[type] = result.template;
    // Update timestamp label
    const panel = document.getElementById(`epanel-${type}`);
    if (panel) {
      const ts = panel.querySelector('.text-xs.text-text-soft');
      if (ts && result.template?.updated_at) {
        ts.textContent = `Senast sparad: ${new Date(result.template.updated_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}`;
      }
    }
    showEtMsg(msgEl, '✅ Sparad!', true);
  } catch (err) {
    showEtMsg(msgEl, `❌ ${err.message}`, false);
  }
}

function showEtMsg(el, msg, ok) {
  if (!el) return;
  el.textContent = msg;
  el.className = `text-sm font-semibold ${ok ? 'text-green-700' : 'text-red-600'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ── Preview ──────────────────────────────────────────────────────────────────
function toggleEmailPreview(type) {
  const previewEl = document.getElementById(`epreview-${type}`);
  if (!previewEl) return;
  const isHidden = previewEl.classList.contains('hidden');
  if (isHidden) {
    renderEmailPreview(type);
    previewEl.classList.remove('hidden');
  } else {
    previewEl.classList.add('hidden');
  }
}

function renderEmailPreview(type) {
  const subEl  = document.getElementById(`etsub-${type}`);
  const bodyEl = document.getElementById(`etbody-${type}`);
  const previewBody = document.getElementById(`epreview-body-${type}`);
  if (!subEl || !bodyEl || !previewBody) return;

  const subject   = subEl.value || '(Ingen ämnesrad)';
  const body_text = bodyEl.value || '';

  // Replace sample variables for preview
  const exVars = {
    '{{foralderns_namn}}':   'Anna',
    '{{barnets_namn}}':      'Kalle',
    '{{enkats_namn}}':       'Aktiva användare',
    '{{tyck_lank}}':         '<a href="#" style="color:#F5A623">mystarday.se/tyck/aktiva-anvandare</a>',
    '{{presentkort_belopp}}': '250 kr',
  };

  let preview = body_text;
  for (const [k, v] of Object.entries(exVars)) {
    preview = preview.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), v);
  }

  // Format body: paragraphs + bold
  const bodyHtml = preview
    .split(/\n\n+/)
    .map(p => {
      const escaped = esc(p.trim()).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      return `<p style="margin:0 0 16px 0;line-height:1.7;">${escaped}</p>`;
    })
    .join('');

  previewBody.innerHTML = `
    <div style="background:#f4f4f5;padding:24px 16px;border-radius:8px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#F5A623 0%,#e8952a 100%);padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.9;">Min Stjärndag</p>
          <p style="margin:10px 0 0 0;color:#fff;font-size:20px;font-weight:700;">${esc(subject)}</p>
        </div>
        <div style="padding:32px;color:#374151;font-size:15px;">
          ${bodyHtml}
        </div>
        <div style="padding:0 32px 24px 32px;">
          <a href="#" style="display:inline-block;background:#F5A623;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:600;font-size:14px;">Öppna Min Stjärndag ⭐</a>
        </div>
        <div style="border-top:1px solid #e5e7eb;padding:16px 32px;color:#9ca3af;font-size:12px;">
          <a href="#" style="color:#9ca3af;">Avprenumerera</a>
        </div>
      </div>
    </div>
  `;
}

// ── Variable inserter ────────────────────────────────────────────────────────
function insertVariable(textareaId, variable) {
  const el = document.getElementById(textareaId);
  if (!el) return;
  const start = el.selectionStart;
  const end   = el.selectionEnd;
  const val   = el.value;
  el.value = val.substring(0, start) + variable + val.substring(end);
  el.selectionStart = el.selectionEnd = start + variable.length;
  el.focus();
}

// ── Escape helpers ───────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return esc(str).replace(/'/g, '&#039;');
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Don't escape " inside textarea (not an attribute context)
}

window.loadEmailTemplates = loadEmailTemplates;
window.switchEmailTab = switchEmailTab;
window.saveEmailTemplate = saveEmailTemplate;
window.toggleEmailPreview = toggleEmailPreview;
window.insertVariable = insertVariable;
