/**
 * Dashboard main UI logic — schedule picker, child view management, activity modals, drag-and-drop, real-time updates.
 * Does not own: authentication (auth.js), API routing, database.
 */

// ── Delegated delete handler (Sortable.js forceFallback blocks inline onclick on mobile) ──
function _handleRemoveBtn(btn) {
  const itemId = btn.dataset.id || btn.closest('[data-id]')?.dataset.id;
  if (itemId && typeof removeItem === 'function') removeItem(itemId);
}
document.addEventListener('click', e => {
  const btn = e.target.closest('.action-btn-remove');
  if (!btn) return;
  e.stopPropagation();
  _handleRemoveBtn(btn);
});
// touchstart — iOS/Sortable preventOnFilter can swallow click on once-task rows
document.addEventListener('touchstart', e => {
  const btn = e.target.closest('.action-btn-remove');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  _handleRemoveBtn(btn);
}, { passive: false });

// ── Constants ────────────────────────────────────────────
const {
  DAYS,
  DAYS_SHORT,
  SECTIONS,
  fmtTime,
  sectionTimeLabel,
  getDayDateLabel,
  buildSectionCardsHtml,
} = window.ScheduleCore;

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
  if (window.AppleSignInDiagnostics && AppleSignInDiagnostics.logPost) {
    AppleSignInDiagnostics.logPost('step_8_dashboard_loaded', {
      path: window.location.pathname,
      userId: user.id,
    });
    AppleSignInDiagnostics.endPostLoginTrace();
  }
  document.getElementById('logoutBtn')?.addEventListener('click', () => window.logout());

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
  }

  // Always re-render dashboard layout on classic↔magic toggle (ParentMagicShell only
  // refreshes shell chrome — without this, magic view hides legacy cards but never
  // mounts DashboardHomeHub until a full navigation e.g. tapping Hem).
  if (window.AppViewMode) {
    AppViewMode.onChange(function () {
      if (AppViewMode.isClassic()) {
        document.body.classList.remove('parent-magic-dashboard');
        var hubMount = document.getElementById('parentHomeHubMount');
        if (hubMount) {
          hubMount.classList.add('hidden');
          hubMount.innerHTML = '';
        }
        if (typeof renderDashboardCards === 'function') renderDashboardCards();
      } else if (window.DashboardHomeHub) {
        DashboardHomeHub.render(dashboardStats);
      }
    });
  }

  await Promise.all([loadChildren(), loadTemplates(), loadDashboardCards(), loadStarHistory()]);
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

window.bootDashboardMagicPage = async function bootDashboardMagicPage() {
  if (typeof loadDashboardCards !== 'function') return;

  currentChildId = null;
  currentScheduleId = null;
  const list = document.getElementById('childrenListView');
  const editor = document.getElementById('scheduleEditorView');
  if (list) list.classList.remove('hidden');
  if (editor) editor.classList.add('hidden');
  document.getElementById('backToChildrenBtn')?.classList.add('hidden');
  document.getElementById('daySelectorWrap')?.classList.add('hidden');
  document.getElementById('viewModeBar')?.classList.add('hidden');
  document.getElementById('calNavBar')?.classList.add('hidden');
  document.getElementById('sbsChildSelector')?.classList.add('hidden');

  await Promise.all([
    typeof loadChildren === 'function' ? loadChildren() : Promise.resolve(),
    typeof loadTemplates === 'function' ? loadTemplates() : Promise.resolve(),
    loadDashboardCards(),
    typeof loadStarHistory === 'function' ? loadStarHistory() : Promise.resolve(),
  ]);

  if (typeof showMedforalderCtaIfEligible === 'function') showMedforalderCtaIfEligible();
  if (typeof initDelaAppenCta === 'function') initDelaAppenCta();
  if (window.ActivationProgramBanner) ActivationProgramBanner.init();
  if (window.DashboardChildHandoff) DashboardChildHandoff.init();
  if (window.DashboardDailySummary && dashboardStats) {
    DashboardDailySummary.update(dashboardStats);
  }

  if (window.DashboardHomeHub && window.AppViewMode && AppViewMode.isMagic()) {
    DashboardHomeHub.render(dashboardStats);
  }
  if (typeof renderDashboardCards === 'function') renderDashboardCards();
};

if (window.ParentMagicPageBoot) {
  ParentMagicPageBoot.register('dashboard', window.bootDashboardMagicPage);
}

window.addEventListener('stjarndag-magic-navigated', function (e) {
  if (!e.detail || e.detail.pageId !== 'dashboard') return;
  if (typeof window.bootDashboardMagicPage === 'function') {
    window.bootDashboardMagicPage();
  }
});

// ── Helpers ──────────────────────────────────────────────
// showToast is now in /js/toast.js
// escHtml shim — delegates to escapeHtml() from /js/dom-utils.js
function escHtml(s) { return escapeHtml(s); }
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

