/**
 * Reports page — create report flow, activity view with notes, shared reports list.
 * Does NOT own: auth (auth.js), QR library (loaded separately in reports.html head).
 */

// ── CSRF ────────────────────────────────────────────────────────
function getCsrfToken() {
  // Read from localStorage (set by auth.js on page load) or parse cookie directly
  const cached = localStorage.getItem('csrf_token');
  if (cached) return cached;
  const match = document.cookie.match(/(?:^|;\u0020)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ── State ──────────────────────────────────────────────────────
let reportChildren = []; // family children
let reportCurrentChildId = null;
let reportCurrentPeriod = 'month';
let reportCustomDates = { from: null, to: null };
let reportActivityPeriod = 'month';
let reportActivityCustomDates = { from: null, to: null };

// Shared reports filter state
let sharedLinksCache = []; // all links from API
let sharedLinksFilter = 'all'; // 'all' | 'active' | 'inactive'

// ── Auth gate ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // auth.js uses cookie-based auth; no isAuthReady/authReady events exist.
  // Check auth status via Auth.isLoggedIn() + redirect if needed.
  if (!Auth.isLoggedIn()) {
    window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
    return;
  }

  initReports();
});

// ── Init ─────────────────────────────────────────────────────────
async function initReports() {
  await loadChildren();
  loadSharedReports();
  // Show/hide pedagog_notes checkbox based on whether parent has pedagogen-linked children
  try {
    const me = await fetch('/api/auth/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null);
    if (me && me.hasPedagogChildren !== true) {
      const card = document.getElementById('pedagogNotesFieldCard');
      if (card) card.style.display = 'none';
    }
  } catch (_) {}
}

// ── Children ──────────────────────────────────────────────────────
let _childLoadRetries = 0;
const MAX_CHILD_RETRIES = 3;

async function loadChildren() {
  try {
    const res = await fetch('/api/children', { credentials: 'include' });
    if (!res.ok) {
      if (res.status === 429 && _childLoadRetries < MAX_CHILD_RETRIES) {
        _childLoadRetries++;
        const waitSec = _childLoadRetries * 2;
        console.warn('[loadChildren] Rate limited, retrying in', waitSec, 's');
        setTimeout(loadChildren, waitSec * 1000);
        return;
      }
      throw new Error('Kunde inte ladda barn (' + res.status + ')');
    }
    const data = await res.json();
    reportChildren = Array.isArray(data) ? data : (data.children || []);
    _childLoadRetries = 0;

    if (reportChildren.length === 0) {
      document.getElementById('childSelector').innerHTML =
        '<p class="text-text-soft text-sm py-4">Inga barn i din familj ännu.</p>';
      document.getElementById('activityChildSelector').innerHTML =
        '<p class="text-text-soft text-sm py-2">Inga barn i din familj.</p>';
      return;
    }

    // Pick first child
    reportCurrentChildId = reportChildren[0].id;

    renderChildSelector();
    renderActivityChildSelector();

    // If activity tab is already visible, trigger load now
    const actTab = document.getElementById('activityTab');
    if (actTab && !actTab.classList.contains('hidden')) {
      loadActivityView();
    }
  } catch (err) {
    console.error('[loadChildren] error:', err);
    // Show error with retry button instead of a transient toast
    const retryHtml = `<div class="text-sm text-red-600 py-2 flex items-center gap-2">
      <span>⚠️ ${escHtml(err.message)}</span>
      <button onclick="loadChildren()" class="text-xs bg-navy text-white px-3 py-1 rounded-lg font-semibold">Försök igen</button>
    </div>`;
    document.getElementById('childSelector').innerHTML = retryHtml;
    document.getElementById('activityChildSelector').innerHTML = retryHtml;
  }
}

function renderChildSelector() {
  const el = document.getElementById('childSelector');
  if (reportChildren.length === 1) {
    el.innerHTML = `<div class="flex items-center gap-2 px-4 py-3 bg-gold-light rounded-xl border border-gold">
      <span class="text-xl">${reportChildren[0].emoji || '👧'}</span>
      <span class="font-semibold text-navy">${escHtml(reportChildren[0].name)}</span>
    </div>`;
    return;
  }
  el.innerHTML = reportChildren.map(child => `
    <button class="child-pill px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${child.id === reportCurrentChildId ? 'selected' : ''}"
      onclick="selectChild('${child.id}', this)">
      ${renderChildAvatar(child, 24)} ${escHtml(child.name)}
    </button>
  `).join('');
}

function renderActivityChildSelector() {
  const el = document.getElementById('activityChildSelector');
  if (reportChildren.length === 1) {
    el.innerHTML = `<div class="text-sm text-text-soft flex items-center gap-2">
      <span>${reportChildren[0].emoji || '👧'}</span> ${escHtml(reportChildren[0].name)}
    </div>`;
    return;
  }
  el.innerHTML = reportChildren.map(child => `
    <button class="child-pill px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 ${child.id === reportCurrentChildId ? 'selected' : ''}"
      onclick="selectActivityChild('${child.id}', this)">
      ${renderChildAvatar(child, 20)} ${escHtml(child.name)}
    </button>
  `).join('');
}

function selectChild(childId, btn) {
  reportCurrentChildId = childId;
  document.querySelectorAll('#childSelector .child-pill').forEach(b => b.classList.remove('selected'));
  if (btn) btn.classList.add('selected');
}

function selectActivityChild(childId, btn) {
  reportCurrentChildId = childId;
  document.querySelectorAll('#activityChildSelector .child-pill').forEach(b => b.classList.remove('selected'));
  if (btn) btn.classList.add('selected');
}

// ── Period selection ──────────────────────────────────────────────
function selectPeriod(period) {
  reportCurrentPeriod = period;
  document.querySelectorAll('.period-pill[data-period]').forEach(b => b.classList.remove('selected'));
  document.querySelector(`.period-pill[data-period="${period}"]`)?.classList.add('selected');

  const customInputs = document.getElementById('customDateInputs');
  if (period === 'custom') {
    customInputs.classList.remove('hidden');
    if (!reportCustomDates.from) {
      const to = new Date();
      const from = new Date(to); from.setDate(from.getDate() - 30);
      document.getElementById('dateFrom').value = fmtDate(from);
      document.getElementById('dateTo').value = fmtDate(to);
      reportCustomDates = { from: fmtDate(from), to: fmtDate(to) };
    } else {
      document.getElementById('dateFrom').value = reportCustomDates.from;
      document.getElementById('dateTo').value = reportCustomDates.to;
    }
  } else {
    customInputs.classList.add('hidden');
  }
}

function selectActivityPeriod(period) {
  reportActivityPeriod = period;
  document.querySelectorAll('[data-ap]').forEach(b => b.classList.remove('selected'));
  document.querySelector(`[data-ap="${period}"]`)?.classList.add('selected');

  const customDates = document.getElementById('activityCustomDates');
  if (period === 'custom') {
    customDates.classList.remove('hidden');
    if (!reportActivityCustomDates.from) {
      const to = new Date();
      const from = new Date(to); from.setDate(from.getDate() - 30);
      document.getElementById('actDateFrom').value = fmtDate(from);
      document.getElementById('actDateTo').value = fmtDate(to);
      reportActivityCustomDates = { from: fmtDate(from), to: fmtDate(to) };
    } else {
      document.getElementById('actDateFrom').value = reportActivityCustomDates.from;
      document.getElementById('actDateTo').value = reportActivityCustomDates.to;
    }
  } else {
    customDates.classList.add('hidden');
  }
}

// ── Fields toggle ─────────────────────────────────────────────────
function toggleField(card) {
  const field = card.dataset.field;
  const checkbox = card.querySelector('input[type="checkbox"]');
  checkbox.checked = !checkbox.checked;
  card.classList.toggle('selected', checkbox.checked);
  document.getElementById('fieldError').classList.add('hidden');
}

// ── PIN toggle ────────────────────────────────────────────────────
function togglePinField() {
  const wrap = document.getElementById('pinInputWrap');
  const toggle = document.getElementById('pinToggle');
  if (toggle.checked) {
    wrap.classList.remove('hidden');
    document.getElementById('pinCode').focus();
  } else {
    wrap.classList.add('hidden');
    document.getElementById('pinError').classList.add('hidden');
  }
}

// ── Get date range ────────────────────────────────────────────────
function getReportDateRange() {
  const today = new Date();
  if (reportCurrentPeriod === 'week') {
    const from = new Date(today); from.setDate(from.getDate() - 7);
    return { from: fmtDate(from), to: fmtDate(today) };
  }
  if (reportCurrentPeriod === 'month') {
    const from = new Date(today); from.setDate(from.getDate() - 30);
    return { from: fmtDate(from), to: fmtDate(today) };
  }
  // custom
  return {
    from: document.getElementById('dateFrom').value,
    to:   document.getElementById('dateTo').value,
  };
}

function getActivityDateRange() {
  const today = new Date();
  if (reportActivityPeriod === 'week') {
    const from = new Date(today); from.setDate(from.getDate() - 7);
    return { from: fmtDate(from), to: fmtDate(today) };
  }
  if (reportActivityPeriod === 'month') {
    const from = new Date(today); from.setDate(from.getDate() - 30);
    return { from: fmtDate(from), to: fmtDate(today) };
  }
  return {
    from: document.getElementById('actDateFrom').value,
    to:   document.getElementById('actDateTo').value,
  };
}

// ── Create report ────────────────────────────────────────────────
async function createReport() {
  if (!reportCurrentChildId) { showCreateError('Välj ett barn först'); return; }

  const label = document.getElementById('reportLabel').value.trim();
  if (!label) { showCreateError('Ge rapporten ett namn'); return; }

  const { from, to } = getReportDateRange();
  if (!from || !to) { showCreateError('Välj en tidsperiod'); return; }

  // Collect selected fields
  const fields = [];
  document.querySelectorAll('.field-card input[type="checkbox"]').forEach(cb => {
    if (cb.checked) {
      const fieldName = cb.id.replace('field_', '');
      // Map UI field names to canonical names
      const fieldMap = {
        activities: 'activities',
        completion: 'completion',
        section_summary: 'section_summary',
        parent_notes: 'parent_notes',
        child_notes: 'child_notes',
        stars: 'stars',
        rewards: 'rewards',
        emotions: 'emotions',
        pedagog_notes: 'pedagog_notes',
      };
      if (fieldMap[fieldName]) fields.push(fieldMap[fieldName]);
    }
  });

  if (fields.length === 0) {
    document.getElementById('fieldError').classList.remove('hidden');
    return;
  }

  const pinEnabled = document.getElementById('pinToggle').checked;
  const pin = pinEnabled ? document.getElementById('pinCode').value.trim() : null;
  if (pinEnabled && (!pin || pin.length < 4 || pin.length > 6)) {
    document.getElementById('pinError').classList.remove('hidden');
    return;
  }

  const parentSummary = document.getElementById('parentSummary').value.trim() || null;

  const btn = document.getElementById('createBtn');
  btn.disabled = true;
  btn.textContent = 'Skapar...';

  try {
    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const anonymous = document.getElementById('anonymousToggle')?.checked || false;

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers,
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        child_id: reportCurrentChildId,
        label,
        parent_summary: parentSummary,
        date_from: from,
        date_to: to,
        fields,
        pin,
        anonymous,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunde inte skapa rapport');

    showReportResult(data);
    // Reload shared list
    loadSharedReports();
    // Refresh active-sharing indicator on dashboard if open
    if (window.refreshReportsActiveCount) window.refreshReportsActiveCount();
  } catch (err) {
    if (err.name === 'AbortError') {
      showCreateError('Timeout — databasen svarade inte. Försök igen.');
    } else {
      showCreateError(err.message);
    }
    btn.disabled = false;
    btn.textContent = 'Skapa rapport';
  }
}

function showCreateError(msg) {
  const el = document.getElementById('createError');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function showReportResult(data) {
  const container = document.getElementById('qrContainer');
  const urlDisplay = document.getElementById('shareUrlDisplay');
  const btn = document.getElementById('createBtn');

  btn.disabled = false;
  btn.textContent = 'Skapa rapport';

  const fullUrl = window.location.origin + '/r/' + data.public_id;
  urlDisplay.textContent = fullUrl;

  container.classList.add('show');
  container.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Generate QR code
  renderQRCode(fullUrl);
}

function renderQRCode(url) {
  const box = document.getElementById('qrCodeBox');
  box.innerHTML = '';

  if (typeof qrcode === 'undefined') {
    // Fallback: just show URL text
    return;
  }

  try {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();

    const size = 160;
    box.innerHTML = `<div style="display:inline-block;padding:8px;background:white;border-radius:12px;">
      <img src="${qr.createDataURL(4, 0)}" width="${size}" height="${size}" alt="QR-kod" style="display:block;">
    </div>`;
  } catch (err) {
    // QR library not loaded yet — retry after short delay
    setTimeout(() => renderQRCode(url), 500);
  }
}

async function copyShareUrl() {
  const url = document.getElementById('shareUrlDisplay').textContent;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Länk kopierad!', 'success');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Länk kopierad!', 'success');
  }
}

