// child-dashboard.js — Barnvyns huvudlogik (schema, aktiviteter, belöningar, betyg)
// Äger: aktivitetscheckning, Skattkammaren, Dagsvy/NU/NÄSTA/SEDAN, substeg, humörslider, konfetti
// Äger INTE: SSE-händelsehanterare (child-dashboard-sse.js), auth (auth.js), toast (toast.js)

const DAY_NAMES = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
const DAY_SHORT = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const SCORE_LABELS = ['', 'Jättesvårt 😢', 'Svårt 😞', 'Lite svårt 😕', 'Okej 😐', 'Ganska bra 🙂', 'Bra 😊', 'Jättebra 😄', 'Superbra 😁', 'Nästan perfekt 🤩', 'Fantastiskt! 🌟'];

// forDigGoalBadgeHtml — /js/child-dashboard-activities.js (Fas 8 F3d)


let currentDate = null;
let todayStr = null;
let me = null;
const itemRatings = {}; // itemId -> { child_score, child_comment, parent_score, parent_comment }
let weekOffset = 0; // 0 = current week, -1 = last week, +1 = next week
let allowChildReorder = false; // toggled by parent in child profile settings
let showNowNext = true; // toggled by parent — shows NU/NÄSTA/SEDAN badges
let viewType = 'day_sections'; // 'day_sections' (default) | 'now_next_later'
let viewTypeLocalOverride = false; // true when child toggled view locally (prevents server value from overwriting)
let showMoodRating = true; // toggled by parent — shows mood slider after check-off
// Check-off queue: serializes rapid toggles to prevent race conditions on loadDay
const _checkOffQueue = [];
let _checkOffRunning = false;
let _pendingLoadDay = null; // dedup: coalesce concurrent loadDay calls
let dopaminAnimation = true; // toggled by parent — star burst on check-off
const minimalUiActive = false; // distraktionsfritt läge — hides print/dark/logout, replaces Skattkammaren text
let visualTimer = true; // toggled by parent — Time Timer in now-card
let hideClock = false; // toggled by parent — hides digital time labels on cards
let colorCoding = true; // toggled by parent — color-codes cards by activity type

// DAG_DEL_CONFIG, COLOR_RULES_CHILD, getChildColorClass — /js/child-dashboard-activities.js (Fas 8 F3d)

// ── Offline UI — /js/child-dashboard-offline.js (Fas 8 F3a) ──


// ── Sub-step state ─────────────────────────────────────────
let subStepCache = {};    // itemId -> array of { id, name, icon, sort_order, completed }
const subStepExpanded = {}; // itemId -> bool (expanded state)
// Track whether child has seen the substep intro tooltip (persisted in localStorage)
let _substepIntroSeen = localStorage.getItem('substepIntroSeen') === '1';

// ── Rating modal state ─────────────────────────────────
let ratingItemId = null;
let ratingItemIcon = null;
let ratingItemName = null;
let ratingScore = 0;

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
  const fv = document.getElementById('familyView');
  const mv = document.getElementById('moreView');
  const weekNav = document.getElementById('weekNavDetails');
  const progress = document.getElementById('progressSection');

  const isHome = tab === 'home';
  const isToday = tab === 'schedule';
  const isUniverse = tab === 'rewards';
  const isFamily = tab === 'family';
  const isMore = tab === 'more';

  if (hv) hv.classList.toggle('hidden', !isHome);
  if (sv) sv.classList.toggle('hidden', !isToday);
  if (rv) rv.classList.toggle('hidden', !isUniverse);
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
      && (!window.LivingWorldTransition || !window.LivingWorldTransition.isActive())) {
    window.rewardsLoaded = false;
    if (typeof window.ChildMorgonhus.clearPreferSkatt === 'function') {
      window.ChildMorgonhus.clearPreferSkatt();
    }
    loadRewards({ force: true });
  } else if ((isHome || isUniverse) && !window.rewardsLoaded) {
    loadRewards();
  }
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


// renderActivities + card renderers — /js/child-dashboard-activities.js (Fas 8 F3d)

// ── SortableJS: child drag-and-drop activity reordering ─────────
let _childSortables = [];

