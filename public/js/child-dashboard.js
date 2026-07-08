// child-dashboard.js — Barnvy host (state, tabs, chrome, init)
// Split modules: activities (F3d), substeps (F3f), checkoff (F3e), load-day (F3g), offline/day-nav/timers/rewards/celebrations

const DAY_NAMES = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
const DAY_SHORT = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
// forDigGoalBadgeHtml — /js/child-dashboard-activities.js (Fas 8 F3d)


let currentDate = null;
let todayStr = null;
let me = null;
const itemRatings = {}; // itemId -> { child_score, child_comment, parent_score, parent_comment }
let weekOffset = 0; // 0 = current week, -1 = last week, +1 = next week
let allowChildReorder = false; // toggled by parent in child profile settings
let showNowNext = false; // parent opt-in — NU/NÄSTA/SEDAN badges + layout
let requireSequentialCompletion = false; // parent opt-in — one activity at a time
let viewType = 'now_next_later'; // 'day_sections' | 'now_next_later' (server may override for existing children)
let viewTypeLocalOverride = false; // true when child toggled view locally (prevents server value from overwriting)
let showMoodRating = true; // toggled by parent — shows mood slider after check-off
let moodInputMode = 'slider'; // cards | slider | off — parent setting
let transitionSupportEnabled = false; // Extra stöd feature gate
let transitionLeadMinutes = [5, 1]; // parent-configured lead times (minutes)
let dopaminAnimation = true; // toggled by parent — star burst on check-off
const minimalUiActive = false; // distraktionsfritt läge — hides print/dark/logout, replaces Skattkammaren text
let visualTimer = true; // toggled by parent — Time Timer in now-card
let activityTimersEnabled = false; // master — aktivitetstimer (timglas)
let hideClock = false; // toggled by parent — hides digital time labels on cards
let colorCoding = true; // toggled by parent — color-codes cards by activity type

// DAG_DEL_CONFIG, COLOR_RULES_CHILD, getChildColorClass — /js/child-dashboard-activities.js (Fas 8 F3d)

// ── Offline UI — /js/child-dashboard-offline.js (Fas 8 F3a) ──


// ── Sub-step state ─────────────────────────────────────────
let subStepCache = {};    // itemId -> array of { id, name, icon, sort_order, completed }
const subStepExpanded = {}; // itemId -> bool (expanded state)
// Track whether child has seen the substep intro tooltip (persisted in localStorage)
let _substepIntroSeen = localStorage.getItem('substepIntroSeen') === '1';

// ── Date helpers ───────────────────────────────────────

function getLocalDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('sv-SE');
}

function resolveChildScheduleDate(dateStr) {
  if (dateStr && dateStr !== 'null' && dateStr !== 'undefined') return dateStr;
  return todayStr || getLocalDate();
}

window.resolveChildScheduleDate = resolveChildScheduleDate;

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const day = d.getDate();
  const mon = MONTH_NAMES[d.getMonth()];
  return `${DAY_NAMES[dow]} ${day} ${mon}`;
}

function calcAge(birthday) {
  if (!birthday) return null;
  const bday = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - bday.getFullYear();
  const m = today.getMonth() - bday.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--;
  return age;
}

function getSectionLabel(section) {
  const labels = { morgon: '🟡 Morgon', dag: '🟠 Dag', kvall: '🔵 Kväll', natt: '🌑 Natt' };
  return labels[section] || section;
}

// Section accent colors for day_sections view
const SECTION_COLORS = {
  morgon: { bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.3)', dot: '#F5A623' },
  dag:    { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)',  dot: '#F97316' },
  kvall:  { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)',  dot: '#3B82F6' },
  natt:   { bg: 'rgba(30,41,59,0.08)',   border: 'rgba(30,41,59,0.2)',    dot: '#1E293B' },
};


// getCurrentTimeHHMM, getTimeMinutes, classifyActivities — /js/child-dashboard-activities.js (Fas 8 F3d)

// ── Day tabs ─

// ── Day tabs / week nav — /js/child-dashboard-day-nav.js (Fas 8 F3b) ──

// ── Tabs ───────────────────────────────────────────────

// Shared with child-dashboard-rewards.js (separate script tag — must be on window).
window.rewardsLoaded = false;
let childUiMagic = false;

