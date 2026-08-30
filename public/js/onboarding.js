// onboarding.js — 6-step onboarding wizard logic
// Owns: child creation, schedule selection, view type selection, reward selection,
//       PIN display/edit, invite flow, celebration, and all step navigation.
// Does NOT own: auth (auth.js), birthday picker (birthday-picker.js), toast (toast.js)

// ────────────────────────────────────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────────────────────────────────────
let currentStep = 1;
let childId = null;
let childName = '';
let childUsername = '';
let childPin = '';
let childBirthdayValue = null;

window.addEventListener('onboarding:child-created', (e) => {
  const d = e.detail || {};
  if (d.id) childId = d.id;
  if (d.name) childName = d.name;
  if (d.username) childUsername = d.username;
  if (d.pin) childPin = d.pin;
  if (d.birthday !== undefined) childBirthdayValue = d.birthday;
  if (window.OnboardingActivation && typeof OnboardingActivation.setChildId === 'function' && d.id) {
    OnboardingActivation.setChildId(d.id);
  }
  const s5Child = document.getElementById('s5ChildName');
  if (s5Child && d.name) s5Child.textContent = d.name;
  const s5Coach = document.getElementById('s5ChildNameCoach');
  if (s5Coach && d.name) s5Coach.textContent = d.name;
  const s5User = document.getElementById('s5Username');
  if (s5User && d.username) s5User.textContent = d.username;
  const s5Pin = document.getElementById('s5Pin');
  if (s5Pin && d.pin) s5Pin.textContent = d.pin;
});   // stored for schedule-preview age calc
let selectedDayPref = null;      // template_group key (e.g. 'forskola', 'morgon', 'helg')
let selectedViewType = 'timeline';    // 'day' | 'timeline' — default: Nu/Nästa/Senare
const selectedRewards = [];        // array of { name, icon, star_cost }
let selectedEmojiValue = null;
let selectedAvatarFile = null;   // compressed JPEG File for deferred upload after child create
let weekendScheduleAdded = false; // true if parent opted in to helg schedule for Sat+Sun
let availableRewards = [];       // loaded from admin library
let loadedChildren = [];         // for invite child-selection

const TOTAL_STEPS = 6;

// Template groups loaded dynamically from admin library
let templateGroups = [];

// Fallback template group metadata (if API fails) — names/descriptions via i18n at runtime
const TEMPLATE_GROUP_META = [
  { key: 'forskola', icon: '🏫', activity_count: 15 },
  { key: 'skola',    icon: '📚', activity_count: 13 },
  { key: 'morgon',   icon: '☀️', activity_count: 5 },
  { key: 'dag',      icon: '🌤️', activity_count: 5 },
  { key: 'kvall',    icon: '🌙', activity_count: 5 },
  { key: 'helg',     icon: '🎉', activity_count: 10 },
];

const KNOWN_TEMPLATE_KEYS = TEMPLATE_GROUP_META.map((g) => g.key);

function getTemplateGroupFallback() {
  return TEMPLATE_GROUP_META.map((g) => ({
    ...g,
    name: tOnboarding('onboarding.templateGroups.' + g.key + '.name'),
    description: tOnboarding('onboarding.templateGroups.' + g.key + '.description'),
  }));
}

function localizeTemplateGroup(group) {
  if (!group?.key || !KNOWN_TEMPLATE_KEYS.includes(group.key)) return group;
  return {
    ...group,
    name: tOnboarding('onboarding.templateGroups.' + group.key + '.name'),
    description: tOnboarding('onboarding.templateGroups.' + group.key + '.description'),
  };
}

const PREVIEW_FALLBACK_EMOJIS = {
  forskola: ['🛏️', '👕', '🍳', '🏫', '🧩', '🍽️', '📕'],
  skola:    ['🛏️', '🍳', '🎒', '🏫', '📚', '🍽️', '📕'],
  morgon:   ['🛏️', '👕', '🪥', '🍳', '🎒'],
  dag:      ['🏫', '🛝', '🍎', '🏃', '📚'],
  kvall:    ['🍽️', '🪥', '🧸', '📕', '😴'],
  helg:     ['😴', '🥞', '🧩', '🌳', '❤️', '🍽️'],
};

function getPreviewFallbackNames(groupKey) {
  const names = window.I18n?.locale?.onboarding?.templateGroups?.previewFallback?.[groupKey];
  return Array.isArray(names) ? names : [];
}

function getPreviewFallbackItems(groupKey) {
  const emojis = PREVIEW_FALLBACK_EMOJIS[groupKey] || PREVIEW_FALLBACK_EMOJIS.forskola;
  const names = getPreviewFallbackNames(groupKey);
  return names.map((name, i) => ({
    icon: emojis[i] || '📋',
    name,
  }));
}

const REWARD_FALLBACK_META = [
  { key: 'extraStory',       icon: '📚', star_cost: 50  },
  { key: 'chooseDessert',    icon: '🍦', star_cost: 50  },
  { key: 'movieNight',       icon: '🎬', star_cost: 100 },
  { key: 'chooseDinner',     icon: '🍝', star_cost: 100 },
  { key: 'outing',           icon: '🌲', star_cost: 150 },
  { key: 'bakeTogether',     icon: '🧁', star_cost: 125 },
  { key: 'familyGameNight',  icon: '🎲', star_cost: 150 },
  { key: 'lateBedtime',      icon: '🌙', star_cost: 75  },
  { key: 'cinemaTrip',       icon: '🎬', star_cost: 250 },
];

const REWARD_SIG_TO_KEY = {
  '📚:50': 'extraStory',
  '🍦:50': 'chooseDessert',
  '🎬:100': 'movieNight',
  '🍝:100': 'chooseDinner',
  '🌲:150': 'outing',
  '🧁:125': 'bakeTogether',
  '🎲:150': 'familyGameNight',
  '🌙:75': 'lateBedtime',
  '🎬:250': 'cinemaTrip',
};

function rewardPresetKey(reward) {
  if (!reward) return null;
  return REWARD_SIG_TO_KEY[`${reward.icon}:${reward.star_cost}`] || null;
}

function localizeReward(reward) {
  const key = rewardPresetKey(reward);
  if (key) {
    return { ...reward, name: tOnboarding('onboarding.rewards.fallback.' + key) };
  }
  return reward;
}

function getRewardPresetsFallback() {
  return REWARD_FALLBACK_META.map((r) => ({
    name: tOnboarding('onboarding.rewards.fallback.' + r.key),
    icon: r.icon,
    star_cost: r.star_cost,
  }));
}

// Must not declare top-level `function ot` — that becomes window.ot and overwrites onboarding-i18n.js.
function tOnboarding(key, params) {
  return window.ot ? window.ot(key, params) : key;
}

function pOnboarding(key, count, params) {
  return window.onboardingPlural ? window.onboardingPlural(key, count, params) : key;
}

const EMOJIS = [
  '🦁','🐯','🦊','🐻','🐼','🐸','🐙','🦄',
  '🐬','🐧','🦋','🐝','🦖','🦕','🐢','🦀',
  '🌟','⭐','🌈','☀️','🌺','🌸','🍀','🎈',
  '🚀','✈️','🎸','🎨','⚽','🏀','🎯','💎',
];

// initBirthdayPicker and updateBirthdayDays are now in /js/birthday-picker.js

function updateBirthdayHidden() {
  const y = document.getElementById('childBirthdayYear').value;
  const m = document.getElementById('childBirthdayMonth').value;
  const d = document.getElementById('childBirthdayDay').value;
  document.getElementById('childBirthday').value = (y && m && d) ? `${y}-${m}-${d}` : '';
}