function initChildSortable() {
  if (!allowChildReorder) {
    // Destroy any existing instances when feature is disabled
    _childSortables.forEach(s => s.destroy());
    _childSortables = [];
    // Remove any draggable attributes SortableJS may have left behind
    document.querySelectorAll('.activity-card[draggable]').forEach(el => el.removeAttribute('draggable'));
    return;
  }

  // Destroy old instances before re-creating
  _childSortables.forEach(s => s.destroy());
  _childSortables = [];

  // Prevent drag handle taps from toggling the activity card
  document.querySelectorAll('.drag-handle').forEach(handle => {
    handle.addEventListener('click', e => e.stopPropagation());
  });

  document.querySelectorAll('.sortable-section').forEach(el => {
    const s = new Sortable(el, {
      animation: 200,
      handle: '.drag-handle',
      draggable: '.activity-card',
      forceFallback: true, // use SortableJS touch/mouse polyfill (required for mobile touch)
      fallbackDelay: 0,    // instant grab on handle (no longpress needed — handle is explicit)
      fallbackTolerance: 3, // touch tolerance (pixels) — prevents accidental drag on small taps
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: async function(evt) {
        if (evt.from !== evt.to) return; // Only reorder within same section
        const cards = Array.from(evt.from.querySelectorAll('.activity-card'));
        const ordered_ids = cards.map(c => c.dataset.itemId).filter(Boolean);
        if (ordered_ids.length === 0) return;
        try {
          await Auth.api('/api/me/daily-log/reorder', {
            method: 'PUT',
            body: JSON.stringify({ ordered_item_ids: ordered_ids }),
          });
          // Re-render the day so NU/NÄSTA/SEDAN badges recalculate
          // based on the new order. Without this, badges stay frozen.
          await loadDay(currentDate, false);
        } catch (err) {
          showToast('Kunde inte spara ordningen', true);
          // Revert: reload from server to restore correct order
          await loadDay(currentDate, false);
        }
      },
    });
    _childSortables.push(s);
  });
}

// ── Sub-step functions ─────────────────────────────────

/**
 * Expand or collapse the sub-step list for an activity.
 * On first expand: fetches from API and renders.
 * Stops click from bubbling up to toggleItem.
 * Loading lock prevents repeated taps from piling up rate-limited requests.
 */
const _expandLoading = {}; // itemId -> true while a fetch is in-flight
async function expandSubSteps(event, itemId) {
  event.stopPropagation();
  event.preventDefault();

  // Loading lock — ignore taps while a fetch is in-flight
  if (_expandLoading[itemId]) return;

  const container = document.getElementById('substeps-' + itemId);
  const btn = document.getElementById('expand-btn-' + itemId);
  if (!container || !btn) return;

  const isExpanded = subStepExpanded[itemId];

  if (!isExpanded) {
    // Mark intro as seen and remove all intro tooltips/hints on first expand
    if (!_substepIntroSeen) {
      _substepIntroSeen = true;
      localStorage.setItem('substepIntroSeen', '1');
      document.querySelectorAll('.intro-tooltip').forEach(el => el.remove());
      document.querySelectorAll('.expand-btn.intro-hint').forEach(el => el.classList.remove('intro-hint'));
    }

    // Load from API if not cached
    if (!subStepCache[itemId]) {
      _expandLoading[itemId] = true;
      btn.classList.add('loading');
      btn.textContent = '⏳';
      try {
        const data = await Auth.api(`/api/me/daily-log-items/${itemId}/sub-steps`);
        subStepCache[itemId] = data.sub_steps || [];
      } catch (err) {
        console.error('Sub-steps load error:', err);
        showToast('Kunde inte ladda delstegen — försök igen', true);
        btn.innerHTML = `📋 Delsteg <span class="chevron">▾</span>`;
        btn.classList.remove('loading');
        _expandLoading[itemId] = false;
        return;
      }
      btn.classList.remove('loading');
      _expandLoading[itemId] = false;
    }
    renderSubStepList(itemId);
    subStepExpanded[itemId] = true;
    container.classList.add('expanded');
    btn.classList.add('open');
    btn.innerHTML = `📋 Delsteg <span class="chevron">▾</span>`;
  } else {
    // Collapse
    subStepExpanded[itemId] = false;
    container.classList.remove('expanded');
    btn.classList.remove('open');
  }
}