function applyChildViewChrome() {
  if (window.ChildFirstStarMode && ChildFirstStarMode.isActive()) {
    const bottomNav = document.getElementById('childBottomNav');
    if (bottomNav) {
      bottomNav.style.setProperty('display', 'none', 'important');
      bottomNav.setAttribute('aria-hidden', 'true');
    }
    const legacyNav = document.getElementById('childLayerNav');
    if (legacyNav) {
      legacyNav.style.setProperty('display', 'none', 'important');
      legacyNav.setAttribute('aria-hidden', 'true');
    }
    return;
  }

  childUiMagic = !!(window.AppViewMode && AppViewMode.isMagic());

  if (window.ChildWorlds && ChildWorlds.V2_ENABLED) {
    const bottomNav = document.getElementById('childBottomNav');
    if (bottomNav) bottomNav.style.display = '';
    const legacyNav = document.getElementById('childLayerNav');
    if (legacyNav) {
      legacyNav.classList.add('hidden');
      legacyNav.setAttribute('aria-hidden', 'true');
    }
    if (window.ChildWorldsNav) ChildWorldsNav.renderBottomNav();
    return;
  }

  const bottomNav = document.getElementById('childBottomNav');
  if (bottomNav) bottomNav.style.display = childUiMagic ? '' : 'none';

  const legacyNav = document.getElementById('childLayerNav');
  if (legacyNav) {
    legacyNav.classList.toggle('hidden', childUiMagic);
    if (childUiMagic) legacyNav.setAttribute('aria-hidden', 'true');
    else legacyNav.removeAttribute('aria-hidden');
  }
}

window.applyChildViewChrome = applyChildViewChrome;

function applyChildViewMode() {
  applyChildViewChrome();

  if (window.ChildWorlds && ChildWorlds.V2_ENABLED) {
    document.body.classList.remove('child-home-active');
    showTab('schedule');
    return;
  }

  if (childUiMagic) {
    showTab('home');
    if (!window.rewardsLoaded) loadRewards();
  } else {
    document.body.classList.remove('child-home-active');
    showTab('schedule');
  }
}