async function loadDashboardCards() {
  try {
    const res = await window.apiFetch('/api/family/dashboard-stats');
    if (!res.ok) {
      console.error('[DASHBOARD] dashboard-stats response:', res.status);
      return;
    }
    dashboardStats = await res.json();
    renderDashboardCards();
    if (window.HomeBumpTime && typeof HomeBumpTime.render === 'function') {
      HomeBumpTime.render(dashboardStats);
    }
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

// ── Dashboard CTAs (medförälder + dela appen) ───────────────
// Extracted to /js/dashboard-cta.js (Fas 8 F2b).
// Exposes window.showMedforalderCtaIfEligible / initDelaAppenCta (called below) +
// sd* onclick handlers (openMedforalderCtaInvite, dismiss*, submit*, openDelaAppenShare).

// Payment UI removed for App Store review — no subscription references in client.
function dismissPaymentPrompt() {}
function goToUpgrade() { window.location.href = '/dashboard'; }

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
  let childList = ch.length > 0 ? ch : children.map(c => ({
    id: c.id, name: c.name, emoji: c.emoji,
    today_total: 0, today_completed: 0, today_pct: null,
    today_log_id: null, today_is_paused: false,
    star_balance: 0, stars_today: 0, today_items: [], nearest_reward: null, history: [],
  }));

  function childAttentionScore(c) {
    const pending = (c.pending_redemptions || 0) + (c.pending_goal_changes || 0);
    if (pending > 0) return 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    const incomplete = (c.history || []).filter(function (d) {
      return d.date < todayStr && d.total > 0 && d.completed < d.total && !d.is_paused;
    }).length;
    if (incomplete > 0) return 1;
    if (c.today_is_paused) return 2;
    const total = c.today_total || 0;
    const done = c.today_completed || 0;
    if (total > 0 && done < total) return 3;
    if (total === 0) return 4;
    return 5;
  }

  childList = childList.slice().sort(function (a, b) {
    return childAttentionScore(a) - childAttentionScore(b);
  });

  const warningsOnly = window.HomeReadiness && HomeReadiness.warningsOnlyEnabled && HomeReadiness.warningsOnlyEnabled();
  if (warningsOnly) {
    childList = childList.filter(function (c) { return childAttentionScore(c) < 5; });
  }

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
          <a href="/schedule?child=${c.id}" onclick="event.stopPropagation()" class="text-xs text-gold hover:text-amber-600 font-semibold transition-colors">✨ Skapa aktivitet i schema →</a>
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
      const dayClass = day.isFuture ? 'mini-week-day' : 'mini-week-day mini-week-day--clickable';
      const dayClick = day.isFuture ? '' : ` onclick="event.stopPropagation(); window.location.href='/daily-log?childId=${c.id}&date=${day.dateStr}'" title="Fyll i ${day.label}"`;
      return `<div class="${dayClass}"${dayClick}>
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
              <h4 class="font-heading font-bold text-navy text-base leading-tight truncate">
                <a href="/family/child/${c.id}" class="hover:text-gold no-underline text-navy" onclick="event.stopPropagation()">🌟 ${escHtml(name)}</a>
              </h4>
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
            <div class="flex items-center justify-between mb-2">
              <div class="text-[10px] font-bold text-text-soft uppercase tracking-wide">📊 Senaste 7 dagarna</div>
              <a href="/daily-log?childId=${c.id}" class="text-[10px] font-semibold text-gold hover:text-amber-600 transition-colors" onclick="event.stopPropagation()">Fyll i i efterhand →</a>
            </div>
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
              <a href="/schedule?child=${c.id}" onclick="event.stopPropagation()" class="text-xs text-purple-600 hover:text-purple-800 font-semibold transition-colors">
                ✨ Skapa i schema →
              </a>
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


// ── Card actions + quick header buttons ───────────────────
// Extracted to /js/dashboard-card-actions.js (Fas 8 F2i).
// Exposes window.toggleInlineRedemption, togglePauseDay, openGiveStarsQuick,
// openLedigDagModal, dashToggleActivity + inline approve/deny handlers.

// ── Star history chart (weekly stars, 8 weeks) ────────────
// Extracted to /js/dashboard-star-history.js (Fas 8 F2c).
// Exposes window.loadStarHistory (called at init + after give-stars) + renderStarHistory.

// ── Give-stars + request panel ────────────────────────────
// Extracted to /js/dashboard-approvals.js (Fas 8 F2f).
// Exposes window.openGiveStarsModal, submitGiveStars, openRequestPanel,
// closeRequestPanel, approve/deny goal-change + redemption handlers.

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
// Extracted to /js/dashboard-special-days.js (Fas 8 F2).
// Exposes window.renderSpecialDaysCalendar (called from setViewMode) + sd* onclick handlers.

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

/** Refresh dashboard + schedule view after engångsaktivitet create/delete. */
async function refreshAfterOnceTaskChange() {
  await loadDashboardCards();
  if (currentChildId) await loadScheduleForDay();
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
  const sHtml = buildSectionCardsHtml(scheduleItems, renderItem);

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

// ── Drag & Drop ───────────────────────────────────────────
// Extracted to /js/dashboard-dnd.js (Fas 8 F2g).

// ── Activity modals ───────────────────────────────────────
// Extracted to /js/dashboard-activity-modal.js (Fas 8 F2e).

// ── Timeline + Side-by-Side views ─────────────────────────
// Extracted to /js/dashboard-views.js (Fas 8 F2d).
// Exposes window.renderTimeline, loadAllChildrenSchedules, renderSbsView + legacy sbs helpers.
// ── Copy/delete/confirm modals ────────────────────────────
// Extracted to /js/dashboard-copy-modals.js (Fas 8 F2h).
// Exposes window.confirmDeleteSchedule, openCopyDayModal, openCopyChildModal,
// openConfirmModal, closeConfirmModal + related handlers.

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