/**
 * Build the inner HTML string for a sub-step list. Pure function, no DOM side-effects.
 * Used both by renderSubStepList (in-place DOM update) and renderActivityCard (during full re-render).
 */
function renderSubStepListHtml(itemId, steps) {
  const done = steps.filter(s => s.completed).length;
  const total = steps.length;
  const allDone = done === total && total > 0;

  let html = `<div style="padding: 6px 8px 2px 8px;">`;
  if (total > 0) {
    html += `<div class="substep-progress ${allDone ? 'all-done' : ''}" style="display:inline-block;margin-bottom:6px;">
      ${allDone ? '✅' : '📋'} ${done}/${total} klara
    </div>`;
  }
  for (const step of steps) {
    const isChecked = !!step.completed;
    html += `
      <div class="substep-row" onclick="toggleSubStep(event, '${itemId}', '${step.id}', ${isChecked})" id="substep-row-${step.id}">
        <div class="substep-check ${isChecked ? 'checked' : ''}" id="substep-check-${step.id}">
          ${isChecked ? `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>` : ''}
        </div>
        ${step.icon ? `<span style="font-size:1.3rem;flex-shrink:0;">${step.icon}</span>` : ''}
        <span class="substep-name ${isChecked ? 'checked' : ''}" id="substep-name-${step.id}">${escHtml(step.name)}</span>
      </div>`;
  }
  html += `</div>`;
  return html;
}

/**
 * Render sub-step rows inside the container for this item (in-place DOM update).
 */
function renderSubStepList(itemId) {
  const steps = subStepCache[itemId] || [];
  const container = document.getElementById('substeps-' + itemId);
  if (!container) return;
  if (window.ChildSupportLayer && typeof ChildSupportLayer.renderInteractiveSubsteps === 'function') {
    ChildSupportLayer.renderInteractiveSubsteps(container, itemId, steps);
    return;
  }
  container.innerHTML = renderSubStepListHtml(itemId, steps);
}

/**
 * Toggle a single sub-step. Updates cache + re-renders list in place.
 * Auto-completes the main activity when ALL sub-steps are done.
 * Auto-uncompletes the main activity when a sub-step is undone.
 */
async function toggleSubStep(event, itemId, subStepId, isCurrentlyDone) {
  event.stopPropagation();
  const action = isCurrentlyDone ? 'uncomplete' : 'complete';

  // Optimistic UI update
  if (subStepCache[itemId]) {
    const step = subStepCache[itemId].find(s => s.id === subStepId);
    if (step) {
      step.completed = !isCurrentlyDone;
      step.completed_at = !isCurrentlyDone ? new Date().toISOString() : null;
    }
  }
  // Re-render the list immediately
  renderSubStepList(itemId);

  try {
    await Auth.api(`/api/me/daily-log-items/${itemId}/sub-steps/${subStepId}/${action}`, { method: 'PUT' });
    // Update progress badge on card
    updateSubStepProgressBadge(itemId);

    // ── Auto-complete/uncomplete main activity based on sub-step state ──
    const steps = subStepCache[itemId] || [];
    const allDone = steps.length > 0 && steps.every(s => s.completed);
    const card = document.getElementById('card-' + itemId);
    const mainIsDone = card && card.classList.contains('done');

    if (allDone && !mainIsDone) {
      // All sub-steps complete → auto-complete the main activity + award stars
      await Auth.api(`/api/me/daily-log-items/${itemId}/complete`, { method: 'PUT' });
      if (window.Platform && window.Platform.haptics) window.Platform.haptics.medium();
      await loadDay(currentDate, false);
    } else if (!allDone && mainIsDone) {
      // A sub-step was unchecked → undo the main activity completion
      await Auth.api(`/api/me/daily-log-items/${itemId}/uncomplete`, { method: 'PUT' });
      await loadDay(currentDate, false);
    }
  } catch (err) {
    console.error('Sub-step toggle error:', err);
    // Revert optimistic update
    if (subStepCache[itemId]) {
      const step = subStepCache[itemId].find(s => s.id === subStepId);
      if (step) { step.completed = isCurrentlyDone; }
    }
    renderSubStepList(itemId);
    showToast('Kunde inte uppdatera delsteget', true);
  }
}