function showTab(tab) {
  if (window.ChildFirstStarMode && ChildFirstStarMode.isActive() && tab !== 'schedule') {
    return;
  }
  if (window.LivingWorldTransition
      && typeof window.LivingWorldTransition.isActive === 'function'
      && window.LivingWorldTransition.isActive()) {
    return;
  }
  if (window.ChildGarden
      && typeof window.ChildGarden.isActive === 'function'
      && window.ChildGarden.isActive()) {
    return;
  }
  if (window.ChildWorlds && ChildWorlds.V2_ENABLED) {
    if (tab === 'home' || tab === 'more') tab = 'schedule';
  } else if (tab === 'home' && !childUiMagic) {
    tab = 'schedule';
  }
  const hv = document.getElementById('homeView');
  const sv = document.getElementById('scheduleView');
  const rv = document.getElementById('rewardsView');
  const cv = document.getElementById('collectionView');
  const fv = document.getElementById('familyView');
  const mv = document.getElementById('moreView');
  const weekNav = document.getElementById('weekNavDetails');
  const progress = document.getElementById('progressSection');

  const isHome = tab === 'home';
  const isToday = tab === 'schedule';
  const isUniverse = tab === 'rewards';
  const isCollection = tab === 'collection';
  const isFamily = tab === 'family';
  const isMore = tab === 'more';

  if (hv) hv.classList.toggle('hidden', !isHome);
  if (sv) sv.classList.toggle('hidden', !isToday);
  if (rv) rv.classList.toggle('hidden', !isUniverse);
  if (cv) cv.classList.toggle('hidden', !isCollection);
  if (fv) fv.classList.toggle('hidden', !isFamily);
  if (mv) mv.classList.toggle('hidden', !isMore);

  const showChildBottomNav = childUiMagic
    || (window.ChildWorlds && ChildWorlds.V2_ENABLED);
  document.body.classList.toggle('child-has-bottom-nav', showChildBottomNav);
  document.body.classList.toggle('child-home-active', childUiMagic && isHome);

  if (isToday) {
    const hideWeekNav = window.ChildFirstStarMode && ChildFirstStarMode.isActive();
    if (!hideWeekNav && weekNav) {
      weekNav.classList.remove('hidden');
      weekNav.classList.remove('ctf-hidden');
      weekNav.removeAttribute('aria-hidden');
    }
    if (!window.ChildTodayFocus) {
      if (progress) { progress.classList.remove('hidden'); progress.removeAttribute('aria-hidden'); }
    }
  } else {
    if (weekNav) { weekNav.classList.add('hidden'); weekNav.setAttribute('aria-hidden', 'true'); }
    if (progress) { progress.classList.add('hidden'); progress.setAttribute('aria-hidden', 'true'); }
  }

  if (isUniverse && window.ChildMorgonhus && !window.ChildMorgonhus.isActive()
      && (!window.ChildGarden || !window.ChildGarden.isActive())
      && (!window.ChildWorldHub || !window.ChildWorldHub.isActive())
      && (!window.LivingWorldTransition || !window.LivingWorldTransition.isActive())) {
    if (window.ChildWorlds && ChildWorlds.prepareTreasureEntry) {
      ChildWorlds.prepareTreasureEntry();
    }
    window.rewardsLoaded = false;
    if (typeof window.ChildMorgonhus.clearPreferSkatt === 'function') {
      window.ChildMorgonhus.clearPreferSkatt();
    }
    if (window.ChildTreasureView) {
      ChildTreasureView.refresh({ force: true });
    } else {
      const skipHub = !!(window.ChildWorlds && ChildWorlds.shouldSkipHubForRewards
        && ChildWorlds.shouldSkipHubForRewards());
      loadRewards({ force: true, skipHub: skipHub });
    }
  } else if ((isHome || isUniverse) && !window.rewardsLoaded) {
    if (window.ChildTreasureView && isUniverse) {
      ChildTreasureView.refresh();
    } else {
      const skipHub = !!(window.ChildWorlds && ChildWorlds.shouldSkipHubForRewards
        && ChildWorlds.shouldSkipHubForRewards());
      loadRewards({ skipHub: skipHub });
    }
  }
  if (isCollection && window.ChildSamlingView) ChildSamlingView.refresh();
  if (isFamily && window.ChildFamilyHall) ChildFamilyHall.refresh();

  if (window.ChildWorldsNav) {
    ChildWorldsNav.highlightActive(tab);
  } else {
    const bottomTabs = {
      home: 'tabHome',
      schedule: 'tabSchedule',
      rewards: 'tabRewards',
      more: 'tabMore',
      family: 'tabMore',
    };
    ['tabHome', 'tabSchedule', 'tabRewards', 'tabMore'].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      const active = id === bottomTabs[tab];
      el.classList.toggle('is-active', active);
    });
  }

  if (window.ChildTodayFocus) ChildTodayFocus.onTabChange(isHome ? 'home' : tab);

  if (isHome && window.rewardsLoaded && window.ChildSkattHouse) {
    ChildSkattHouse.showHub();
  }
}

// ── Rewards & Goals ────────────────────────────────────

const _currentGoalData = null; // cache for goal-picker
const _currentRewardsData = null;

// ══════════════════════════════════════════════════════════
// SKATTKAMMAREN — renderSkattkammaren()
// ══════════════════════════════════════════════════════════

// ── Coin sound generator (Web Audio API) ──────────────
// ── Coin ripple visual on entry ─────────────────────────
// ── Redeem: sends request to parent ───────────────────
// Keep backward compat
// ── Goal picker modal ─────────────────────────────────
// ── Milestone tracking ──────────────────────────────
// Each milestone fires once per child per day
// Stored in localStorage as { childId_date: [25, 50, 75, 100] }

// ── Milestone + celebration effects ──────────────────────
// Extracted to /js/child-dashboard-celebrations.js (Fas 8 F3).
// Exposes window.checkMilestones / launchMilestoneConfetti / launchDopaminBurst.

// ── Time Timer — /js/child-dashboard-timers.js (Fas 8 F3c) ──

// ── Goal progress bar (top) ─────────────────────────────

function isTodayFocusLayer() {
  return document.documentElement.classList.contains('today-focus-mode');
}