// ── Activity view ────────────────────────────────────────────────
async function loadActivityView() {
  if (!reportCurrentChildId) {
    const errEl = document.getElementById('activityError');
    errEl.textContent = 'Laddar barn… Försök igen om en stund.';
    errEl.classList.remove('hidden');
    return;
  }

  const { from, to } = getActivityDateRange();
  if (!from || !to) { showToast('Välj en tidsperiod', 'error'); return; }

  document.getElementById('activityLoading').classList.remove('hidden');
  document.getElementById('activityError').classList.add('hidden');
  document.getElementById('activityEmpty').classList.add('hidden');
  document.getElementById('activityList').classList.add('hidden');
  _initObsCharCounter();

  try {
    const [logsRes] = await Promise.all([
      fetch(`/api/children/${reportCurrentChildId}/daily-logs?from=${from}&to=${to}`, { credentials: 'include' }),
      loadGeneralObs(),
    ]);

    if (!logsRes.ok) {
      const data = await logsRes.json().catch(() => ({}));
      const msg = (data && data.error) || `Kunde inte ladda aktiviteter (${logsRes.status})`;
      if (logsRes.status === 429) {
        throw new Error('Servern är tillfälligt överbelastad. Vänta några sekunder och klicka Visa igen.');
      }
      throw new Error(msg);
    }

    const logs = await logsRes.json();
    // Normalize date keys to YYYY-MM-DD — node-pg DATE columns may arrive as ISO timestamps
    const dateMap = {};
    logs.forEach(log => {
      if (!log.date) return;
      const m = String(log.date).match(/^(\d{4}-\d{2}-\d{2})/);
      const key = m ? m[1] : String(log.date);
      dateMap[key] = log;
    });
    const dailyDates = Object.keys(dateMap).sort().reverse();

    const allItems = {};
    await Promise.allSettled(dailyDates.map(async (date) => {
      const itemsRes = await fetch(`/api/children/${reportCurrentChildId}/daily-log?date=${date}`, { credentials: 'include' });
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        allItems[date] = data.items || [];
      }
    }));

    try {
      renderActivityList(dateMap, allItems);
    } catch (renderErr) {
      console.error('[loadActivityView] render error:', renderErr);
      document.getElementById('activityLoading').classList.add('hidden');
      const errEl = document.getElementById('activityError');
      errEl.textContent = 'Ett fel uppstod vid visning av aktiviteter. Försök igen.';
      errEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error('[loadActivityView] fetch error:', err);
    document.getElementById('activityLoading').classList.add('hidden');
    const errEl = document.getElementById('activityError');
    errEl.textContent = err.message || 'Kunde inte ladda aktiviteter. Försök igen.';
    errEl.classList.remove('hidden');
  }
}