// ────────────────────────────────────────────────────────────────────────────
// EMOJI GRID
// ────────────────────────────────────────────────────────────────────────────
function selectEmojiButton(btn, emoji) {
  if (btn) {
    document.querySelectorAll('.emoji-btn').forEach(function (b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
  }
  selectedEmojiValue = emoji;
  const custom = document.getElementById('customEmoji');
  if (custom) custom.value = '';
}

function ensureDefaultEmoji() {
  if (selectedEmojiValue) return selectedEmojiValue;
  const starBtn = Array.prototype.find.call(
    document.querySelectorAll('.emoji-btn'),
    function (b) { return b.textContent === '🌟'; }
  );
  if (starBtn) selectEmojiButton(starBtn, '🌟');
  else selectEmojiButton(null, '🌟');
  return selectedEmojiValue;
}

function buildEmojiGrid() {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn text-2xl p-1.5 text-center';
    btn.textContent = emoji;
    btn.type = 'button';
    btn.setAttribute('aria-label', tOnboarding('onboarding.child.emojiAriaLabel', { emoji }));
    btn.addEventListener('click', function () { selectEmojiButton(btn, emoji); });
    grid.appendChild(btn);
  });
  document.getElementById('customEmoji').addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      selectedEmojiValue = val;
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE GROUP GRID (dynamic from admin library)
// ────────────────────────────────────────────────────────────────────────────
let templateGroupsLoading = false;

function focusScheduleSection() {
  const grid = document.getElementById('templateGroupGrid');
  const target = grid ? (grid.closest('div') || grid) : null;
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  if (typeof target.focus === 'function') target.focus({ preventScroll: true });
}

function renderTemplateGroupsLoadFailed(grid, step1Btn) {
  const failedMsg = tOnboarding('onboarding.child.templatesLoadFailed');
  const retryLabel = tOnboarding('onboarding.child.templatesRetryBtn');
  grid.innerHTML =
    '<div class="col-span-full py-4 space-y-3">' +
    '<p class="text-sm text-text-soft">' + escapeHtml(failedMsg) + '</p>' +
    '<button type="button" id="templateGroupsRetryBtn" class="text-sm font-semibold text-navy underline">' +
    escapeHtml(retryLabel) + '</button></div>';
  const retryBtn = document.getElementById('templateGroupsRetryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      if (!templateGroupsLoading) loadTemplateGroups();
    });
  }
  if (step1Btn) step1Btn.disabled = true;
}

async function loadTemplateGroups() {
  const grid = document.getElementById('templateGroupGrid');
  const step1Btn = document.getElementById('step1Btn');
  if (!grid) return;

  templateGroupsLoading = true;
  grid.innerHTML = '<p class="text-sm text-text-soft col-span-full py-4">' +
    escapeHtml(tOnboarding('onboarding.child.templatesLoading')) + '</p>';
  if (step1Btn) step1Btn.disabled = true;

  try {
    const tRes = await window.apiFetch('/api/onboarding/template-groups');
    if (tRes.ok) {
      templateGroups = await tRes.json();
    } else {
      templateGroups = [];
    }
  } catch {
    templateGroups = [];
  }

  templateGroupsLoading = false;
  const usableGroups = (templateGroups || []).filter(function (g) { return g && g.activity_count > 0; });
  if (usableGroups.length === 0) {
    templateGroups = [];
    renderTemplateGroupsLoadFailed(grid, step1Btn);
    return;
  }
  templateGroups = usableGroups;
  buildTemplateGroupGrid(templateGroups);
  if (step1Btn) step1Btn.disabled = false;
}