function updateGoalBar(goalData) {
  if (window.ChildFirstStarMode && ChildFirstStarMode.isActive()) return;
  if (isTodayFocusLayer()) return;
  const section = document.getElementById('goalBarSection');
  if (!section) return;
  const bar = document.getElementById('goalProgressBarTop');
  const label = document.getElementById('goalBarLabel');
  const nameEl = document.getElementById('goalBarName');

  // Always visible — show "no goal" state if no active goal
  if (!goalData || !goalData.goal || !goalData.goal.reward_id) {
    if (bar) bar.style.width = '0%';
    if (label) label.textContent = 'Inget mål valt';
    if (nameEl) nameEl.textContent = 'Gå till Skattkammaren för att välja mål';
    if (window.ChildDashboardWarmth) window.ChildDashboardWarmth.updateGoalTeaser(null);
    return;
  }
  const balance = goalData.star_balance || 0;
  const starCost = goalData.goal.star_cost || 1;
  const pct = Math.min(100, Math.round((balance / starCost) * 100));
  const name = goalData.goal.reward_name || '';
  const icon = goalData.goal.reward_icon || '🎯';

  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `⭐ ${balance} av ${starCost}`;
  if (nameEl) nameEl.textContent = `${icon} ${name}`;
  if (window.ChildDashboardWarmth) window.ChildDashboardWarmth.updateGoalTeaser(goalData);
}


// renderActivities — child-dashboard-activities.js (F3d)
// substeps + sortable — child-dashboard-substeps.js (F3f)
// check-off + mood rating — child-dashboard-checkoff.js (F3e)
// loadDay — child-dashboard-load-day.js (F3g)

function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// ── Dark mode ──────────────────────────────────────────

function toggleChildDarkMode() {
  const isDark = Theme.toggleDark();
  const btn = document.getElementById('childDarkBtn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

// ── Byt barn (familjemedlem) — barnväljare utan att aktivera vuxenpanel ──
async function switchChildMember() {
  if (window.Auth && typeof Auth.switchChildMember === 'function') {
    await Auth.switchChildMember();
    return;
  }
  window.location.replace('/child-login?picker=1');
}
window.switchChildMember = switchChildMember;

// ── Child logout ────────────────────────────────────────
async function childLogout() {
  await Auth.logout({ childFlow: true });
}
window.childLogout = childLogout;

// ── NU / Nästa / Senare three-zone layout ─────────────────
function renderNowNextLaterZones(opts) {
  const doneItems = opts.doneItems || [];
  const nowItems = opts.nowItems || [];
  const nextItems = opts.nextItems || [];
  const laterItems = opts.laterItems || [];
  const isToday = opts.isToday !== false;

  const renderNow = window.renderNowCard;
  const renderDone = window.renderDoneHistoryCard;
  const renderCard = window.renderActivityCard;
  if (typeof renderNow !== 'function' || typeof renderCard !== 'function') return '';

  let html = '';

  if (doneItems.length > 0 && typeof renderDone === 'function') {
    html += `<div class="nnl-done-history mb-4">
      <div class="nl-section-label" style="color:#22C55E;">✅ Klart</div>
      <div class="space-y-2">`;
    for (const item of doneItems) {
      html += renderDone(item);
    }
    html += `</div></div>`;
  }

  html += '<div class="nnl-zones-layout">';

  html += `<div class="nnl-zone nnl-zone--now">
    <div class="nnl-zone-header">⚡ NU</div>
    <div class="sortable-section space-y-3" data-sortable-section="now">`;
  if (nowItems.length > 0) {
    for (const item of nowItems) {
      html += renderNow(item, isToday);
    }
  } else {
    html += '<p class="nnl-zone-empty text-sm text-text-soft px-1">Inget just nu</p>';
  }
  html += `</div></div>`;

  html += `<div class="nnl-zone nnl-zone--next">
    <div class="nnl-zone-header">▶ Nästa</div>
    <div class="sortable-section space-y-3" data-sortable-section="next">`;
  if (nextItems.length > 0) {
    for (const item of nextItems) {
      html += renderCard(item, isToday, 'next');
    }
  } else {
    html += '<p class="nnl-zone-empty text-sm text-text-soft px-1">—</p>';
  }
  html += `</div></div>`;

  html += `<div class="nnl-zone nnl-zone--later">
    <div class="nnl-zone-header">📋 Senare</div>
    <div class="sortable-section space-y-3" data-sortable-section="later">`;
  if (laterItems.length > 0) {
    for (const item of laterItems) {
      html += renderCard(item, isToday, 'later');
    }
  } else {
    html += '<p class="nnl-zone-empty text-sm text-text-soft px-1">—</p>';
  }
  html += `</div></div>`;

  html += '</div>';
  return html;
}
window.renderNowNextLaterZones = renderNowNextLaterZones;

// ── View type toggle (child can switch view in-session) ─
function updateViewToggleButton() {
  const icon = document.getElementById('viewToggleIcon');
  const label = document.getElementById('viewToggleLabel');
  if (!icon) return;
  if (viewType === 'now_next_later') {
    icon.textContent = '⚡';
    if (label) label.textContent = 'Nu/Nästa/Senare';
  } else {
    icon.textContent = '🌅';
    if (label) label.textContent = 'Dagsvy';
  }
}

async function toggleViewType() {
  const newType = viewType === 'day_sections' ? 'now_next_later' : 'day_sections';
  viewType = newType;
  viewTypeLocalOverride = true; // prevent server response from overwriting our local choice
  updateViewToggleButton();
  // Save preference to server (fire & forget — don't block re-render)
  Auth.api('/api/me/view-type', {
    method: 'PUT',
    body: JSON.stringify({ view_type: newType }),
  }).then(() => {
    viewTypeLocalOverride = false; // server has caught up, allow updates again
  }).catch(() => {
    viewTypeLocalOverride = false;
  });
  // Re-render current day immediately (view_type is already updated locally)
  if (currentDate) loadDay(currentDate, false);
}

// ── Confetti launcher ──────────────────────────────────

function launchConfetti() {
  const COLORS = ['#F5A623', '#22C55E', '#3B82F6', '#A855F7', '#EF4444', '#F59E0B', '#10B981'];
  const SHAPES = ['⭐', '🌟', '✨', '★'];
  const count = 60;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('span');
      const useEmoji = Math.random() < 0.4;
      if (useEmoji) {
        el.textContent = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        el.style.cssText = `
          position: fixed;
          left: ${Math.random() * 100}vw;
          top: -20px;
          font-size: ${10 + Math.random() * 18}px;
          pointer-events: none;
          z-index: 9999;
          animation: confettiFall ${1.5 + Math.random() * 2}s linear forwards;
        `;
      } else {
        el.className = 'confetti-piece';
        el.style.left = `${Math.random() * 100}vw`;
        el.style.top = '-10px';
        el.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        el.style.width = `${6 + Math.random() * 8}px`;
        el.style.height = `${6 + Math.random() * 8}px`;
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      }
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }, i * 30);
  }
}

