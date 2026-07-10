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
const activities = [];
const childSchedules = {};
let currentChildId = null;
let currentDay = new Date().getDay();
let currentScheduleId = null;
let scheduleItems = [];
let sectionTimes = {};
const selectedTemplateId = null;
const addSectionOverride = 'dag';
const editSectionVal = 'dag';
const copyDaySelections = [];
const _pendingDeleteItemId = null;
const _pendingTargetChildIds = [];
const copyTargetChildId = null;
const allExpanded = true;
const _onceMode = false; // true when addActivityModal is opened for a one-time task
const _onceCreateContext = null; // snapshot of once-flow context when "Skapa ny" is opened from once mode

// DnD state
let dndType = null; // 'within-day' | 'activity-to-day' | 'day-tab' | 'timeline' | 'sbs'
let dndSrcDay = null;
let currentViewMode = 'normal';
const sbsChildId = null;
const sbsItems = [];
const sbsScheduleId = null;
const sbsAllData = {}; // { [childId]: { items: [], scheduleId: null } }
const allTemplates = [];

// ── Calendar navigation state ─────────────────────────────
let calView = 'week'; // 'day' | 'week' | 'month'
let weekOffset = 0;   // 0 = current week, -1 = last week, +1 = next week
let dayOffset = 0;    // offset in days from today (for day view)

if (window.ScheduleCalNav) {
  ScheduleCalNav.registerHost({
    formatMonthChildName(child) {
      return `${renderChildAvatar(child, 20)} ${escHtml(child.name)}`;
    },
  });
}

// ── Calendar helpers — /js/schedule-cal-nav.js (Fas 8 PR-S2) ─

// ── Init ─────────────────────────────────────────────────
function androidStabilityLog(step, detail) {
  if (!document.documentElement.classList.contains('is-native-android')) return;
  try {
    fetch('/api/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        channel: 'android_stability',
        step: step,
        detail: detail || null,
        ts: Date.now(),
        native: true,
        android: true,
      }),
      keepalive: true,
    }).catch(function () {});
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
  androidStabilityLog('dashboard_dom_ready');
  androidStabilityLog('dashboard_auth_start');
  const user = await window.authGuard();
  if (!user) {
    androidStabilityLog('dashboard_auth_missing');
    return;
  }
  androidStabilityLog('dashboard_auth_ok', { type: user.type });
  if (window.NativeDebug) {
    NativeDebug.log('dashboard_auth_ok', { userId: user.id, type: user.type });
  }
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

  if (window.ParentMagicShell && !document.documentElement.classList.contains('is-native-android')) {
    await ParentMagicShell.init('dashboard');
    androidStabilityLog('dashboard_shell_done', { magic: !!(window.AppViewMode && AppViewMode.isMagic()) });
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
        const hubMount = document.getElementById('parentHomeHubMount');
        if (hubMount) {
          hubMount.classList.add('hidden');
          hubMount.innerHTML = '';
        }
        if (window.DashboardHomeHub && typeof DashboardHomeHub.restoreMounts === 'function') {
          DashboardHomeHub.restoreMounts();
        }
        if (window.HomeReadiness && typeof HomeReadiness.reload === 'function') {
          HomeReadiness.reload();
        }
        if (typeof renderDashboardCards === 'function') renderDashboardCards();
      } else if (window.DashboardHomeHub) {
        DashboardHomeHub.render(dashboardStats);
        if (window.DashboardDailySummary && dashboardStats) {
          DashboardDailySummary.update(dashboardStats);
        }
      }
    });
  }

  await Promise.all([loadChildren(), loadTemplates(), loadDashboardCards(), loadStarHistory()]);
  androidStabilityLog('dashboard_data_loaded', { classic: !!(window.AppViewMode && AppViewMode.isClassic()) });
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
    if (window.DashboardDailySummary && dashboardStats) {
      DashboardDailySummary.update(dashboardStats);
    }
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

// ── Dashboard cards (tidsblock pills + child grid) — /js/dashboard-cards.js (Fas 8 D1) ──

// ── Children loader ──────────────────────────────────────
async function loadChildren() {
  try {
    const res = await window.apiFetch('/api/children');
    if (res.ok) { children = await res.json(); }
  } catch (e) {
    console.error('[DASHBOARD] loadChildren failed:', e);
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

// ── Touch DnD Bridge — /js/dnd-touch-bridge.js (Fas 8 PR-0) ─

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
