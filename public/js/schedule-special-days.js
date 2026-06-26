/**
 * Schedule page special-days (Fas 8 F3a).
 * Special-day calendar + edit modal for the /schedule page, extracted from schedule.js.
 * Group-exclusive state (sdCalYear/Month, sdSpecialDays, sdEditDate, sdScheduleId, sdItems,
 * MONTH_NAMES) moves here; reads globals (currentChildId, children, allTemplates, fmtTime via
 * ScheduleCore, escHtml, showToast, apiFetch). Handlers exposed on window for onclick + setViewMode.
 */
(function () {
let sdCalYear = new Date().getFullYear();
let sdCalMonth = new Date().getMonth(); // 0-indexed
let sdSpecialDays = []; // list of { id, date, note, item_count }
let sdEditDate = null; // 'YYYY-MM-DD' currently being edited
let sdScheduleId = null; // UUID of the special_day_schedule being edited
let sdItems = []; // items in the current special day being edited

const MONTH_NAMES = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];

async function loadSpecialDays(childId) {
  // Load all special days for this child (future 6 months + past 3 months)
  const from = new Date(sdCalYear, sdCalMonth - 2, 1).toISOString().slice(0,10);
  const to = new Date(sdCalYear, sdCalMonth + 4, 0).toISOString().slice(0,10);
  const res = await window.apiFetch(`/api/children/${childId}/special-days?from=${from}&to=${to}`);
  if (res.ok) sdSpecialDays = await res.json();
  else sdSpecialDays = [];
}

async function renderSpecialDaysCalendar() {
  if (!currentChildId) return;
  await loadSpecialDays(currentChildId);

  const child = children.find(c => c.id === currentChildId);
  const childName = child ? `${child.emoji||'👤'} ${escHtml(child.name)}` : '';

  const firstDay = new Date(sdCalYear, sdCalMonth, 1);
  const lastDay = new Date(sdCalYear, sdCalMonth + 1, 0);
  const today = new Date().toISOString().slice(0,10);

  // Build a set of special day dates for quick lookup
  const specialDateSet = {};
  for (const sd of sdSpecialDays) specialDateSet[sd.date] = sd;

  // Calendar grid: start from Monday of the week containing the 1st
  const startDow = firstDay.getDay(); // 0=Sun
  // Adjust to Monday-first: shift so Mon=0
  const offset = (startDow + 6) % 7; // days to go back to Monday

  const cells = [];
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - offset);

  // We always render 6 rows × 7 = 42 cells
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = d.toISOString().slice(0,10);
    const inMonth = d.getMonth() === sdCalMonth;
    const isToday = dateStr === today;
    const special = specialDateSet[dateStr] || null;
    cells.push({ date: d, dateStr, inMonth, isToday, special });
  }

  // Trim trailing empty weeks
  let totalRows = 6;
  while (totalRows > 4 && !cells.slice((totalRows-1)*7, totalRows*7).some(c => c.inMonth)) totalRows--;

  const headerDays = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];

  const html = `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy">${childName} — Specialdagar</h3>
          <p class="text-xs text-text-soft mt-0.5">Klicka på ett datum för att skapa eller redigera ett unikt schema för den dagen</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="sdNavMonth(-1)" class="w-9 h-9 rounded-full border-2 border-lavender hover:border-gold flex items-center justify-center font-bold text-navy transition-colors">‹</button>
          <span class="font-heading font-bold text-navy min-w-[140px] text-center">${MONTH_NAMES[sdCalMonth]} ${sdCalYear}</span>
          <button onclick="sdNavMonth(1)" class="w-9 h-9 rounded-full border-2 border-lavender hover:border-gold flex items-center justify-center font-bold text-navy transition-colors">›</button>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 mb-3 text-xs text-text-soft flex-wrap">
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded-full bg-amber-100 border-2 border-amber-400 inline-block"></span> Specialdag</span>
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-400 inline-block"></span> Idag</span>
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded-full bg-white border-2 border-lavender inline-block"></span> Veckodagsmall används</span>
      </div>

      <!-- Calendar grid — cal-scroll-wrap enables horizontal scroll on narrow viewports -->
      <div class="cal-scroll-wrap">
      <div class="border-2 border-lavender rounded-2xl overflow-hidden">
        <!-- Header -->
        <div class="grid grid-cols-7 bg-navy">
          ${headerDays.map(d => `<div class="text-center text-white text-xs font-bold py-2">${d}</div>`).join('')}
        </div>
        <!-- Cells -->
        <div class="grid grid-cols-7">
          ${cells.slice(0, totalRows*7).map(cell => {
            const { dateStr, inMonth, isToday, special } = cell;
            const dayNum = cell.date.getDate();
            let bg = inMonth ? 'bg-white hover:bg-sky cursor-pointer' : 'bg-gray-50 opacity-50 cursor-pointer';
            let border = 'border border-gray-100';
            if (isToday) { bg = 'bg-blue-50 hover:bg-blue-100 cursor-pointer'; border = 'border-2 border-blue-300'; }
            if (special) { bg = 'bg-amber-50 hover:bg-amber-100 cursor-pointer'; border = 'border-2 border-amber-400'; }
            const dot = special ? `<span class="absolute top-1 right-1 text-[10px]">🌟</span>` : '';
            const note = special && special.note ? `<div class="text-[9px] text-amber-700 truncate leading-tight mt-0.5">${escHtml(special.note)}</div>` : '';
            const cnt = special ? `<div class="text-[9px] text-amber-600 font-semibold">${special.item_count} akt.</div>` : '';
            return `<div class="relative min-h-[64px] p-2 ${bg} ${border} transition-colors" onclick="sdOpenDay('${dateStr}')">
              <div class="text-sm font-bold ${inMonth?'text-navy':'text-gray-400'} ${isToday?'text-blue-700':''}">${dayNum}</div>
              ${note}${cnt}${dot}
            </div>`;
          }).join('')}
        </div>
      </div>
      </div><!-- /cal-scroll-wrap -->

      <!-- Special days list -->
      ${sdSpecialDays.length > 0 ? `
      <div class="mt-4">
        <p class="text-xs font-semibold text-navy mb-2">Specialdagar denna period (${sdSpecialDays.length} st):</p>
        <div class="space-y-2">
          ${sdSpecialDays.map(sd => {
            const d = new Date(sd.date.slice(0, 10) + 'T12:00:00Z');
            const label = d.toLocaleDateString('sv-SE', { weekday:'long', day:'numeric', month:'long' });
            return `<div class="flex items-center justify-between p-3 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <div>
                <span class="text-sm font-semibold text-navy">🌟 ${escHtml(label)}</span>
                ${sd.note ? `<span class="text-xs text-amber-700 ml-2">— ${escHtml(sd.note)}</span>` : ''}
                <span class="text-xs text-text-soft ml-2">(${sd.item_count} aktiviteter)</span>
              </div>
              <button onclick="sdOpenDay('${sd.date}')" class="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-semibold transition-colors">Redigera</button>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}
    </div>
  `;

  document.getElementById('scheduleContent').innerHTML = html;
}

function sdNavMonth(delta) {
  sdCalMonth += delta;
  if (sdCalMonth < 0) { sdCalMonth = 11; sdCalYear--; }
  if (sdCalMonth > 11) { sdCalMonth = 0; sdCalYear++; }
  renderSpecialDaysCalendar();
}

async function sdOpenDay(dateStr) {
  dateStr = dateStr.slice(0, 10);
  sdEditDate = dateStr;
  sdScheduleId = null;
  sdItems = [];

  // Format display date
  const d = new Date(dateStr + 'T12:00:00Z');
  const label = d.toLocaleDateString('sv-SE', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById('specialDayDateLabel').textContent = label;

  // Check if special day already exists
  const existing = sdSpecialDays.find(sd => sd.date === dateStr);
  if (existing) {
    document.getElementById('specialDayModalTitle').textContent = '🌟 Redigera specialdag';
    document.getElementById('sdDeleteBtn').classList.remove('hidden');

    // Load the full schedule with items
    // First get the ID
    const listRes = await window.apiFetch(`/api/children/${currentChildId}/special-days?from=${dateStr}&to=${dateStr}`);
    if (listRes.ok) {
      const days = await listRes.json();
      if (days.length > 0) {
        sdScheduleId = days[0].id;
        document.getElementById('specialDayNote').value = days[0].note || '';

        // Fetch items
        const itemsRes = await window.apiFetch(`/api/special-day-schedules/${sdScheduleId}/items`);
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          sdItems = data.items || [];
        }
      }
    }
  } else {
    document.getElementById('specialDayModalTitle').textContent = '✨ Skapa specialdag';
    document.getElementById('sdDeleteBtn').classList.add('hidden');
    document.getElementById('specialDayNote').value = '';
  }

  // Populate template select
  const sel = document.getElementById('sdAddTemplateSelect');
  sel.innerHTML = '<option value="">-- Välj aktivitet --</option>' +
    allTemplates.map(t => `<option value="${t.id}">${escHtml(t.icon||'')} ${escHtml(t.name)} (${t.star_value}⭐)</option>`).join('');

  renderSdItems();
  document.getElementById('specialDayError').classList.add('hidden');
  document.getElementById('specialDayModal').classList.remove('hidden');
}

function closeSpecialDayModal() {
  document.getElementById('specialDayModal').classList.add('hidden');
  sdEditDate = null; sdScheduleId = null; sdItems = [];
}

function renderSdItems() {
  const container = document.getElementById('sdItemsList');
  if (sdItems.length === 0) {
    container.innerHTML = '<div class="text-text-soft text-sm text-center py-4">Inga aktiviteter — lägg till nedan</div>';
    return;
  }
  const secEmoji = { morgon:'🌅', dag:'☀️', kvall:'🌆', natt:'🌙' };
  const secLabel = { morgon:'Morgon', dag:'Dag', kvall:'Kväll', natt:'Natt' };
  // Group by section
  const grouped = {};
  for (const item of sdItems) {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section].push(item);
  }
  const sectionOrder = ['morgon','dag','kvall','natt'];
  let html = '';
  for (const sec of sectionOrder) {
    if (!grouped[sec]) continue;
    html += `<div class="mb-3">
      <div class="text-xs font-bold text-text-soft uppercase mb-1">${secEmoji[sec]||''} ${secLabel[sec]||sec}</div>
      ${grouped[sec].map((item, idx) => `
        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-lavender mb-1 group">
          <span class="text-lg">${escHtml(item.icon||'')}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-navy truncate">${escHtml(item.name)}</div>
            ${item.start_time ? `<div class="text-xs text-text-soft">${fmtTime(item.start_time)}${item.end_time?' – '+fmtTime(item.end_time):''}</div>` : ''}
          </div>
          <span class="text-xs text-gold font-bold">${item.star_value}⭐</span>
          ${sdScheduleId ? `<button onclick="sdRemoveItem('${item.id}')" class="text-red-400 hover:text-red-600 text-sm font-bold ml-1 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>` : `<button onclick="sdRemovePendingItem(${sdItems.indexOf(item)})" class="text-red-400 hover:text-red-600 text-sm font-bold ml-1 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>`}
        </div>`).join('')}
    </div>`;
  }
  container.innerHTML = html;
}

async function sdCopyFromTemplate() {
  if (!currentChildId || !sdEditDate) return;
  const btn = document.getElementById('sdCopyBtn');
  btn.disabled = true; btn.textContent = 'Laddar…';
  try {
    // Create/get the special day first
    if (!sdScheduleId) {
      const createRes = await window.apiFetch(`/api/children/${currentChildId}/special-days`, {
        method: 'POST',
        body: JSON.stringify({ date: sdEditDate, note: document.getElementById('specialDayNote').value.trim() || null, copy_from_template: true }),
      });
      if (!createRes.ok) { const e = await createRes.json(); throw new Error(e.error || 'Fel'); }
      const data = await createRes.json();
      sdScheduleId = data.id;
      sdItems = data.items || [];
      document.getElementById('sdDeleteBtn').classList.remove('hidden');
      await loadSpecialDays(currentChildId);
    } else {
      // If already exists, fetch items from weekly template and add
      // We reload via copy endpoint effect — just re-open with copy
      showToast('Specialdag finns redan. Lägg till aktiviteter manuellt.', true);
    }
    renderSdItems();
    showToast('Kopierat från veckodagsmall!');
  } catch (err) {
    showToast(err.message || 'Fel vid kopiering', true);
  }
  btn.disabled = false; btn.textContent = '📋 Kopiera från veckodagsmall';
}

async function sdAddItem() {
  const templateId = document.getElementById('sdAddTemplateSelect').value;
  const section = document.getElementById('sdAddSection').value;
  if (!templateId) { showToast('Välj en aktivitet', true); return; }

  const tpl = allTemplates.find(t => t.id === templateId);
  if (!tpl) return;

  // If schedule doesn't exist yet, create it first
  if (!sdScheduleId) {
    const createRes = await window.apiFetch(`/api/children/${currentChildId}/special-days`, {
      method: 'POST',
      body: JSON.stringify({ date: sdEditDate, note: document.getElementById('specialDayNote').value.trim() || null, copy_from_template: false }),
    });
    if (!createRes.ok) { const e = await createRes.json(); showToast(e.error || 'Fel', true); return; }
    const data = await createRes.json();
    sdScheduleId = data.id;
    sdItems = data.items || [];
    document.getElementById('sdDeleteBtn').classList.remove('hidden');
    await loadSpecialDays(currentChildId);
  }

  // Add item via API
  const res = await window.apiFetch(`/api/special-day-schedules/${sdScheduleId}/items`, {
    method: 'POST',
    body: JSON.stringify({ activity_template_id: templateId, section }),
  });
  if (res.ok) {
    const item = await res.json();
    sdItems.push(item);
    renderSdItems();
    document.getElementById('sdAddTemplateSelect').value = '';
    showToast('Aktivitet tillagd');
  } else {
    const e = await res.json();
    showToast(e.error || 'Fel', true);
  }
}

function sdRemovePendingItem(idx) {
  sdItems.splice(idx, 1);
  renderSdItems();
}

async function sdRemoveItem(itemId) {
  if (!sdScheduleId) return;
  const res = await window.apiFetch(`/api/special-day-schedules/${sdScheduleId}/items/${itemId}`, { method: 'DELETE' });
  if (res.ok) {
    sdItems = sdItems.filter(i => i.id !== itemId);
    renderSdItems();
  } else {
    const e = await res.json();
    showToast(e.error || 'Fel', true);
  }
}

async function sdClearAll() {
  if (!sdScheduleId) { sdItems = []; renderSdItems(); return; }
  // Remove all items
  for (const item of [...sdItems]) {
    await window.apiFetch(`/api/special-day-schedules/${sdScheduleId}/items/${item.id}`, { method: 'DELETE' });
  }
  sdItems = [];
  renderSdItems();
  showToast('Alla aktiviteter borttagna');
}

async function sdSave() {
  if (!currentChildId || !sdEditDate) return;
  const note = document.getElementById('specialDayNote').value.trim() || null;

  if (sdScheduleId) {
    // Update note only (items are saved on the fly)
    // There's no direct "update note" endpoint — re-POST with ON CONFLICT updates note
    const res = await window.apiFetch(`/api/children/${currentChildId}/special-days`, {
      method: 'POST',
      body: JSON.stringify({ date: sdEditDate, note }),
    });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('Specialdag sparad!');
  } else if (sdItems.length > 0) {
    // Shouldn't happen — items can only be added once schedule is created
    showToast('Specialdag sparad!');
  } else {
    // Create empty special day (e.g. a scheduled day off with no activities)
    const res = await window.apiFetch(`/api/children/${currentChildId}/special-days`, {
      method: 'POST',
      body: JSON.stringify({ date: sdEditDate, note, copy_from_template: false }),
    });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    const data = await res.json();
    sdScheduleId = data.id;
    document.getElementById('sdDeleteBtn').classList.remove('hidden');
    showToast('Specialdag skapad!');
  }

  await loadSpecialDays(currentChildId);
  closeSpecialDayModal();
  await renderSpecialDaysCalendar();
}

async function sdDeleteSpecialDay() {
  if (!confirm('Ta bort specialdagen? Veckodagsmallen används igen för det datumet.')) return;
  const res = await window.apiFetch(`/api/children/${currentChildId}/special-days/${sdEditDate}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Specialdag borttagen. Veckodagsmallen gäller igen.');
    closeSpecialDayModal();
    await loadSpecialDays(currentChildId);
    await renderSpecialDaysCalendar();
  } else {
    const e = await res.json();
    showToast(e.error || 'Fel', true);
  }
}

  // Exposed on window for inline onclick + cross-file callers
  window.loadSpecialDays = loadSpecialDays;
  window.renderSpecialDaysCalendar = renderSpecialDaysCalendar;
  window.sdNavMonth = sdNavMonth;
  window.sdOpenDay = sdOpenDay;
  window.closeSpecialDayModal = closeSpecialDayModal;
  window.renderSdItems = renderSdItems;
  window.sdCopyFromTemplate = sdCopyFromTemplate;
  window.sdAddItem = sdAddItem;
  window.sdRemovePendingItem = sdRemovePendingItem;
  window.sdRemoveItem = sdRemoveItem;
  window.sdClearAll = sdClearAll;
  window.sdSave = sdSave;
  window.sdDeleteSpecialDay = sdDeleteSpecialDay;
})();