function renderActivityList(dateMap, allItems) {
  try {
    document.getElementById('activityLoading').classList.add('hidden');

    const dates = Object.keys(dateMap || {}).sort().reverse(); // newest first
    if (dates.length === 0) {
      document.getElementById('activityEmpty').classList.remove('hidden');
      document.getElementById('activityList').classList.add('hidden');
      return;
    }

    const list = document.getElementById('activityList');
    let html = '';

    dates.forEach(date => {
      const log = dateMap[date];
      const items = (allItems && allItems[date]) ? allItems[date] : [];

      // Normalize date: extract YYYY-MM-DD from ISO timestamps or plain dates
      // node-pg may return "2026-05-25T00:00:00.000Z" for DATE columns
      if (!date || typeof date !== 'string') return;
      const ymdMatch = date.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!ymdMatch) return;
      const ymd = ymdMatch[1];
      const dateObj = new Date(ymd + 'T12:00:00');
      if (!dateObj || isNaN(dateObj.getTime())) {
        return;
      }
      const dayName = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'][dateObj.getDay()] || 'Okänt';
      const dateStr = dateObj.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' });

    if (items.length === 0) {
      // Zero-data day
      html += `
        <div class="zero-data-day">
          <p class="font-semibold text-sm mb-1">📅 ${dayName} ${dateStr}</p>
          <p class="text-xs">Ingen data registrerad</p>
        </div>`;
      return;
    }

    // Group by section
    const sectionOrder = ['morgon', 'dag', 'kvall', 'natt'];
    const sectionEmoji = { morgon: '🌅', dag: '☀️', kvall: '🌆', natt: '🌙' };

    const completedCount = items.filter(i => i.completed).length;
    const totalCount = items.length;

    html += `
      <div class="bg-white rounded-xl border border-lavender overflow-hidden">
        <div class="bg-lavender px-4 py-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm text-navy">${dayName} ${dateStr}</span>
          </div>
          <span class="text-xs font-semibold text-text-soft">${completedCount}/${totalCount} klara</span>
        </div>
        <div class="p-3 flex flex-col gap-2">`;

    sectionOrder.forEach(section => {
      const sectionItems = items.filter(i => i.section === section);
      if (sectionItems.length === 0) return;

      html += `<div class="mb-2">
        <div class="text-xs font-semibold text-text-soft mb-1 flex items-center gap-1">
          ${sectionEmoji[section] || '📋'} ${capitalize(section)}
        </div>`;

      sectionItems.forEach(item => {
        const emoji = item.category_emoji || '📋';
        const note = item.parent_note || '';
        const childNote = item.child_note || '';
        const hasNotes = note || childNote;

        html += `
          <div class="activity-report-card rounded-lg p-3 mb-1 ${item.completed ? 'opacity-70' : ''}">
            <div class="flex items-start gap-2 mb-2">
              <span class="text-base flex-shrink-0">${emoji}</span>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm ${item.completed ? 'line-through text-text-soft' : 'text-navy'}">${escHtml(item.name)}</p>
                ${item.completed ? '<span class="text-xs text-green-600 font-semibold">✅ Klar</span>' : ''}
              </div>
            </div>
            ${hasNotes ? `
            <div class="space-y-2 pl-2">
              ${note ? `
              <div class="bg-gold-light rounded-lg p-2">
                <p class="text-xs font-semibold text-amber-800 mb-1">📝 Förälderns anteckning:</p>
                <p class="text-sm text-navy">${escHtml(note)}</p>
                <button onclick="openNoteModal('${item.id}', '${escJs(note)}')"
                  class="text-xs text-gold hover:text-yellow-600 font-semibold mt-1">Redigera</button>
              </div>` : ''}
              ${childNote ? `
              <div class="bg-lavender rounded-lg p-2">
                <p class="text-xs font-semibold text-purple-800 mb-1">💬 Barnets anteckning:</p>
                <p class="text-sm text-navy">${escHtml(childNote)}</p>
              </div>` : ''}
            </div>` : `
            <button onclick="openNoteModal('${item.id}', '')"
              class="text-xs text-text-soft hover:text-gold font-semibold ml-2">+ Lägg till anteckning</button>`}
          </div>`;
      });

      html += `</div>`;
    });

    html += `</div></div>`;
    });

    list.innerHTML = html;
    list.classList.remove('hidden');
  } catch (err) {
    console.error('[renderActivityList]', err);
    document.getElementById('activityLoading').classList.add('hidden');
    const errEl = document.getElementById('activityError');
    errEl.textContent = 'Ett fel uppstod vid visning av aktiviteter. Prova ladda om sidan.';
    errEl.classList.remove('hidden');
    document.getElementById('activityList').classList.add('hidden');
    document.getElementById('activityEmpty').classList.add('hidden');
  }
}

