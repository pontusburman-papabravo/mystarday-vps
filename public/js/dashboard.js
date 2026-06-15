/**
 * Dashboard main UI logic — schedule picker, child view management, activity modals, drag-and-drop, real-time updates.
 * Does not own: authentication (auth.js), API routing, database.
 */

// ── Delegated delete handler (Sortable.js forceFallback blocks inline onclick on mobile) ──
document.addEventListener('click', e => {
  const btn = e.target.closest('.action-btn-remove');
  if (!btn) return;
  e.stopPropagation();
  const itemId = btn.dataset.id || btn.closest('[data-id]')?.dataset.id;
  if (itemId && typeof removeItem === 'function') removeItem(itemId);
});

// ── Constants ────────────────────────────────────────────
const DAYS = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'];
const DAYS_SHORT = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
const SECTIONS = [
  { key: 'morgon', label: 'Morgon', emoji: '🌅', color: 'bg-yellow-50 border-yellow-200' },
  { key: 'dag',    label: 'Dag',    emoji: '☀️', color: 'bg-sky border-blue-200' },
  { key: 'kvall',  label: 'Kväll',  emoji: '🌆', color: 'bg-orange-50 border-orange-200' },
  { key: 'natt',   label: 'Natt',   emoji: '🌙', color: 'bg-indigo-50 border-indigo-200' },
];

// initBirthdayPicker and updateBirthdayDays are now in /js/birthday-picker.js
function updateBirthdayHidden(prefix) {
  const y = document.getElementById(prefix + 'Year').value;
  const m = document.getElementById(prefix + 'Month').value;
  const d = document.getElementById(prefix + 'Day').value;
  document.getElementById(prefix).value = (y && m && d) ? `${y}-${m}-${d}` : '';
}

function calculateAge(birthday) {
  const birth = new Date(birthday);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) years--;
  if (years < 1) {
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    return months + ' mån';
  }
  return years + ' år';
}

// ── State ────────────────────────────────────────────────
let children = [];
let activities = [];
let childSchedules = {};
let currentChildId = null;
let currentDay = new Date().getDay();
let currentScheduleId = null;
let scheduleItems = [];
let sectionTimes = {};
let selectedTemplateId = null;
let addSectionOverride = 'dag';
let editSectionVal = 'dag';
let copyDaySelections = [];
let _pendingDeleteItemId = null;
let _pendingTargetChildIds = [];
let copyTargetChildId = null;
let allExpanded = true;
let _onceMode = false; // true when addActivityModal is opened for a one-time task
let _onceCreateContext = null; // snapshot of once-flow context when "Skapa ny" is opened from once mode

// DnD state
let dndType = null; // 'within-day' | 'activity-to-day' | 'day-tab' | 'timeline' | 'sbs'
let dndSrcDay = null;
let currentViewMode = 'normal';
let sbsChildId = null;
let sbsItems = [];
let sbsScheduleId = null;
let sbsAllData = {}; // { [childId]: { items: [], scheduleId: null } }
let allTemplates = [];

// ── Calendar navigation state ─────────────────────────────
let calView = 'week'; // 'day' | 'week' | 'month'
let weekOffset = 0;   // 0 = current week, -1 = last week, +1 = next week
let dayOffset = 0;    // offset in days from today (for day view)

// ── Calendar helpers ──────────────────────────────────────
function getWeekStart(offset) {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const mondayDiff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayDiff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function getDayFromOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function updateCalNavLabel() {
  const label = document.getElementById('calNavLabel');
  if (!label) return;
  if (calView === 'week') {
    const ws = getWeekStart(weekOffset);
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    const wn = getWeekNumber(ws);
    label.textContent = `Vecka ${wn}, ${ws.getFullYear()}`;
  } else if (calView === 'day') {
    const d = getDayFromOffset(dayOffset);
    const today = new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0);
    const isToday = d.getTime() === today.getTime();
    const dayName = d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' });
    label.textContent = isToday ? `Idag — ${d.toLocaleDateString('sv-SE', { day:'numeric', month:'short' })}` : dayName;
  } else if (calView === 'month') {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + weekOffset, 1);
    const monthName = d.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
    label.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }
}