/**
 * Update the small progress badge shown on the activity card (e.g. "2/4").
 * Called after each sub-step toggle.
 */
function updateSubStepProgressBadge(itemId) {
  const steps = subStepCache[itemId] || [];
  const done = steps.filter(s => s.completed).length;
  const total = steps.length;
  const el = document.getElementById('substep-badge-' + itemId);
  if (el) {
    const allDone = done === total && total > 0;
    el.textContent = `${done}/${total}`;
    el.className = `substep-progress ${allDone ? 'all-done' : ''}`;
  }
}

// ── Toggle next uncompleted activity in a section (traffic light pill tap) ──
function toggleNextInSection(sectionKey, event) {
  if (event) event.stopPropagation();
  // Find the section container for this dagdel
  const sectionEl = document.querySelector(`.dagdel-section[data-section="${sectionKey}"] .sortable-section`);
  if (!sectionEl) return;
  // Find first uncompleted activity card in this section
  const cards = sectionEl.querySelectorAll('.activity-card:not(.done)');
  if (cards.length === 0) {
    showToast('✅ Alla aktiviteter i sektionen är klara!');
    return;
  }
  const firstUndone = cards[0];
  const itemId = firstUndone.dataset.itemId;
  if (itemId) {
    toggleItem(itemId, false);
  }
}

// ── Toggle item & show rating ──────────────────────────

async function toggleItem(itemId, isCurrentlyDone) {
  // ── Auto-complete sub-steps when completing the main activity ──
  // Clicking the main activity (e.g. "Klä på sig") should mark ALL sub-steps done.
  // Fetch sub-steps from API if not yet cached (child may never have expanded this activity).
  if (!isCurrentlyDone) {
    let steps = subStepCache[itemId];
    if (!steps || steps.length === 0) {
      try {
        const data = await Auth.api(`/api/me/daily-log-items/${itemId}/sub-steps`);
        steps = data.sub_steps || [];
        subStepCache[itemId] = steps;
      } catch {
        steps = [];
      }
    }
    if (steps.length > 0) {
      const incomplete = steps.filter(s => !s.completed);
      if (incomplete.length > 0) {
        // Auto-complete all incomplete sub-steps in parallel
        await Promise.allSettled(
          incomplete.map(step =>
            Auth.api(`/api/me/daily-log-items/${itemId}/sub-steps/${step.id}/complete`, { method: 'PUT' })
              .then(() => { step.completed = true; })
              .catch(() => {})
          )
        );
        // Update sub-step badge on the card
        const done = steps.filter(s => s.completed).length;
        const badge = document.getElementById('substep-badge-' + itemId);
        if (badge) {
          badge.textContent = `${done}/${steps.length}`;
          if (done === steps.length) badge.className = 'substep-progress all-done';
        }
        // Update the sub-step list in the DOM if expanded
        if (subStepExpanded[itemId]) {
          renderSubStepList(itemId);
        }
      }
    }
  }

  const action = isCurrentlyDone ? 'uncomplete' : 'complete';
  // Read item data BEFORE re-rendering (card will be replaced after loadDay)
  const card = document.getElementById('card-' + itemId);
  const feedbackFor = card ? (card.dataset.feedbackFor || 'both') : 'both';
  const icon = card ? (card.dataset.itemIcon || '⭐') : '⭐';
  const name = card ? (card.dataset.itemName || 'Aktivitet') : 'Aktivitet';

  // ── Optimistic UI: fire animations immediately, don't wait for network ──
  if (!isCurrentlyDone) {
    // Haptic: star earned → medium impact
    if (window.Platform && window.Platform.haptics) {
      window.Platform.haptics.medium();
    }
    const checkEl = document.querySelector(`#card-${itemId} .card-check`) ||
                    document.querySelector(`#card-${itemId} .now-check`) ||
                    document.getElementById('card-' + itemId);
    launchDopaminBurst(checkEl);

    // Visual feedback: immediately mark the card as "completing"
    const nowCard = document.querySelector(`#card-${itemId}`);
    if (nowCard) {
      nowCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      nowCard.style.opacity = '0.5';
      nowCard.style.transform = 'scale(0.97)';
    }
  }

  // ── Enqueue check-off (serialized to prevent loadDay races) ─────────────
  _checkOffQueue.push({
    itemId, isCurrentlyDone, action, feedbackFor, icon, name,
    resolve() {}, // placeholder; filled by _drainCheckOffQueue
  });
  // Drain queue if not already running
  if (!_checkOffRunning) {
    _drainCheckOffQueue();
  }
}