function buildTemplateGroupGrid(groups) {
  const grid = document.getElementById('templateGroupGrid');
  grid.innerHTML = '';
  groups.forEach(group => {
    const g = localizeTemplateGroup(group);
    const card = document.createElement('div');
    card.className = 'day-pref-card p-3 text-center';
    card.dataset.pref = g.key;
    const detailsId = `details-${g.key}`;
    const arrowId = `arrow-${g.key}`;
    const activityLabel = pOnboarding('onboarding.templateGroups.activityCount', g.activity_count, { count: g.activity_count });
    card.innerHTML = `
      <div class="text-3xl mb-1.5">${g.icon}</div>
      <div class="font-semibold text-navy text-sm">${escapeHtml(g.name)}</div>
      <div class="text-text-soft text-xs mt-0.5">${escapeHtml(g.description)}</div>
      <div class="text-gold text-xs mt-1 font-medium">${escapeHtml(activityLabel)}</div>
      <button class="template-toggle-btn" onclick="event.stopPropagation(); toggleTemplateDetails('${g.key}')">
        ${escapeHtml(tOnboarding('onboarding.templateGroups.showActivities'))} <span class="arrow" id="${arrowId}">▼</span>
      </button>
      <div class="template-details" id="${detailsId}">
        <div class="text-xs text-text-soft py-1">${escapeHtml(tOnboarding('onboarding.templateGroups.loadingActivities'))}</div>
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.template-toggle-btn')) return;
      document.querySelectorAll('.day-pref-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedDayPref = g.key;
    });
    grid.appendChild(card);
  });
}

// Cache for loaded template details
const templateDetailsCache = {};

window.toggleTemplateDetails = async function(groupKey) {
  const details = document.getElementById(`details-${groupKey}`);
  const arrow = document.getElementById(`arrow-${groupKey}`);
  if (!details) return;

  const isOpen = details.classList.contains('open');
  // Close all other open details first
  document.querySelectorAll('.template-details.open').forEach(d => {
    d.classList.remove('open');
  });
  document.querySelectorAll('.template-toggle-btn .arrow').forEach(a => {
    a.classList.remove('open');
  });

  if (isOpen) return; // Was open, now closed

  details.classList.add('open');
  if (arrow) arrow.classList.add('open');

  // Load activities if not cached
  if (!templateDetailsCache[groupKey]) {
    try {
      const res = await window.apiFetch(`/api/onboarding/schedule-preview?group=${groupKey}`);
      if (res.ok) {
        const data = await res.json();
        templateDetailsCache[groupKey] = data.activities || [];
      }
    } catch { /* use fallback */ }

    if (!templateDetailsCache[groupKey] || templateDetailsCache[groupKey].length === 0) {
      templateDetailsCache[groupKey] = getPreviewFallbackItems(groupKey);
    }
  }

  const activities = templateDetailsCache[groupKey];
  details.innerHTML = activities.map(a =>
    `<div class="template-detail-item">${escapeHtml(a.icon) || '📋'} ${escapeHtml(a.name)}</div>`
  ).join('');
};

// ────────────────────────────────────────────────────────────────────────────
// VIEW TYPE SELECTION (Step 2)
// ────────────────────────────────────────────────────────────────────────────
window.selectViewType = function(type) {
  selectedViewType = type;
  document.getElementById('viewCardDay').classList.toggle('selected', type === 'day');
  document.getElementById('viewCardTimeline').classList.toggle('selected', type === 'timeline');
};

// ────────────────────────────────────────────────────────────────────────────
// REWARD GRID
// ────────────────────────────────────────────────────────────────────────────
// Map star_cost to a 1-5 star rating for display
function starRating(cost) {
  if (cost <= 30) return 1;
  if (cost <= 75) return 2;
  if (cost <= 125) return 3;
  if (cost <= 200) return 4;
  return 5;
}

function renderStarRating(cost) {
  const rating = starRating(cost);
  let html = '<div class="star-rating">';
  for (let i = 1; i <= 5; i++) {
    html += i <= rating ? '<span class="star-filled">★</span>' : '<span class="star-empty">★</span>';
  }
  html += '</div>';
  return html;
}

function updateRewardSelectCount() {
  const count = selectedRewards.length;
  const el = document.getElementById('s4SelectCount');
  if (!el) return;
  el.textContent = count >= 1
    ? pOnboarding('onboarding.rewards.selectCount', count, { count })
    : tOnboarding('onboarding.rewards.selectCount.zero');
}

function buildRewardGrid(rewards) {
  const grid = document.getElementById('rewardGrid');
  grid.innerHTML = '';
  const localizedRewards = rewards.map(localizeReward);
  const introPara = document.querySelector('#step4 .bg-lavender p.text-xs');
  if (introPara) {
    const childLabel = childName || tOnboarding('onboarding.common.childFallback');
    introPara.textContent = tOnboarding('onboarding.rewards.introWithCount', {
      count: localizedRewards.length,
      childName: childLabel,
    });
  }
  localizedRewards.forEach((reward) => {
    const card = document.createElement('div');
    card.className = 'reward-card';
    card.dataset.name = reward.name;
    card.dataset.icon = reward.icon;
    card.dataset.cost = reward.star_cost;
    card.innerHTML = `
      <div class="text-3xl mb-1">${escapeHtml(reward.icon)}</div>
      <div class="font-semibold text-navy text-xs leading-snug mb-0.5">${escapeHtml(reward.name)}</div>
      ${renderStarRating(reward.star_cost)}
      <div class="text-gold font-bold text-xs mt-0.5">${escapeHtml(tOnboarding('onboarding.rewards.starCost', { count: Number(reward.star_cost) }))}</div>
    `;
    card.addEventListener('click', () => toggleReward(card, reward));
    grid.appendChild(card);
  });
  updateRewardSelectCount();
}

function toggleReward(card, reward) {
  const key = reward.name;
  const idx = selectedRewards.findIndex(r => r.name === key);
  if (idx >= 0) {
    selectedRewards.splice(idx, 1);
    card.classList.remove('selected');
  } else {
    // No limit — user can select as many rewards as they want
    selectedRewards.push({ name: reward.name, icon: reward.icon, star_cost: reward.star_cost });
    card.classList.add('selected');
  }
  updateRewardSelectCount();
}

function updateStepLabel() {
  const label = document.getElementById('stepLabel');
  if (label) {
    label.textContent = tOnboarding('onboarding.common.stepLabel', { current: currentStep, total: TOTAL_STEPS });
  }
}

function refreshOnboardingDynamicUI() {
  updateStepLabel();
  const childLabel = childName || tOnboarding('onboarding.common.childFallback');
  const agTitle = document.getElementById('activityGuideTitle');
  if (agTitle) agTitle.textContent = tOnboarding('onboarding.activityGuide.title', { childName: childLabel });
  const viewTitle = document.getElementById('viewTypeTitle');
  if (viewTitle) viewTitle.textContent = tOnboarding('onboarding.viewType.title', { childName: childLabel });
  const s3Sub = document.getElementById('s3Subtitle');
  if (s3Sub) s3Sub.textContent = tOnboarding('onboarding.scheduleReady.subtitle', { childName: childLabel });
  const s4Intro = document.getElementById('s4RewardsIntro');
  if (s4Intro) s4Intro.textContent = tOnboarding('onboarding.rewards.intro', { childName: childLabel });
  const s5Lead = document.getElementById('s5HandoffLead');
  if (s5Lead) s5Lead.textContent = tOnboarding('onboarding.handoff.lead', { childName: childLabel });
  const s5Coach = document.getElementById('s5ParentCoachTip');
  if (s5Coach) {
    s5Coach.textContent = [
      tOnboarding('onboarding.handoff.parentTipLead'),
      tOnboarding('onboarding.handoff.parentTipEmphasis'),
      tOnboarding('onboarding.handoff.parentTipTail', { childName: childLabel }),
    ].join(' ');
  }
  if (templateGroups.length > 0) {
    const selected = selectedDayPref;
    buildTemplateGroupGrid(templateGroups);
    if (selected) {
      selectedDayPref = selected;
      const card = document.querySelector('.day-pref-card[data-pref="' + selected + '"]');
      if (card) card.classList.add('selected');
    }
  }
  if (availableRewards.length > 0) {
    buildRewardGrid(availableRewards);
    selectedRewards.forEach((reward) => {
      const card = document.querySelector('.reward-card[data-name="' + CSS.escape(reward.name) + '"]');
      if (card) card.classList.add('selected');
    });
    updateRewardSelectCount();
  }
  if (IS_ADD_CHILD) {
    const step6Btn = document.getElementById('step6Btn');
    if (step6Btn) step6Btn.textContent = tOnboarding('onboarding.common.addChildDone');
  }
  if (journeyHandoffMode) {
    const btn = document.getElementById('step6Btn');
    if (btn) btn.textContent = tOnboarding('onboarding.complete.letChildStartPlain');
  }
}

// ────────────────────────────────────────────────────────────────────────────
// STEP NAVIGATION
// ────────────────────────────────────────────────────────────────────────────
function goToStep(n) {
  document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
  document.getElementById(`step${n}`).classList.add('active');
  currentStep = n;
  updateStepLabel();
  [1,2,3,4,5,6].forEach(i => {
    const pb = document.getElementById(`pb${i}`);
    pb.classList.remove('active','done');
    if (i < n) pb.classList.add('done');
    else if (i === n) pb.classList.add('active');
  });

  window.scrollTo(0, 0);

  if (window.ParentPinHandoffGate && typeof ParentPinHandoffGate.prepareOnboardingHandoffStep === 'function') {
    ParentPinHandoffGate.prepareOnboardingHandoffStep(n);
  }
}

/** Resume ACT-1 funnel after schema save or child access (avoids auth redirect loop). */
async function resumeAct1Onboarding(funnelStep) {
  const step = funnelStep || 'signup';
  if (step === 'child_created') {
    // Child exists without schema — return to Step 1 / slim so schedule can be saved.
    if (typeof window.goToStep === 'function') goToStep(1);
    return;
  }
  if (step === 'schema_saved') {
    let filmDone = false;
    try {
      if (window.OnboardingActivation && typeof OnboardingActivation.loadConfig === 'function') {
        await OnboardingActivation.loadConfig();
      }
      const cfg = window.OnboardingActivation && typeof OnboardingActivation.getConfig === 'function'
        ? OnboardingActivation.getConfig()
        : null;
      filmDone = Boolean(cfg && cfg.state && cfg.state.handoff_film_completed_at);
    } catch (_) { /* fall through to handoff */ }
    if (filmDone) {
      try {
        const res = await window.apiFetch('/api/onboarding/complete', { method: 'POST' });
        if (res.ok) {
          const user = Auth.getUser();
          if (user) {
            user.onboarding_completed = true;
            Auth.setAuth(Auth.getToken(), user);
          }
        }
      } catch (_) { /* ignore */ }
      window.location.href = '/dashboard?next_step=child_handoff';
      return;
    }
    await enterChildHandoff('resume_schema_saved');
    return;
  }
  if (['child_access', 'first_completion', 'p0_activated', 'p0_activated_48h'].includes(step)) {
    try {
      const res = await window.apiFetch('/api/onboarding/complete', { method: 'POST' });
      if (res.ok) {
        const user = Auth.getUser();
        if (user) {
          user.onboarding_completed = true;
          Auth.setAuth(Auth.getToken(), user);
        }
      }
    } catch (_) { /* server may already have marked complete */ }
    window.location.href = '/dashboard';
  }
}
window.resumeAct1Onboarding = resumeAct1Onboarding;
window.goToStep = goToStep;

function populateStep5LoginInfo() {
  const s5Child = document.getElementById('s5ChildName');
  if (s5Child && childName) s5Child.textContent = childName;
  const s5Coach = document.getElementById('s5ChildNameCoach');
  if (s5Coach && childName) s5Coach.textContent = childName;
  const s5User = document.getElementById('s5Username');
  if (s5User && childUsername) s5User.textContent = childUsername;
  const s5Pin = document.getElementById('s5Pin');
  if (s5Pin && childPin) s5Pin.textContent = childPin;
}

/** After child + schema: default dagsvy, activity guide, then handoff. */
async function finalizeSchemaAndGoHandoff() {
  populateStep5LoginInfo();
  if (childId) {
    window.apiFetch('/api/onboarding/child-view', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, view_type: 'timeline' }),
    }).catch(function () {});
  }
  if (window.OnboardingActivation && typeof OnboardingActivation.notifyPinSet === 'function') {
    OnboardingActivation.notifyPinSet('onboarding_auto');
  }
  if (window.OnboardingActivityGuide && typeof OnboardingActivityGuide.goToActivityGuideStep === 'function') {
    OnboardingActivityGuide.goToActivityGuideStep();
  } else {
    await enterChildHandoff('legacy_wizard');
  }
}

/** Unified handoff entry — film when enabled, else steg 5. */
async function enterChildHandoff(entryPoint) {
  window.__onboardingHandoffEntry = entryPoint || 'unknown';
  if (window.OnboardingHandoffFilm && typeof OnboardingHandoffFilm.goToHandoffAfterSchema === 'function') {
    await OnboardingHandoffFilm.goToHandoffAfterSchema(entryPoint);
    return;
  }
  populateStep5LoginInfo();
  goToStep(5);
}
window.enterChildHandoff = enterChildHandoff;

// ────────────────────────────────────────────────────────────────────────────
// STEP 1 — Create child
// ────────────────────────────────────────────────────────────────────────────
document.getElementById('step1Btn').addEventListener('click', async () => {
  const name = document.getElementById('childName').value.trim();
  const customEmojiVal = document.getElementById('customEmoji').value.trim();
  let emoji = customEmojiVal || selectedEmojiValue;
  const errorEl = document.getElementById('step1Error');
  errorEl.classList.add('hidden');

  if (!name) { showError(errorEl, tOnboarding('onboarding.child.nameRequired')); return; }
  const hasAvatar = Platform && Platform.isNative() && selectedAvatarFile;
  if (!emoji && !hasAvatar) {
    // iOS/iPad: emoji rutnät ska vara synligt; fallback till 🌟 om inget valts
    if (Platform && Platform.isIOS()) emoji = ensureDefaultEmoji();
    if (!emoji && !hasAvatar) { showError(errorEl, tOnboarding('onboarding.child.emojiRequired')); return; }
  }
  if (!selectedDayPref) {
    showError(errorEl, tOnboarding('onboarding.child.scheduleRequired'));
    focusScheduleSection();
    return;
  }

  const btn = document.getElementById('step1Btn');
  setLoading(btn, tOnboarding('onboarding.child.creatingChild'));

  try {
    const birthday = document.getElementById('childBirthday').value || null;
    // If child already created this session (schedule failed earlier), only retry schedule.
    if (!childId) {
      const res = await window.apiFetch('/api/onboarding/child', {
        method: 'POST',
        body: JSON.stringify({ name, emoji, birthday }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tOnboarding('onboarding.common.genericError'));

      childId = data.id;
      if (selectedAvatarFile && window.AvatarUploadFlow && typeof AvatarUploadFlow.putAvatarFile === 'function') {
        try {
          await AvatarUploadFlow.putAvatarFile('/api/children/' + childId + '/avatar', selectedAvatarFile);
        } catch (uploadErr) {
          console.error('[onboarding] avatar upload failed:', uploadErr.message);
          showToast(tOnboarding('onboarding.child.avatarSaveFailedToast'), true);
        }
      }
      if (window.OnboardingActivation && typeof OnboardingActivation.setChildId === 'function') {
        OnboardingActivation.setChildId(childId);
      }
      childName = data.name;
      childUsername = data.username;
      childPin = data.pin;
      childBirthdayValue = birthday;
      if (data.resumed) {
        showToast(tOnboarding('onboarding.child.childResumedToast'));
      }
    }

    // Now create the schedule immediately (we know the template group)
    setLoading(btn, tOnboarding('onboarding.child.creatingSchedule'));
    const schedRes = await window.apiFetch('/api/onboarding/schedule', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, template_group: selectedDayPref }),
    });
    const schedData = await schedRes.json();
    if (!schedRes.ok) throw new Error(schedData.error || tOnboarding('onboarding.child.scheduleCreateFailed'));
    if (window.MetaAppEvents && typeof MetaAppEvents.handleServerMilestones === 'function') {
      MetaAppEvents.handleServerMilestones(schedData && schedData.meta_milestones);
    }

    // Set child name in step 2 view selection
    document.getElementById('s2vChildName').textContent = childName;

    // School/preschool templates only cover Mon–Fri — ask about weekend schedule
    if (schedData.weekdays_only) {
      showWeekendModal();
    } else {
      await finalizeSchemaAndGoHandoff();
    }
  } catch (err) {
    showError(errorEl, err.message || tOnboarding('onboarding.common.genericError'));
  } finally {
    setLoading(btn, tOnboarding('onboarding.common.next'), false);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WEEKEND SCHEDULE MODAL — shown after step 1 for school/preschool templates
// ────────────────────────────────────────────────────────────────────────────
function showWeekendModal() {
  document.getElementById('weekendModal').classList.remove('hidden');
}

function hideWeekendModal() {
  document.getElementById('weekendModal').classList.add('hidden');
}

window.applyWeekendSchedule = async function() {
  const yesBtn = document.getElementById('weekendYesBtn');
  const noBtn = document.getElementById('weekendNoBtn');
  const errorEl = document.getElementById('weekendModalError');
  errorEl.classList.add('hidden');
  yesBtn.disabled = true;
  noBtn.disabled = true;
  yesBtn.textContent = tOnboarding('onboarding.weekend.yesLoading');

  try {
    const res = await window.apiFetch('/api/onboarding/weekend-schedule', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || tOnboarding('onboarding.weekend.addFailed'));

    weekendScheduleAdded = true;
    hideWeekendModal();
    await finalizeSchemaAndGoHandoff();
  } catch (err) {
    showError(errorEl, err.message || tOnboarding('onboarding.common.genericError'));
    yesBtn.disabled = false;
    noBtn.disabled = false;
    yesBtn.textContent = tOnboarding('onboarding.weekend.yesBtn');
  }
};

window.skipWeekendSchedule = async function() {
  weekendScheduleAdded = false;
  hideWeekendModal();
  await finalizeSchemaAndGoHandoff();
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 2 — View type selection
// ────────────────────────────────────────────────────────────────────────────
document.getElementById('step2vBtn').addEventListener('click', async () => {
  const errorEl = document.getElementById('step2vError');
  errorEl.classList.add('hidden');
  const btn = document.getElementById('step2vBtn');
  setLoading(btn, tOnboarding('onboarding.viewType.saving'));

  try {
    // Save view_type to DB (non-blocking on failure — we fall back to default)
    if (childId) {
      const res = await window.apiFetch('/api/onboarding/child-view', {
        method: 'POST',
        body: JSON.stringify({ child_id: childId, view_type: selectedViewType }),
      });
      if (!res.ok) {
        // Non-fatal — default 'day' is already in DB
        console.warn('[onboarding] view_type save failed, using default');
      }
    }

    // Populate step 3 schedule preview before navigating
    await populateStep3();

    goToStep(3);
  } catch (err) {
    // Non-fatal error — still proceed
    await populateStep3();
    goToStep(3);
  } finally {
    setLoading(btn, tOnboarding('onboarding.common.next'), false);
  }
});

async function populateStep3() {
  const groupMeta = localizeTemplateGroup(
    templateGroups.find(g => g.key === selectedDayPref)
    || getTemplateGroupFallback().find(g => g.key === selectedDayPref)
    || { icon: '📅', name: tOnboarding('onboarding.scheduleReady.templateFallback'), description: '' }
  );

  document.getElementById('s3ChildName').textContent = childName;
  document.getElementById('s3TemplateIcon').textContent = groupMeta.icon;
  document.getElementById('s3TemplateLabel').textContent = groupMeta.name;

  // Update days label depending on whether weekend was added
  const isSchoolTemplate = ['forskola', 'skola', 'dag'].includes(selectedDayPref);
  const daysLabel = document.getElementById('s3DaysLabel');
  if (daysLabel) {
    if (isSchoolTemplate && weekendScheduleAdded) {
      daysLabel.textContent = tOnboarding('onboarding.scheduleReady.daysMonFriWeekend');
    } else if (isSchoolTemplate) {
      daysLabel.textContent = tOnboarding('onboarding.scheduleReady.daysMonFri');
    } else {
      daysLabel.textContent = tOnboarding('onboarding.scheduleReady.daysWeek');
    }
  }

  const subtitleEl = document.getElementById('s3Subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = tOnboarding('onboarding.scheduleReady.subtitleWithTemplate', {
      templateName: groupMeta.name,
      childName: childName,
    });
  }

  // Also update step 5 (login info)
  document.getElementById('s5ChildName').textContent = childName;
  document.getElementById('s5ChildNameCoach').textContent = childName;
  document.getElementById('s5Username').textContent = childUsername;
  document.getElementById('s5Pin').textContent = childPin;

  const preview = document.getElementById('s3SchedulePreview');

  // Try to load dynamic schedule from admin library using template_group
  try {
    const res = await window.apiFetch(`/api/onboarding/schedule-preview?group=${selectedDayPref}`);
    if (res.ok) {
      const data = await res.json();
      if (data.activities && data.activities.length > 0) {
        // Group by category
        const byCategory = {};
        for (const act of data.activities) {
          if (!byCategory[act.category_name]) byCategory[act.category_name] = [];
          byCategory[act.category_name].push(act);
        }
        let html = '';
        for (const [cat, items] of Object.entries(byCategory)) {
          if (Object.keys(byCategory).length > 1) {
            html += `<div class="text-xs font-bold text-text-soft uppercase tracking-wide mb-1 mt-2">${cat}</div>`;
          }
          html += items.map(act => `
            <div class="flex items-center gap-2 py-1.5 px-3 bg-white border border-lavender rounded-xl text-sm font-medium text-navy">
              ${act.icon || '📋'} ${act.name}
            </div>
          `).join('');
        }
        preview.innerHTML = html;
        return;
      }
    }
  } catch { /* fall through to fallback */ }

  // Fallback: show static items
  const fallbackItems = getPreviewFallbackItems(selectedDayPref);
  preview.innerHTML = fallbackItems.map(item => `
    <div class="flex items-center gap-2 py-1.5 px-3 bg-white border border-lavender rounded-xl text-sm font-medium text-navy">
      ${escapeHtml(item.icon)} ${escapeHtml(item.name)}
    </div>
  `).join('');
}

// Step 3 — just a confirmation, schedule already created in step 1
document.getElementById('step3Btn').addEventListener('click', () => {
  // Update child name in step 4 copy before navigating
  const s4Name = document.getElementById('s4ChildName');
  if (s4Name) s4Name.textContent = childName;
  goToStep(4);
});

// ────────────────────────────────────────────────────────────────────────────
// STEP 4 — Save rewards
// ────────────────────────────────────────────────────────────────────────────
document.getElementById('step4Btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('step4Error');
  errorEl.classList.add('hidden');

  if (selectedRewards.length < 1) {
    showError(errorEl, tOnboarding('onboarding.rewards.minOneError'));
    return;
  }

  const btn = document.getElementById('step4Btn');
  setLoading(btn, tOnboarding('onboarding.rewards.saving'));

  try {
    // Create all selected rewards (parallel)
    await Promise.all(selectedRewards.map(reward =>
      window.apiFetch('/api/onboarding/reward', {
        method: 'POST',
        body: JSON.stringify({ name: reward.name, icon: reward.icon, star_cost: reward.star_cost }),
      })
    ));
    await enterChildHandoff('legacy_rewards');
  } catch (err) {
    showError(errorEl, err.message || tOnboarding('onboarding.common.genericError'));
  } finally {
    setLoading(btn, tOnboarding('onboarding.rewards.saveBtn'), false);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// STEP 5 — Login info helpers
// ────────────────────────────────────────────────────────────────────────────
async function copyLoginInfo() {
  const brand = tOnboarding('onboarding.common.brand');
  const appUrl = window.location.origin;
  const text = tOnboarding('onboarding.handoff.copyLoginText', {
    brand,
    childName,
    username: childUsername,
    pin: childPin,
    appUrl,
  });
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyPinBtn');
    btn.textContent = tOnboarding('onboarding.handoff.copied');
    setTimeout(() => { btn.textContent = tOnboarding('onboarding.handoff.copyInfo'); }, 2000);
  } catch {
    alert(tOnboarding('onboarding.handoff.copyManual', { text }));
  }
}

async function emailLoginInfo() {
  try {
    const me = await (await window.apiFetch('/api/auth/me')).json();
    const email = me.email || '';
    const brand = tOnboarding('onboarding.common.brand');
    const appUrl = window.location.origin;
    const subject = encodeURIComponent(tOnboarding('onboarding.handoff.emailSubject', { brand, childName }));
    const text = tOnboarding('onboarding.handoff.emailBody', {
      brand,
      childName,
      username: childUsername,
      pin: childPin,
      appUrl,
    });
    try {
      await navigator.clipboard.writeText(text);
    } catch (_err) {
      alert(tOnboarding('onboarding.handoff.copyManual', { text }));
    }
    window.location.href = `mailto:${email}?subject=${subject}`;
  } catch {
    alert(tOnboarding('onboarding.handoff.emailFallbackAlert', {
      childName,
      username: childUsername,
      pin: childPin,
    }));
  }
}

// ────────────────────────────────────────────────────────────────────────────
// STEP 5 — PIN edit helpers
// ────────────────────────────────────────────────────────────────────────────
window.showPinEdit = function() {
  document.getElementById('pinDisplay').classList.add('hidden');
  document.getElementById('pinEditSection').classList.remove('hidden');
  // Pre-fill with current PIN
  const digits = childPin.split('');
  for (let i = 0; i < 4; i++) {
    const input = document.getElementById(`pinD${i + 1}`);
    if (input) input.value = digits[i] || '';
  }
  document.getElementById('pinD1').focus();
};

window.cancelPinEdit = function() {
  document.getElementById('pinEditSection').classList.add('hidden');
  document.getElementById('pinDisplay').classList.remove('hidden');
  document.getElementById('pinEditError').classList.add('hidden');
};

window.saveCustomPin = async function() {
  const d1 = document.getElementById('pinD1').value;
  const d2 = document.getElementById('pinD2').value;
  const d3 = document.getElementById('pinD3').value;
  const d4 = document.getElementById('pinD4').value;
  const newPin = d1 + d2 + d3 + d4;
  const errorEl = document.getElementById('pinEditError');
  errorEl.classList.add('hidden');

  if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    showError(errorEl, tOnboarding('onboarding.handoff.pinMustBe4'));
    return;
  }
  // Check weak patterns
  if (/^(\d)\1{3}$/.test(newPin)) {
    showError(errorEl, tOnboarding('onboarding.handoff.pinTooWeak'));
    return;
  }

  const btn = document.getElementById('savePinBtn');
  btn.disabled = true;
  btn.textContent = tOnboarding('onboarding.handoff.savingPin');

  try {
    const res = await window.apiFetch('/api/onboarding/update-pin', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, pin: newPin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || tOnboarding('onboarding.handoff.pinSaveFailed'));

    childPin = newPin;
    document.getElementById('s5Pin').textContent = newPin;
    cancelPinEdit();
    if (window.OnboardingActivation && typeof OnboardingActivation.notifyPinSet === 'function') {
      OnboardingActivation.notifyPinSet('onboarding_custom');
    }
  } catch (err) {
    showError(errorEl, err.message || tOnboarding('onboarding.common.genericError'));
  } finally {
    btn.disabled = false;
    btn.textContent = tOnboarding('onboarding.handoff.savePin');
  }
};

// Auto-advance PIN digit inputs
function setupPinInputs() {
  wirePinDigitGroup(['pinD1', 'pinD2', 'pinD3', 'pinD4']);
}

function wirePinDigitGroup(ids) {
  for (let i = 0; i < ids.length; i++) {
    const input = document.getElementById(ids[i]);
    if (!input) continue;
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(0, 1);
      if (val && i < ids.length - 1) {
        document.getElementById(ids[i + 1]).focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        document.getElementById(ids[i - 1]).focus();
      }
    });
  }
}

function setupParentPinOnboardingInputs() {
  wirePinDigitGroup(['ppObD1', 'ppObD2', 'ppObD3', 'ppObD4']);
  wirePinDigitGroup(['ppObC1', 'ppObC2', 'ppObC3', 'ppObC4']);
}

function readOnboardingParentPin(prefix) {
  return [1, 2, 3, 4].map(function (i) {
    return (document.getElementById(prefix + i)?.value || '').trim();
  }).join('');
}

function wireDeferredStep6Options() {
  const pinLink = document.getElementById('showParentPinLink');
  const pinBlock = document.getElementById('onboardingParentPinBlock');
  if (pinLink && pinBlock) {
    pinLink.addEventListener('click', function () {
      pinBlock.classList.remove('hidden');
      pinLink.classList.add('hidden');
    });
  }
  const inviteLink = document.getElementById('showInviteLink');
  const inviteBlock = document.getElementById('onboardingInviteBlock');
  if (inviteLink && inviteBlock) {
    inviteLink.addEventListener('click', function () {
      inviteBlock.classList.remove('hidden');
      inviteLink.classList.add('hidden');
      loadInviteChildren();
    });
  }
}

async function redirectToChildHandoffAfterComplete() {
  if (window.ParentPinHandoffGate && typeof ParentPinHandoffGate.ensureBeforeChildHandoff === 'function') {
    const pinOk = await ParentPinHandoffGate.ensureBeforeChildHandoff({
      childHandoff: true,
      preferOnboardingBlock: true,
    });
    if (!pinOk) return;
  }
  document.getElementById('step6').classList.remove('active');
  document.getElementById('loadingStep').classList.remove('hidden');
  setTimeout(function () {
    if (window.Auth && typeof Auth.logout === 'function') {
      Auth.logout({ childFlow: true });
    } else {
      window.location.href = '/child-login';
    }
  }, 900);
}

async function onboardingHandoffNeedsParentPin() {
  if (window.ParentPinHandoffGate && typeof ParentPinHandoffGate.fetchHasParentPin === 'function') {
    return !(await ParentPinHandoffGate.fetchHasParentPin());
  }
  return false;
}

async function saveOnboardingParentPinIfProvided(options) {
  const requirePin = options && options.requirePin === true;
  const block = document.getElementById('onboardingParentPinBlock');
  const errorEl = document.getElementById('onboardingParentPinError');
  if (!block || block.classList.contains('hidden')) {
    if (requirePin) {
      if (window.ParentPinHandoffGate && typeof ParentPinHandoffGate.prepareOnboardingStep6PinBlock === 'function') {
        ParentPinHandoffGate.prepareOnboardingStep6PinBlock();
      }
      if (errorEl) {
        errorEl.textContent = tOnboarding('onboarding.parentPin.pinRequiredForHandoff');
        errorEl.classList.remove('hidden');
      }
      return false;
    }
    return true;
  }

  const pin = readOnboardingParentPin('ppObD');
  const confirm = readOnboardingParentPin('ppObC');
  if (!pin && !confirm) {
    if (requirePin) {
      if (errorEl) {
        errorEl.textContent = tOnboarding('onboarding.parentPin.pinRequiredForHandoff');
        errorEl.classList.remove('hidden');
      }
      return false;
    }
    return true;
  }

  if (errorEl) errorEl.classList.add('hidden');

  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    if (errorEl) {
      errorEl.textContent = tOnboarding('onboarding.parentPin.pinRequiredOrEmpty');
      errorEl.classList.remove('hidden');
    }
    return false;
  }
  if (pin !== confirm) {
    if (errorEl) {
      errorEl.textContent = tOnboarding('onboarding.parentPin.pinMismatch');
      errorEl.classList.remove('hidden');
    }
    return false;
  }

  try {
    const res = await window.apiFetch('/api/family/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin: pin, confirmPin: confirm }),
    });
    if (!res.ok) {
      const data = await res.json().catch(function () { return {}; });
      if (errorEl) {
        errorEl.textContent = data.error || tOnboarding('onboarding.parentPin.saveFailed');
        errorEl.classList.remove('hidden');
      }
      return false;
    }
    if (window.ParentPinHandoffGate && typeof ParentPinHandoffGate.invalidateCache === 'function') {
      ParentPinHandoffGate.invalidateCache();
    }
    return true;
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || tOnboarding('onboarding.parentPin.saveFailed');
      errorEl.classList.remove('hidden');
    }
    return false;
  }
}

let journeyHandoffMode = false;

async function initJourneyOnboardingCta() {
  if (IS_ADD_CHILD || !window.JourneyContextClient) return;
  try {
    journeyHandoffMode = await JourneyContextClient.isJourneyApiEnabled();
    if (journeyHandoffMode) {
      const btn = document.getElementById('step6Btn');
      if (btn) btn.textContent = tOnboarding('onboarding.complete.letChildStartPlain');
    }
  } catch (_) { /* legacy CTA */ }
}

async function finishOnboardingWithJourneyHandoff(btn, errorEl) {
  if (window.ParentPinHandoffGate && typeof ParentPinHandoffGate.ensureBeforeChildHandoff === 'function') {
    const pinOk = await ParentPinHandoffGate.ensureBeforeChildHandoff({
      childHandoff: true,
      preferOnboardingBlock: true,
    });
    if (!pinOk) {
      setLoading(btn, tOnboarding('onboarding.complete.letChildStartPlain'), false);
      return;
    }
  } else if (!(await saveOnboardingParentPinIfProvided({ requirePin: true }))) {
    setLoading(btn, tOnboarding('onboarding.complete.letChildStartPlain'), false);
    return;
  }
  launchStars();
  try {
    const res = await window.apiFetch('/api/onboarding/complete', { method: 'POST' });
    if (!res.ok) throw new Error(tOnboarding('onboarding.complete.completeFailed'));
    const user = Auth.getUser();
    if (user) {
      user.onboarding_completed = true;
      Auth.setAuth(Auth.getToken(), user);
    }
    if (window.JourneyContextClient) {
      await JourneyContextClient.postEvent('handoff_started', childId || null);
    }
    document.getElementById('step6').classList.remove('active');
    document.getElementById('loadingStep').classList.remove('hidden');
    setTimeout(() => {
      if (window.Auth && typeof Auth.logout === 'function') {
        Auth.logout({ childFlow: true });
      } else {
        window.location.href = '/child-login';
      }
    }, 900);
  } catch (err) {
    showError(errorEl, err.message || tOnboarding('onboarding.common.genericError'));
    setLoading(btn, tOnboarding('onboarding.complete.letChildStartPlain'), false);
  }
}
document.getElementById('step6Btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('step6Error');
  errorEl.classList.add('hidden');
  const btn = document.getElementById('step6Btn');

  // In add-child mode: skip invite step, go straight to complete
  if (IS_ADD_CHILD) {
    completeAddChild();
    return;
  }

  if (journeyHandoffMode) {
    setLoading(btn, tOnboarding('onboarding.common.finishing'));
    await finishOnboardingWithJourneyHandoff(btn, errorEl);
    return;
  }

  setLoading(btn, tOnboarding('onboarding.common.finishing'));

  if (window.ParentPinHandoffGate && typeof ParentPinHandoffGate.ensureBeforeChildHandoff === 'function') {
    const pinOk = await ParentPinHandoffGate.ensureBeforeChildHandoff({
      childHandoff: true,
      preferOnboardingBlock: true,
    });
    if (!pinOk) {
      setLoading(btn, tOnboarding('onboarding.complete.letChildStart'), false);
      return;
    }
  } else if (!(await saveOnboardingParentPinIfProvided({ requirePin: true }))) {
    setLoading(btn, tOnboarding('onboarding.complete.letChildStart'), false);
    return;
  }

  // Celebration effect
  launchStars();

  try {
    const res = await window.apiFetch('/api/onboarding/complete', { method: 'POST' });
    if (!res.ok) throw new Error(tOnboarding('onboarding.complete.completeFailed'));

    // Update local auth state
    const user = Auth.getUser();
    if (user) {
      user.onboarding_completed = true;
      Auth.setAuth(Auth.getToken(), user);
    }

    // Fas 4: val-skärm innan dashboard (väg A)
    if (!IS_ADD_CHILD && window.ActivationProgramEnrollChoice) {
      const showedChoice = await ActivationProgramEnrollChoice.maybeShowAfterOnboarding({
        onDone: () => { redirectToChildHandoffAfterComplete(); },
      });
      if (showedChoice) {
        setLoading(btn, tOnboarding('onboarding.complete.letChildStart'), false);
        return;
      }
    }

    await redirectToChildHandoffAfterComplete();
  } catch (err) {
    showError(errorEl, err.message || tOnboarding('onboarding.common.genericError'));
    setLoading(btn, tOnboarding('onboarding.complete.letChildStart'), false);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────
function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setLoading(btn, text, loading = true) {
  btn.disabled = loading;
  btn.textContent = text;
  btn.style.opacity = loading ? '0.7' : '1';
}

function launchStars() {
  const area = document.getElementById('celebrationArea');
  const starsEmojis = ['⭐','🌟','✨','💫'];
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const star = document.createElement('span');
      star.className = 'float-star';
      star.textContent = starsEmojis[Math.floor(Math.random() * starsEmojis.length)];
      star.style.left = (20 + Math.random() * 60) + '%';
      star.style.bottom = '0';
      area.appendChild(star);
      setTimeout(() => star.remove(), 1300);
    }, i * 120);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFICATION BANNER
// ────────────────────────────────────────────────────────────────────────────
function showVerificationBanner(user) {
  if (!user) return;
  // user.verified = true means email is confirmed; false means needs verification
  if (user.verified === true) return;

  const banner = document.getElementById('emailVerificationBanner');
  if (!banner) return;

  const emailSpan = document.getElementById('bannerEmailAddr');
  if (emailSpan && user.email) {
    emailSpan.textContent = maskEmail(user.email);
  }

  banner.classList.remove('hidden');
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  return local[0] + '***' + (local.length > 3 ? local[local.length - 1] : '') + '@' + domain;
}

window.dismissEmailBanner = function() {
  const banner = document.getElementById('emailVerificationBanner');
  if (banner) banner.classList.add('hidden');
  try {
    localStorage.setItem('emailBannerDismissed', '1');
  } catch { /* ignore */ }
};

window.resendVerificationEmail = async function() {
  const resendBtn = document.getElementById('resendBtn');
  const successEl = document.getElementById('resendSuccess');
  const errorEl = document.getElementById('resendError');

  resendBtn.disabled = true;
  resendBtn.textContent = tOnboarding('onboarding.verifyEmail.resendSending');
  successEl.classList.add('hidden');
  errorEl.classList.add('hidden');

  try {
    const me = await (await window.apiFetch('/api/auth/me')).json();
    const email = me.email;
    const res = await window.apiFetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data?.error || tOnboarding('onboarding.verifyEmail.resendError');
      errorEl.classList.remove('hidden');
    } else {
      successEl.textContent = tOnboarding('onboarding.verifyEmail.resendSuccess');
      successEl.classList.remove('hidden');
      resendBtn.textContent = tOnboarding('onboarding.verifyEmail.resendSent');
    }
  } catch {
    errorEl.textContent = tOnboarding('onboarding.common.networkError');
    errorEl.classList.remove('hidden');
  } finally {
    resendBtn.disabled = false;
    if (!successEl.classList.contains('hidden')) {
      resendBtn.textContent = tOnboarding('onboarding.verifyEmail.resendSent');
    } else {
      resendBtn.textContent = tOnboarding('onboarding.verifyEmail.resend');
    }
  }
};

// ────────────────────────────────────────────────────────────────────────────
// INVITE (Step 6)
// ────────────────────────────────────────────────────────────────────────────
async function loadInviteChildren() {
  try {
    const res = await window.apiFetch('/api/family');
    if (!res.ok) return;
    const data = await res.json();
    loadedChildren = data.allChildren || data.children || [];
    if (loadedChildren.length > 0) {
      const container = document.getElementById('inviteChildList');
      const wrapper = document.getElementById('inviteChildAccess');
      container.innerHTML = '';
      loadedChildren.forEach(child => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 cursor-pointer py-1';
        label.innerHTML = `
          <input type="checkbox" value="${child.id}" class="invite-child-check w-4 h-4 accent-gold" checked />
          <span class="text-sm text-navy">${child.emoji || '⭐'} ${child.name}</span>
        `;
        container.appendChild(label);
      });
      wrapper.classList.remove('hidden');
    }
  } catch { /* non-critical */ }
}

window.sendInvite = async function() {
  const name = document.getElementById('inviteName').value.trim();
  const email = document.getElementById('inviteEmail').value.trim();
  const errorEl = document.getElementById('inviteError');
  const successEl = document.getElementById('inviteSuccess');
  const btn = document.getElementById('inviteBtn');
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  if (!email) { errorEl.textContent = tOnboarding('onboarding.invite.emailRequired'); errorEl.classList.remove('hidden'); return; }
  if (!email.includes('@')) { errorEl.textContent = tOnboarding('onboarding.invite.invalidEmail'); errorEl.classList.remove('hidden'); return; }

  // Collect selected child IDs
  const checkedBoxes = document.querySelectorAll('.invite-child-check:checked');
  const childIds = Array.from(checkedBoxes).map(cb => cb.value);

  btn.disabled = true;
  btn.textContent = tOnboarding('onboarding.invite.sending');

  try {
    const res = await window.apiFetch('/api/family/invite', {
      method: 'POST',
      body: JSON.stringify({ email, childIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || tOnboarding('onboarding.invite.sendFailed');
      errorEl.classList.remove('hidden');
    } else {
      successEl.textContent = tOnboarding('onboarding.invite.success', { email });
      successEl.classList.remove('hidden');
      document.getElementById('inviteName').value = '';
      document.getElementById('inviteEmail').value = '';
      // Disable form after success
      btn.textContent = tOnboarding('onboarding.invite.sent');
      btn.className = btn.className.replace('bg-navy hover:bg-navy-soft', 'bg-green-500 cursor-default');
      return; // keep btn disabled
    }
  } catch {
    errorEl.textContent = tOnboarding('onboarding.common.networkError');
    errorEl.classList.remove('hidden');
  }
  btn.disabled = false;
  btn.textContent = tOnboarding('onboarding.invite.sendBtn');
};

window.skipInvite = async function() {
  // Complete onboarding and go directly to dashboard
  const errorEl = document.getElementById('step6Error');
  errorEl.classList.add('hidden');

  if (window.ParentPinHandoffGate && typeof ParentPinHandoffGate.ensureBeforeChildHandoff === 'function') {
    const pinOk = await ParentPinHandoffGate.ensureBeforeChildHandoff({
      childHandoff: true,
      preferOnboardingBlock: true,
    });
    if (!pinOk) return;
  } else if (!(await saveOnboardingParentPinIfProvided({ requirePin: true }))) {
    return;
  }

  try {
    const res = await window.apiFetch('/api/onboarding/complete', { method: 'POST' });
    if (!res.ok) throw new Error(tOnboarding('onboarding.complete.completeFailed'));

    const user = Auth.getUser();
    if (user) {
      user.onboarding_completed = true;
      Auth.setAuth(Auth.getToken(), user);
    }

    await redirectToChildHandoffAfterComplete();
  } catch (err) {
    showError(errorEl, err.message || tOnboarding('onboarding.common.genericError'));
  }
};

// ────────────────────────────────────────────────────────────────────────────
// ADD-CHILD COMPLETION (skip step 6 invite)
// ────────────────────────────────────────────────────────────────────────────
async function completeAddChild() {
  const btn = document.getElementById('step6Btn');
  setLoading(btn, tOnboarding('onboarding.common.finishing'));

  try {
    if (window.OnboardingHandoffFilm && typeof OnboardingHandoffFilm.isEnabled === 'function' &&
        OnboardingHandoffFilm.isEnabled()) {
      setLoading(btn, tOnboarding('onboarding.common.addChildDone'), false);
      await enterChildHandoff('add_child_step6');
      return;
    }

    const res = await window.apiFetch('/api/onboarding/complete', { method: 'POST' });
    if (!res.ok) throw new Error(tOnboarding('onboarding.complete.completeFailedShort'));

    // Update local auth
    const user = Auth.getUser();
    if (user) {
      user.onboarding_completed = true;
      Auth.setAuth(Auth.getToken(), user);
    }

    document.getElementById('step6').classList.remove('active');
    document.getElementById('loadingStep').classList.remove('hidden');
    setTimeout(() => { window.location.href = '/child-login'; }, 1200);
  } catch (err) {
    const errorEl = document.getElementById('step6Error');
    showError(errorEl, err.message || tOnboarding('onboarding.common.genericError'));
    setLoading(btn, tOnboarding('onboarding.common.goForward'), false);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────────────────────

// Detect add-child mode from URL query string — must be declared before first use (line 922+)
const IS_ADD_CHILD = new URLSearchParams(window.location.search).get('flow') === 'add-child';
window.IS_ADD_CHILD = IS_ADD_CHILD;

// In add-child mode, hide invite step UI and use completeAddChild
if (IS_ADD_CHILD) {
  const inviteSection = document.getElementById('inviteSection');
  if (inviteSection) inviteSection.classList.add('hidden');
  const step6Btn = document.getElementById('step6Btn');
  if (step6Btn) step6Btn.textContent = tOnboarding('onboarding.common.addChildDone');
  const parentPinBlock = document.getElementById('onboardingParentPinBlock');
  if (parentPinBlock) parentPinBlock.classList.add('hidden');
}
// ────────────────────────────────────────────────────────────────────────────
/**
 * On iOS native: optional photo picker alongside emoji grid (iPhone + iPad).
 * Emoji picker must stay visible — App Review tested on iPad and could not pick emoji when hidden.
 */
function initIOSAvatarPicker() {
  if (!window.Platform || !Platform.isIOS()) return;

  const avatarSection = document.getElementById('avatarPickerSection');
  const emojiSection = document.getElementById('emojiSection');
  if (!avatarSection || !emojiSection) return;

  // Keep emoji grid visible; photo is optional add-on below
  emojiSection.classList.remove('hidden');
  avatarSection.classList.remove('hidden');

  const preview = document.getElementById('avatarPreview');
  const chooseBtn = document.getElementById('pickPhotoBtn');
  const useDefaultBtn = document.getElementById('useDefaultAvatarBtn');

  // Pre-select 🌟 so onboarding can continue even if reviewer skips emoji tap
  ensureDefaultEmoji();

  if (!chooseBtn) return;

  // "Use default" — deselects photo, keep emoji
  if (useDefaultBtn) useDefaultBtn.addEventListener('click', () => {
    selectedAvatarFile = null;
    preview.src = 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_87240/bac2e263-dc2f-4046-8870-cc4f4dd6f3a0.jpg';
    preview.classList.remove('ring-2', 'ring-gold');
    chooseBtn.classList.remove('hidden');
    useDefaultBtn.classList.add('hidden');
    ensureDefaultEmoji();
  });

  // "Choose photo" — opens camera/photo library
  chooseBtn.addEventListener('click', async () => {
    chooseBtn.disabled = true;
    chooseBtn.textContent = tOnboarding('onboarding.child.avatarLoading');
    try {
      const result = await Platform.camera.pick({ source: 'library', quality: 'medium' });
      if (!result) {
        return;
      }
      if (result.error) {
        showToast(result.error, true);
        return;
      }
      chooseBtn.textContent = tOnboarding('onboarding.child.avatarPreparing');
      const file = Platform.camera.toAvatarFile
        ? await Platform.camera.toAvatarFile(result)
        : null;
      if (!file) throw new Error(tOnboarding('onboarding.child.avatarReadFailed'));
      selectedAvatarFile = file;
      preview.src = URL.createObjectURL(file);
      preview.classList.add('ring-2', 'ring-gold');
      chooseBtn.classList.add('hidden');
      useDefaultBtn.classList.remove('hidden');
    } catch (err) {
      console.error('[onboarding] avatar upload failed:', err.message);
      showToast(tOnboarding('onboarding.child.avatarUploadFailed'), true);
    } finally {
      chooseBtn.disabled = false;
      chooseBtn.textContent = tOnboarding('onboarding.child.avatarPickBtn');
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
let _funnelOnboardingStartedSent = false;

function trackLegacyOnboardingIfNeeded() {
  if (_funnelOnboardingStartedSent) return;
  if (typeof IS_ADD_CHILD !== 'undefined' && IS_ADD_CHILD) return;
  if (window.OnboardingStarterPlan && typeof OnboardingStarterPlan.isEnabled === 'function' &&
      OnboardingStarterPlan.isEnabled()) {
    return;
  }
  _funnelOnboardingStartedSent = true;
  const meta = { source: 'legacy_wizard' };
  if (window.analytics && typeof window.analytics.track === 'function') {
    window.analytics.track(null, 'funnel_onboarding_started', meta);
    return;
  }
  window.apiFetch('/api/analytics/event', {
    method: 'POST',
    body: JSON.stringify({ event_type: 'funnel_onboarding_started', metadata: meta }),
  }).catch(() => {});
}

document.addEventListener('DOMContentLoaded', async () => {
  const addChildReturnUrl = (typeof currentSafeReturnPath === 'function')
    ? currentSafeReturnPath()
    : window.location.pathname;
  const resumeHandoff = !IS_ADD_CHILD &&
    window.OnboardingHandoffResume &&
    typeof OnboardingHandoffResume.isResumeHandoffQuery === 'function' &&
    OnboardingHandoffResume.isResumeHandoffQuery();

  if (!Auth.isLoggedIn()) {
    if (!IS_ADD_CHILD) {
      if (window.AppleSignInDiagnostics && AppleSignInDiagnostics.traceLoginBounce) {
        AppleSignInDiagnostics.traceLoginBounce('onboarding_not_logged_in', { path: window.location.pathname });
      }
      window.location.href = '/login?next=' + encodeURIComponent(addChildReturnUrl);
      return;
    }
    const hydrated = await Auth.hydrateUserFromLoginPicker();
    if (!hydrated) {
      window.location.href = '/login?next=' + encodeURIComponent(addChildReturnUrl);
      return;
    }
  }

  let me = Auth.getUser();
  if (IS_ADD_CHILD && me && me.type === 'parent') {
    // Barnväljare: use picker parent — /api/auth/me may still be child JWT in cookie.
  } else {
    try {
      const res = await window.apiFetch('/api/auth/me');
      if (!res.ok) {
        if (window.AppleSignInDiagnostics && AppleSignInDiagnostics.traceLoginBounce) {
          AppleSignInDiagnostics.traceLoginBounce('onboarding_auth_me_failed', { status: res.status });
        }
        Auth.clearAuth(); window.location.href = '/login'; return;
      }
      me = await res.json();
      if (IS_ADD_CHILD && me.type === 'child' && (await Auth.hydrateUserFromLoginPicker())) {
        me = Auth.getUser();
      }
      if (!IS_ADD_CHILD && me.onboarding_completed && !resumeHandoff) { window.location.href = '/dashboard'; return; }
      if (me.is_admin) { window.location.href = '/admin'; return; }
      Auth.setAuth(null, me);
    } catch {
      window.location.href = '/login';
      return;
    }
  }

  if (typeof window.initOnboardingI18n === 'function') {
    await initOnboardingI18n(me?.preferred_locale);
  }
  document.addEventListener('onboarding-i18n-ready', refreshOnboardingDynamicUI);

  let handoffResumeHandled = false;
  if (resumeHandoff && window.OnboardingHandoffResume &&
      typeof OnboardingHandoffResume.handleResume === 'function') {
    const resumeResult = await OnboardingHandoffResume.handleResume(window.apiFetch);
    if (resumeResult.action === 'dashboard') {
      window.location.href = '/dashboard';
      return;
    }
    if (resumeResult.action === 'handoff') {
      handoffResumeHandled = true;
      await enterChildHandoff('email_resume');
    }
  }

  buildEmojiGrid();
  initBirthdayPicker();
  initIOSAvatarPicker();
  setupPinInputs();
  setupParentPinOnboardingInputs();
  wireDeferredStep6Options();
  if (window.AppleSignInDiagnostics && AppleSignInDiagnostics.logPost && AppleSignInDiagnostics.isPostLoginTraceActive()) {
    AppleSignInDiagnostics.logPost('step_8_onboarding_loaded', { path: window.location.pathname });
    AppleSignInDiagnostics.endPostLoginTrace();
  }

  if (!handoffResumeHandled && window.OnboardingStarterPlan && typeof OnboardingStarterPlan.init === 'function') {
    await OnboardingStarterPlan.init().catch(() => 'inactive');
  }
  const act1InitResult = !handoffResumeHandled && window.OnboardingStarterPlan &&
    typeof OnboardingStarterPlan.getInitResult === 'function' &&
    OnboardingStarterPlan.getInitResult();
  const act1Active = act1InitResult === 'active' || act1InitResult === 'resumed';
  if (handoffResumeHandled) {
    // step 5 handoff from email reminder resume (PR 3)
  } else if (act1InitResult === 'resumed') {
    // resumeAct1Onboarding already navigated (step 5 or dashboard)
  } else if (!act1Active) {
    trackLegacyOnboardingIfNeeded();
    goToStep(1);
  }

  // Show email verification banner if needed (after auth check)
  showVerificationBanner(me);

  // Load template groups from admin library (for step 1 schema selection)
  await loadTemplateGroups();

  // Load rewards from admin library (for step 4)
  try {
    const rRes = await window.apiFetch('/api/onboarding/rewards-preview');
    if (rRes.ok) {
      availableRewards = await rRes.json();
    }
  } catch { /* use fallback */ }
  if (!availableRewards || availableRewards.length === 0) {
    availableRewards = getRewardPresetsFallback();
  }
  buildRewardGrid(availableRewards);

  // Pre-load children list for step 6 invite
  loadInviteChildren();
  initJourneyOnboardingCta();

  // Track funnel_onboarding_abandoned when user leaves before completing step 6
  // Use sendBeacon so the event is sent even as the page unloads.
  window.addEventListener('pagehide', () => {
    if (currentStep < TOTAL_STEPS && Auth.getUser()?.familyId) {
      const body = JSON.stringify({
        event_type: 'funnel_onboarding_abandoned',
        metadata: { step: currentStep },
      });
      navigator.sendBeacon('/api/analytics/event', body);
    }
  });
});