function setCalView(view) {
  calView = view;
  // Update toggle button styles
  ['day','week','month'].forEach(v => {
    const btn = document.getElementById('btnView' + v.charAt(0).toUpperCase() + v.slice(1));
    if (!btn) return;
    const isActive = v === view;
    btn.classList.toggle('bg-navy', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('bg-white', !isActive);
    btn.classList.toggle('text-navy', !isActive);
  });
  // Show/hide viewModeBar and daySelectorWrap
  const viewModeBar = document.getElementById('viewModeBar');
  const daySelectorWrap = document.getElementById('daySelectorWrap');
  if (view === 'month') {
    if (viewModeBar) viewModeBar.classList.add('hidden');
    if (daySelectorWrap) daySelectorWrap.classList.add('hidden');
  } else if (view === 'day') {
    // Day view: show viewModeBar but hide day tabs (navigation is via arrows)
    if (viewModeBar && currentChildId) viewModeBar.classList.remove('hidden');
    if (daySelectorWrap) daySelectorWrap.classList.add('hidden');
  } else {
    // Week view: show both
    if (viewModeBar && currentChildId) viewModeBar.classList.remove('hidden');
    if (daySelectorWrap && currentChildId && currentViewMode !== 'special-days') daySelectorWrap.classList.remove('hidden');
  }
  updateCalNavLabel();
  refreshCalView();
}

function calNavPrev() {
  if (calView === 'week') { weekOffset--; updateCalNavLabel(); renderDayTabs(); loadScheduleForDay(); }
  else if (calView === 'day') {
    dayOffset--;
    const d = getDayFromOffset(dayOffset);
    currentDay = d.getDay();
    updateCalNavLabel();
    if (currentChildId) loadScheduleForDay();
  } else if (calView === 'month') { weekOffset--; updateCalNavLabel(); renderMonthView(); }
}

function calNavNext() {
  if (calView === 'week') { weekOffset++; updateCalNavLabel(); renderDayTabs(); loadScheduleForDay(); }
  else if (calView === 'day') {
    dayOffset++;
    const d = getDayFromOffset(dayOffset);
    currentDay = d.getDay();
    updateCalNavLabel();
    if (currentChildId) loadScheduleForDay();
  } else if (calView === 'month') { weekOffset++; updateCalNavLabel(); renderMonthView(); }
}

function calNavToday() {
  weekOffset = 0; dayOffset = 0;
  const todayDow = new Date().getDay();
  currentDay = todayDow;
  updateCalNavLabel();
  if (calView === 'month') renderMonthView();
  else { renderDayTabs(); if (currentChildId) loadScheduleForDay(); }
}

function refreshCalView() {
  if (!currentChildId) return;
  if (calView === 'month') renderMonthView();
  else loadScheduleForDay();
}

// ── Month overview ─────────────────────────────────────────
async function renderMonthView() {
  if (!currentChildId) return;
  const now = new Date();
  const displayDate = new Date(now.getFullYear(), now.getMonth() + weekOffset, 1);
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();

  document.getElementById('scheduleContent').innerHTML = '<div class="text-center py-10 text-text-soft">Laddar…</div>';

  // Fetch all weekly schedules to know which days have activities
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules`);
  const schedules = res.ok ? await res.json() : [];
  const activeDays = new Set(schedules.map(s => s.day_of_week)); // 0-6

  const child = children.find(c => c.id === currentChildId);
  const childName = child ? `${renderChildAvatar(child, 20)} ${escHtml(child.name)}` : '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const todayStr = new Date().toISOString().slice(0,10);
  const headerDays = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];

  // Build calendar grid (Mon-first)
  let startDow = firstDay.getDay();
  let offset = (startDow + 6) % 7;
  const cells = [];
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - offset);
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate); d.setDate(startDate.getDate() + i);
    const dateStr = d.toISOString().slice(0,10);
    const inMonth = d.getMonth() === month;
    const isToday = dateStr === todayStr;
    // 0=Sun, but we want Mon=1..Sun=0 — JS getDay() returns 0=Sun,1=Mon,...
    const dow = d.getDay(); // 0=Sun
    const hasActivities = activeDays.has(dow);
    cells.push({ d, dateStr, inMonth, isToday, hasActivities, dow });
  }
  // Trim trailing empty rows
  let totalRows = 6;
  while (totalRows > 4 && !cells.slice((totalRows-1)*7, totalRows*7).some(c => c.inMonth)) totalRows--;

  const gridHtml = cells.slice(0, totalRows*7).map(cell => {
    const { d, dateStr, inMonth, isToday, hasActivities } = cell;
    let bg = inMonth ? 'bg-white hover:bg-sky cursor-pointer' : 'bg-gray-50 cursor-default';
    let ring = 'border border-gray-100';
    if (isToday) { bg = 'bg-blue-50 hover:bg-blue-100 cursor-pointer'; ring = 'border-2 border-blue-300'; }
    const dot = hasActivities && inMonth ? `<span class="block w-2 h-2 rounded-full bg-green-400 mx-auto mt-0.5"></span>` : `<span class="block w-2 h-2 mt-0.5"></span>`;
    const dayNum = d.getDate();
    return `<div class="relative min-h-[52px] p-1.5 ${bg} ${ring} transition-colors flex flex-col items-center" onclick="${inMonth ? `calMonthDayClick(${d.getDay()})` : ''}">
      <span class="text-sm font-bold ${inMonth ? (isToday ? 'text-blue-700' : 'text-navy') : 'text-gray-300'}">${dayNum}</span>
      ${dot}
    </div>`;
  }).join('');

  // Activity summary for each weekday with schedule
  const dayLabels = [];
  [1,2,3,4,5,6,0].forEach(dow => {
    if (activeDays.has(dow)) {
      const s = schedules.find(x => x.day_of_week === dow);
      dayLabels.push(`<span class="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 font-semibold">${DAYS_SHORT[dow]}</span>`);
    }
  });

  document.getElementById('scheduleContent').innerHTML = `
    <div class="mb-4">
      <h3 class="text-lg font-heading font-bold text-navy mb-1">${childName} — Månadsöversikt</h3>
      <p class="text-xs text-text-soft mb-3">Gröna prickar = dagar med schemalagda aktiviteter. Klicka på en dag för att se schemat.</p>
      ${dayLabels.length > 0 ? `<div class="flex flex-wrap gap-1 mb-3">${dayLabels.join('')}</div>` : '<p class="text-xs text-text-soft mb-3">Inga aktiviteter inlagda i veckoschemat ännu.</p>'}
      <div class="cal-scroll-wrap">
        <div class="border-2 border-lavender rounded-2xl overflow-hidden">
          <div class="grid grid-cols-7 bg-navy">
            ${headerDays.map(h => `<div class="text-center text-white text-xs font-bold py-2">${h}</div>`).join('')}
          </div>
          <div class="grid grid-cols-7">${gridHtml}</div>
        </div>
      </div>
    </div>`;
}

function calMonthDayClick(dow) {
  currentDay = dow;
  setCalView('week');
  renderDayTabs();
  loadScheduleForDay();
}

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
  const user = await window.authGuard();
  if (!user) return;
  document.getElementById('logoutBtn').addEventListener('click', () => window.logout());

  // ── View-mode redirect: pedagog-only or pedagog-preferred → pedagog-oversikt
  const isPedagogRedirect =
    (user.account_type === 'educator') ||
    (user.account_type === 'family' && user.preferred_view_mode === 'pedagog');

  if (isPedagogRedirect && window.location.pathname === '/dashboard') {
    window.location.href = '/pedagog-oversikt';
    return;
  }

  // ── Clear localStorage viewMode on logout ──────────────────────────
  const _origLogout = window.logout.bind(window);
  window.logout = function() {
    try { localStorage.removeItem('viewMode'); } catch (_) {}
    Auth.logout();
  };

  // Feature-gate: hide UI elements for features the family doesn't have access to.
  // klinisk_rapportering → hide "Rapporter" sidebar link and sharing banner.
  // offline_pwa → hide PWA install guide (dashboardPwaInstallWrap).
  (async () => {
    try {
      const resp = await fetch('/api/features', { credentials: 'include' });
      if (!resp.ok) return;
      const features = await resp.json();
      const slugs = features.map(f => f.slug);
      if (!slugs.includes('klinisk_rapportering')) {
        const rapporterLink = document.querySelector('a[href="/reports"].sidebar-nav');
        if (rapporterLink) rapporterLink.closest('li')?.remove();
        const banner = document.getElementById('activeSharingBanner');
        if (banner) banner.remove();
      }
      if (!slugs.includes('offline_pwa')) {
        const pwaWrap = document.getElementById('dashboardPwaInstallWrap');
        if (pwaWrap) pwaWrap.remove();
      }
    } catch (_) { /* non-critical — allow page to load */ }
  })();

  // ── Offline banner (parent view) ────────────────────────────────────────
  let _lastOnlineAt = null;

  function showParentOfflineBanner() {
    const banner = document.getElementById('parentOfflineBanner');
    if (!banner) return;
    banner.classList.remove('hidden');
    const timeEl = document.getElementById('parentOfflineTime');
    if (timeEl && _lastOnlineAt) {
      const fmt = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit' });
      timeEl.textContent = '· Senast uppdaterat ' + fmt.format(new Date(_lastOnlineAt));
    }
  }

  function hideParentOfflineBanner() {
    const banner = document.getElementById('parentOfflineBanner');
    if (banner) banner.classList.add('hidden');
  }

  function updateLastOnline() {
    _lastOnlineAt = Date.now();
    const timeEl = document.getElementById('parentOfflineTime');
    if (timeEl) {
      const fmt = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit' });
      timeEl.textContent = '· Senast uppdaterat ' + fmt.format(new Date(_lastOnlineAt));
    }
  }

  // Initial check
  if (!navigator.onLine) showParentOfflineBanner();

  window.addEventListener('online', () => {
    hideParentOfflineBanner();
    // Flush any pending child write actions from this parent session
    if (window.OfflineQueue) {
      setTimeout(() => OfflineQueue.flush(), 500);
    }
    updateLastOnline();
  });

  window.addEventListener('offline', () => {
    showParentOfflineBanner();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine && window.OfflineQueue) {
      setTimeout(() => OfflineQueue.flush(), 500);
      updateLastOnline();
    }
  });

  // logoutBtn2 removed — logout only in sidebar/hamburger menu now

  // Skeleton loading on Capacitor: show shimmer immediately if slow
  const grid = document.getElementById('childCardsGrid');
  let skeletonTimer;
  if (window.Skeleton && window.Skeleton.isNative()) {
    skeletonTimer = window.Skeleton.createTimer(function () {
      window.Skeleton.showParentDashboardSkeleton();
    });
  }

  if (window.ParentMagicShell) {
    await ParentMagicShell.init('dashboard');
  } else if (window.AppViewMode) {
    await AppViewMode.initParent();
    if (AppViewMode.isAllowed()) {
      const toggleMount = document.getElementById('appViewToggleMount');
      if (toggleMount) AppViewMode.mountToggle(toggleMount);
    }
    AppViewMode.onChange(function () {
      if (window.DashboardHomeHub) {
        DashboardHomeHub.render(dashboardStats);
      }
    });
  }

  await Promise.all([loadChildren(), loadTemplates(), loadDashboardCards(), loadStarHistory(), loadTrialBanner()]);
  if (window.ActivationProgramBanner) ActivationProgramBanner.init();
  // Medförälder CTA: show banner for single-parent families
  showMedforalderCtaIfEligible();
  initDelaAppenCta();
  if (window.DashboardChildHandoff) DashboardChildHandoff.init();
  if (skeletonTimer) skeletonTimer.stop();

  // Safety net: if dashboard cards didn't render (e.g. API failed silently,
  // stale Service Worker returned malformed data, or Neon cold-start timeout),
  // force a render with whatever data we have. This prevents the "Laddar…"
  // placeholder from staying on screen permanently.
  const gridEl = document.getElementById('childCardsGrid');
  if (gridEl && gridEl.querySelector('.text-text-soft.text-sm.py-8')) {
    // Loading placeholder is still visible — force render
    renderDashboardCards();
  }

  pickSection('dag');
  initBirthdayPicker('childBirthday');

  let selectedChildEmoji = '';
  document.querySelectorAll('.emoji-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('border-gold','bg-gold-light'));
      btn.classList.add('border-gold','bg-gold-light');
      selectedChildEmoji = btn.dataset.emoji;
      document.getElementById('childEmoji').value = selectedChildEmoji;
    });
  });

  document.getElementById('addChildForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('addChildMsg');
    const btn = document.getElementById('addChildSubmit');
    if (!selectedChildEmoji) { msg.textContent = 'Välj en emoji'; msg.className = 'text-sm text-red-500'; return; }
    btn.disabled = true; btn.textContent = 'Skapar...'; msg.textContent = '';
    try {
      const res = await window.apiFetch('/api/children', {
        method: 'POST',
        body: JSON.stringify({ name: document.getElementById('childName').value.trim(), emoji: selectedChildEmoji, birthday: document.getElementById('childBirthday').value, pin: document.getElementById('childPin').value.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Shared-device guard: redirect to login if session type is wrong
        if (data.error && data.error.includes('föräldrabehörighet')) {
          msg.textContent = 'Din session har löpt ut. Du loggas in igen…';
          msg.className = 'text-sm text-red-500';
          setTimeout(() => { Auth.clearAuth(); window.location.href = '/login'; }, 2000);
          return;
        }
        msg.textContent = data.error || 'Nätverksfel'; msg.className = 'text-sm text-red-500';
      } else {
        // Redirect to wizard onboarding so parent can review the seeded schedule
        if (data.wizard && data.id) {
          window.location.href = `/child-wizard?id=${data.id}&pin=${encodeURIComponent(data.pin)}&name=${encodeURIComponent(data.name)}&schedule=${encodeURIComponent(data.default_schedule_name || '')}`;
        } else {
          showToast(`${data.name} har lagts till! PIN: ${data.pin}`);
          document.getElementById('addChildModal').classList.add('hidden');
          document.getElementById('addChildForm').reset();
          selectedChildEmoji = '';
          document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('border-gold','bg-gold-light'));
          await loadChildren();
          await loadDashboardCards();
        }
      }
    } catch (err) { msg.textContent = err.message || 'Nätverksfel'; msg.className = 'text-sm text-red-500'; }
    btn.disabled = false; btn.textContent = 'Lägg till';
  });

  initTouchDndBridge();
  bindRecurrenceAddHandlers();
  } catch (err) {
    console.error('[DASHBOARD] Init error:', err);
    const grid = document.getElementById('childCardsGrid');
    if (grid) grid.innerHTML = '<div class="text-center py-8 text-red-500 font-semibold">Något gick fel vid laddning. Ladda om sidan.</div>';
  }
});

// ── Helpers ──────────────────────────────────────────────
// showToast is now in /js/toast.js
// escHtml shim — delegates to escapeHtml() from /js/dom-utils.js
function escHtml(s) { return escapeHtml(s); }
function fmtTime(t) { return t ? t.substring(0,5) : ''; }
function sectionTimeLabel(key) {
  const m = sectionTimes;
  if (!m) return '';
  const map = { morgon:`${fmtTime(m.morning_start)}–${fmtTime(m.morning_end)}`, dag:`${fmtTime(m.day_start)}–${fmtTime(m.day_end)}`, kvall:`${fmtTime(m.evening_start)}–${fmtTime(m.evening_end)}`, natt:`${fmtTime(m.night_start)}–${fmtTime(m.night_end)}` };
  return map[key] || '';
}

// ── Dashboard state ──────────────────────────────────────
let dashboardStats = null; // cached stats from /api/family/dashboard-stats

// ── Tidsblock-engine ─────────────────────────────────────
// Converts today_items → block pills with trafikljus-färg (grön/gul/röd/grå).
// Block definitions: [label, startH, endH, sectionMatcher(item)]
// Dag-sektionen splits on start_time: <12:00 → Förmiddag, >=12:00 → Eftermiddag.
// Natt-sektionen merges into Kväll.
function buildBlockPills(items) {
  if (!items || items.length === 0) return `<span class="dash-section-pill pill-gray">Inget schema</span>`;

  // Get current time as minutes since midnight (Stockholm)
  const nowStr = new Date().toLocaleTimeString('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit' });
  const [nowH, nowM] = nowStr.split(':').map(Number);
  const nowMins = nowH * 60 + nowM;

  // Helper: parse "HH:MM:SS" or "HH:MM" to minutes
  function toMins(t) {
    if (!t) return null;
    const parts = t.split(':').map(Number);
    return parts[0] * 60 + (parts[1] || 0);
  }

  // Define blocks: { key, label, start, end, matcher }
  // Items matched by matcher(); Dag split on start_time.
  const blockDefs = [
    { key: 'morgon',       label: '🌅',      start: 6*60,  end: 9*60,
      matcher: item => item.section === 'morgon' },
    { key: 'formiddag',    label: '☀️',      start: 9*60,  end: 12*60,
      matcher: item => {
        if (item.section !== 'dag') return false;
        const t = toMins(item.start_time);
        return t === null || t < 12*60; // no time or before noon → Förmiddag
      }},
    { key: 'eftermiddag',  label: '🌤',      start: 12*60, end: 17*60,
      matcher: item => {
        if (item.section !== 'dag') return false;
        const t = toMins(item.start_time);
        return t !== null && t >= 12*60; // has time and after noon → Eftermiddag
      }},
    { key: 'kvall',        label: '🌆',      start: 17*60, end: 21*60,
      matcher: item => item.section === 'kvall' || item.section === 'natt' },
  ];

  // Compute trafikljus color for a block given its items and time range
  // Grön = alla klara, Gul = pågår/delvis, Röd = ej klart (passerat/aktivt utan framsteg)
  function blockColor(blockItems, startMins, endMins) {
    if (blockItems.length === 0) return null; // no pill
    const doneCount = blockItems.filter(i => i.completed).length;
    const allDone = doneCount === blockItems.length;
    if (allDone) return 'green';           // 🟢 alla aktiviteter i sektionen avklarade
    const someDone = doneCount > 0;
    if (someDone) return 'yellow';         // 🟡 pågår / delvis avklarade
    // Nothing done — check time to determine if missed or future
    const inProgress = nowMins >= startMins && nowMins < endMins;
    const passed = nowMins >= endMins;
    if (passed || inProgress) return 'red'; // 🔴 ej påbörjade (tid pågår/passerat)
    return 'gray';                          // ⚪ framtid — inte börjat än
  }

  const pills = [];
  for (const bd of blockDefs) {
    const blockItems = items.filter(bd.matcher);
    const color = blockColor(blockItems, bd.start, bd.end);
    if (color !== null) {
      pills.push(`<span class="dash-section-pill pill-${color}">${bd.label}</span>`);
    }
  }

  return pills.length > 0
    ? pills.join('')
    : `<span class="dash-section-pill pill-gray">Inget schema</span>`;
}

// ── Children loader ──────────────────────────────────────
async function loadChildren() {
  try {
    const res = await window.apiFetch('/api/children');
    if (res.ok) { children = await res.json(); }
  } catch (e) {
    console.error('[DASHBOARD] loadChildren failed:', e);
  }
}

// ── Dashboard cards (new layout) ─────────────────────────
async function loadDashboardCards() {
  try {
    const res = await window.apiFetch('/api/family/dashboard-stats');
    if (!res.ok) {
      console.error('[DASHBOARD] dashboard-stats response:', res.status);
      return;
    }
    dashboardStats = await res.json();
    renderDashboardCards();
  } catch (e) {
    console.error('[DASHBOARD] loadDashboardCards failed:', e);
  }
}

// ── Analytics beacon ───────────────────────────────────────
/**
 * Fire a client-side analytics event.
 * POST to /api/analytics/event (whitelisted types only, 204 response).
 * Failures are silent — analytics must never break the UI.
 */
function trackEvent(eventType, metadata) {
  try {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
      credentials: 'include',
    });
  } catch (_) {}
}

// ── Medförälder CTA ─────────────────────────────────────────
// Shows an invite banner for families with only 1 parent.
// Gate: medforalder_cta feature flag + parent_count === 1 in dashboardStats.
// Dismiss persisted in localStorage for 7 days.

const MEDFORALDER_CTA_KEY = 'medforalder_cta_dismissed';
const MEDFORALDER_CTA_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function showMedforalderCtaIfEligible() {
  const banner = document.getElementById('medforalderCtaBanner');
  if (!banner) return;

  // 1. Feature gate — element is hidden by default via data-feature + feature-check.js
  //    We double-check here using the cached feature list.
  if (!window._stjarndagFeatures || !window._stjarndagFeatures['medforalder_cta']) {
    banner.style.display = 'none';
    return;
  }

  // 2. Check parent_count from dashboard-stats
  if (!dashboardStats || dashboardStats.parent_count === undefined) {
    return; // Stats not loaded yet — wait for retry on next cycle
  }
  if (dashboardStats.parent_count >= 2) {
    // Already has 2+ parents — never show
    banner.style.display = 'none';
    return;
  }

  // 3. Check localStorage dismiss
  try {
    const raw = localStorage.getItem(MEDFORALDER_CTA_KEY);
    if (raw) {
      const { ts } = JSON.parse(raw);
      if (Date.now() - ts < MEDFORALDER_CTA_TTL) {
        banner.style.display = 'none';
        return;
      }
    }
  } catch (_) {}

  // 4. Show banner + fire event
  banner.style.display = '';
  trackEvent('cta_invite_co_parent_shown');
}

function dismissMedforalderCtaBanner() {
  const banner = document.getElementById('medforalderCtaBanner');
  if (!banner) return;
  banner.style.display = 'none';
  try {
    localStorage.setItem(MEDFORALDER_CTA_KEY, JSON.stringify({ ts: Date.now() }));
  } catch (_) {}
}

function openMedforalderCtaInvite() {
  trackEvent('cta_invite_co_parent_clicked');
  const modal = document.getElementById('medforalderCtaModal');
  const form = document.getElementById('medforalderCtaForm');
  const success = document.getElementById('medforalderCtaSuccess');
  const errorEl = document.getElementById('medforalderCtaError');
  if (!modal) return;
  errorEl.classList.add('hidden');
  form.classList.remove('hidden');
  success.classList.add('hidden');
  document.getElementById('medforalderCtaEmail').value = '';
  modal.classList.remove('hidden');
}

function closeMedforalderCtaModal() {
  const modal = document.getElementById('medforalderCtaModal');
  if (modal) modal.classList.add('hidden');
}

async function submitMedforalderCtaInvite() {
  const emailInput = document.getElementById('medforalderCtaEmail');
  const errorEl = document.getElementById('medforalderCtaError');
  const submitBtn = document.getElementById('medforalderCtaSubmit');
  const email = (emailInput.value || '').trim();

  if (!email) {
    errorEl.textContent = 'Ange en e-postadress';
    errorEl.classList.remove('hidden');
    return;
  }
  // Basic email validation
  const emailRegex = /^[^@\u0020]+@[^\u0020]+\u002E[a-z]{2,}$/i;
  if (!emailRegex.test(email)) {
    errorEl.textContent = 'Ange en giltig e-postadress';
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Skickar…';

  try {
    const res = await window.apiFetch('/api/family/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Något gick fel. Försök igen.';
      errorEl.classList.remove('hidden');
    } else {
      // Success
      document.getElementById('medforalderCtaForm').classList.add('hidden');
      document.getElementById('medforalderCtaSuccess').classList.remove('hidden');
      // Dismiss banner so it doesn't keep showing
      dismissMedforalderCtaBanner();
      // Refresh parent count after invite is sent
      setTimeout(function () {
        loadDashboardCards();
      }, 1500);
    }
  } catch (e) {
    errorEl.textContent = 'Något gick fel. Kontrollera din uppkoppling.';
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Skicka inbjudan';
  }
}

// ── Dela appen CTA (R5-T3) ─────────────────────────────────
// Share button on dashboard for all families (feature-gated: dela_appen)
// Reuses POST /api/account/share-notify from mobile-nav.js.
// Dismiss persisted in localStorage for 30 days.

const DELA_APPEN_KEY = 'dela_appen_cta_dismissed';
const DELA_APPEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

function showDelaAppenCtaIfEligible() {
  var banner = document.getElementById('delaAppenCtaBanner');
  if (!banner) return;

  // Feature gate
  if (!window._stjarndagFeatures || !window._stjarndagFeatures['dela_appen']) {
    banner.style.display = 'none';
    return;
  }

  // Check localStorage dismissal
  try {
    var stored = localStorage.getItem(DELA_APPEN_KEY);
    if (stored) {
      var parsed = JSON.parse(stored);
      if (Date.now() - parsed.ts < DELA_APPEN_TTL) {
        banner.style.display = 'none';
        return;
      }
    }
  } catch (_) {}

  // Show banner + fire shown event
  banner.style.display = '';
  trackEvent('cta_share_app_shown');
}

function dismissDelaAppenCtaBanner() {
  var banner = document.getElementById('delaAppenCtaBanner');
  if (!banner) return;
  banner.style.display = 'none';
  try {
    localStorage.setItem(DELA_APPEN_KEY, JSON.stringify({ ts: Date.now() }));
  } catch (_) {}
}

function openDelaAppenShare() {
  trackEvent('cta_share_app_clicked');

  // Use Web Share API if available, otherwise open fallback modal
  if (navigator.share) {
    navigator.share({
      title: 'Min Stjärndag',
      text: 'Min Stjärndag — Hjälp ditt barn med vardagsrutiner och stjärnor!',
      url: 'https://mystarday.se',
    }).then(function () {
      // Mark as shared, dismiss banner
      sendShareNotify();
      dismissDelaAppenCtaBanner();
    }).catch(function (e) {
      if (e.name !== 'AbortError') {
        sendShareNotify();
        dismissDelaAppenCtaBanner();
      }
    });
  } else {
    // Fallback: copy link to clipboard
    var url = 'https://mystarday.se';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        // Show brief toast
        var toast = document.getElementById('toastContainer') || document.body;
        var el = document.createElement('div');
        el.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-navy text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50';
        el.textContent = '📋 Länk kopierad!';
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 2500);
        sendShareNotify();
        dismissDelaAppenCtaBanner();
      }).catch(function () {
        sendShareNotify();
        dismissDelaAppenCtaBanner();
      });
    } else {
      sendShareNotify();
      dismissDelaAppenCtaBanner();
    }
  }
}

function sendShareNotify() {
  var csrf = typeof Auth !== 'undefined' && Auth.getCsrfToken ? Auth.getCsrfToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Token'] = csrf;
  fetch('/api/account/share-notify', {
    method: 'POST',
    headers: headers,
    credentials: 'include',
  }).catch(function () { /* silent */ });
}

function initDelaAppenCta() {
  showDelaAppenCtaIfEligible();
}

// ── Trial countdown banner ─────────────────────────────────
// WHY payment_enabled check: all payment UI is hidden until owner enables PAYMENT_ENABLED env var
const BETA_FREEZE = new Date('2027-06-30T23:59:59Z');

async function loadTrialBanner() {
  const banner = document.getElementById('trialBanner');
  const bannerText = document.getElementById('trialBannerText');
  const bannerCta = document.getElementById('trialBannerCta');
  if (!banner || !bannerText) return;

  try {
    const res = await window.apiFetch('/api/family/subscription-status');
    if (!res.ok) return;
    const data = await res.json();

    // Hide all payment UI unless PAYMENT_ENABLED is true on the server
    if (!data.payment_enabled) { banner.style.display = 'none'; return; }

    // Only show for trial families
    if (data.subscription_status !== 'trial') { banner.style.display = 'none'; return; }
    if (data.is_beta && new Date() <= BETA_FREEZE) { banner.style.display = 'none'; return; }

    const days = data.trial_days_remaining;
    if (days == null || days <= 0) {
      // Trial expired — show upgrade modal if payment is enabled
      showPaymentPrompt();
      banner.style.display = 'none';
      return;
    }

    if (days <= 3) {
      banner.style.background = '#991B1B';
      banner.style.borderBottomColor = '#DC2626';
    }

    const suffix = days === 1 ? 'dag' : 'dagar';
    bannerText.textContent = `🐣 ${days} ${suffix} kvar av gratis provperiod — sedan 59 kr/månad`;
    if (bannerCta) bannerCta.style.display = '';
    banner.style.display = 'block';
  } catch (_) { /* non-critical */ }
}

/** Show the payment prompt modal when trial has expired and payment is enabled. */
function showPaymentPrompt() {
  const modal = document.getElementById('paymentPromptModal');
  if (modal) modal.classList.remove('hidden');
}

/** Dismiss the payment prompt modal (user chooses to continue in limited mode). */
function dismissPaymentPrompt() {
  const modal = document.getElementById('paymentPromptModal');
  if (modal) modal.classList.add('hidden');
}

/** Redirect to upgrade page for payment. */
function goToUpgrade() {
  window.location.href = '/upgrade';
}

// Track which card is expanded
let _expandedCardId = null;

function renderDashboardCards() {
  const container = document.getElementById('childCardsGrid');
  const ch = dashboardStats?.children || [];

  if (ch.length === 0 && children.length === 0) {
    container.innerHTML = `<div class="text-center py-16">
      <p class="text-5xl mb-4">👨‍👩‍👧</p>
      <p class="font-semibold text-navy mb-1">Inga barn tillagda ännu</p>
      <p class="text-sm text-text-soft mb-3">Lägg till ditt första barn för att komma igång</p>
      <button onclick="document.getElementById('addChildModal').classList.remove('hidden')" class="px-6 py-3 bg-gold text-white rounded-xl font-semibold">+ Lägg till barn</button>
    </div>`;
    return;
  }

  // Use stats for children that have data; fall back to children list
  const childList = ch.length > 0 ? ch : children.map(c => ({
    id: c.id, name: c.name, emoji: c.emoji,
    today_total: 0, today_completed: 0, today_pct: null,
    today_log_id: null, today_is_paused: false,
    star_balance: 0, stars_today: 0, today_items: [], nearest_reward: null, history: [],
  }));

  // Build current week dates Mon→Sun (Swedish week)
  const today = new Date();
  const todayDow = today.getDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
  const weekDates = [];
  const dayLabels = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    weekDates.push({
      dateStr: d.toLocaleDateString('sv-SE'),
      label: dayLabels[i],
      isToday: d.toLocaleDateString('sv-SE') === today.toLocaleDateString('sv-SE'),
      isFuture: d > today && d.toLocaleDateString('sv-SE') !== today.toLocaleDateString('sv-SE'),
    });
  }

  container.innerHTML = childList.map(c => {
    const name = c.name ? (c.name.charAt(0).toUpperCase() + c.name.slice(1)) : '';
    const total = c.today_total || 0;
    const done = c.today_completed || 0;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    const allDone = total > 0 && done === total;
    const isPaused = c.today_is_paused || false;
    const stars = c.star_balance || 0;
    const starsToday = c.stars_today || 0;
    const nearestReward = c.nearest_reward || null;
    const todayItems = c.today_items || [];
    const pendingRedemptions = c.pending_redemptions || 0;
    const pendingGoalChanges = c.pending_goal_changes || 0;
    const totalPending = pendingRedemptions + pendingGoalChanges;
    const isExpanded = _expandedCardId === c.id;

    // ── Avatar progress ring (today's activity completion) ──
    // Ring shows X/Y activities completed TODAY
    // Colors: empty=0, gold <50%, orange 50-99%, green 100%
    const ringR = 28;
    const ringCirc = 2 * Math.PI * ringR;
    const showRing = total > 0;
    let ringColor = '#E5E7EB'; // default gray (0%)
    if (pct >= 100) ringColor = '#10B981';       // green — all done
    else if (pct >= 50) ringColor = '#F97316';   // orange — 50-99%
    else if (pct > 0) ringColor = '#F5A623';     // gold — 1-49%
    const ringOffset = ringCirc - (pct / 100) * ringCirc;
    const ringTooltip = total > 0 ? `${done}/${total} aktiviteter klara idag` : '';

    const avatarHtml = `
      <div class="dash-avatar-wrap" title="${escHtml(ringTooltip)}">
        ${showRing ? `
        <svg class="dash-avatar-ring" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="${ringR}" fill="none" stroke="#E5E7EB" stroke-width="4"/>
          <circle cx="32" cy="32" r="${ringR}" fill="none" stroke="${ringColor}" stroke-width="4"
            stroke-dasharray="${ringCirc}" stroke-dashoffset="${ringOffset}"
            stroke-linecap="round" transform="rotate(-90 32 32)"/>
        </svg>` : ''}
        <span class="dash-avatar-emoji">${renderChildAvatar(c, 32)}</span>
      </div>`;

    // ── Tidsblock-engine: map items → blocks with trafikljus-färg ─
    // Blocks: Morgon 06–09, Förmiddag 09–12, Eftermiddag 12–17, Kväll 17–21 (natt→kväll)
    const sectionPillsHtml = buildBlockPills(todayItems);

    // ── Senast / Nästa status row ────────────────────────────
    const lastDone = [...todayItems].reverse().find(item => item.completed);
    const nextPending = todayItems.find(item => !item.completed);
    let statusRowHtml = '';
    if (isPaused) {
      statusRowHtml = `<span class="dash-status-row">⏸ <em>Pausad idag</em></span>`;
    } else if (allDone && total > 0) {
      statusRowHtml = `<span class="dash-status-row" style="color:#10B981;font-weight:700;">✅ Alla aktiviteter klara idag!</span>`;
    } else if (total === 0) {
      statusRowHtml = `<span class="dash-status-row">Inga aktiviteter planerade idag</span>`;
    } else {
      const lastPart = lastDone
        ? `<strong>Senast:</strong> ${escHtml(lastDone.name)} ✅${lastDone.start_time ? ' ' + lastDone.start_time.substring(0,5) : ''}`
        : '';
      const nextPart = nextPending
        ? `<strong>Nästa:</strong> ${escHtml(nextPending.icon || '')} ${escHtml(nextPending.name)}`
        : '';
      statusRowHtml = `<span class="dash-status-row">${[lastPart, nextPart].filter(Boolean).join(' &nbsp;·&nbsp; ')}</span>`;
    }

    // ── Activity checklist for expanded detail ───────────────
    let activityListHtml = '';
    if (isPaused) {
      activityListHtml = `<div class="text-xs text-text-soft text-center py-3 italic">Pausad idag</div>`;
    } else if (todayItems.length === 0) {
      activityListHtml = `
        <div class="text-xs text-text-soft text-center py-2 mb-2">Inget schema för idag</div>
        <div class="text-center mb-1">
          <button onclick="event.stopPropagation(); openCreateActivityModal('')" class="text-xs text-gold hover:text-amber-600 font-semibold transition-colors">✨ Skapa ny aktivitet</button>
        </div>
        <p class="text-[10px] text-text-soft text-center leading-tight">${escHtml(name)} har inga aktiviteter ännu — skapa den första →</p>`;
    } else {
      const itemsHtml = todayItems.map(item => {
        const statusClass = item.status === 'NU' ? 'status-nu' : item.status === 'NÄSTA' ? 'status-nasta' : item.status === 'DONE' ? 'status-done' : 'status-sedan';
        const checkClass = item.completed ? 'checked' : '';
        const badgeHtml = item.status === 'NU' ? `<span class="status-badge-nu">NU</span>` :
                          item.status === 'NÄSTA' ? `<span class="status-badge-nasta">NÄSTA</span>` : '';
        const starsHtml = item.star_value > 0 ? `<span class="text-[10px] text-gold font-bold ml-auto flex-shrink-0">+${item.star_value}⭐</span>` : '';
        const nameDisplay = item.completed ? `<span class="line-through opacity-60">${escHtml(item.name)}</span>` : `<span>${escHtml(item.name)}</span>`;
        const oncePin = item.is_once_task ? `<span title="Engångsaktivitet" class="text-[10px] flex-shrink-0">📌</span>` : '';
        return `
          <div class="dash-activity-item ${statusClass}" data-item-id="${item.id}">
            <button class="dash-activity-check ${checkClass}" onclick="event.stopPropagation(); dashToggleActivity('${item.id}', '${c.id}', ${item.completed})" title="${item.completed ? 'Avmarkera' : 'Markera klar'}">
              ${item.completed ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
            </button>
            ${oncePin}
            <span class="text-base flex-shrink-0">${item.icon || '📋'}</span>
            <span class="text-sm font-medium text-navy flex-1 min-w-0 truncate">${nameDisplay}</span>
            ${badgeHtml}
            ${starsHtml}
          </div>`;
      }).join('');
      activityListHtml = `<div class="dash-activity-list">${itemsHtml}</div>`;
    }

    // ── Mini weekly chart for expanded detail ────────────────
    const histByDate = {};
    for (const h of (c.history || [])) histByDate[h.date] = h;
    const miniChartBars = weekDates.map(day => {
      const h = histByDate[day.dateStr];
      const dayPct = h ? (h.pct || 0) : 0;
      const dayPaused = h?.is_paused;
      let barHeight, barBg;
      if (day.isFuture) { barHeight = 0; barBg = ''; }
      else if (dayPaused) { barHeight = 15; barBg = '#D1D5DB'; }
      else if (dayPct >= 100) { barHeight = 100; barBg = 'linear-gradient(180deg, #34D399, #10B981)'; }
      else if (dayPct > 0) { barHeight = Math.max(15, dayPct); barBg = 'linear-gradient(180deg, #FBBF24, #F5A623)'; }
      else if (h) { barHeight = 8; barBg = '#E5E7EB'; }
      else { barHeight = 0; barBg = ''; }
      const labelColor = day.isToday ? 'color:#F5A623;font-weight:800;' : '';
      const todayDot = day.isToday ? '<div style="width:5px;height:5px;border-radius:50%;background:#F5A623;margin:2px auto 0;"></div>' : '';
      return `<div class="mini-week-day">
        <div class="mini-week-bar-track">
          ${barHeight > 0 ? `<div class="mini-week-bar-fill" style="height:${barHeight}%;background:${barBg};" title="${dayPct}%${dayPaused ? ' (pausad)' : ''}"></div>` : ''}
        </div>
        <div class="mini-week-label" style="${labelColor}">${day.label}</div>
        ${todayDot}
      </div>`;
    }).join('');

    // ── Reward progress bar for expanded detail ──────────────
    let expandedRewardHtml = '';
    if (nearestReward) {
      const rPct = Math.min(100, Math.round((stars / nearestReward.star_cost) * 100));
      expandedRewardHtml = `
        <div class="mb-3 p-3 bg-navy rounded-xl">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs text-white/80 font-semibold truncate">${escHtml(nearestReward.icon || '🎁')} ${escHtml(nearestReward.name)}</span>
            <span class="text-xs text-white/60 ml-2 flex-shrink-0">${stars}/${nearestReward.star_cost} ⭐</span>
          </div>
          <div class="reward-progress-bar-track">
            <div class="reward-progress-bar-fill" style="width:${rPct}%"></div>
          </div>
        </div>`;
    } else {
      // Empty state: no rewards yet
      expandedRewardHtml = `
        <div class="mb-3 p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
          <span class="text-sm">🎁 Inga belöningar ännu</span>
          <a href="/library#rewards" class="block text-xs text-purple-600 font-semibold mt-1 hover:underline">→ Lägg till en belöning</a>
        </div>`;
    }

    // ── Pause button for expanded detail ─────────────────────
    const pauseLabel = isPaused ? '▶ Återuppta' : '⏸ Pausa idag';
    const pauseClass = isPaused ? 'pause-btn is-paused' : 'pause-btn';

    // ── Redemption badge (inline) ─────────────────────────────
    // Only show if there are pending requests; clicking expands inline panel
    const redemptionBadgeHtml = totalPending > 0 ? `
      <button class="dash-action-btn btn-redemption" onclick="event.stopPropagation(); toggleInlineRedemption('${c.id}', '${escHtml(name)}')" title="${totalPending} väntande förfrågan">
        🎁 ${totalPending}
      </button>` : '';

    const cardStats = window.DashboardDailySummary
      ? window.DashboardDailySummary.buildChildStats(c)
      : { primaryHtml: `<div class="text-xs text-text-soft">Idag ${done}/${total}</div>`, secondaryHtml: `<div class="text-xs font-bold text-gold">⭐ Totalt ${stars}</div>`, cardClass: '' };

    return `<div class="dash-child-card ${isPaused ? 'paused' : ''} ${isExpanded ? 'is-expanded' : ''} ${cardStats.cardClass || ''}" data-child-id="${c.id}">
      <!-- ── COMPACT TOP (always visible) ── -->
      <div class="dash-card-compact" onclick="toggleCardExpand('${c.id}')">
        <div class="flex items-center gap-3">
          <!-- Avatar with reward ring -->
          ${avatarHtml}

          <!-- Name + progress highlights -->
          <div class="flex-1 min-w-0" style="min-width:60px;">
            <div class="flex items-center gap-1.5 mb-0.5">
              <h4 class="font-heading font-bold text-navy text-base leading-tight truncate">🌟 ${escHtml(name)}</h4>
              ${allDone ? '<span class="text-base" title="Alla klara!">🌟</span>' : ''}
              ${isPaused ? '<span class="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">PAUSAD</span>' : ''}
            </div>
            ${cardStats.primaryHtml}
            ${cardStats.secondaryHtml}
          </div>

          <!-- Section pills + chevron -->
          <div class="flex items-center gap-1.5 flex-shrink-0" style="flex-direction:row;">
            <div style="display:flex;flex-direction:row;gap:4px;flex-wrap:nowrap;">${sectionPillsHtml}</div>
            <span class="dash-expand-chevron">▼</span>
          </div>
        </div>

        <!-- Status row (Senast/Nästa) -->
        <div class="mt-2">${statusRowHtml}</div>

        <!-- Action buttons (only redemption badge remains; quick actions moved to header) -->
        ${redemptionBadgeHtml ? `<div class="flex items-center gap-2 mt-2.5" onclick="event.stopPropagation()">${redemptionBadgeHtml}</div>` : ''}

        <!-- Inline redemption panel (hidden by default) -->
        <div id="inline-redemption-${c.id}" class="hidden"></div>
      </div>

      <!-- ── EXPANDED DETAIL (accordion) ── -->
      <div class="dash-card-expanded ${isExpanded ? '' : 'hidden'}" id="card-detail-${c.id}">
        <div class="dash-detail-panel">
          <!-- Reward progress -->
          ${expandedRewardHtml}

          <!-- Activity checklist -->
          <div class="mb-3" onclick="event.stopPropagation()">
            <div class="text-[10px] font-bold text-text-soft uppercase tracking-wider mb-2">📋 Idag</div>
            ${activityListHtml}
          </div>

          <!-- Weekly mini chart -->
          <div class="mb-3 p-3 bg-gray-50 rounded-xl" onclick="event.stopPropagation()">
            <div class="text-[10px] font-bold text-text-soft mb-2 uppercase tracking-wide">📊 Senaste 7 dagarna</div>
            <div class="mini-week-chart">${miniChartBars}</div>
          </div>

          <!-- Bottom actions: pause + add activity + schema link + share -->
          <div class="flex items-center justify-between gap-2 flex-wrap" onclick="event.stopPropagation()">
            <button class="${pauseClass}" onclick="togglePauseDay('${c.id}', '${c.today_log_id || ''}', ${isPaused})" ${!c.today_log_id ? 'disabled title="Inget schema genererat idag"' : ''}>
              ${pauseLabel}
            </button>
            <div class="flex items-center gap-2">
              <button class="text-xs text-gold hover:text-amber-600 font-semibold transition-colors" onclick="openDashboardAddForChild('${c.id}')">
                + Aktivitet
              </button>
              <button class="text-xs text-purple-600 hover:text-purple-800 font-semibold transition-colors" onclick="event.stopPropagation(); openCreateActivityModal('')">
                ✨ Skapa ny
              </button>
              <button class="text-xs text-text-soft hover:text-navy font-semibold transition-colors" onclick="window.location.href='/schedule?child=${c.id}'">
                Schema →
              </button>
              <button class="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors" onclick="shareChildSchedule('${c.id}')">
                📤 Dela
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  if (window.DashboardDailySummary && dashboardStats) {
    window.DashboardDailySummary.update(dashboardStats);
  }

  if (window.DashboardHomeHub) {
    DashboardHomeHub.render(dashboardStats);
  }
}

function toggleCardExpand(childId) {
  if (_expandedCardId === childId) {
    // Collapse current
    _expandedCardId = null;
    const card = document.querySelector(`[data-child-id="${childId}"]`);
    if (card) {
      card.classList.remove('is-expanded');
      const detail = document.getElementById(`card-detail-${childId}`);
      if (detail) detail.classList.add('hidden');
    }
  } else {
    // Collapse previously expanded
    if (_expandedCardId) {
      const prev = document.querySelector(`[data-child-id="${_expandedCardId}"]`);
      if (prev) {
        prev.classList.remove('is-expanded');
        const prevDetail = document.getElementById(`card-detail-${_expandedCardId}`);
        if (prevDetail) prevDetail.classList.add('hidden');
      }
    }
    // Expand new
    _expandedCardId = childId;
    const card = document.querySelector(`[data-child-id="${childId}"]`);
    if (card) {
      card.classList.add('is-expanded');
      const detail = document.getElementById(`card-detail-${childId}`);
      if (detail) detail.classList.remove('hidden');
    }
  }
}


// Toggle inline redemption panel for a child card
async function toggleInlineRedemption(childId, childName) {
  const panel = document.getElementById(`inline-redemption-${childId}`);
  if (!panel) return;

  if (!panel.classList.contains('hidden')) {
    panel.classList.add('hidden');
    panel.innerHTML = '';
    return;
  }

  panel.innerHTML = `<div class="dash-inline-redemption mt-2"><p class="text-center text-xs text-text-soft py-2">Laddar förfrågningar...</p></div>`;
  panel.classList.remove('hidden');

  try {
    const res = await window.apiFetch('/api/rewards/pending-requests');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();

    const childRedemptions = (data.pending_redemptions || []).filter(r => r.child_id === childId);
    const childGoalChanges = (data.pending_goal_changes || []).filter(r => r.child_id === childId);

    if (childRedemptions.length === 0 && childGoalChanges.length === 0) {
      panel.innerHTML = `<div class="dash-inline-redemption mt-2 text-center text-xs text-text-soft py-2">Inga väntande förfrågningar 🎉</div>`;
      return;
    }

    let html = '<div class="dash-inline-redemption mt-2 space-y-2">';
    for (const req of childGoalChanges) {
      html += `<div class="flex items-center gap-2">
        <span class="flex-1 text-xs font-semibold text-navy">🎯 Vill byta mål till ${escHtml(req.to_reward_name || '')} ${req.to_reward_icon || ''}</span>
        <button onclick="event.stopPropagation(); inlineApproveGoalChange('${req.id}', '${childId}')" class="min-h-[36px] px-3 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors">✅</button>
        <button onclick="event.stopPropagation(); inlineDenyGoalChange('${req.id}', '${childId}')" class="min-h-[36px] px-3 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors">❌</button>
      </div>`;
    }
    for (const req of childRedemptions) {
      html += `<div class="flex items-center gap-2">
        <span class="flex-1 text-xs font-semibold text-navy">🎁 ${escHtml(req.reward_name || '')} (⭐ ${req.star_cost || 0})</span>
        <button onclick="event.stopPropagation(); inlineApproveRedemption('${req.id}', '${childId}')" class="min-h-[36px] px-3 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors">✅</button>
        <button onclick="event.stopPropagation(); inlineDenyRedemption('${req.id}', '${childId}')" class="min-h-[36px] px-3 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors">❌</button>
      </div>`;
    }
    html += '</div>';
    panel.innerHTML = html;
  } catch (err) {
    panel.innerHTML = `<div class="dash-inline-redemption mt-2 text-center text-xs text-red-500 py-2">Kunde inte ladda förfrågningar.</div>`;
  }
}

async function inlineApproveGoalChange(requestId, childId) {
  try {
    const res = await window.apiFetch(`/api/rewards/goal-change-requests/${requestId}/approve`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('🎯 Målbyte godkänt!');
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function inlineDenyGoalChange(requestId, childId) {
  try {
    const res = await window.apiFetch(`/api/rewards/goal-change-requests/${requestId}/deny`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('Målbyte nekat.');
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function inlineApproveRedemption(redemptionId, childId) {
  try {
    const res = await window.apiFetch(`/api/rewards/redemptions/${redemptionId}/approve`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('🎉 Inlösen godkänd!');
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function inlineDenyRedemption(redemptionId, childId) {
  try {
    const res = await window.apiFetch(`/api/rewards/redemptions/${redemptionId}/deny`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('Inlösen nekad.');
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

// ── Pause / unpause today ────────────────────────────────
async function togglePauseDay(childId, logId, currentlyPaused) {
  if (!logId) { showToast('Inget schema genererat för idag', true); return; }
  const action = currentlyPaused ? 'unpause' : 'pause';
  try {
    const res = await window.apiFetch(`/api/daily-logs/${logId}/${action}`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast(currentlyPaused ? 'Dagen återupptagen!' : 'Dagen pausad!');
    await loadDashboardCards();
  } catch (err) {
    showToast('Nätverksfel', true);
  }
}

// ── Ge extra stjärnor quick button (header) ───────────────
// If 1 child → open giveStarsModal directly.
// If multiple → show child picker first.
function openGiveStarsQuick() {
  const ch = dashboardStats?.children || children || [];
  if (ch.length === 0) { showToast('Inga barn hittade', true); return; }
  if (ch.length === 1) {
    const c = ch[0];
    openGiveStarsModal(c.id, c.name, c.emoji || '⭐');
    return;
  }
  // Render picker list
  const list = document.getElementById('giveStarsPickerList');
  list.innerHTML = ch.map(c => `
    <button onclick="document.getElementById('giveStarsPickerModal').classList.add('hidden'); openGiveStarsModal('${c.id}', '${escHtml(c.name)}', '${c.emoji || '⭐'}')"
      class="flex items-center gap-3 p-3 rounded-xl border-2 border-lavender hover:border-gold hover:bg-gold-light text-left transition-all w-full">
      <span class="text-2xl">${c.emoji || '⭐'}</span>
      <span class="font-semibold text-navy">${escHtml(c.name)}</span>
    </button>`).join('');
  document.getElementById('giveStarsPickerModal').classList.remove('hidden');
}

// ── Ledig dag quick button (header) ───────────────────────
// Shows each child with their current pause state; click to toggle.
async function openLedigDagModal() {
  const ch = dashboardStats?.children || children || [];
  if (ch.length === 0) { showToast('Inga barn hittade', true); return; }

  const list = document.getElementById('ledigDagList');
  list.innerHTML = ch.map(c => {
    const isPaused = c.today_is_paused || false;
    const logId = c.today_log_id || '';
    const stateLabel = isPaused ? '⏸ Ledig idag' : '🟢 Aktivt schema';
    const stateCls = isPaused
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-lavender bg-white text-navy';
    const btnLabel = isPaused ? '▶ Återuppta schema' : '🏠 Markera som ledig';
    const btnCls = isPaused
      ? 'bg-green-500 hover:bg-green-600 text-white'
      : 'bg-coral hover:bg-red-200 text-red-800 border-red-200';
    const disabled = !logId ? 'disabled title="Inget schema genererat för idag"' : '';
    return `
      <div class="p-3 rounded-xl border-2 ${stateCls}">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${c.emoji || '⭐'}</span>
            <div>
              <div class="font-semibold text-sm">${escHtml(c.name)}</div>
              <div class="text-xs opacity-70">${stateLabel}</div>
            </div>
          </div>
          <button ${disabled}
            onclick="ledigDagToggle('${c.id}', '${logId}', ${isPaused})"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${btnCls} ${!logId ? 'opacity-40 cursor-not-allowed' : ''}">
            ${btnLabel}
          </button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('ledigDagModal').classList.remove('hidden');
}

async function ledigDagToggle(childId, logId, currentlyPaused) {
  if (!logId) { showToast('Inget schema genererat för idag', true); return; }
  const action = currentlyPaused ? 'unpause' : 'pause';
  try {
    const res = await window.apiFetch(`/api/daily-logs/${logId}/${action}`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast(currentlyPaused ? 'Schema återupptaget!' : '🏠 Markerat som ledig dag!');
    await loadDashboardCards();
    // Refresh the modal with updated state
    document.getElementById('ledigDagModal').classList.add('hidden');
  } catch (err) {
    showToast('Nätverksfel', true);
  }
}

// ── Parent checkoff from dashboard panel ─────────────────
async function dashToggleActivity(itemId, childId, currentlyCompleted) {
  const action = currentlyCompleted ? 'uncomplete' : 'complete';
  // Optimistic UI: update check button immediately
  const btn = document.querySelector(`.dash-activity-check[onclick*="${itemId}"]`);
  if (btn) {
    btn.classList.add('checking');
    btn.disabled = true;
  }
  try {
    const res = await window.apiFetch(`/api/daily-log-items/${itemId}/${action}`, { method: 'PUT' });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      showToast(e.error || 'Fel vid uppdatering', true);
      if (btn) { btn.classList.remove('checking'); btn.disabled = false; }
      return;
    }
    // Refresh dashboard cards to get updated state
    await loadDashboardCards();
    showToast(currentlyCompleted ? 'Avmarkerad!' : '✅ Klar!');
  } catch (err) {
    showToast('Nätverksfel', true);
    if (btn) { btn.classList.remove('checking'); btn.disabled = false; }
  }
}

// ── Star history chart (weekly stars, 8 weeks) ────────────
let starHistoryData = null;

async function loadStarHistory() {
  try {
    const res = await window.apiFetch('/api/family/star-history');
    if (!res.ok) return;
    starHistoryData = await res.json();
    renderStarHistory();
  } catch (e) {
    // Silent — chart is optional
  }
}

function renderStarHistory() {
  if (!starHistoryData) return;
  const { children: ch, weeks } = starHistoryData;
  if (!ch || ch.length === 0 || !weeks || weeks.length === 0) return;

  const section = document.getElementById('starHistorySection');
  const content = document.getElementById('starHistoryContent');
  if (!section || !content) return;

  section.classList.remove('hidden');

  const childColors = ['#F5A623', '#7C3AED', '#10B981', '#EF4444', '#3B82F6', '#EC4899'];

  // Find max stars in any week for scaling
  let maxStars = 0;
  for (const w of weeks) {
    let weekTotal = 0;
    for (const c of ch) weekTotal += (w.child_totals[c.id] || 0);
    if (weekTotal > maxStars) maxStars = weekTotal;
  }
  if (maxStars === 0) maxStars = 1;

  let html = `
    <div class="flex items-center gap-3 mb-4 flex-wrap">
      ${ch.map((c, i) => `<span class="flex items-center gap-1 text-xs font-semibold text-navy"><span class="w-3 h-3 rounded-full inline-block" style="background:${childColors[i % childColors.length]}"></span>${c.emoji || ''} ${escHtml(c.name)}</span>`).join('')}
    </div>
    <div class="flex gap-2 items-end justify-between min-w-0 overflow-x-auto pb-1">
      ${weeks.map(w => {
        // Per-child stacked bars
        const bars = ch.map((c, i) => {
          const stars = w.child_totals[c.id] || 0;
          const height = maxStars > 0 ? Math.max(stars > 0 ? 8 : 0, Math.round((stars / maxStars) * 80)) : 0;
          return `<div class="week-bar-track" title="${escHtml(c.name)}: ${stars} ⭐" style="height:80px;">
            <div class="week-bar-fill" style="height:${height}%;background:${childColors[i % childColors.length]};"></div>
          </div>`;
        }).join('');

        const weekTotal = ch.reduce((sum, c) => sum + (w.child_totals[c.id] || 0), 0);
        const isEmpty = weekTotal === 0;
        return `<div class="week-day-col" style="min-width:60px;" title="V${w.week_label}: ${weekTotal} stjärnor">
          <div class="text-[10px] font-bold text-center mb-1 ${isEmpty ? 'text-text-soft' : 'text-gold'}">${weekTotal}⭐</div>
          <div class="flex gap-1 justify-center mb-1">${bars}</div>
          <div class="text-[10px] font-bold text-center ${w.is_current ? 'text-gold' : 'text-text-soft'}">${w.week_label}</div>
        </div>`;
      }).join('')}
    </div>
  `;

  content.innerHTML = html;

  if (window.DashboardWeeklyStory) {
    window.DashboardWeeklyStory.render(starHistoryData);
  }
}

// ── Give Stars Modal ──────────────────────────────────────
function openGiveStarsModal(childId, childName, childEmoji) {
  document.getElementById('giveStarsChildId').value = childId;
  document.getElementById('giveStarsChildName').textContent = `${childEmoji} ${childName}`;
  document.getElementById('giveStarsCount').value = '5';
  document.getElementById('giveStarsReason').value = '';
  document.getElementById('giveStarsError').classList.add('hidden');
  document.getElementById('giveStarsModal').classList.remove('hidden');
}

async function submitGiveStars() {
  const childId = document.getElementById('giveStarsChildId').value;
  const starCount = parseInt(document.getElementById('giveStarsCount').value, 10);
  const reason = document.getElementById('giveStarsReason').value.trim();
  const errEl = document.getElementById('giveStarsError');

  errEl.classList.add('hidden');
  if (isNaN(starCount) || starCount < 1 || starCount > 100) {
    errEl.textContent = 'Ange 1–100 stjärnor';
    errEl.classList.remove('hidden');
    return;
  }
  if (!reason) {
    errEl.textContent = 'Anledning krävs';
    errEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('giveStarsSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Sparar…';

  try {
    const res = await window.apiFetch('/api/rewards/manual-stars', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, star_count: starCount, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Fel';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Ge stjärnor';
      return;
    }
    document.getElementById('giveStarsModal').classList.add('hidden');
    showToast(`⭐ ${starCount} stjärnor givna!`);
    await loadDashboardCards();
    await loadStarHistory();
  } catch (err) {
    errEl.textContent = 'Nätverksfel';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Ge stjärnor';
  }
}


// ── Request Panel (pending approvals for a child) ─────────
async function openRequestPanel(childId, childName) {
  const modal = document.getElementById('requestPanelModal');
  const nameEl = document.getElementById('requestPanelChildName');
  const content = document.getElementById('requestPanelContent');
  nameEl.textContent = childName;
  content.innerHTML = '<p class="text-center text-text-soft py-6">Laddar förfrågningar...</p>';
  modal.classList.remove('hidden');

  try {
    const res = await window.apiFetch('/api/rewards/pending-requests');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();

    // Filter to this child
    const childRedemptions = (data.pending_redemptions || []).filter(r => r.child_id === childId);
    const childGoalChanges = (data.pending_goal_changes || []).filter(r => r.child_id === childId);

    if (childRedemptions.length === 0 && childGoalChanges.length === 0) {
      content.innerHTML = '<p class="text-center text-text-soft py-6">Inga väntande förfrågningar! 🎉</p>';
      return;
    }

    let html = '';

    // Goal change requests
    for (const req of childGoalChanges) {
      html += `
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">🎯</span>
            <div class="flex-1">
              <div class="font-heading font-bold text-sm text-navy">Vill byta mål</div>
              <div class="text-xs text-text-soft">Till: ${escHtml(req.to_reward_name || '')} ${req.to_reward_icon || ''}</div>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button onclick="event.stopPropagation(); approveGoalChange('${req.id}')" class="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors min-h-[44px]">✅ Godkänn</button>
            <button onclick="event.stopPropagation(); denyGoalChange('${req.id}')" class="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold py-2.5 rounded-xl transition-colors min-h-[44px]">❌ Neka</button>
          </div>
        </div>`;
    }

    // Redemption requests
    for (const req of childRedemptions) {
      html += `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">${req.reward_icon || '🎁'}</span>
            <div class="flex-1">
              <div class="font-heading font-bold text-sm text-navy">Vill lösa in</div>
              <div class="text-xs text-text-soft">${escHtml(req.reward_name || '')} (⭐ ${req.star_cost || 0})</div>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button onclick="event.stopPropagation(); approveRedemption('${req.id}')" class="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors min-h-[44px]">✅ Godkänn</button>
            <button onclick="event.stopPropagation(); denyRedemption('${req.id}')" class="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold py-2.5 rounded-xl transition-colors min-h-[44px]">❌ Neka</button>
          </div>
        </div>`;
    }

    content.innerHTML = html;
  } catch (err) {
    content.innerHTML = '<p class="text-center text-red-500 py-6">Kunde inte ladda förfrågningar.</p>';
  }
}

function closeRequestPanel() {
  document.getElementById('requestPanelModal').classList.add('hidden');
}

async function approveGoalChange(requestId) {
  try {
    const res = await window.apiFetch(`/api/rewards/goal-change-requests/${requestId}/approve`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('🎯 Målbyte godkänt!');
    closeRequestPanel();
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function denyGoalChange(requestId) {
  try {
    const res = await window.apiFetch(`/api/rewards/goal-change-requests/${requestId}/deny`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('Målbyte nekat.');
    closeRequestPanel();
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function approveRedemption(redemptionId) {
  try {
    const res = await window.apiFetch(`/api/rewards/redemptions/${redemptionId}/approve`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('🎉 Inlösen godkänd!');
    closeRequestPanel();
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function denyRedemption(redemptionId) {
  try {
    const res = await window.apiFetch(`/api/rewards/redemptions/${redemptionId}/deny`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('Inlösen nekad.');
    closeRequestPanel();
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

// ── Child tabs ────────────────────────────────────────────
function renderChildTabs() {
  document.getElementById('childTabs').innerHTML = children.map(c => `
    <button onclick="selectChild('${c.id}')" class="child-tab px-5 py-2 rounded-full border-2 font-semibold text-sm transition-colors day-btn ${currentChildId===c.id?'bg-navy text-white border-navy':'border-lavender text-navy hover:border-navy'}" data-id="${c.id}">
      ${c.emoji||'👤'} ${escHtml(c.name)}
    </button>`).join('');
}

async function selectChild(id) {
  document.getElementById('childrenListView').classList.add('hidden');
  document.getElementById('scheduleEditorView').classList.remove('hidden');
  document.getElementById('backToChildrenBtn').classList.remove('hidden');
  document.getElementById('viewModeBar').classList.remove('hidden');
  document.getElementById('calNavBar').classList.remove('hidden');
  currentChildId = id; currentDay = new Date().getDay();
  document.getElementById('daySelectorWrap').classList.remove('hidden');
  calView = 'week'; weekOffset = 0; dayOffset = 0;
  setCalView('week');
  renderChildTabs(); renderDayTabs();
  await loadScheduleForDay();
  renderSbsChildSelector();
}

function backToChildrenList() {
  currentChildId = null; currentScheduleId = null;
  document.getElementById('childrenListView').classList.remove('hidden');
  document.getElementById('scheduleEditorView').classList.add('hidden');
  document.getElementById('backToChildrenBtn').classList.add('hidden');
  document.getElementById('daySelectorWrap').classList.add('hidden');
  document.getElementById('viewModeBar').classList.add('hidden');
  document.getElementById('calNavBar').classList.add('hidden');
  document.getElementById('sbsChildSelector').classList.add('hidden');
  // Refresh dashboard cards (progress may have changed)
  loadDashboardCards();
}

// ── Day tabs with DnD ────────────────────────────────────
function renderDayTabs() {
  const container = document.getElementById('dayTabs');
  // Get dates for the current week offset (Mon=1..Sun=0)
  const weekStart = getWeekStart(weekOffset); // Monday
  const dayToDate = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    // i=0 → Monday (dow=1), i=5 → Saturday (dow=6), i=6 → Sunday (dow=0)
    const dow = i < 6 ? i + 1 : 0;
    dayToDate[dow] = d;
  }
  const todayDow = new Date().getDay();

  updateCalNavLabel();

  container.innerHTML = [1,2,3,4,5,6,0].map(d => {
    const dateObj = dayToDate[d];
    const dateLabel = dateObj ? dateObj.getDate() + '/' + (dateObj.getMonth()+1) : '';
    const isToday = d === todayDow && weekOffset === 0;
    const todayDot = isToday ? `<span class="block w-1.5 h-1.5 rounded-full bg-blue-400 mx-auto mt-0.5"></span>` : '';
    return `<button draggable="true" onclick="selectDay(${d})"
      class="day-tab flex-shrink-0 px-2 md:px-4 py-1.5 rounded-xl border-2 font-semibold text-xs md:text-sm day-btn flex flex-col items-center leading-tight
      ${currentDay===d?'bg-gold text-white border-gold':'border-lavender text-navy hover:border-navy'}"
      data-day="${d}">
      <span>${DAYS_SHORT[d]}</span>
      <span class="font-normal text-[10px] opacity-75">${dateLabel}</span>
      ${todayDot}
    </button>`;
  }).join('');

  container.querySelectorAll('.day-tab').forEach(btn => {
    const day = parseInt(btn.dataset.day);
    btn.addEventListener('dragstart', e => {
      dndType = 'day-tab'; dndSrcDay = day;
      btn.classList.add('day-drag-src');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `day:${day}`);
    });
    btn.addEventListener('dragend', () => {
      dndType = null; dndSrcDay = null;
      clearDayTabHighlights();
    });
    btn.addEventListener('dragover', e => {
      e.preventDefault();
      if (dndType === 'day-tab' && dndSrcDay !== day) btn.classList.add('day-drop-hover');
      else if (dndType === 'activity-to-day') btn.classList.add('activity-drop-hover');
    });
    btn.addEventListener('dragleave', () => btn.classList.remove('day-drop-hover','activity-drop-hover'));
    btn.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      btn.classList.remove('day-drop-hover','activity-drop-hover');
      if (dndType === 'day-tab' && dndSrcDay !== null && dndSrcDay !== day) openDayDndModal(dndSrcDay, day);
      else if (dndType === 'activity-to-day' && dragSrcItem) copyActivityToDay(dragSrcItem, day);
    });
  });
}

function clearDayTabHighlights() {
  document.querySelectorAll('.day-tab').forEach(b => b.classList.remove('day-drop-hover','activity-drop-hover','day-drag-src'));
}

async function selectDay(d) {
  currentDay = d; renderDayTabs();
  // Update dayOffset to match selected day within current week
  if (calView === 'week') {
    const weekStart = getWeekStart(weekOffset);
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < 7; i++) {
      const dow = i < 6 ? i + 1 : 0;
      if (dow === d) {
        const dt = new Date(weekStart); dt.setDate(weekStart.getDate() + i);
        dt.setHours(0,0,0,0);
        dayOffset = Math.round((dt - today) / 86400000);
        break;
      }
    }
  }
  if (currentViewMode === 'sbs') { await loadScheduleForDay(); await loadAllChildrenSchedules(); renderSbsView(); }
  else await loadScheduleForDay();
}

// ── View mode ─────────────────────────────────────────────
async function setViewMode(mode) {
  currentViewMode = mode;
  document.getElementById('btnNormalView').classList.toggle('active', mode==='normal');
  document.getElementById('btnTimelineView').classList.toggle('active', mode==='timeline');
  document.getElementById('btnSbsView').classList.toggle('active', mode==='sbs');
  document.getElementById('btnSpecialDaysView').classList.toggle('active', mode==='special-days');
  document.getElementById('sbsChildSelector').classList.add('hidden');
  // Show/hide day selector (not needed in special-days mode or month calView)
  const hideDaySelector = mode === 'special-days' || calView === 'month';
  document.getElementById('daySelectorWrap').classList.toggle('hidden', hideDaySelector);
  if (mode === 'normal') renderSchedule();
  else if (mode === 'timeline') renderTimeline();
  else if (mode === 'sbs') { await loadAllChildrenSchedules(); renderSbsView(); }
  else if (mode === 'special-days') { await renderSpecialDaysCalendar(); }
}

// ── Special Days ──────────────────────────────────────────
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
  let startDow = firstDay.getDay(); // 0=Sun
  // Adjust to Monday-first: shift so Mon=0
  let offset = (startDow + 6) % 7; // days to go back to Monday

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

// ── Load schedule ─────────────────────────────────────────
async function loadScheduleForDay() {
  if (!currentChildId) return;

  const container = document.getElementById('scheduleContent');
  let skeletonTimer;
  if (window.Skeleton && window.Skeleton.isNative()) {
    skeletonTimer = window.Skeleton.createTimer(function () {
      window.Skeleton.showActivityListSkeleton();
    });
  } else {
    container.innerHTML = '<div class="text-center py-10 text-text-soft">Laddar…</div>';
  }

  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules`);
  if (!res.ok) {
    if (skeletonTimer) skeletonTimer.stop();
    if (window.Skeleton) window.Skeleton.showParentDashboardError(container);
    else container.innerHTML = '<p class="text-red-500">Fel vid laddning</p>';
    return;
  }
  const schedules = await res.json();
  const ds = schedules.find(s => s.day_of_week === currentDay);
  if (!ds) {
    if (skeletonTimer) skeletonTimer.stop();
    currentScheduleId = null; scheduleItems = []; renderEmptyDay(); return;
  }
  currentScheduleId = ds.id;
  const dateStr = getCurrentDateStr();
  const ir = await window.apiFetch(`/api/schedules/${currentScheduleId}/items?date=${encodeURIComponent(dateStr)}`);
  if (!ir.ok) {
    if (skeletonTimer) skeletonTimer.stop();
    if (window.Skeleton) window.Skeleton.showParentDashboardError(container);
    else container.innerHTML = '<p class="text-red-500">Fel vid laddning av aktiviteter</p>';
    return;
  }
  if (skeletonTimer) skeletonTimer.stop();
  const data = await ir.json();
  scheduleItems = data.items || []; sectionTimes = data.section_times || {};
  if (currentViewMode === 'timeline') renderTimeline();
  else if (currentViewMode === 'sbs') renderSbsView();
  else renderSchedule();
}

function renderEmptyDay() {
  const child = children.find(c => c.id === currentChildId);
  const dl = getDayDateLabel();
  document.getElementById('scheduleContent').innerHTML = `
    <div class="text-center py-16"><p class="text-5xl mb-4">📅</p>
      <p class="font-semibold text-navy mb-1">Inget schema för ${DAYS[currentDay]}${dl ? ` (${dl})` : ''}</p>
      <p class="text-text-soft text-sm mb-6">Skapa ett schema för att börja planera ${child?escHtml(child.name)+'s':''} dag</p>
      <button onclick="createSchedule()" class="px-6 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold">+ Skapa schema för ${DAYS[currentDay]}</button>
    </div>`;
}

async function createSchedule() {
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules`, { method: 'POST', body: JSON.stringify({ day_of_week: currentDay }) });
  const data = await res.json();
  if (res.ok) { currentScheduleId = data.id; scheduleItems = []; renderSchedule(); }
  else if (res.status === 409 && data.id) { currentScheduleId = data.id; scheduleItems = []; renderSchedule(); }
  else showToast(data.error || 'Fel uppstod', true);
}

// ── Render normal schedule ────────────────────────────────
function getDayDateLabel() {
  // Get the date label for currentDay in the current weekOffset
  const weekStart = getWeekStart(weekOffset);
  // weekStart is Monday, i=0 → Mon(1), i=5 → Sat(6), i=6 → Sun(0)
  for (let i = 0; i < 7; i++) {
    const dow = i < 6 ? i + 1 : 0;
    if (dow === currentDay) {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      return d.toLocaleDateString('sv-SE', { day:'numeric', month:'short' });
    }
  }
  return '';
}

function formatLocalDateStr(d) {
  if (!d || !isFinite(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateForDayOfWeek(dayOfWeek) {
  if (calView === 'day') {
    const d = getDayFromOffset(dayOffset);
    if (d.getDay() === dayOfWeek) return d;
  }
  const weekStart = getWeekStart(weekOffset);
  const dayDiff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + dayDiff);
  return d;
}

// Get ISO date string (YYYY-MM-DD) for currentDay in the current weekOffset/dayOffset.
function getCurrentDateStr() {
  return formatLocalDateStr(getDateForDayOfWeek(currentDay)) || formatLocalDateStr(new Date());
}

function renderSchedule() {
  const child = children.find(c => c.id === currentChildId);
  const sHtml = SECTIONS.map(sec => {
    const items = scheduleItems.filter(i => i.section===sec.key).sort((a,b)=>a.sort_order-b.sort_order);
    const tl = sectionTimeLabel(sec.key);
    return `<div class="section-card border-2 ${sec.color} rounded-2xl p-4 mb-4" data-section="${sec.key}">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2"><span class="text-xl">${sec.emoji}</span>
          <div><h4 class="font-heading font-bold text-navy">${sec.label}</h4>${tl?`<p class="text-xs text-text-soft">${tl}</p>`:''}</div>
        </div>
        <button onclick="openAddModal('${sec.key}')" class="action-btn px-3 py-2 bg-white hover:bg-lavender rounded-xl text-sm font-semibold transition-colors border border-lavender">+ Aktivitet</button>
      </div>
      <div class="space-y-2 items-list" id="items-${sec.key}">
        ${items.length===0?'<p class="text-sm text-text-soft text-center py-3">Inga aktiviteter</p>':items.map(i=>renderItem(i)).join('')}
      </div>
    </div>`;
  }).join('');

  const dateLabel = getDayDateLabel();
  document.getElementById('scheduleContent').innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="text-lg font-heading font-bold text-navy">${DAYS[currentDay]}${dateLabel ? ` <span class="text-text-soft font-normal text-base">${dateLabel}</span>` : ''} — ${child?escHtml(child.name):''}</h3>
        <p class="text-sm text-text-soft">${scheduleItems.length} aktivitet${scheduleItems.length!==1?'er':''}
          <span class="text-xs text-purple-400 ml-1">💡 Dra aktivitet till en dag-flik för att kopiera</span>
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button onclick="openCopyDayModal()" class="px-4 py-2 bg-lavender hover:bg-purple-100 text-navy rounded-xl text-sm font-semibold">📋 Kopiera dag</button>
        <button onclick="openCopyChildModal()" class="px-4 py-2 bg-mint hover:bg-green-100 text-navy rounded-xl text-sm font-semibold">👶 Kopiera till barn</button>
        <button onclick="confirmDeleteSchedule()" class="px-4 py-2 bg-coral hover:bg-red-200 text-navy rounded-xl text-sm font-semibold">🗑️ Ta bort dag</button>
      </div>
    </div>${sHtml}`;
  initDragDrop();
}

function renderItem(item) {
  const isOnce = !!item.is_once_task;
  const onceClass = isOnce ? ' once-task-item' : '';
  const onceBorder = isOnce ? ' border-dashed border-gold/40' : '';
  const dragHandle = isOnce ? '' : '<button type="button" class="drag-handle" aria-label="Dra för att ändra ordning">⠿</button>';
  const oncePin = isOnce ? '<span title="Engångsaktivitet" class="text-[10px] flex-shrink-0">📌</span>' : '';
  const moveBtns = isOnce ? '' : `<button onclick="moveItem('${item.id}','${item.section}',-1)" class="move-btn" title="Flytta upp" aria-label="Flytta upp">▲</button><button onclick="moveItem('${item.id}','${item.section}',1)" class="move-btn" title="Flytta ner" aria-label="Flytta ner">▼</button>`;
  const editBtn = isOnce ? '' : `<button onclick="openEditItem('${item.id}')" class="action-btn p-2 rounded-lg hover:bg-lavender transition-colors text-text-soft" title="Redigera">✏️</button>`;
  const timeStr = item.start_time ? fmtTime(item.start_time) + (item.end_time ? '–' + fmtTime(item.end_time) : '') : '';
  return `
    <div class="activity-item flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100${onceClass}${onceBorder} shadow-sm"
      data-id="${item.id}" data-section="${item.section}">
      ${dragHandle}
      <span class="text-xl flex-shrink-0">${item.activity_icon || '📌'}</span>
      ${oncePin}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm text-navy truncate">${escHtml(item.activity_name)}</div>
        ${timeStr ? `<div class="text-xs text-text-soft">${timeStr}</div>` : ''}
      </div>
      <div class="flex gap-1 flex-shrink-0">
        ${moveBtns}
        ${editBtn}
        <button type="button" data-id="${item.id}" onclick="event.stopPropagation(); removeItem('${item.id}')"
          class="action-btn action-btn-remove p-2 rounded-lg transition-colors text-text-soft" title="Ta bort">✕</button>
      </div>
    </div>`;
}

// ── Drag & Drop (sortablejs) ───────────────────────────────
let scheduleSortables = {}; // section -> Sortable instance
let scheduleDragSrc = null; // { id, section } from sortablejs evt.item
let _pendingReorderSection = null; // section key from last drag
let _pendingReorderOrder = null;   // [{id, sort_order, section}] snapshot

function initDragDrop() {
  if (typeof Sortable === 'undefined') return;

  // Destroy previous instances before re-rendering
  Object.values(scheduleSortables).forEach(s => s.destroy());
  scheduleSortables = {};

  // Prevent drag handle taps from toggling activity or propagating
  document.querySelectorAll('.drag-handle').forEach(handle => {
    handle.addEventListener('click', e => e.stopPropagation());
  });

  SECTIONS.forEach(sec => {
    const listEl = document.getElementById('items-' + sec.key);
    if (!listEl) return;
    const sortable = Sortable.create(listEl, {
      // No shared group — drag ONLY within each section, never between
      animation: 200,
      handle: '.drag-handle',
      draggable: '.activity-item',
      filter: '.once-task-item',
      preventOnFilter: true,
      forceFallback: true,
      fallbackTolerance: 3,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onStart: function(evt) {
        scheduleDragSrc = { id: evt.item.dataset.id, section: evt.item.dataset.section };
      },
      onEnd: function(evt) {
        if (evt.oldIndex === evt.newIndex) return;
        const sectionEl = evt.from.closest('[data-section]');
        const section = sectionEl ? sectionEl.dataset.section : null;
        if (!section) return;
        captureAndAskReorder(section);
      },
    });
    scheduleSortables[sec.key] = sortable;
  });
}

// Capture DOM order after drag and show confirmation dialog
function captureAndAskReorder(section) {
  if (!currentScheduleId) return;
  const order = [];
  SECTIONS.forEach(sec => {
    const listEl = document.getElementById('items-' + sec.key);
    if (!listEl) return;
    listEl.querySelectorAll('.activity-item').forEach((el, idx) => {
      order.push({ id: el.dataset.id, sort_order: idx, section: sec.key });
    });
  });
  _pendingReorderSection = section;
  _pendingReorderOrder = order;
  showReorderDialog();
}

// "Bara idag / Alla [veckodagar]" confirmation dialog
function showReorderDialog() {
  const dayName = DAYS[currentDay] ? DAYS[currentDay].toLowerCase() : '';
  const dayPlural = dayName ? `alla ${dayName}ar` : 'alla dagar';
  const existing = document.getElementById('reorder-dialog-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'reorder-dialog-overlay';
  overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
      <p class="text-2xl mb-2">↕️</p>
      <h3 class="font-heading font-bold text-navy text-lg mb-1">Ändra ordning</h3>
      <p class="text-sm text-text-soft mb-5">Ska ändringen gälla bara idag eller ${dayPlural}?</p>
      <div class="flex flex-col gap-2">
        <button id="reorder-today-btn" class="w-full py-3 px-4 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors">
          📅 Ändra bara idag
        </button>
        <button id="reorder-all-btn" class="w-full py-3 px-4 bg-navy hover:bg-purple-900 text-white rounded-xl font-semibold text-sm transition-colors">
          🔁 Ändra ${dayPlural}
        </button>
        <button id="reorder-cancel-btn" class="w-full py-2 px-4 text-text-soft hover:text-navy text-sm transition-colors">
          Avbryt
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) cancelReorderDialog(); });
  document.getElementById('reorder-today-btn').addEventListener('click', () => confirmReorderTodayOnly());
  document.getElementById('reorder-all-btn').addEventListener('click', () => confirmReorderAllDays());
  document.getElementById('reorder-cancel-btn').addEventListener('click', () => cancelReorderDialog());
}

function cancelReorderDialog() {
  const overlay = document.getElementById('reorder-dialog-overlay');
  if (overlay) overlay.remove();
  renderSchedule();
  _pendingReorderOrder = null;
  _pendingReorderSection = null;
}

// "Ändra alla [veckodagar]" — save to weekly_schedule_item template
async function confirmReorderAllDays() {
  const overlay = document.getElementById('reorder-dialog-overlay');
  if (overlay) overlay.remove();
  if (!_pendingReorderOrder || !currentScheduleId) return;

  const order = _pendingReorderOrder;
  const prevScheduleItems = scheduleItems.slice();
  scheduleItems = order.map(({ id, sort_order, section }) => {
    const existing = scheduleItems.find(i => i.id == id) || {};
    return { ...existing, id, sort_order, section };
  });

  const res = await window.apiFetch(`/api/schedules/${currentScheduleId}/items/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ order }),
  });

  if (!res.ok) {
    scheduleItems = prevScheduleItems;
    renderSchedule();
    showToast('Fel vid sparning av ordning', true);
  } else {
    order.forEach(({ id, sort_order, section }) => {
      const item = scheduleItems.find(i => i.id == id);
      if (item) { item.sort_order = sort_order; item.section = section; }
    });
    showToast(`Ordning sparad för alla ${DAYS[currentDay] ? DAYS[currentDay].toLowerCase() + 'ar' : 'dagar'} ✅`);
  }
  _pendingReorderOrder = null;
  _pendingReorderSection = null;
}

// "Bara idag" — reorder daily_log_items for today's date only
async function confirmReorderTodayOnly() {
  const overlay = document.getElementById('reorder-dialog-overlay');
  if (overlay) overlay.remove();
  if (!_pendingReorderOrder || !currentChildId) return;

  const dateStr = getCurrentDateStr();
  if (!dateStr) { showToast('Kunde inte bestämma datum', true); renderSchedule(); return; }

  const newOrder = _pendingReorderOrder;

  try {
    const logRes = await window.apiFetch(`/api/children/${currentChildId}/daily-log?date=${dateStr}`);
    if (!logRes.ok) throw new Error('Kunde inte hämta dagens schema');
    const logData = await logRes.json();
    const logItems = logData.items || [];

    // Map new order: template IDs → matching daily_log_item IDs
    const orderedDailyIds = [];
    SECTIONS.forEach(sec => {
      const sectionOrder = newOrder.filter(o => o.section === sec.key).sort((a, b) => a.sort_order - b.sort_order);
      for (const entry of sectionOrder) {
        const schedItem = scheduleItems.find(i => i.id == entry.id);
        if (!schedItem) continue;
        const templateId = schedItem.activity_template_id;
        if (!templateId) continue;
        const match = logItems.find(li =>
          li.activity_template_id === templateId && li.section === sec.key &&
          !orderedDailyIds.includes(li.id)
        );
        if (match) orderedDailyIds.push(match.id);
      }
      logItems.filter(li => li.section === sec.key && !orderedDailyIds.includes(li.id))
        .forEach(li => orderedDailyIds.push(li.id));
    });

    if (orderedDailyIds.length === 0) throw new Error('Inga aktiviteter att sortera');

    const res = await window.apiFetch('/api/daily-log-items/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ordered_item_ids: orderedDailyIds }),
    });
    if (!res.ok) throw new Error('Sparning misslyckades');

    showToast('Ordning sparad bara för idag ✅');
  } catch (err) {
    showToast(err.message || 'Fel vid sparning', true);
  }

  renderSchedule();
  _pendingReorderOrder = null;
  _pendingReorderSection = null;
}

async function moveItem(itemId, section, direction) {
  const si = scheduleItems.filter(i=>i.section===section).sort((a,b)=>a.sort_order-b.sort_order);
  const idx = si.findIndex(i=>i.id==itemId);
  if (idx < 0) return;
  const ni = idx + direction;
  if (ni < 0 || ni >= si.length) return;
  [si[idx], si[ni]] = [si[ni], si[idx]];
  // Build pending order and show dialog (same flow as drag)
  const order = si.map((item, i) => ({ id: item.id, sort_order: i, section }));
  const otherItems = scheduleItems.filter(i => i.section !== section);
  _pendingReorderOrder = [...order, ...otherItems.map(i => ({ id: i.id, sort_order: i.sort_order, section: i.section }))];
  _pendingReorderSection = section;
  renderSchedule();
  showReorderDialog();
}

// ── Copy activity to another day (drop on day tab) ────────
async function copyActivityToDay(itemId, toDay) {
  if (!currentScheduleId || !currentChildId) return;
  const item = scheduleItems.find(i => i.id == itemId);
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-item-to-day`, {
    method: 'POST', body: JSON.stringify({ item_id: itemId, from_schedule_id: currentScheduleId, to_day: toDay }),
  });
  const data = await res.json();
  if (res.ok) showToast(data.skipped ? `Al finns redan på ${DAYS[toDay]}` : `📋 Kopierat till ${DAYS[toDay]}`);
  else showToast(data.error || 'Fel uppstod', true);
}

// ── Day DnD Modal ─────────────────────────────────────────
let dayDndSrc = null, dayDndDst = null;
function openDayDndModal(s, d) {
  dayDndSrc = s; dayDndDst = d;
  document.getElementById('dayDndTitle').textContent = `${DAYS[s]} → ${DAYS[d]}`;
  document.getElementById('dayDndDesc').textContent = `Vad vill du göra med ${DAYS[s]}s schema?`;
  document.getElementById('dayDndCopyBtn').onclick = () => { closeDayDndModal(); doDayDndCopy(s,d); };
  document.getElementById('dayDndSwapBtn').onclick = () => { closeDayDndModal(); doDayDndSwap(s,d); };
  document.getElementById('dayDndModal').classList.remove('hidden');
}
function closeDayDndModal() { document.getElementById('dayDndModal').classList.add('hidden'); dayDndSrc=null; dayDndDst=null; }
async function doDayDndCopy(src, dst) {
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-day`, { method: 'POST', body: JSON.stringify({ from_day: src, to_days: [dst] }) });
  const data = await res.json();
  if (res.ok) { showToast(`📋 ${DAYS[src]} kopierat till ${DAYS[dst]}`); if(currentDay===dst) await loadScheduleForDay(); }
  else showToast(data.error||'Fel uppstod', true);
}
async function doDayDndSwap(a, b) {
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/swap-day`, { method: 'POST', body: JSON.stringify({ day_a: a, day_b: b }) });
  const data = await res.json();
  if (res.ok) { showToast(`🔄 ${DAYS[a]} och ${DAYS[b]} bytte plats`); if(currentDay===a||currentDay===b) await loadScheduleForDay(); }
  else showToast(data.error||'Fel uppstod', true);
}

// ── Timeline View ─────────────────────────────────────────
function renderTimeline() {
  if (!currentScheduleId) { renderEmptyDay(); return; }
  const child = children.find(c => c.id === currentChildId);
  const START_H = 6, END_H = 22;
  const slots = [];
  for (let h = START_H; h < END_H; h++) {
    slots.push({ h, m: 0, label: `${String(h).padStart(2,'0')}:00`, timeStr: `${String(h).padStart(2,'0')}:00`, half: false });
    slots.push({ h, m: 30, label: '', timeStr: `${String(h).padStart(2,'0')}:30`, half: true });
  }
  function timeToSlot(t) {
    if (!t) return -1;
    const [h,m] = t.split(':').map(Number);
    const s = (h - START_H)*2 + (m>=30?1:0);
    return (s>=0 && s<slots.length) ? s : -1;
  }
  const slotMap = {}; const unscheduled = [];
  scheduleItems.forEach(item => {
    const s = timeToSlot(item.start_time);
    if (s>=0) { if(!slotMap[s]) slotMap[s]=[]; slotMap[s].push(item); }
    else unscheduled.push(item);
  });

  const slotsHtml = slots.map((slot,idx) => {
    const items = slotMap[idx]||[];
    return `<div class="time-slot ${slot.half?'slot-half':''}" data-slot="${idx}" data-time="${slot.timeStr}">
      <span class="time-slot-label">${slot.half?'':slot.label}</span>
      ${items.map(item=>`<div class="timeline-activity${item.is_once_task ? ' once-task-item' : ''}" data-id="${item.id}" draggable="${item.is_once_task ? 'false' : 'true'}">
        <span class="text-sm flex-shrink-0">${item.activity_icon||'📌'}</span>
        ${item.is_once_task ? '<span title="Engångsaktivitet" class="text-[10px]">📌</span>' : ''}
        <span class="font-semibold text-navy truncate flex-1 text-xs">${escHtml(item.activity_name_display||item.activity_name)}</span>
        <button type="button" onclick="event.stopPropagation(); removeItem('${item.id}')" draggable="false" class="action-btn action-btn-remove p-2 rounded-lg text-gray-400 hover:text-red-500 flex-shrink-0" title="Ta bort">✕</button>
      </div>`).join('')}
    </div>`;
  }).join('');

  const unschHtml = unscheduled.length>0 ? `
    <div class="tl-unscheduled-label">Utan tid</div>
    ${unscheduled.map(item=>`<div class="time-slot" data-slot="-1" data-time="">
      <span class="time-slot-label text-gray-300 text-xs">–</span>
      <div class="timeline-activity${item.is_once_task ? ' once-task-item' : ''}" data-id="${item.id}" draggable="${item.is_once_task ? 'false' : 'true'}">
        <span class="text-sm flex-shrink-0">${item.activity_icon||'📌'}</span>
        ${item.is_once_task ? '<span title="Engångsaktivitet" class="text-[10px]">📌</span>' : ''}
        <span class="font-semibold text-navy truncate flex-1 text-xs">${escHtml(item.activity_name_display||item.activity_name)}</span>
        <button type="button" onclick="event.stopPropagation(); removeItem('${item.id}')" draggable="false" class="action-btn action-btn-remove p-2 rounded-lg text-gray-400 hover:text-red-500 flex-shrink-0">✕</button>
      </div>
    </div>`).join('')}` : '';

  const tlDateLabel = getDayDateLabel();
  document.getElementById('scheduleContent').innerHTML = `
    <div class="flex items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="text-lg font-heading font-bold text-navy">${DAYS[currentDay]}${tlDateLabel ? ` <span class="text-text-soft font-normal text-base">${tlDateLabel}</span>` : ''} — ${child?escHtml(child.name):''} ⏱ Tidsvy</h3>
        <p class="text-xs text-text-soft">Dra aktiviteter upp/ner för att ändra starttid. 06:00–22:00.</p>
      </div>
      <button onclick="openAddModal('dag')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-white rounded-xl text-sm font-semibold">+ Aktivitet</button>
    </div>
    <div class="border-2 border-lavender rounded-2xl overflow-hidden bg-white" id="timelineWrap" style="max-height:65vh;overflow-y:auto">
      ${slotsHtml}${unschHtml}
    </div>`;
  initTimelineDnd();
}

function initTimelineDnd() {
  const wrap = document.getElementById('timelineWrap');
  if (!wrap) return;
  let tlSrcId = null;
  wrap.querySelectorAll('.timeline-activity').forEach(el => {
    el.addEventListener('dragstart', e => {
      tlSrcId = el.dataset.id; el.classList.add('tl-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `tl:${tlSrcId}`);
      dndType = 'timeline';
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('tl-dragging'); tlSrcId = null; dndType = null;
      wrap.querySelectorAll('.slot-drop-target').forEach(s=>s.classList.remove('slot-drop-target'));
    });
  });
  wrap.querySelectorAll('.time-slot').forEach(slot => {
    slot.addEventListener('dragover', e => {
      if (dndType !== 'timeline') return;
      e.preventDefault();
      wrap.querySelectorAll('.slot-drop-target').forEach(s=>s.classList.remove('slot-drop-target'));
      slot.classList.add('slot-drop-target');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('slot-drop-target'));
    slot.addEventListener('drop', async e => {
      e.preventDefault(); e.stopPropagation();
      slot.classList.remove('slot-drop-target');
      if (!tlSrcId || !currentScheduleId) return;
      const newTime = slot.dataset.time || null;
      const res = await window.apiFetch(`/api/schedules/${currentScheduleId}/items/${tlSrcId}`, {
        method: 'PUT', body: JSON.stringify({ start_time: newTime }),
      });
      if (res.ok) {
        const item = scheduleItems.find(i=>i.id==tlSrcId);
        if (item) item.start_time = newTime;
        showToast(`⏱ Tid: ${newTime||'utan tid'}`);
        renderTimeline();
      } else showToast('Fel vid tidsändring', true);
    });
  });
}

// ── Side-by-Side View (All Children) ──────────────────────
async function loadAllChildrenSchedules() {
  sbsAllData = {};
  const dateStr = getCurrentDateStr();
  const promises = children.map(async (child) => {
    const res = await window.apiFetch(`/api/children/${child.id}/schedules`);
    if (!res.ok) { sbsAllData[child.id] = { items: [], scheduleId: null }; return; }
    const schedules = await res.json();
    const ds = schedules.find(s => s.day_of_week === currentDay);
    if (!ds) { sbsAllData[child.id] = { items: [], scheduleId: null }; return; }
    const ir = await window.apiFetch(`/api/schedules/${ds.id}/items?date=${encodeURIComponent(dateStr)}`);
    if (ir.ok) {
      const d = await ir.json();
      sbsAllData[child.id] = { items: d.items || [], scheduleId: ds.id };
    } else {
      sbsAllData[child.id] = { items: [], scheduleId: ds.id };
    }
  });
  await Promise.all(promises);
  // Keep current child's schedule in sync
  if (sbsAllData[currentChildId]) {
    scheduleItems = sbsAllData[currentChildId].items;
    currentScheduleId = sbsAllData[currentChildId].scheduleId;
  }
}

function renderSbsView() {
  const panelItems = (items, schedId, childId) => {
    if (!items || items.length === 0) return `<p class="text-sm text-text-soft text-center py-6">Inget schema för ${DAYS[currentDay]}</p>`;
    return SECTIONS.map(sec => {
      const si = items.filter(i => i.section === sec.key).sort((a, b) => a.sort_order - b.sort_order);
      if (!si.length) return '';
      return `<div class="mb-2"><div class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-1 px-1">${sec.emoji} ${sec.label}</div>
        ${si.map(item => `<div class="activity-item flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm mb-1${item.is_once_task ? ' once-task-item' : ''} ${item.is_once_task ? '' : 'cursor-grab'}"
          data-id="${item.id}" data-section="${item.section}"
          data-schedule-id="${schedId || ''}" data-child-id="${childId}"
          draggable="${item.is_once_task ? 'false' : 'true'}">
          <span class="text-sm flex-shrink-0">${item.activity_icon || '📌'}</span>
          ${item.is_once_task ? '<span title="Engångsaktivitet" class="text-[10px]">📌</span>' : ''}
          <div class="flex-1 min-w-0"><div class="font-semibold text-xs text-navy truncate">${escHtml(item.activity_name_display || item.activity_name)}</div>${item.start_time ? `<div class="text-xs text-text-soft">${fmtTime(item.start_time)}</div>` : ''}</div>
        </div>`).join('')}
      </div>`;
    }).join('');
  };

  const panels = children.map(child => {
    const data = sbsAllData[child.id] || { items: [], scheduleId: null };
    return `<div class="sbs-panel">
      <div class="sbs-panel-header">
        ${renderChildAvatar(child, 28)}
        <span class="font-bold text-navy">${escHtml(child.name)}</span>
        <span class="text-xs text-text-soft ml-auto">${data.items.length} st</span>
      </div>
      <div class="sbs-inner p-2" id="sbsInner_${child.id}">${panelItems(data.items, data.scheduleId, child.id)}</div>
    </div>`;
  }).join('');

  document.getElementById('scheduleContent').innerHTML = `
    <div class="mb-3"><h3 class="text-lg font-heading font-bold text-navy">${DAYS[currentDay]} — Jämför barn</h3>
      <p class="text-xs text-text-soft">📋 Dra en aktivitet från ett barn till det andra för att kopiera den</p>
    </div>
    <div class="sbs-container">${panels}</div>`;

  initSbsDnd();
}

function initSbsDnd() {
  const allPanels = children.map(c => document.getElementById(`sbsInner_${c.id}`)).filter(Boolean);
  if (allPanels.length < 2) return;
  let sbsSrcItemId = null, sbsSrcScheduleId = null, sbsSrcChildId = null;

  document.querySelectorAll('.sbs-inner [data-schedule-id]').forEach(el => {
    el.addEventListener('dragstart', e => {
      sbsSrcItemId = el.dataset.id; sbsSrcScheduleId = el.dataset.scheduleId; sbsSrcChildId = el.dataset.childId;
      el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', `sbs:${sbsSrcItemId}`);
      dndType = 'sbs';
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging'); sbsSrcItemId = null; sbsSrcScheduleId = null; sbsSrcChildId = null;
      dndType = null;
      allPanels.forEach(p => p.classList.remove('sbs-drop-active'));
    });
  });

  allPanels.forEach(panel => {
    const panelChildId = panel.id.replace('sbsInner_', '');
    panel.addEventListener('dragover', e => { if (dndType !== 'sbs') return; e.preventDefault(); panel.classList.add('sbs-drop-active'); });
    panel.addEventListener('dragleave', () => panel.classList.remove('sbs-drop-active'));
    panel.addEventListener('drop', async e => {
      e.preventDefault(); e.stopPropagation();
      panel.classList.remove('sbs-drop-active');
      if (dndType !== 'sbs' || !sbsSrcItemId) return;
      if (!panelChildId || sbsSrcChildId === panelChildId) { showToast('Aktiviteten är redan hos detta barn'); return; }
      if (!sbsSrcScheduleId) { showToast('Källschema saknas', true); return; }
      const res = await window.apiFetch(`/api/children/${sbsSrcChildId}/schedules/copy-item-to-child`, {
        method: 'POST',
        body: JSON.stringify({ item_id: sbsSrcItemId, from_schedule_id: sbsSrcScheduleId, to_child_id: panelChildId, to_day: currentDay }),
      });
      const data = await res.json();
      if (res.ok) {
        const dstChild = children.find(c => c.id === panelChildId);
        showToast(data.skipped ? `Finns redan hos ${dstChild ? dstChild.name : 'barnet'}` : `📋 Kopierat till ${dstChild ? dstChild.name : 'barnet'}`);
        await loadAllChildrenSchedules(); renderSbsView();
      } else showToast(data.error || 'Fel uppstod', true);
    });
  });
}

// Legacy compatibility (keep old functions for any callers)
function renderSbsChildSelector() {}
async function loadSbsSchedule() { await loadAllChildrenSchedules(); }
async function selectSbsChild(id) { sbsChildId = id; }

// ── Activity template modal ───────────────────────────────
async function loadTemplates() {
  try {
    const res = await window.apiFetch('/api/activities');
    if (res.ok) allTemplates = await res.json();
  } catch (e) {
    console.error('[DASHBOARD] loadTemplates failed:', e);
  }
}
async function openDashboardAddForChild(childId) {
  await selectChild(childId);
  addSectionOverride = 'dag';
  openAddModal('dag');
}

// Open addActivityModal in once-mode (replaces onceTaskModal)
async function openOnceTaskModal() {
  if (!children || children.length === 0) { await loadChildren(); }
  _onceMode = true;
  document.getElementById('addActivityOnceWrap').classList.remove('hidden');
  const td = new Date();
  const todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
  document.getElementById('addActivityOnceDate').value = todayStr;
  document.getElementById('addActivityOnceDate').min = todayStr;
  const list = document.getElementById('addActivityOnceChildList');
  // Pre-seed _onceCreateContext so single-child families work even when _onceMode
  // is set before openCreateActivityModal saves the snapshot (fixes "Välj minst ett barn"
  // when user skips step 1 and selects children in the create-modal instead).
  _onceCreateContext = {
    childIds: (children || []).length === 1 ? [children[0].id] : [],
    date: new Date().toISOString().slice(0, 10),
    startTime: null,
    endTime: null,
    section: 'dag',
  };
  _pendingTargetChildIds = _onceCreateContext.childIds;
  if ((children || []).length === 1) {
    // Single-child family: show static label, no checkbox needed — the only child is pre-selected.
    const c = children[0];
    list.innerHTML = `<div class="flex items-center gap-2 p-2 rounded-xl bg-sky">
      <span class="text-xl">${c.emoji || '⭐'}</span>
      <span class="font-semibold text-sm text-navy">${escHtml(c.name)}</span>
      <span class="ml-auto text-xs text-text-soft">Auto-vald</span>
    </div>`;
  } else {
    // Multi-child family: render interactive checkboxes.
    list.innerHTML = (children || []).map(c =>
      `<label class="flex items-center gap-3 p-2 rounded-xl hover:bg-sky cursor-pointer">
        <input type="checkbox" class="once-child-check w-4 h-4 accent-gold" value="${c.id}">
        <span class="text-xl">${c.emoji || '⭐'}</span>
        <span class="font-semibold text-sm text-navy">${escHtml(c.name)}</span>
      </label>`
    ).join('');
  }
  // Reset addActivityModal state and open
  selectedTemplateId = null;
  document.getElementById('addActivityError').classList.add('hidden');
  document.getElementById('addStartTime').value = '';
  document.getElementById('addEndTime').value = '';
  // Show tip when both time fields are empty, hide when either is filled
  const tipMsg = document.getElementById('timeTipMsg');
  if (tipMsg) {
    tipMsg.classList.remove('hidden');
    const hideTip = () => { const s = document.getElementById('addStartTime'); const e = document.getElementById('addEndTime'); if (s?.value || e?.value) tipMsg.classList.add('hidden'); };
    document.getElementById('addStartTime').removeEventListener('input', hideTip);
    document.getElementById('addEndTime').removeEventListener('input', hideTip);
    document.getElementById('addStartTime').addEventListener('input', hideTip);
    document.getElementById('addEndTime').addEventListener('input', hideTip);
  }
  document.getElementById('selectedTemplateInfo').classList.add('hidden');
  document.getElementById('templateSearch').value = '';
  addSectionOverride = 'dag';
  pickSection('dag');
  renderTemplateList('');
  document.getElementById('addActivityModal').classList.remove('hidden');
  document.getElementById('addActivityModal').scrollTop = 0;
  document.querySelector('#addActivityModal h3').textContent = '➕ Engångsaktivitet';
  setTimeout(() => document.getElementById('templateSearch').focus(), 100);
}

// Opens the add-activity modal for a given schedule section (morgon/dag/kväll).
// Was accidentally removed in the toggleCardExpand dedup fix (May 18 2026).
function openAddModal(sectionKey) {
  selectedTemplateId = null;
  document.getElementById('addActivityError').classList.add('hidden');
  document.getElementById('addStartTime').value = '';
  document.getElementById('addEndTime').value = '';
  const tipMsg = document.getElementById('timeTipMsg');
  if (tipMsg) {
    tipMsg.classList.remove('hidden');
    const hideTip = () => {
      const s = document.getElementById('addStartTime');
      const e = document.getElementById('addEndTime');
      if (s?.value || e?.value) tipMsg.classList.add('hidden');
    };
    document.getElementById('addStartTime').removeEventListener('input', hideTip);
    document.getElementById('addEndTime').removeEventListener('input', hideTip);
    document.getElementById('addStartTime').addEventListener('input', hideTip);
    document.getElementById('addEndTime').addEventListener('input', hideTip);
  }
  document.getElementById('selectedTemplateInfo').classList.add('hidden');
  document.getElementById('templateSearch').value = '';
  addSectionOverride = sectionKey || 'dag';
  pickSection(sectionKey || 'dag');
  renderTemplateList('');
  const addModal = document.getElementById('addActivityModal');
  addModal.classList.remove('hidden');
  addModal.scrollTop = 0;
  setTimeout(() => {
    addModal.scrollTop = 0;
    document.getElementById('templateSearch').focus();
  }, 100);
}

// NOTE: toggleCardExpand is defined once at the top of the file (accordion logic).
// This duplicate was removed — it incorrectly opened the add-activity modal.
function closeAddModal() {
  document.getElementById('addActivityModal').classList.add('hidden');
  if (_onceMode) {
    _onceMode = false;
    document.getElementById('addActivityOnceWrap').classList.add('hidden');
    document.querySelector('#addActivityModal h3').textContent = 'Lägg till aktivitet';
  }
  _onceCreateContext = null;
  _pendingTargetChildIds = [];
}
function filterTemplates() { renderTemplateList(document.getElementById('templateSearch').value); }
function renderTemplateList(q) {
  const list = document.getElementById('templateList');
  let items = allTemplates;
  if (q) items = items.filter(t=>t.name&&t.name.toLowerCase().includes(q.toLowerCase()));
  const used = new Set(scheduleItems.filter(i=>i.section===addSectionOverride).map(i=>i.activity_template_id));
  items = items.filter(t=>!used.has(t.id)).sort((a,b)=>(b.is_favorite?1:0)-(a.is_favorite?1:0));
  if (!items.length) {
    const qEsc = q ? escHtml(q) : '';
    list.innerHTML=`<div class="text-center py-4">
      <p class="text-text-soft text-sm mb-3">Inga aktiviteter hittades${q?' för "'+qEsc+'"':''}.</p>
      <button type="button" onclick="openCreateActivityModal('${(q||'').replace(/'/g,"\\'")}')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm">✨ Skapa ny aktivitet</button>
    </div>`;
    return;
  }
  const grouped={}; const unc=[];
  for (const t of items) { const cn=t.category_name||null; if(cn){if(!grouped[cn])grouped[cn]={sort:t.category_sort_order||999,items:[]};grouped[cn].items.push(t);}else unc.push(t); }
  const sc=Object.entries(grouped).sort((a,b)=>a[1].sort-b[1].sort);
  let html='';
  for (const [cn,g] of sc) { html+=`<div class="text-xs font-semibold text-text-soft uppercase tracking-wide px-2 pt-3 pb-1">${escHtml(cn)}</div>`+g.items.map(t=>renderTemplateItem(t)).join(''); }
  if (unc.length>0) { if(sc.length>0) html+=`<div class="text-xs font-semibold text-text-soft uppercase tracking-wide px-2 pt-3 pb-1">Övriga</div>`; html+=unc.map(t=>renderTemplateItem(t)).join(''); }
  // Always show "Skapa ny" at the bottom
  html += `<div class="border-t border-lavender mt-2 pt-2 text-center"><button type="button" onclick="openCreateActivityModal('')" class="text-sm text-gold font-semibold hover:underline">✨ Skapa ny aktivitet</button></div>`;
  list.innerHTML = html;
}
function renderTemplateItem(t) {
  return `<button type="button" onclick="selectTemplate('${t.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sky transition-colors text-left ${selectedTemplateId===t.id?'bg-sky border-2 border-gold':'border-2 border-transparent'}" data-tid="${t.id}">
    <span class="text-2xl">${t.icon||'📌'}</span>
    <div class="flex-1 min-w-0"><div class="font-semibold text-sm text-navy truncate">${escHtml(t.name)}</div><div class="text-xs text-text-soft">${'⭐'.repeat(t.star_value||0)}</div></div>
  </button>`;
}
function selectTemplate(id) {
  selectedTemplateId = id; const t=allTemplates.find(x=>x.id===id); if(!t)return;
  document.getElementById('selTemplateIcon').textContent=t.icon||'📌';
  document.getElementById('selTemplateName').textContent=t.name;
  document.getElementById('selTemplateStars').textContent='⭐'.repeat(t.star_value||0);
  document.getElementById('selectedTemplateInfo').classList.remove('hidden');
  document.querySelectorAll('#templateList button').forEach(b=>{b.classList.toggle('border-gold',b.dataset.tid===id);b.classList.toggle('bg-sky',b.dataset.tid===id);});
}
function clearSelectedTemplate() { selectedTemplateId=null; document.getElementById('selectedTemplateInfo').classList.add('hidden'); renderTemplateList(document.getElementById('templateSearch').value); }
function pickSection(sec) {
  addSectionOverride=sec; document.getElementById('addSection').value=sec;
  document.querySelectorAll('.section-pick-btn').forEach(btn=>{ const s=btn.dataset.sec===sec; btn.classList.toggle('bg-navy',s);btn.classList.toggle('text-white',s);btn.classList.toggle('border-navy',s); });
  if(!document.getElementById('addActivityModal').classList.contains('hidden')) renderTemplateList(document.getElementById('templateSearch').value);
}
// Pending recurrence state
let _pendingTemplateId = null;
let _pendingTemplateName = '';
let _pendingSection = 'dag';
let _pendingStartTime = null;
let _pendingEndTime = null;
let _recurrenceSelectedDays = [];

// ── Child picker helpers (multi-child feature) ─────────────
function getActivityPickChildList() {
  return children; // already loaded as global `children`
}

function renderActivityChildPick(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const family = getActivityPickChildList();
  if (family.length < 2) { container.classList.add('hidden'); return; }
  const selected = _pendingTargetChildIds.length ? _pendingTargetChildIds : [currentChildId];
  container.innerHTML = family.map(c =>
    `<label class="flex items-center gap-2 cursor-pointer py-1">
      <input type="checkbox" value="${c.id}" class="child-pick-checkbox accent-gold w-4 h-4">
      <span class="text-sm text-navy font-medium">${c.icon || '👤'} ${c.name}</span>
    </label>`
  ).join('');
  // Set .checked property directly — do not rely on HTML attribute alone
  container.querySelectorAll('.child-pick-checkbox').forEach(cb => {
    if (selected.includes(cb.value)) cb.checked = true;
  });
  container.classList.remove('hidden');
}

function getSelectedActivityChildIds() {
  return Array.from(document.querySelectorAll('.child-pick-checkbox:checked')).map(el => el.value);
}

async function submitAddActivity() {
  // Once-mode: add directly to daily log for a specific date
  if (_onceMode) {
    if (!selectedTemplateId) {
      document.getElementById('addActivityError').textContent = 'Välj en aktivitet';
      document.getElementById('addActivityError').classList.remove('hidden');
      return;
    }
    const date = document.getElementById('addActivityOnceDate').value;
    if (!date) {
      document.getElementById('addActivityError').textContent = 'Välj ett datum';
      document.getElementById('addActivityError').classList.remove('hidden');
      return;
    }
    let selectedIds = [...document.querySelectorAll('#addActivityOnceChildList .once-child-check:checked')].map(el => el.value);
    // Fallback for single-child families where the child picker is hidden (static label, no checkboxes).
    if (selectedIds.length === 0 && (children || []).length === 1) {
      selectedIds = [children[0].id];
    }
    if (selectedIds.length === 0) {
      document.getElementById('addActivityError').textContent = 'Välj minst ett barn';
      document.getElementById('addActivityError').classList.remove('hidden');
      return;
    }
    const tpl = allTemplates.find(t => t.id === selectedTemplateId);
    const addBtn = document.getElementById('addActivityBtn');
    addBtn.disabled = true; addBtn.textContent = 'Skapar…';
    try {
      const primaryChildId = selectedIds[0];
      const res = await window.apiFetch(`/api/children/${primaryChildId}/schedules/once-tasks`, {
        method: 'POST',
        body: JSON.stringify({
          name: tpl?.name || '',
          icon: tpl?.icon || '📌',
          section: addSectionOverride || 'dag',
          date,
          start_time: document.getElementById('addStartTime').value || null,
          end_time: document.getElementById('addEndTime').value || null,
          star_value: tpl?.star_value || 1,
          child_ids: selectedIds,
        })
      });
      if (res.ok) {
        const d = new Date(date + 'T12:00:00');
        const dateFmt = d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
        closeAddModal();
        showToast(`${tpl?.icon || ''} "${tpl?.name}" tillagd för ${dateFmt}!`);
        await loadDashboardCards();
      } else {
        const err = await res.json();
        document.getElementById('addActivityError').textContent = err.error || 'Fel uppstod';
        document.getElementById('addActivityError').classList.remove('hidden');
      }
    } finally {
      addBtn.disabled = false; addBtn.textContent = 'Lägg till';
    }
    return;
  }

  // Normal mode: store pending data and show recurrence choice
  if (!selectedTemplateId) { document.getElementById('addActivityError').textContent='Välj en aktivitet'; document.getElementById('addActivityError').classList.remove('hidden'); return; }
  const tpl = allTemplates.find(t=>t.id===selectedTemplateId);

  // If _onceCreateContext exists, submit the once-task directly and skip recurrence modal
  if (_onceCreateContext) {
    await submitOnceTaskDirect(selectedTemplateId, tpl);
    return;
  }

  _pendingTemplateId = selectedTemplateId;
  _pendingTemplateName = tpl ? tpl.name : 'Aktiviteten';
  _pendingSection = addSectionOverride;
  _pendingStartTime = document.getElementById('addStartTime').value || null;
  _pendingEndTime = document.getElementById('addEndTime').value || null;
  _pendingTargetChildIds = [currentChildId];
  closeAddModal();
  openRecurrenceModal();
}

function bindRecurrenceAddHandlers() {
  const onceBtn = document.getElementById('recurrenceOnceBtn');
  const weeklyBtn = document.getElementById('recurrenceWeeklyBtn');
  if (!onceBtn || !weeklyBtn) return;
  onceBtn.removeAttribute('onclick');
  weeklyBtn.removeAttribute('onclick');
  onceBtn.disabled = false;
  weeklyBtn.disabled = false;
  onceBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    confirmRecurrence('once');
  };
  weeklyBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    showWeekdayPicker();
  };
}

function bindRecurrenceDeleteHandlers(itemId) {
  const onceBtn = document.getElementById('recurrenceOnceBtn');
  const weeklyBtn = document.getElementById('recurrenceWeeklyBtn');
  if (!onceBtn || !weeklyBtn) return;
  onceBtn.removeAttribute('onclick');
  weeklyBtn.removeAttribute('onclick');
  onceBtn.disabled = false;
  weeklyBtn.disabled = false;
  onceBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteOnce(itemId);
  };
  weeklyBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteAll(itemId);
  };
}

function openRecurrenceModal() {
  resetRecurrenceModalTexts(); // must be first — resets handlers + texts before showing
  document.getElementById('recurrenceActivityName').textContent = `"${_pendingTemplateName}"`;
  document.getElementById('recurrenceError').classList.add('hidden');
  document.getElementById('weekdayPickerSection').classList.add('hidden');
  _recurrenceSelectedDays = [];
  renderActivityChildPick('recurrenceChildrenWrap');
  updateRecurrenceChildHint();
  bindRecurrenceAddHandlers();
  document.getElementById('recurrenceModal').classList.remove('hidden');
}

function updateRecurrenceChildHint() {
  const hint = document.getElementById('recurrenceChildHint');
  if (!hint) return;
  const ids = getSelectedActivityChildIds();
  if (!ids.length) return;
  const names = ids.map(id => children.find(c => c.id === id)?.name).filter(Boolean);
  if (names.length) {
    hint.textContent = `Gäller: ${names.join(', ')}`;
    hint.classList.remove('hidden');
  } else {
    hint.classList.add('hidden');
  }
}

function closeRecurrenceModal() {
  resetRecurrenceModalTexts(); // always reset texts + handlers, even when closing after delete flow
  document.getElementById('recurrenceModal').classList.add('hidden');
}

function showWeekdayPicker() {
  const picker = document.getElementById('weekdayPicker');
  _recurrenceSelectedDays = [];
  picker.innerHTML = [1,2,3,4,5,6,0].map(d =>
    `<button type="button" onclick="toggleRecurrenceDay(${d},this)" class="px-3 py-2 rounded-xl border-2 border-lavender text-sm font-semibold transition-colors hover:border-gold text-navy">${DAYS_SHORT[d]}</button>`
  ).join('');
  document.getElementById('weekdayPickerSection').classList.remove('hidden');
}

function toggleRecurrenceDay(d, btn) {
  const idx = _recurrenceSelectedDays.indexOf(d);
  if (idx === -1) { _recurrenceSelectedDays.push(d); btn.classList.add('bg-navy','text-white','border-navy'); }
  else { _recurrenceSelectedDays.splice(idx,1); btn.classList.remove('bg-navy','text-white','border-navy'); }
}

async function confirmRecurrence(choice) {
  document.getElementById('recurrenceError').classList.add('hidden');
  updateRecurrenceChildHint(); // capture latest checkbox state before processing
  let targetChildIds = getSelectedActivityChildIds();
  if (targetChildIds.length === 0) {
    // Fallback for single-child families where the picker is hidden and no checkboxes exist.
    // _pendingTargetChildIds is set to [currentChildId] in submitAddActivity() before this runs.
    targetChildIds = (_pendingTargetChildIds || []).filter(Boolean);
  }
  // Last-resort fallback: if targetChildIds is still empty but family has exactly one child,
  // use that child directly — mirrors submitOnceTaskDirect logic.
  if (targetChildIds.length === 0 && (children || []).length === 1) {
    targetChildIds = [children[0].id];
  }
  if (targetChildIds.length === 0) {
    document.getElementById('recurrenceError').textContent = 'Välj minst ett barn';
    document.getElementById('recurrenceError').classList.remove('hidden');
    return;
  }
  if (choice === 'once') {
    // Add to current day only (once-task — no weekly_schedule_item)
    document.getElementById('recurrenceOnceBtn').disabled = true;
    let successCount = 0;
    for (const childId of targetChildIds) {
      const ok = await addOnceTaskToDay(currentDay, childId);
      if (ok) successCount++;
    }
    if (successCount > 0) {
      closeRecurrenceModal();
      showToast(`Aktiviteten har lagts till`);
      await loadDashboardCards();
    } else {
      document.getElementById('recurrenceError').textContent = 'Kunde inte lägga till aktiviteten. Försök igen.';
      document.getElementById('recurrenceError').classList.remove('hidden');
      document.getElementById('recurrenceOnceBtn').disabled = false;
    }
  } else if (choice === 'weekly') {
    if (_recurrenceSelectedDays.length === 0) {
      document.getElementById('recurrenceError').textContent = 'Välj minst en dag';
      document.getElementById('recurrenceError').classList.remove('hidden');
      return;
    }
    // Add to all selected days for all selected children
    let successCount = 0;
    for (const childId of targetChildIds) {
      for (const day of _recurrenceSelectedDays) {
        const ok = await addActivityToDay(day, childId);
        if (ok) successCount++;
      }
    }
    if (successCount > 0) {
      closeRecurrenceModal();
      showToast(`Aktiviteten har lagts till i ${successCount} dag(ar)`);
      await loadDashboardCards();
    } else {
      document.getElementById('recurrenceError').textContent = 'Kunde inte lägga till aktiviteten. Försök igen.';
      document.getElementById('recurrenceError').classList.remove('hidden');
    }
  }
}

async function addOnceTaskToDay(dayOfWeek, childId) {
  const targetChildId = childId || currentChildId;
  const tpl = allTemplates.find(t => t.id === _pendingTemplateId);
  if (!tpl) return false;
  const dateStr = formatLocalDateStr(getDateForDayOfWeek(dayOfWeek));
  if (!dateStr) return false;
  const res = await window.apiFetch(`/api/children/${targetChildId}/schedules/once-tasks`, {
    method: 'POST',
    body: JSON.stringify({
      name: tpl.name,
      icon: tpl.icon || '📌',
      section: _pendingSection || 'dag',
      date: dateStr,
      start_time: _pendingStartTime || null,
      end_time: _pendingEndTime || null,
      star_value: tpl.star_value || 1,
    }),
  });
  if (!res.ok) {
    try { const err = await res.json(); console.warn('[DASHBOARD] addOnceTaskToDay failed:', err); } catch (_) {}
  }
  return res.ok;
}

async function addActivityToDay(dayOfWeek, childId) {
  const targetChildId = childId || currentChildId;
  // Ensure schedule exists for this day
  let schedId = (dayOfWeek === currentDay && targetChildId === currentChildId) ? currentScheduleId : null;
  if (!schedId) {
    const res = await window.apiFetch(`/api/children/${targetChildId}/schedules`, {method:'POST', body:JSON.stringify({day_of_week:dayOfWeek})});
    const data = await res.json();
    if (res.ok) schedId = data.id;
    else if (res.status===409 && data.id) schedId = data.id;
    else return false;
    if (dayOfWeek === currentDay && targetChildId === currentChildId) currentScheduleId = schedId;
  }
  // Strip null time values — backend expects undefined (missing), not null
  const itemBody = { activity_template_id: _pendingTemplateId, section: _pendingSection };
  if (_pendingStartTime) itemBody.start_time = _pendingStartTime;
  if (_pendingEndTime) itemBody.end_time = _pendingEndTime;
  const res = await window.apiFetch(`/api/schedules/${schedId}/items`, {method:'POST', body:JSON.stringify(itemBody)});
  if (!res.ok) {
    try { const err = await res.json(); console.warn('[DASHBOARD] addActivityToDay failed:', err); } catch (_) {}
  }
  return res.ok;
}

// ── Create Activity Modal ─────────────────────────────────
const EMOJI_QUICK_PICKS = ['🪥','🧹','📚','🎨','🏃','🍎','👕','🎵','✏️','🧩','🚿','🛏️','🎒','🚶','🍽️','💤'];

function openCreateActivityModal(prefill) {
  document.getElementById('newActName').value = prefill || '';
  document.getElementById('newActEmojiInput').value = '';
  document.getElementById('newActEmojiPreview').textContent = '📌';
  document.getElementById('newActStarValue').value = '1';
  document.getElementById('createActivityError').classList.add('hidden');
  // Reset star buttons
  document.querySelectorAll('.star-val-btn').forEach(b => {
    const active = b.dataset.val === '1';
    b.classList.toggle('bg-gold', active); b.classList.toggle('text-white', active); b.classList.toggle('border-gold', active);
  });
  // Fill emoji grid
  document.getElementById('newActEmojiGrid').innerHTML = EMOJI_QUICK_PICKS.map(e =>
    `<button type="button" onclick="document.getElementById('newActEmojiInput').value='${e}';previewNewActEmoji()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sky transition-colors text-lg">${e}</button>`
  ).join('');
  // Snapshot once-flow context so submitCreateActivity() knows which child/date/times to use
  if (_onceMode) {
    _onceCreateContext = {
      date: document.getElementById('addActivityOnceDate').value,
      childIds: [...document.querySelectorAll('#addActivityOnceChildList .once-child-check:checked')].map(el => el.value),
      startTime: document.getElementById('addStartTime').value || null,
      endTime: document.getElementById('addEndTime').value || null,
      section: addSectionOverride || 'dag',
    };
    _pendingTargetChildIds = _onceCreateContext.childIds;
  } else {
    _pendingTargetChildIds = [currentChildId];
  }
  renderActivityChildPick('createActivityChildrenWrap');
  document.getElementById('createActivityModal').classList.remove('hidden');
  setTimeout(()=>document.getElementById('newActName').focus(),100);
}

function closeCreateActivityModal() {
  document.getElementById('createActivityModal').classList.add('hidden');
}

function previewNewActEmoji() {
  const val = document.getElementById('newActEmojiInput').value.trim();
  document.getElementById('newActEmojiPreview').textContent = val || '📌';
}

function pickStarVal(v) {
  document.getElementById('newActStarValue').value = v;
  document.querySelectorAll('.star-val-btn').forEach(b => {
    const active = b.dataset.val === String(v);
    b.classList.toggle('bg-gold', active); b.classList.toggle('text-white', active); b.classList.toggle('border-gold', active);
  });
}

function resolveActivityTargetChildIds() {
  // Only trust the snapshot if it has actual selections — an empty array means
  // the user skipped step 1, so defer to the child checkboxes in the create-modal.
  if (_onceCreateContext?.childIds?.length) return _onceCreateContext.childIds;
  // Fallback: read checked .child-pick-checkbox checkboxes in the create-modal.
  const fromModal = Array.from(document.querySelectorAll('.child-pick-checkbox:checked')).map(el => el.value);
  if (fromModal.length) return fromModal;
  if (_pendingTargetChildIds?.length) return _pendingTargetChildIds;
  if (currentChildId) return [currentChildId];
  if (children?.length) return [children[0].id];
  return [];
}

// Submit a once-task directly (used by submitCreateActivity when _onceCreateContext exists)
async function submitOnceTaskDirect(tplId, tpl) {
  const ctx = _onceCreateContext;
  let childIds = resolveActivityTargetChildIds();
  // Fallback for single-child families where the child picker is hidden (static label, no checkboxes).
  if (childIds.length === 0 && (children || []).length === 1) {
    childIds = [children[0].id];
  }
  if (!childIds.length) {
    document.getElementById('createActivityError').textContent = 'Välj minst ett barn';
    document.getElementById('createActivityError').classList.remove('hidden');
    return;
  }
  const addBtn = document.getElementById('addActivityBtn');
  addBtn.disabled = true; addBtn.textContent = 'Skapar…';
  try {
    const primaryChildId = childIds[0];
    const res = await window.apiFetch(`/api/children/${primaryChildId}/schedules/once-tasks`, {
      method: 'POST',
      body: JSON.stringify({
        name: tpl?.name || '',
        icon: tpl?.icon || '📌',
        section: ctx.section || 'dag',
        date: ctx.date,
        start_time: ctx.startTime || null,
        end_time: ctx.endTime || null,
        star_value: tpl?.star_value || 1,
        child_ids: childIds,
      })
    });
    if (res.ok) {
      const d = new Date(ctx.date + 'T12:00:00');
      const dateFmt = d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
      closeCreateActivityModal();
      closeAddModal();
      showToast(`${tpl?.icon || ''} "${tpl?.name || 'Aktiviteten'}" tillagd för ${dateFmt}!`);
      await loadDashboardCards();
    } else {
      const err = await res.json();
      document.getElementById('createActivityError').textContent = err.error || 'Fel uppstod';
      document.getElementById('createActivityError').classList.remove('hidden');
    }
  } finally {
    addBtn.disabled = false; addBtn.textContent = 'Lägg till';
  }
}

async function submitCreateActivity() {
  const name = document.getElementById('newActName').value.trim();
  if (!name) { document.getElementById('createActivityError').textContent='Namn krävs'; document.getElementById('createActivityError').classList.remove('hidden'); return; }
  const icon = document.getElementById('newActEmojiInput').value.trim() || '📌';
  const starValue = parseInt(document.getElementById('newActStarValue').value) || 1;
  const body = { name, icon, star_value: starValue };
  try {
    const res = await window.apiFetch('/api/activities', {method:'POST', body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) {
      if (_onceCreateContext) {
        // Once-mode: create template + submit once-task directly (no recurrence modal)
        const tpl = { name, icon, star_value: starValue };
        await submitOnceTaskDirect(data.id, tpl);
      } else {
        // Normal mode: close modals, load templates, open recurrence modal
        closeCreateActivityModal();
        closeAddModal();
        await loadTemplates();
        _pendingTemplateId = data.id;
        _pendingTemplateName = name;
        _pendingSection = addSectionOverride;
        _pendingTargetChildIds = [currentChildId];
        openRecurrenceModal();
      }
    } else {
      document.getElementById('createActivityError').textContent = data.error || 'Kunde inte skapa aktiviteten';
      document.getElementById('createActivityError').classList.remove('hidden');
    }
  } catch (e) {
    document.getElementById('createActivityError').textContent = 'Nätverksfel. Försök igen.';
    document.getElementById('createActivityError').classList.remove('hidden');
  }
}

// ── Edit/remove item ──────────────────────────────────────
function openEditItem(itemId) {
  const item=scheduleItems.find(i=>i.id==itemId); if(!item)return;
  document.getElementById('editItemId').value=itemId;
  document.getElementById('editStartTime').value=item.start_time?item.start_time.substring(0,5):'';
  document.getElementById('editEndTime').value=item.end_time?item.end_time.substring(0,5):'';
  setEditSection(item.section||'dag');
  document.getElementById('editItemModal').classList.remove('hidden');
}
function closeEditItemModal(){document.getElementById('editItemModal').classList.add('hidden');}
function setEditSection(sec){
  editSectionVal=sec; document.getElementById('editSection').value=sec;
  document.querySelectorAll('.edit-sec-btn').forEach(btn=>{const s=btn.dataset.sec===sec;btn.classList.toggle('bg-navy',s);btn.classList.toggle('text-white',s);btn.classList.toggle('border-navy',s);});
}
async function submitEditItem(){
  const itemId=document.getElementById('editItemId').value;
  const res=await window.apiFetch(`/api/schedules/${currentScheduleId}/items/${itemId}`,{method:'PUT',body:JSON.stringify({start_time:document.getElementById('editStartTime').value||null,end_time:document.getElementById('editEndTime').value||null,section:editSectionVal})});
  if(res.ok){closeEditItemModal();showToast('Sparad');await loadScheduleForDay();}
  else{const d=await res.json();showToast(d.error||'Fel uppstod',true);}
}
function removeItem(itemId){
  // Use == (not ===) — itemId is a string from onclick, scheduleItems[].id is a number from API
  const item = scheduleItems.find(i=>i.id==itemId);
  // Once-task: show simple direct-confirm modal, call DELETE /api/daily-log-items/:id
  if (item?.is_once_task) {
    openConfirmModal(`Ta bort engångsaktiviteten "${item.activity_name}"?`, async () => {
      const res = await window.apiFetch(`/api/daily-log-items/${itemId}`, { method: 'DELETE' });
      if (res.ok) { showToast('Engångsaktiviteten borttagen'); await loadScheduleForDay(); }
      else { const d = await res.json(); showToast(d.error || 'Fel uppstod', true); }
    });
    return;
  }
  // Repurpose the recurrence modal to offer "bara denna dag" vs "alla kommande"
  _pendingDeleteItemId = itemId;
  const modal = document.getElementById('recurrenceModal');
  const titleEl = modal.querySelector('h3');
  const iconEl = modal.querySelector('.text-3xl');
  if (titleEl) titleEl.textContent = 'Ta bort aktivitet';
  if (iconEl) iconEl.textContent = '🗑️';
  document.getElementById('recurrenceActivityName').textContent = item ? `"${item.activity_name || 'aktiviteten'}"` : '';
  document.getElementById('recurrenceOnceLbl').textContent = '📌 Bara denna dag';
  document.getElementById('recurrenceOnceDesc').textContent = 'Aktiviteten försvinner bara från dagens schema';
  document.getElementById('recurrenceWeeklyLbl').textContent = `🗑️ Alla kommande ${DAYS[currentDay]}ar`;
  document.getElementById('recurrenceWeeklyDesc').textContent = 'Tar bort aktiviteten från schemat permanent';
  document.getElementById('weekdayPickerSection').classList.add('hidden');
  document.getElementById('recurrenceError').classList.add('hidden');
  // Override button handlers for delete mode
  bindRecurrenceDeleteHandlers(itemId);
  modal.classList.remove('hidden');
}

async function deleteOnce(itemId) {
  const onceBtn = document.getElementById('recurrenceOnceBtn');
  const weeklyBtn = document.getElementById('recurrenceWeeklyBtn');
  if (onceBtn) onceBtn.disabled = true;
  if (weeklyBtn) weeklyBtn.disabled = true;
  const dateStr = getCurrentDateStr();
  try {
    const res = await window.apiFetch(
      `/api/schedules/${currentScheduleId}/items/${itemId}/exclude-date`,
      { method: 'POST', body: JSON.stringify({ date: dateStr }) }
    );
    if (res.ok) {
      document.getElementById('recurrenceModal').classList.add('hidden');
      resetRecurrenceModalTexts();
      showToast('Aktiviteten borttagen för idag');
      await loadScheduleForDay();
    } else {
      const d = await res.json();
      showToast(d.error || 'Fel uppstod', true);
      bindRecurrenceDeleteHandlers(itemId);
    }
  } catch (_) {
    showToast('Nätverksfel. Försök igen.', true);
    bindRecurrenceDeleteHandlers(itemId);
  }
}

async function deleteAll(itemId) {
  const onceBtn = document.getElementById('recurrenceOnceBtn');
  const weeklyBtn = document.getElementById('recurrenceWeeklyBtn');
  if (onceBtn) onceBtn.disabled = true;
  if (weeklyBtn) weeklyBtn.disabled = true;
  try {
    const res = await window.apiFetch(
      `/api/schedules/${currentScheduleId}/items/${itemId}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      document.getElementById('recurrenceModal').classList.add('hidden');
      resetRecurrenceModalTexts();
      showToast('Aktiviteten har tagits bort');
      await loadScheduleForDay();
    } else {
      const d = await res.json();
      showToast(d.error || 'Fel uppstod', true);
      bindRecurrenceDeleteHandlers(itemId);
    }
  } catch (_) {
    showToast('Nätverksfel. Försök igen.', true);
    bindRecurrenceDeleteHandlers(itemId);
  }
}

// Reset recurrence modal back to its default add-activity texts
function resetRecurrenceModalTexts() {
  const modal = document.getElementById('recurrenceModal');
  const titleEl = modal.querySelector('h3');
  const iconEl = modal.querySelector('.text-3xl');
  if (titleEl) titleEl.textContent = 'En gång eller flera gånger?';
  if (iconEl) iconEl.textContent = '🗓️';
  document.getElementById('recurrenceOnceLbl').textContent = '📌 Bara idag';
  document.getElementById('recurrenceOnceDesc').textContent = 'Läggs till för dagens schema';
  document.getElementById('recurrenceWeeklyLbl').textContent = '🔁 Flera gånger';
  document.getElementById('recurrenceWeeklyDesc').textContent = 'Välj vilka veckodagar';
  // Restore original onclick handlers
  bindRecurrenceAddHandlers();
}

// ── Delete schedule ───────────────────────────────────────
function confirmDeleteSchedule(){
  openConfirmModal(`Ta bort hela schemat för ${DAYS[currentDay]}?`,async()=>{
    const res=await window.apiFetch(`/api/children/${currentChildId}/schedules/${currentScheduleId}`,{method:'DELETE'});
    if(res.ok){showToast('Schemat har tagits bort');currentScheduleId=null;scheduleItems=[];renderEmptyDay();}
    else{const d=await res.json();showToast(d.error||'Fel uppstod',true);}
  });
}

// ── Copy day/child ────────────────────────────────────────
function openCopyDayModal(){
  if(!currentScheduleId){showToast('Inget schema att kopiera',true);return;}
  copyDaySelections=[];
  document.getElementById('copyFromLabel').innerHTML=`Kopiera schemat från <strong>${DAYS[currentDay]}</strong> till:`;
  document.getElementById('copyDayPicker').innerHTML=[1,2,3,4,5,6,0].filter(d=>d!==currentDay).map(d=>`<button type="button" onclick="toggleCopyDay(${d},this)" class="px-4 py-3 rounded-xl border-2 border-lavender text-sm font-semibold transition-colors hover:border-navy text-navy" data-day="${d}">${DAYS[d]}</button>`).join('');
  document.getElementById('copyDayModal').classList.remove('hidden');
}
function toggleCopyDay(d,btn){const idx=copyDaySelections.indexOf(d);if(idx===-1){copyDaySelections.push(d);btn.classList.add('bg-navy','text-white','border-navy');}else{copyDaySelections.splice(idx,1);btn.classList.remove('bg-navy','text-white','border-navy');}}
function closeCopyDayModal(){document.getElementById('copyDayModal').classList.add('hidden');}
async function submitCopyDay(){
  if(!copyDaySelections.length){showToast('Välj minst en dag',true);return;}
  const res=await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-day`,{method:'POST',body:JSON.stringify({from_day:currentDay,to_days:copyDaySelections})});
  const data=await res.json();
  if(res.ok){closeCopyDayModal();showToast(`Schema kopierat till ${data.copied_to_days.length} dag(ar)`);}
  else showToast(data.error||'Fel uppstod',true);
}
function openCopyChildModal(){
  if(!currentChildId)return;
  copyTargetChildId=null;
  const others=children.filter(c=>c.id!==currentChildId);
  if(!others.length){showToast('Inga andra barn',true);return;}
  document.getElementById('copyChildPicker').innerHTML=others.map(c=>`<button type="button" onclick="selectCopyChild('${c.id}',this)" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-lavender hover:border-gold transition-colors text-left" data-cid="${c.id}"><span class="text-2xl">${c.emoji||'👤'}</span><span class="font-semibold text-navy">${escHtml(c.name)}</span></button>`).join('');
  document.getElementById('copyChildModal').classList.remove('hidden');
}
function selectCopyChild(id,btn){copyTargetChildId=id;document.querySelectorAll('#copyChildPicker button').forEach(b=>{b.classList.toggle('border-gold',b.dataset.cid===id);b.classList.toggle('bg-sky',b.dataset.cid===id);});}
function closeCopyChildModal(){document.getElementById('copyChildModal').classList.add('hidden');}
async function submitCopyChild(){
  if(!copyTargetChildId){showToast('Välj ett barn',true);return;}
  const res=await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-to-child`,{method:'POST',body:JSON.stringify({target_child_id:copyTargetChildId})});
  const data=await res.json();
  if(res.ok){closeCopyChildModal();showToast('Veckoschemat har kopierats');}
  else showToast(data.error||'Fel uppstod',true);
}

// ── Confirm modal ─────────────────────────────────────────
function openConfirmModal(msg, cb) {
  document.getElementById('confirmMsg').textContent = msg;
  const okBtn = document.getElementById('confirmOkBtn');
  okBtn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    okBtn.disabled = true;
    try {
      await cb();
      closeConfirmModal();
    } catch (_) {
      showToast('Nätverksfel. Försök igen.', true);
    } finally {
      okBtn.disabled = false;
    }
  };
  document.getElementById('confirmModal').classList.remove('hidden');
}
function closeConfirmModal(){document.getElementById('confirmModal').classList.add('hidden');}

// ── Touch DnD Bridge (converts touch to HTML5 drag events) ─
function initTouchDndBridge() {
  let touchEl=null, ghost=null, longPressTimer=null, startX=0, startY=0;
  document.addEventListener('touchstart', e => {
    const d=e.target.closest('[draggable="true"]'); if(!d)return;
    startX=e.touches[0].clientX; startY=e.touches[0].clientY;
    longPressTimer=setTimeout(()=>{
      touchEl=d;
      ghost=document.createElement('div');
      ghost.className='dnd-ghost'+(d.classList.contains('activity-item')?' copy-ghost':d.classList.contains('day-tab')?' day-ghost':'');
      const icon=d.querySelector('.text-xl,.text-base,.text-2xl,.text-lg');
      const label=d.querySelector('.font-semibold,.font-bold');
      ghost.innerHTML=`${icon?icon.textContent.trim():''} ${label?escHtml(label.textContent.trim().substring(0,25)):''}`;
      document.body.appendChild(ghost);
      const t=e.touches[0]; ghost.style.left=(t.clientX-60)+'px'; ghost.style.top=(t.clientY-30)+'px';
      d.classList.add('dragging');
      try{d.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true}));}catch(x){}
    },380);
  },{passive:true});
  document.addEventListener('touchmove', e=>{
    if(longPressTimer&&!touchEl){const dx=Math.abs(e.touches[0].clientX-startX),dy=Math.abs(e.touches[0].clientY-startY);if(dx>8||dy>8){clearTimeout(longPressTimer);longPressTimer=null;}}
    if(!touchEl||!ghost)return;
    const t=e.touches[0]; ghost.style.left=(t.clientX-60)+'px'; ghost.style.top=(t.clientY-30)+'px';
    ghost.style.display='none';
    const el=document.elementFromPoint(t.clientX,t.clientY);
    ghost.style.display='';
    if(el)try{el.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true}));}catch(x){}
  },{passive:true});
  document.addEventListener('touchend', e=>{
    clearTimeout(longPressTimer); longPressTimer=null;
    if(!touchEl||!ghost){touchEl=null;return;}
    const t=e.changedTouches[0];
    ghost.style.display='none';
    const el=document.elementFromPoint(t.clientX,t.clientY);
    ghost.remove(); ghost=null;
    if(el)try{el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true}));}catch(x){}
    try{touchEl.dispatchEvent(new DragEvent('dragend',{bubbles:true}));}catch(x){}
    touchEl.classList.remove('dragging'); touchEl=null;
  },{passive:true});
}

// ── Share schedule ────────────────────────────────────────
async function shareChildSchedule(childId) {
  if (!window.Platform || !window.Platform.share) {
    showToast('Dela ej tillgänglig på denna enhet', true);
    return;
  }
  // Find today's activities for this child from the rendered HTML state
  // Build text from childrenData (already loaded on the page)
  const child = (window.childrenData || []).find(c => c.id === childId);
  if (!child) {
    showToast('Kunde inte hitta barnet', true);
    return;
  }
  const childName = child.name || 'Barnet';
  const items = child.today_items || [];

  // Format: "Alexs schema idag: 07:00 Frukost ✅, 08:00 Skola, ..."
  const completed = items.filter(i => i.completed).map(i => {
    const time = i.start_time ? `${i.start_time} ${i.name}` : i.name;
    return `${time} ✅`;
  });
  const pending = items.filter(i => !i.completed).map(i => {
    const time = i.start_time ? `${i.start_time} ${i.name}` : i.name;
    return time;
  });

  let text = `${childName}s schema idag:`;
  if (completed.length) text += ` ${completed.join(', ')}`;
  if (pending.length) {
    if (completed.length) text += '. ';
    text += pending.join(', ');
  }
  text += '\n(Min Stjärndag)';

  try {
    const result = await window.Platform.share({ title: `${childName}s schema – Min Stjärndag`, text });
    if (!result) showToast('Delat!', false);
  } catch (err) {
    if (err.message === 'Share not supported') {
      showToast('Dela-funktion saknas på denna enhet', true);
    } else if (err.name !== 'AbortError') {
      showToast('Kunde inte dela: ' + err.message, true);
    }
  }
}

// ── Modal backdrop close ──────────────────────────────────
{
  const el=document.getElementById('addActivityModal');
  if(el)el.addEventListener('click',e=>{if(e.target===e.currentTarget)closeAddModal();});
}
['editItemModal','copyDayModal','copyChildModal','confirmModal','dayDndModal','specialDayModal'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('click',e=>{if(e.target===e.currentTarget)el.classList.add('hidden');});
});