// ── General Observations (Allmän observation) ───────────────────
// Family-level, time-agnostic notes — always loaded, independent of child selection.

let _generalObsActive = [];
let _generalObsArchived = [];

async function loadGeneralObservations() {
  try {
    const res = await fetch('/api/general-observations', { credentials: 'include' });
    if (!res.ok) { _generalObsActive = []; return; }
    const data = await res.json();
    _generalObsActive = data.observations || [];
  } catch {
    _generalObsActive = [];
  }
}

async function loadArchivedObservations() {
  try {
    const res = await fetch('/api/general-observations/archived', { credentials: 'include' });
    if (!res.ok) { _generalObsArchived = []; return; }
    const data = await res.json();
    _generalObsArchived = data.observations || [];
  } catch {
    _generalObsArchived = [];
  }
}

function renderGeneralObservationsSection(active, archived) {
  const section = document.getElementById('observationsSection');
  const writeBar = document.getElementById('obsWriteBar');
  if (!writeBar) return;

  writeBar.classList.remove('hidden');

  if (active.length === 0 && archived.length === 0) {
    section.innerHTML = '';
    return;
  }

  // Active observations
  let html = `<div class="mb-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-heading font-bold text-navy flex items-center gap-2 text-base">
        📝 Allmänna anteckningar
        ${active.length > 0 ? `<span class="bg-gold-light text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">${active.length}</span>` : ''}
      </h3>
      <button onclick="openObsModal()" class="text-xs text-gold hover:text-yellow-600 font-semibold">+ Skriv ny</button>
    </div>`;

  if (active.length === 0) {
    html += `<p class="text-sm text-text-soft italic">Inga anteckningar ännu.</p>`;
  } else {
    active.forEach(obs => {
      const preview = obs.text.length > 100 ? obs.text.slice(0, 100) + '…' : obs.text;
      const createdDate = new Date(obs.created_at);
      const dateStr = createdDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
      const isLong = obs.text.length > 100;

      html += `<div class="obs-card mb-3 ${obs.is_important ? 'important' : ''}" id="genObs-${obs.id}">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            ${obs.is_important ? '<span class="text-xs font-bold text-red-500 mb-1 block">⚠️ Viktigt</span>' : ''}
            <p class="obs-content text-sm" id="genObs-preview-${obs.id}">${escHtml(preview)}</p>
            ${isLong ? `<p class="text-xs text-text-soft mt-1"><button onclick="toggleGenObsExpand('${obs.id}', false)" class="text-gold hover:text-yellow-600 font-semibold">Visa mer</button></p>` : ''}
          </div>
          <span class="text-xs text-text-soft flex-shrink-0">${dateStr}</span>
        </div>
        <div class="flex gap-2 mt-3 flex-wrap">
          <button onclick="openObsModal('${obs.id}', '${escJs(obs.text)}', ${obs.is_important})"
            class="text-xs px-3 py-1.5 bg-lavender hover:bg-purple-100 text-navy font-semibold rounded-lg transition-colors">Redigera</button>
          <button onclick="doArchiveObservation('${obs.id}')"
            class="text-xs px-3 py-1.5 bg-sky hover:bg-blue-100 text-navy font-semibold rounded-lg transition-colors">Arkivera</button>
          <button onclick="doDeleteGeneralObs('${obs.id}')"
            class="text-xs px-3 py-1.5 bg-coral hover:bg-red-200 text-navy font-semibold rounded-lg transition-colors">Ta bort</button>
        </div>
      </div>`;
    });
  }

  html += `</div>`;

  // Archived section
  html += `<div class="mt-4" id="archivedObsSection">
    <button onclick="toggleArchivedSection()" class="flex items-center gap-2 text-sm font-semibold text-text-soft hover:text-navy transition-colors mb-2">
      <span id="archivedArrow">▸</span> Arkiverade anteckningar
      <span class="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">${archived.length}</span>
    </button>
    <div id="archivedObsList" class="hidden mt-2 flex flex-col gap-2"></div>
  </div>`;

  section.innerHTML = html;

  // Render archived items
  if (archived.length > 0) {
    renderArchivedList(archived);
  }
}