window.launchConfetti = launchConfetti;
window.isTodayFocusLayer = isTodayFocusLayer;
window.getSectionLabel = getSectionLabel;
window.formatDateDisplay = formatDateDisplay;
window.escHtml = escHtml;

// showToast is now in /js/toast.js

// ── Init ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const localUser = Auth.getUser();
  const hasCookie = document.cookie.includes('access_token=');

  if (!localUser && !hasCookie) {
    window.location.href = '/child-login';
    return;
  }

  // Guard: parent tokens cannot access child-dashboard — show clear message
  if (localUser && localUser.type && localUser.type !== 'child') {
    document.getElementById('scheduleView').innerHTML = `
      <div class="text-center py-12 bg-white rounded-2xl mt-2">
        <p class="text-4xl mb-3">🔒</p>
        <p class="text-navy font-semibold mb-1">Logga in som barn för att se schemat</p>
        <p class="text-text-soft text-sm mb-4">Den här vyn kräver barnets PIN-kod.</p>
        <a href="/child-login" class="inline-block px-6 py-2 bg-gold text-white rounded-xl font-semibold">Logga in som barn</a>
      </div>`;
    return;
  }

  try {
    // Feature gate: hide mood rating if emotion_tracking is not available
    let featureSlugs = [];
    try {
      const feats = window.fetchStjarndagFeatures
        ? await window.fetchStjarndagFeatures()
        : await fetch('/api/features', { credentials: 'include' }).then(function (r) {
          return r.ok ? r.json() : [];
        });
      featureSlugs = (feats || []).map(function (f) { return f.slug; });
      if (window.ChildWorlds && ChildWorlds.configureFromFeatures) {
        ChildWorlds.configureFromFeatures(feats || []);
      }
      if (!featureSlugs.includes('emotion_tracking')) {
        showMoodRating = false;
      }
      transitionSupportEnabled = featureSlugs.includes('transition_support');
    } catch { /* fail open for transition; mood stays gated below */ }

    me = await Auth.api('/api/auth/me');
    if (me.type !== 'child') {
      console.warn('[child-dashboard] Session is not child (got', me.type, ') — redirect to barnväljare');
      Auth.clearAuth();
      window.location.href = '/child-login';
      return;
    }
    if (window.DeviceMode) DeviceMode.enterChild();
    Auth.setAuth(null, me);
    // Cache child profile for offline access
    if (me && window.OfflineStore) {
      OfflineStore.saveChildProfile(me.id, me).catch(() => {});
      // Prune stale data on every app open (keep last 7 days)
      OfflineStore.clearStaleData(7).catch(() => {});
    }
    document.getElementById('childName').textContent = me.name || 'Mitt schema';
    document.getElementById('childEmoji').textContent = me.emoji || '⭐';
    if (window.ChildTodayFocus) ChildTodayFocus.init(me.name);
    const darkBtn = document.getElementById('childDarkBtn');
    if (darkBtn) darkBtn.textContent = Theme.isDark() ? '☀️' : '🌙';

    // Minimal UI: hide print/dark/logout if minimal_ui feature is accessible
    // and child_view_config.minimal_ui is true
    let minimalUiActive = false;
    try {
      const [featRes, viewCfgRes] = await Promise.all([
        window.fetchStjarndagFeatures
          ? window.fetchStjarndagFeatures()
          : fetch('/api/features', { credentials: 'include' }).then(function (r) {
            return r.ok ? r.json() : [];
          }),
        Auth.api(`/api/children/${me.id}/view-config`).catch(() => null),
      ]);
      const slugs = (featRes || []).map(function (f) { return f.slug; });
      if (slugs.includes('minimal_ui') && viewCfgRes && viewCfgRes.minimal_ui) {
        minimalUiActive = true;
      }
    } catch { /* fail open */ }
    if (minimalUiActive) {
      const printBtn = document.getElementById('printBtn');
      const logoutBtn = document.getElementById('logoutBtn');
      const switchChildBtn = document.getElementById('switchChildBtn');
      const darkModeBtn = document.getElementById('childDarkBtn');
      if (printBtn) printBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (switchChildBtn) switchChildBtn.style.display = 'none';
      if (darkModeBtn) darkModeBtn.style.display = 'none';
    }

    todayStr = getLocalDate();
    currentDate = todayStr;
    if (window.ChildDashboardWarmth) window.ChildDashboardWarmth.init();

    let dbViewMode = 'classic';
    try {
      const viewCfgRes = await Auth.api(`/api/children/${me.id}/view-config`);
      if (viewCfgRes && viewCfgRes.view_mode) dbViewMode = viewCfgRes.view_mode;
    } catch (_) { /* default classic */ }

    if (window.AppViewMode) {
      await AppViewMode.initChild(me.id, dbViewMode);
      if (AppViewMode.isAllowed()) {
        const toggleMount = document.getElementById('appViewToggleMount');
        if (toggleMount) AppViewMode.mountToggle(toggleMount);
      }
      AppViewMode.onChange(function () { applyChildViewMode(); });
    }

    renderDayTabs();
    updateDateLine();
    await loadDay(todayStr);

    if (window.ChildLayerRouter) {
      ChildLayerRouter.init();
      applyChildViewChrome();
      if (window.ChildWorldsNav && window.ChildFirstStarMode && ChildFirstStarMode.isActive()) {
        ChildWorldsNav.syncFirstStarHide();
      }
    } else if (window.location.hash === '#rewards') {
      showTab('rewards');
    } else if (window.AppViewMode && AppViewMode.isAllowed()) {
      applyChildViewMode();
    } else {
      showTab('schedule');
    }
  } catch (err) {
    console.error('Init error:', err);
    Auth.clearAuth();
    const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
    window.location.href =
      path === '/child-dashboard' || path.indexOf('/child/') === 0 ? '/child-login' : '/login';
  }
});