/**
 * Process check-off queue sequentially.
 * Only one loadDay runs at a time; concurrent calls are coalesced.
 */
async function _drainCheckOffQueue() {
  _checkOffRunning = true;
  while (_checkOffQueue.length > 0) {
    const task = _checkOffQueue.shift();
    await _processCheckOff(task);
  }
  _checkOffRunning = false;
}

async function _processCheckOff({ itemId, isCurrentlyDone, action, feedbackFor, icon, name }) {
  let queueId = null;

  // Haptic: activity check-off → light impact (uncomplete also triggers light)
  if (window.Platform && window.Platform.haptics) {
    window.Platform.haptics.light();
  }

  const apiPromise = Auth.api(`/api/me/daily-log-items/${itemId}/${action}`, { method: 'PUT' })
    .then(() => {
      if (queueId && window.OfflineQueue) {
        window.OfflineQueue.markSynced(queueId);
      }
    })
    .catch((err) => {
      const isOffline = !navigator.onLine ||
        (err && (err.message === 'Failed to fetch' || err.message === 'NetworkError when attempting to fetch resource.'));

      if (isOffline && window.OfflineQueue) {
        queueId = window.OfflineQueue.enqueue(itemId, action);
        if (!isCurrentlyDone) {
          showToast('📶 Sparas när nätverket är tillbaka', false);
        }
      } else {
        console.error('Toggle error:', err);
        if (window.Platform && window.Platform.haptics) {
          window.Platform.haptics.error();
        }
        _refreshLoadDay().catch(() => {});
        showToast('Kunde inte uppdatera. Försök igen.', true);
      }
    });

  // ── Dedupe concurrent loadDay: wait for any in-flight call ──────────────
  try {
    await _refreshLoadDay();
    if (!isCurrentlyDone && window.ChildEventBus) {
      ChildEventBus.emitActivityCompleted({
        childId: me && me.id,
        activityId: itemId,
        itemId: itemId,
        timestamp: new Date().toISOString(),
      });
    }
    // Scroll to the new NU card so the child sees what's next
    setTimeout(() => {
      const newNowCard = document.querySelector('.now-card');
      if (newNowCard) {
        newNowCard.style.animation = 'popIn 0.3s ease forwards';
        newNowCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    // After completing, show rating modal only if config allows child rating and mood rating is enabled
    if (!isCurrentlyDone && showMoodRating && feedbackFor !== 'parent' && feedbackFor !== 'none') {
      openRatingModal(itemId, icon, name);
    }
  } catch {
    // loadDay failed (e.g. fully offline) — optimistic state already shown
  }

  // Await the API promise silently so unhandled rejection is avoided
  await apiPromise.catch(() => {});
}

/**
 * Dedupe: if _pendingLoadDay is resolving a loadDay, return that promise.
 * Otherwise start a new one and store it.
 */
async function _refreshLoadDay() {
  if (_pendingLoadDay) {
    return _pendingLoadDay;
  }
  const dateStr = currentDate || todayStr || getLocalDate();
  _pendingLoadDay = loadDay(dateStr, false).finally(() => {
    _pendingLoadDay = null;
  });
  return _pendingLoadDay;
}

window.coalescedLoadDay = _refreshLoadDay;

// ── Listen for offline-queue sync events ─────────────────────────────────
// When items synced in background arrive, refresh the day view so stars
// and progress reflect the server state.
window.addEventListener('offlineQueue:allSynced', (e) => {
  const count = e.detail && e.detail.count || 0;
  if (count > 0) {
    showToast('✅ Allt uppdaterat ✓', false);
    if (typeof loadDay === 'function' && currentDate) {
      loadDay(currentDate, false).catch(() => {});
    }
  }
});

// Also listen for individual syncs (e.g. star grants, redemptions)
window.addEventListener('offlineQueue:synced', (e) => {
  const { type } = e.detail || {};
  // Refresh rewards view if a reward-related action synced
  if (type === 'REDEEM_REWARD' || type === 'ADD_STARS') {
    if (typeof loadRewards === 'function' && window.rewardsLoaded) {
      loadRewards().catch(() => {});
    }
  }
});

// ── Rating modal ───────────────────────────────────────

function openRatingModal(itemId, icon, name) {
  ratingItemId = itemId;
  ratingItemIcon = icon;
  ratingItemName = name;
  ratingScore = 5; // default middle
  document.getElementById('ratingActivityIcon').textContent = icon;
  document.getElementById('ratingActivityName').textContent = name;
  document.getElementById('ratingComment').value = '';
  const slider = document.getElementById('moodSlider');
  if (slider) slider.value = 5;
  updateMoodSlider(5);
  document.getElementById('ratingModal').classList.remove('hidden');
}

// ── Mood slider + morphing face ────────────────────────

function updateMoodSlider(score) {
  ratingScore = score;
  // Update score display
  const scoreDisplay = document.getElementById('scoreDisplay');
  const scoreLabel = document.getElementById('scoreLabel');
  if (scoreDisplay) scoreDisplay.textContent = score;
  if (scoreLabel) scoreLabel.textContent = SCORE_LABELS[score] || '';

  // Colour of the score number based on score
  const scoreColors = ['','#EF4444','#F97316','#F97316','#EAB308','#EAB308','#22C55E','#22C55E','#10B981','#10B981','#F5A623'];
  if (scoreDisplay) scoreDisplay.style.color = scoreColors[score] || '#F5A623';

  // Morph the face
  morphFace(score);
}

function morphFace(score) {
  // score 1–10
  // t = 0 (very sad) → 1 (very happy)
  const t = (score - 1) / 9;

  // Mouth: M 32 65 Q 50 CY 68 65
  // sad CY = 52 (frown), happy CY = 80 (big smile)
  const mouthCY = Math.round(52 + t * 28);
  const mouth = document.getElementById('mouthPath');
  if (mouth) {
    // Wider mouth at extremes
    const mouthX1 = Math.round(32 - t * 4); // 32 → 28 (wider smile)
    const mouthX2 = Math.round(68 + t * 4); // 68 → 72
    mouth.setAttribute('d', `M ${mouthX1} 65 Q 50 ${mouthCY} ${mouthX2} 65`);
  }

  // Eyebrows: raised when happy (low y), furrowed when sad (high y, angled in)
  const browLeft = document.getElementById('browLeft');
  const browRight = document.getElementById('browRight');
  if (browLeft && browRight) {
    if (score <= 3) {
      // Furrowed / angled down toward nose = angry/sad
      const anger = (3 - score) / 2; // 0–1
      browLeft.setAttribute('d', `M 27 ${28 + anger * 4} Q 35 ${30 + anger * 2} 43 ${28 - anger * 2}`);
      browRight.setAttribute('d', `M 57 ${28 - anger * 2} Q 65 ${30 + anger * 2} 73 ${28 + anger * 4}`);
    } else {
      // Normal to raised
      const raise = Math.max(0, t - 0.6) * 2.5; // only raise near top
      browLeft.setAttribute('d', `M 27 ${30 - raise * 4} Q 35 ${26 - raise * 4} 43 ${30 - raise * 4}`);
      browRight.setAttribute('d', `M 57 ${30 - raise * 4} Q 65 ${26 - raise * 4} 73 ${30 - raise * 4}`);
    }
  }

  // Rosy cheeks: visible at score 8+
  const cheekOpacity = Math.max(0, (score - 7) / 3).toFixed(2);
  const cheekLeft = document.getElementById('cheekLeft');
  const cheekRight = document.getElementById('cheekRight');
  if (cheekLeft) cheekLeft.setAttribute('opacity', cheekOpacity);
  if (cheekRight) cheekRight.setAttribute('opacity', cheekOpacity);

  // Face background colour: more vivid/golden at high scores
  const faceBg = document.getElementById('faceBg');
  if (faceBg) {
    if (score >= 9) faceBg.setAttribute('fill', '#FFF3D6');
    else if (score <= 2) faceBg.setAttribute('fill', '#EEF2FF');
    else faceBg.setAttribute('fill', '#FFF8E8');
  }

  // Eyes: slightly wider at high scores
  const eyeSize = 5 + t * 1.5;
  const eyeLeft = document.getElementById('eyeLeft');
  const eyeRight = document.getElementById('eyeRight');
  if (eyeLeft) { eyeLeft.setAttribute('rx', eyeSize.toFixed(1)); eyeLeft.setAttribute('ry', eyeSize.toFixed(1)); }
  if (eyeRight) { eyeRight.setAttribute('rx', eyeSize.toFixed(1)); eyeRight.setAttribute('ry', eyeSize.toFixed(1)); }
}

function dismissRating() {
  document.getElementById('ratingModal').classList.add('hidden');
  ratingItemId = null;
}

async function submitRating() {
  if (!ratingItemId) return;
  const score = ratingScore || 5;
  const comment = document.getElementById('ratingComment').value.trim();
  const btn = document.getElementById('ratingSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sparar…'; }
  try {
    await Auth.api(`/api/me/daily-log-items/${ratingItemId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ score, comment: comment || null }),
    });
    itemRatings[ratingItemId] = { child_score: score, child_comment: comment };
    dismissRating();
    await loadDay(currentDate, false);
    showToast('⭐ Betyg sparat!');
  } catch (err) {
    console.error('Rating error:', err);
    dismissRating();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Spara ⭐'; }
  }
}

// ── Load day ───────────────────────────────────────────

async function loadDay(dateStr, showLoader = true) {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') {
    dateStr = todayStr || getLocalDate();
  }
  // child-shell.js may call refreshToday on DOMContentLoaded before auth/me is ready.
  if (!me) return;

  currentDate = dateStr;
  // Clear sub-step caches when loading a new day (expand state preserved via subStepExpanded)
  subStepCache = {};
  renderDayTabs();
  updateDateLine();

  const container = document.getElementById('scheduleView');
  let skeletonTimer;

  // ── Offline path: serve cached data from IndexedDB ────────────
  if (!navigator.onLine) {
    const cached = await (window.OfflineStore
      ? OfflineStore.getDailyLog(me?.id, dateStr)
      : Promise.resolve(null));
    if (skeletonTimer) skeletonTimer.stop();
    if (cached) {
      renderActivities(cached, null);
      showOfflineBanner('📶 Offline — visar sparat schema');
    } else {
      showOfflineEmptyState(container);
    }
    return;
  }

  // ── Online path: fetch, cache, then render ─────────────────────
  if (showLoader) {
    if (window.Skeleton && window.Skeleton.isNative()) {
      skeletonTimer = window.Skeleton.createTimer(function () {
        window.Skeleton.showChildScheduleSkeleton();
      });
    } else {
      container.innerHTML = `
        <div class="text-center py-16">
          <p class="text-4xl mb-3 animate-pulse">⏳</p>
          <p class="text-text-soft">Laddar ditt schema...</p>
        </div>`;
    }
  }

  try {
    const focusLayer = isTodayFocusLayer();
    const [data, rwdData, goalData] = await Promise.all(
      focusLayer
        ? [
            Auth.api(`/api/me/daily-log?date=${dateStr}`),
            Promise.resolve(null),
            Auth.api('/api/me/goal').catch(() => null),
          ]
        : [
            Auth.api(`/api/me/daily-log?date=${dateStr}`),
            Auth.api('/api/me/rewards').catch(() => null),
            Auth.api('/api/me/goal').catch(() => null),
          ]
    );
    if (skeletonTimer) skeletonTimer.stop();

    // ── Cache data for offline use ─────────────────────────────
    if (window.OfflineStore && me?.id) {
      OfflineStore.saveDailyLog(me.id, dateStr, data).catch(() => {});
      if (rwdData) OfflineStore.saveRewards(me.id, rwdData).catch(() => {});
      if (data.child_profile) OfflineStore.saveChildProfile(me.id, data.child_profile).catch(() => {});
    }

    hideOfflineBanner();

    // Load ratings: prefer batch from daily-log response, supplement any missing
    const items = data.items || [];
    for (const item of items) {
      if (item.rating && item.rating.child_score != null) {
        itemRatings[item.id] = { child_score: item.rating.child_score, child_comment: item.rating.child_comment || null };
      }
    }
    // Fetch any items that didn't carry ratings in the batch response
    const unfetched = items.filter(i => !itemRatings[i.id]).map(i => i.id);
    if (unfetched.length > 0) {
      await loadRatingsForItems(unfetched);
    }
    // Store flags from API
    allowChildReorder = !!data.allow_child_reorder;
    showNowNext = data.show_now_next !== false; // default true if not present
    // Only update viewType from server if not locally overridden by child's in-session toggle
    if (!viewTypeLocalOverride) {
      viewType = data.view_type || 'day_sections'; // default day_sections
    }
    showMoodRating = data.show_mood_rating !== false; // default true if not present
    dopaminAnimation = data.dopamin_animation !== false; // default true
    visualTimer = data.visual_timer !== false; // default true
    hideClock = !!data.hide_clock; // default false
    colorCoding = data.color_coding !== false; // default true
    if (window.ChildSevenQuestions?.ready) {
      await ChildSevenQuestions.ready();
    }
    renderActivities(data, rwdData?.starBalance);
    updateGoalBar(goalData);
    if (window.ChildActivityEngine) {
      ChildActivityEngine.setLastDayData(data);
      ChildActivityEngine.mountPausedBannerIfNeeded();
    }
    if (window.ChildRewardsEngine && goalData && !(window.ChildFirstStarMode && ChildFirstStarMode.isActive())) {
      ChildRewardsEngine.setGoalData(goalData);
      ChildRewardsEngine.mountGoalProgress();
    }
  } catch (err) {
    if (skeletonTimer) skeletonTimer.stop();
    console.error('Load day error:', err);
    // Fallback to IndexedDB cache on API failure
    const cached = await (window.OfflineStore
      ? OfflineStore.getDailyLog(me?.id, dateStr)
      : Promise.resolve(null));
    if (cached) {
      renderActivities(cached, null);
      showOfflineBanner('📶 Offline — visar sparat schema');
    } else if (window.Skeleton) {
      window.Skeleton.showChildScheduleError(container, dateStr);
    } else {
      showOfflineErrorState(container, dateStr);
    }
  }
}

window.loadDay = loadDay;
window.toggleItem = toggleItem;
window.expandSubSteps = expandSubSteps;
window.toggleNextInSection = toggleNextInSection;
window.initChildSortable = initChildSortable;
window.launchConfetti = launchConfetti;
window.isTodayFocusLayer = isTodayFocusLayer;
window.getSectionLabel = getSectionLabel;
window.formatDateDisplay = formatDateDisplay;

async function loadRatingsForItems(itemIds) {
  // Load ratings for all items in parallel (batch with Promise.all)
  if (!itemIds.length) return;
  const results = await Promise.allSettled(
    itemIds.map(id =>
      Auth.api(`/api/me/daily-log-items/${id}/rating`)
        .then(r => ({ id, r }))
        .catch(() => null)
    )
  );
  for (const res of results) {
    if (res.status === 'fulfilled' && res.value) {
      const { id, r } = res.value;
      if (r) itemRatings[id] = r;
    }
  }
}

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

// ── View type toggle (child can switch view in-session) ─
function updateViewToggleButton() {
  const icon = document.getElementById('viewToggleIcon');
  const label = document.getElementById('viewToggleLabel');
  if (!icon) return;
  if (viewType === 'now_next_later') {
    icon.textContent = '⚡';
    if (label) label.textContent = 'Nu/Nästa/Sedan';
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
    try {
      const featRes = await fetch('/api/features', { credentials: 'include' });
      if (featRes.ok) {
        const feats = await featRes.json();
        const slugs = feats.map(f => f.slug);
        if (!slugs.includes('emotion_tracking')) {
          showMoodRating = false;
        }
      }
    } catch { /* fail open */ }

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
        fetch('/api/features', { credentials: 'include' }),
        Auth.api(`/api/children/${me.id}/view-config`).catch(() => null),
      ]);
      if (featRes.ok) {
        const feats = await featRes.json();
        const slugs = feats.map(f => f.slug);
        if (slugs.includes('minimal_ui') && viewCfgRes && viewCfgRes.minimal_ui) {
          minimalUiActive = true;
        }
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