function toggleGenObsExpand(obsId, forceShow) {
  const obs = _generalObsActive.find(o => o.id === obsId) || _generalObsArchived.find(o => o.id === obsId);
  if (!obs) return;
  const preview = document.getElementById('genObs-preview-' + obsId);
  const container = document.getElementById('genObs-' + obsId);
  if (!preview || !container) return;
  if (obs.text.length <= 100) return;

  const currentText = preview.textContent;
  if (currentText === escHtml(obs.text)) {
    preview.textContent = obs.text.slice(0, 100) + '…';
    preview.parentElement.querySelector('button')?.remove();
    const btn = document.createElement('button');
    btn.className = 'text-xs text-gold hover:text-yellow-600 font-semibold mt-1';
    btn.textContent = 'Visa mer';
    btn.onclick = () => toggleGenObsExpand(obsId, false);
    preview.parentElement.appendChild(btn);
  } else {
    preview.textContent = obs.text;
    preview.parentElement.querySelector('button')?.remove();
    const btn = document.createElement('button');
    btn.className = 'text-xs text-gold hover:text-yellow-600 font-semibold mt-1';
    btn.textContent = 'Visa mindre';
    btn.onclick = () => toggleGenObsExpand(obsId, true);
    preview.parentElement.appendChild(btn);
  }
}

function renderArchivedList(archived) {
  const list = document.getElementById('archivedObsList');
  if (!list) return;

  list.innerHTML = archived.map(obs => {
    const dateStr = new Date(obs.created_at).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
    const preview = obs.text.length > 80 ? obs.text.slice(0, 80) + '…' : obs.text;
    return `<div class="obs-card opacity-70 mb-2" id="genArch-${obs.id}">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          ${obs.is_important ? '<span class="text-xs font-bold text-red-400 mb-1 block">⚠️ Viktigt</span>' : ''}
          <p class="obs-content text-xs">${escHtml(preview)}</p>
        </div>
        <span class="text-xs text-text-soft flex-shrink-0">${dateStr}</span>
      </div>
      <div class="flex gap-2 mt-2 flex-wrap">
        <button onclick="doRestoreObservation('${obs.id}')"
          class="text-xs px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 font-semibold rounded-lg">Återställ</button>
        <button onclick="doDeleteGeneralObs('${obs.id}')"
          class="text-xs px-3 py-1 bg-coral hover:bg-red-200 text-navy font-semibold rounded-lg">Ta bort</button>
      </div>
    </div>`;
  }).join('');
}

function toggleArchivedSection() {
  const list = document.getElementById('archivedObsList');
  const arrow = document.getElementById('archivedArrow');
  if (!list || !arrow) return;
  const hidden = list.classList.contains('hidden');
  list.classList.toggle('hidden', !hidden);
  arrow.textContent = hidden ? '▾' : '▸';
}

// ── General obs load (called from loadActivityView) ───────────────
async function loadGeneralObs() {
  await Promise.all([loadGeneralObservations(), loadArchivedObservations()]);
  renderGeneralObservationsSection(_generalObsActive, _generalObsArchived);
}

let _obsModalState = {
  editingId: null,
};

function openObsModal(editId, editContent, editImportant) {
  _obsModalState.editingId = editId || null;

  const modal = document.getElementById('obsModal');
  const contentEl = document.getElementById('obsContent');
  const dateInfoEl = document.getElementById('obsDateInfo');
  const dateDisplayEl = document.getElementById('obsDateDisplay');
  const titleEl = document.getElementById('obsModalTitle');
  const impEl = document.getElementById('obsImportant');
  const errorEl = document.getElementById('obsError');
  const btn = document.getElementById('obsSaveBtn');

  errorEl.classList.add('hidden');
  contentEl.value = editContent || '';
  updateObsCharCount();

  if (editId) {
    // Find the observation to show its created date
    const obs = _generalObsActive.find(o => o.id === editId) || _generalObsArchived.find(o => o.id === editId);
    if (obs) {
      const d = new Date(obs.created_at);
      dateDisplayEl.textContent = 'Skapad ' + d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
      dateInfoEl.classList.remove('hidden');
    }
    titleEl.textContent = 'Redigera anteckning';
    impEl.checked = Boolean(editImportant);
    btn.textContent = 'Spara ändringar';
  } else {
    dateInfoEl.classList.add('hidden');
    titleEl.textContent = 'Allmän observation';
    impEl.checked = false;
    btn.textContent = 'Spara';
  }

  modal.classList.remove('hidden');
  contentEl.focus();
}

function closeObsModal() {
  document.getElementById('obsModal').classList.add('hidden');
  _obsModalState.editingId = null;
}

function updateObsCharCount() {
  const el = document.getElementById('obsCharCount');
  const val = document.getElementById('obsContent').value;
  el.textContent = val.length + '/2000';
}

async function saveObservation() {
  const content = document.getElementById('obsContent').value.trim();
  const isImportant = document.getElementById('obsImportant').checked;
  const errorEl = document.getElementById('obsError');
  const btn = document.getElementById('obsSaveBtn');

  errorEl.classList.add('hidden');

  if (!content) { errorEl.textContent = 'Skriv en anteckning först'; errorEl.classList.remove('hidden'); return; }
  if (content.length > 2000) { errorEl.textContent = 'Max 2000 tecken'; errorEl.classList.remove('hidden'); return; }

  btn.disabled = true;
  btn.textContent = 'Sparar...';

  try {
    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-CSRF-Token'] = csrf;

    let res;
    if (_obsModalState.editingId) {
      res = await fetch(`/api/general-observations/${_obsModalState.editingId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ text: content, is_important: isImportant }),
      });
    } else {
      res = await fetch('/api/general-observations', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ text: content, is_important: isImportant }),
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunde inte spara');

    closeObsModal();

    // Reload the general observations section in-place (more targeted than full activity view reload)
    try {
      await loadGeneralObs();
      showToast(_obsModalState.editingId ? 'Sparat!' : 'Sparat!', 'success');
    } catch (err) {
      console.error('[saveObservation] reload failed:', err);
      showToast('Sparat! Men kunde inte uppdatera listan — ladda om sidan.', 'error');
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = _obsModalState.editingId ? 'Spara ändringar' : 'Spara';
  }
}

async function doArchiveObservation(obsId) {
  if (!confirm('Arkivera denna anteckning?')) return;
  try {
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`/api/general-observations/${obsId}/archive`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Kunde inte arkivera');
    showToast('Arkiverad ✓', 'success');
    try { await reloadActivityView(); } catch (e) { console.error('[doArchiveObservation] reload failed:', e); }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function doRestoreObservation(obsId) {
  try {
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`/api/general-observations/${obsId}/restore`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Kunde inte återställa');
    showToast('Återställd ✓', 'success');
    try { await reloadActivityView(); } catch (e) { console.error('[doRestoreObservation] reload failed:', e); }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function doDeleteGeneralObs(obsId) {
  if (!confirm('Ta bort denna anteckning permanent? Detta kan inte ångras.')) return;
  try {
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`/api/general-observations/${obsId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Kunde inte ta bort');
    showToast('Borttagen', 'success');
    try { await reloadActivityView(); } catch (e) { console.error('[doDeleteGeneralObs] reload failed:', e); }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function reloadActivityView() {
  const { from, to } = getActivityDateRange();
  if (!from || !to || !reportCurrentChildId) return;
  const [logsRes] = await Promise.all([
    fetch(`/api/children/${reportCurrentChildId}/daily-logs?from=${from}&to=${to}`, { credentials: 'include' }),
    loadGeneralObs(),
  ]);
  if (!logsRes.ok) return;
  const logs = await logsRes.json();
  // Normalize date keys to YYYY-MM-DD (same fix as loadActivityView)
  const dateMap = {};
  logs.forEach(log => {
    if (!log.date) return;
    const m = String(log.date).match(/^(\d{4}-\d{2}-\d{2})/);
    const key = m ? m[1] : String(log.date);
    dateMap[key] = log;
  });
  const dailyDates = Object.keys(dateMap).sort().reverse();
  const allItems = {};
  await Promise.allSettled(dailyDates.map(async (date) => {
    const itemsRes = await fetch(`/api/children/${reportCurrentChildId}/daily-log?date=${date}`, { credentials: 'include' });
    if (itemsRes.ok) {
      const data = await itemsRes.json();
      allItems[date] = data.items || [];
    }
  }));
  renderActivityList(dateMap, allItems);
}

function _initObsCharCounter() {
  const el = document.getElementById('obsContent');
  if (!el) return;
  el.removeEventListener('input', updateObsCharCount);
  el.addEventListener('input', updateObsCharCount);
}

function openNoteModal(itemId, currentNote) {
  _noteModalItemId = itemId;
  document.getElementById('noteModalText').value = currentNote || '';
  document.getElementById('noteModalError').classList.add('hidden');
  document.getElementById('noteModal').classList.remove('hidden');
  document.getElementById('noteModalText').focus();
}

function closeNoteModal() {
  document.getElementById('noteModal').classList.add('hidden');
  _noteModalItemId = null;
}

async function saveNote() {
  if (!_noteModalItemId || !_noteModalItemId.trim()) {
    const el = document.getElementById('noteModalError');
    el.textContent = 'Kunde inte identifiera aktiviteten. Prova ladda om sidan.';
    el.classList.remove('hidden');
    return;
  }
  const note = document.getElementById('noteModalText').value.trim();

  document.getElementById('noteModalError').textContent = '';
  document.getElementById('noteModalError').classList.add('hidden');

  try {
    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const url = `/api/daily-log-items/${_noteModalItemId}/note`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Kunde inte spara anteckning (${res.status})`);
    }

    closeNoteModal();

    // Reload activity view if on that tab, THEN show toast (toast comes after data refresh)
    if (!document.getElementById('activityTab').classList.contains('hidden')) {
      try {
        await loadActivityView();
        showToast('Anteckning sparad!', 'success');
      } catch (err) {
        console.error('[saveNote] reload failed:', err);
        showToast('Sparat! Men kunde inte uppdatera — ladda om sidan.', 'error');
      }
    } else {
      showToast('Anteckning sparad!', 'success');
    }
  } catch (err) {
    const el = document.getElementById('noteModalError');
    el.textContent = err.message;
    el.classList.remove('hidden');
  }
}

// ── Shared reports ────────────────────────────────────────────────
async function loadSharedReports() {
  document.getElementById('sharedLoading').classList.remove('hidden');
  document.getElementById('sharedEmpty').classList.add('hidden');
  document.getElementById('sharedFilterEmpty').classList.add('hidden');
  document.getElementById('sharedList').classList.add('hidden');

  try {
    const res = await fetch('/api/reports', { credentials: 'include' });
    if (!res.ok) throw new Error('Kunde inte ladda rapporter');
    const data = await res.json();
    sharedLinksCache = data.links || [];

    document.getElementById('sharedLoading').classList.add('hidden');

    if (sharedLinksCache.length === 0) {
      document.getElementById('sharedEmpty').classList.remove('hidden');
      updateSharedFilterCounts();
      return;
    }

    applySharedFilter();
  } catch (err) {
    document.getElementById('sharedLoading').classList.add('hidden');
    showToast('Kunde inte ladda delade rapporter', 'error');
  }
}

// ── Filter helpers ────────────────────────────────────────────────
function getLinkStatus(link) {
  const now = new Date();
  const expiresAt = link.expires_at ? new Date(link.expires_at) : null;
  if (link.revoked_at) return 'revoked';
  if (expiresAt && expiresAt < now) return 'expired';
  return 'active';
}

function setSharedFilter(filter) {
  sharedLinksFilter = filter;
  // Update button styles
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isSelected = btn.dataset.filter === filter;
    btn.classList.toggle('border-gold', isSelected);
    btn.classList.toggle('bg-gold', isSelected);
    btn.classList.toggle('text-white', isSelected);
    btn.classList.toggle('border-lavender', !isSelected);
    btn.classList.toggle('text-text-soft', !isSelected);
  });
  applySharedFilter();
}

function applySharedFilter() {
  updateSharedFilterCounts();

  const filtered = sharedLinksCache.filter(link => {
    const status = getLinkStatus(link);
    if (sharedLinksFilter === 'all') return true;
    if (sharedLinksFilter === 'active') return status === 'active';
    if (sharedLinksFilter === 'inactive') return status === 'expired' || status === 'revoked';
    return true;
  });

  document.getElementById('sharedList').classList.add('hidden');
  document.getElementById('sharedEmpty').classList.add('hidden');
  document.getElementById('sharedFilterEmpty').classList.add('hidden');

  if (filtered.length === 0) {
    const labels = { all: 'Inga delade rapporter ännu', active: 'Inga aktiva rapporter', inactive: 'Inga inaktiva rapporter' };
    document.getElementById('filterEmptyLabel').textContent = labels[sharedLinksFilter] || 'Inga rapporter';
    document.getElementById('sharedFilterEmpty').classList.remove('hidden');
  } else {
    renderSharedList(filtered);
  }
}

function updateSharedFilterCounts() {
  const all = sharedLinksCache.length;
  const active = sharedLinksCache.filter(l => getLinkStatus(l) === 'active').length;
  const inactive = sharedLinksCache.filter(l => getLinkStatus(l) !== 'active').length;
  document.getElementById('filterCountAll').textContent = all;
  document.getElementById('filterCountActive').textContent = active;
  document.getElementById('filterCountInactive').textContent = inactive;
}

function renderSharedList(links) {
  const list = document.getElementById('sharedList');

  list.innerHTML = links.map(link => {
    const createdMatch = link.created_at.match(/^\d{4}-\d{2}-\d{2}/);
    const createdAt = createdMatch ? new Date(createdMatch[0] + 'T12:00:00') : new Date(link.created_at);
    const expiresMatch = link.expires_at && link.expires_at.match(/^\d{4}-\d{2}-\d{2}/);
    const expiresAt = expiresMatch ? new Date(expiresMatch[0] + 'T12:00:00') : (link.expires_at ? new Date(link.expires_at) : null);
    const now = new Date();

    let status = 'active';
    let statusLabel = 'Aktiv';
    if (link.revoked_at) {
      status = 'revoked';
      statusLabel = 'Återkallad';
    } else if (expiresAt && expiresAt < now) {
      status = 'expired';
      statusLabel = 'Utgången';
    }

    const createdStr = createdAt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
    const expiresStr = expiresAt
      ? expiresAt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
      : '—';

    const child = reportChildren.find(c => c.id === link.child_id);
    const childLabel = link.anonymous
      ? '<span class="text-purple-600 font-medium">🔒 Anonym</span>'
      : (child ? `${renderChildAvatar(child, 20)} ${escHtml(child.name)}` : 'Okänt barn');

    return `
      <div class="report-row bg-white rounded-xl border border-lavender p-4">
        <div class="flex items-start justify-between gap-2 mb-3">
          <div>
            <p class="font-semibold text-navy">${escHtml(link.label || 'Namnlös rapport')}</p>
            <p class="text-xs text-text-soft mt-0.5">${childLabel}</p>
          </div>
          <div class="flex flex-col items-end gap-1">
            ${link.anonymous ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">🔒 Anonym</span>' : ''}
            <span class="report-status-badge ${'status-' + status}">${statusLabel}</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div>
            <p class="text-xs text-text-soft">Skapad</p>
            <p class="text-sm font-semibold">${createdStr}</p>
          </div>
          <div>
            <p class="text-xs text-text-soft">Utgår</p>
            <p class="text-sm font-semibold ${status === 'expired' ? 'text-red-500' : ''}">${expiresStr}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs text-text-soft mb-3">
          <span>📋</span>
          <span>${(link.fields || []).join(', ') || 'Alla fält'}</span>
        </div>
        ${link.view_count > 0 ? `<p class="text-xs text-text-soft mb-3">👁️ ${link.view_count} visningar</p>` : ''}
        <div class="flex gap-2">
          <button onclick="copyLink('${link.public_id}')"
            class="flex-1 py-2 bg-navy hover:bg-navy-soft text-white text-sm font-semibold rounded-xl transition-colors">
            📋 Kopiera länk
          </button>
          <a href="/r/${link.public_id}" target="_blank" rel="noopener"
            class="flex-1 py-2 bg-lavender hover:bg-purple-200 text-navy text-sm font-semibold rounded-xl transition-colors text-center no-underline">
            🔗 Öppna
          </a>
        </div>
        ${status !== 'revoked' ? `
        <div class="flex gap-2">
          <button onclick="archiveReportDirect('${link.id}')"
            class="flex-1 py-2 bg-lavender hover:bg-purple-200 text-navy text-sm font-semibold rounded-xl transition-colors">
            📂 Återta
          </button>
          <button onclick="showDeleteDialog('${link.id}')"
            class="flex-1 py-2 bg-coral hover:bg-red-200 text-navy text-sm font-semibold rounded-xl transition-colors">
            🗑️ Ta bort
          </button>
        </div>` : `
        <div class="flex gap-2">
          <button onclick="showDeleteDialog('${link.id}')"
            class="flex-1 py-2 bg-coral hover:bg-red-200 text-navy text-sm font-semibold rounded-xl transition-colors">
            🗑️ Ta bort
          </button>
        </div>`}
      </div>`;
  }).join('');

  list.classList.remove('hidden');
}

async function copyLink(publicId) {
  const url = window.location.origin + '/r/' + publicId;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Länk kopierad!', 'success');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Länk kopierad!', 'success');
  }
}

async function revokeReport(id) {
  if (!confirm('Återkalla denna rapportlänk? Den kommer inte längre att fungera.')) return;

  try {
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`/api/reports/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Kunde inte återkalla');
    }
    showToast('Rapport återkallad', 'success');
    loadSharedReports();
    if (window.refreshReportsActiveCount) window.refreshReportsActiveCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function renewReport(id) {
  if (!confirm('Förnya rapporten i 7 nya dagar?')) return;

  try {
    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`/api/reports/${id}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ renew: true }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Kunde inte förnya');
    }
    showToast('Rapport förnyad!', 'success');
    loadSharedReports();
    if (window.refreshReportsActiveCount) window.refreshReportsActiveCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Tab switching ────────────────────────────────────────────────
function switchTab(tab) {
  ['create', 'activity', 'shared'].forEach(t => {
    const el = document.getElementById(t + 'Tab');
    const tabBtn = document.getElementById('tab' + capitalize(t));
    if (el) el.classList.toggle('hidden', t !== tab);
    if (tabBtn) {
      tabBtn.classList.toggle('tab-active', t === tab);
      tabBtn.classList.toggle('tab-inactive', t !== tab);
    }
  });

  if (tab === 'activity') {
    if (reportCurrentChildId) {
      loadActivityView();
    } else if (reportChildren.length === 0 && _childLoadRetries === 0) {
      // Children haven't loaded yet or failed — retry
      loadChildren();
    }
  }
}

// ── Helpers ────────────────────────────────────
function fmtDate(d) {
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return '';
  }
  if (d instanceof Date && !isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return '';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escJs(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

// ── Revoke\delete dialog ─────────────────────────────────────
function showRevokeDialog(linkId) {
  document.getElementById('revokeLinkId').value = linkId;
  document.getElementById('revokeDialog').classList.remove('hidden');
}

function closeRevokeDialog() {
  document.getElementById('revokeDialog').classList.add('hidden');
  document.getElementById('revokeLinkId').value = '';
}

// Direct archive — no confirmation dialog
async function archiveReportDirect(id) {
  if (!confirm('Återta rapporten? Länken slutar fungera, men du kan fortfarande se rapporten.')) return;
  try {
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`/api/reports/${id}/revoke`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Kunde inte återta');
    }
    showToast('Rapport återkallad', 'success');
    loadSharedReports();
    if (window.refreshReportsActiveCount) window.refreshReportsActiveCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delete confirmation dialog (no archive option — just delete)
function showDeleteDialog(linkId) {
  document.getElementById('revokeLinkId').value = linkId;
  document.getElementById('revokeDialog').classList.remove('hidden');
}

async function archiveReport() {
  const id = document.getElementById('revokeLinkId').value;
  closeRevokeDialog();
  try {
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`/api/reports/${id}/revoke`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Kunde inte arkivera');
    }
    showToast('Rapport arkiverad', 'success');
    loadSharedReports();
    if (window.refreshReportsActiveCount) window.refreshReportsActiveCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function permanentlyDeleteReport() {
  const id = document.getElementById('revokeLinkId').value;
  closeRevokeDialog();
  if (!confirm('Ta bort rapporten permanent? Detta kan inte ångras.')) return;
  try {
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`/api/reports/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Kunde inte ta bort');
    }
    showToast('Rapport borttagen', 'success');
    loadSharedReports();
    if (window.refreshReportsActiveCount) window.refreshReportsActiveCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showToast(msg, type) {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, type);
  } else {
    const toast = document.getElementById('toast') || document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg font-semibold text-sm ${
      type === 'error' ? 'bg-red-500 text-white' : 'bg-navy text-white'
    }`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}