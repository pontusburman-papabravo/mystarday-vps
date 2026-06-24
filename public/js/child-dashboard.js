// child-dashboard.js — Barnvyns huvudlogik (schema, aktiviteter, belöningar, betyg)
// Äger: aktivitetscheckning, Skattkammaren, Dagsvy/NU/NÄSTA/SEDAN, substeg, humörslider, konfetti
// Äger INTE: SSE-händelsehanterare (child-dashboard-sse.js), auth (auth.js), toast (toast.js)

const DAY_NAMES = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
const DAY_SHORT = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const SCORE_LABELS = ['', 'Jättesvårt 😢', 'Svårt 😞', 'Lite svårt 😕', 'Okej 😐', 'Ganska bra 🙂', 'Bra 😊', 'Jättebra 😄', 'Superbra 😁', 'Nästan perfekt 🤩', 'Fantastiskt! 🌟'];

let currentDate = null;
let todayStr = null;
let me = null;
let itemRatings = {}; // itemId -> { child_score, child_comment, parent_score, parent_comment }
let weekOffset = 0; // 0 = current week, -1 = last week, +1 = next week
let allowChildReorder = false; // toggled by parent in child profile settings
let showNowNext = true; // toggled by parent — shows NU/NÄSTA/SEDAN badges
let viewType = 'day_sections'; // 'day_sections' (default) | 'now_next_later'
let viewTypeLocalOverride = false; // true when child toggled view locally (prevents server value from overwriting)
let showMoodRating = true; // toggled by parent — shows mood slider after check-off
// Check-off queue: serializes rapid toggles to prevent race conditions on loadDay
let _checkOffQueue = [];
let _checkOffRunning = false;
let _pendingLoadDay = null; // dedup: coalesce concurrent loadDay calls
let dopaminAnimation = true; // toggled by parent — star burst on check-off
let minimalUiActive = false; // distraktionsfritt läge — hides print/dark/logout, replaces Skattkammaren text
let visualTimer = true; // toggled by parent — Time Timer in now-card
let hideClock = false; // toggled by parent — hides digital time labels on cards
let colorCoding = true; // toggled by parent — color-codes cards by activity type

// ── Offline helpers ─────────────────────────────────────────────────────────

let _offlineBanner = null;
let _offlineTimer = null;

function getOfflineBanner() {
  if (!_offlineBanner) {
    _offlineBanner = document.getElementById('offlineBanner');
  }
  return _offlineBanner;
}

function showOfflineBanner(msg) {
  const banner = getOfflineBanner();
  if (!banner) return;
  banner.innerHTML = `<span>📶</span><span>${msg}</span>`;
  banner.classList.remove('hidden');
  banner.classList.add('flex');
}

function hideOfflineBanner() {
  const banner = getOfflineBanner();
  if (!banner) return;
  banner.classList.add('hidden');
  banner.classList.remove('flex');
}

function showOfflineEmptyState(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="text-center py-12 bg-white rounded-2xl mt-2">
      <p class="text-4xl mb-3">📶</p>
      <p class="text-text-soft font-semibold">Ingen uppkoppling</p>
      <p class="text-text-soft text-sm mt-1">Koppla upp för att se schemat</p>
    </div>`;
}

function showOfflineErrorState(container, dateStr) {
  if (!container) return;
  container.innerHTML = `
    <div class="text-center py-12 bg-white rounded-2xl mt-2">
      <p class="text-4xl mb-3">😕</p>
      <p class="text-text-soft">Kunde inte ladda schemat.</p>
      <button onclick="loadDay('${dateStr}')" class="mt-4 px-6 py-2 bg-gold text-white rounded-xl font-semibold">Försök igen</button>
    </div>`;
}

// ── Dag-del (day section) definitions ─────────────────────────────────────
// Maps DB section names to display config for the day_sections view.
// DB has: morgon, dag, kvall, natt
// We split 'dag' visually into förmiddag (< 12:00) and eftermiddag (≥ 12:00).
const DAG_DEL_CONFIG = {
  morgon:      { label: 'Morgon',      emoji: '🌅', bg: '#FFFBEA', border: '#FCD34D', headerBg: '#FEF9C3', headerText: '#92400E' },
  formiddag:   { label: 'Förmiddag',   emoji: '☀️',  bg: '#FFF7ED', border: '#FDBA74', headerBg: '#FFEDD5', headerText: '#9A3412' },
  eftermiddag: { label: 'Eftermiddag', emoji: '🌤️',  bg: '#EFF6FF', border: '#93C5FD', headerBg: '#DBEAFE', headerText: '#1E40AF' },
  kvall:       { label: 'Kväll',       emoji: '🌙', bg: '#FAF5FF', border: '#C084FC', headerBg: '#EDE9FE', headerText: '#6B21A8' },
  natt:        { label: 'Natt',        emoji: '🌑', bg: '#EFF6FF', border: '#60A5FA', headerBg: '#1E3A5F', headerText: '#BFDBFE' },
};

// Color coding: keyword→CSS class mapping
const COLOR_RULES_CHILD = [
  { cls: 'cc-hygien',  keywords: ['tänder','borsta','tvätta','duscha','dusch','bad','badrum','toalett','blöja','klä','kläder','hygien','hår','kamm','nagel'] },
  { cls: 'cc-mat',     keywords: ['frukost','lunch','middag','mellanmål','mat','äta','dricka','frukt','snack','kvällsmat'] },
  { cls: 'cc-skola',   keywords: ['skola','förskola','läxor','läxa','läsa','räkna','aktivitet','inlämning','lektion','pedagog','lärare'] },
  { cls: 'cc-lek',     keywords: ['lek','leka','spel','spela','pussel','rita','måla','musik','sjunga','bygga','lego','docklek','utomhus'] },
  { cls: 'cc-rorelse', keywords: ['träna','träning','sport','gym','simning','simma','cykel','cykla','promenad','gå','springa','dans','dansa','yoga','fotboll','idrott'] },
  { cls: 'cc-vila',    keywords: ['sova','sovstund','vila','tupplur','natt','pyjamas','läggdags','kvällsrutin'] },
  { cls: 'cc-social',  keywords: ['kompi','kompis','besök','samling','träffa','möte','telefon','video','ring'] },
];
function getChildColorClass(name) {
  if (!colorCoding || !name) return '';
  const lower = name.toLowerCase();
  for (const rule of COLOR_RULES_CHILD) {
    if (rule.keywords.some(kw => lower.includes(kw))) return rule.cls;
  }
  return '';
}

// ── Sub-step state ─────────────────────────────────────────
let subStepCache = {};    // itemId -> array of { id, name, icon, sort_order, completed }
let subStepExpanded = {}; // itemId -> bool (expanded state)
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

// ── Time utilities for NOW/NEXT/LATER logic ─────────────

function getCurrentTimeHHMM() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getTimeMinutes(timeStr) {
  // Convert "HH:MM" or "HH:MM–HH:MM" to minutes since midnight
  if (!timeStr) return null;
  const clean = timeStr.split('–')[0].trim();
  const parts = clean.split(':');
  if (parts.length < 2) return null;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// Classify activities into NOW / NEXT / LATER based on current time
// completed items are excluded from remaining-activities classification
function classifyActivities(items, currentTimeStr) {
  const currentMins = getTimeMinutes(currentTimeStr);
  const now = [];
  const next = [];
  const laterFuture = []; // future uncompleted → normal LATER
  const laterPast = [];   // past uncompleted → "Redan" chip

  for (const item of items) {
    // Skip completed — they are handled separately
    if (item.completed) continue;

    const startMins = getTimeMinutes(item.start_time);
    const endMins = getTimeMinutes(item.end_time);

    // Activity with no time → goes to future LATER (no time-based ordering)
    if (startMins === null) {
      laterFuture.push({ ...item, _view: 'later', _past: false });
      continue;
    }

    // Check if currently happening
    if (currentMins !== null) {
      if (endMins !== null) {
        if (currentMins >= startMins && currentMins <= endMins) {
          now.push({ ...item, _view: 'now', _past: false });
          continue;
        }
      } else {
        if (currentMins >= startMins && currentMins <= startMins + 30) {
          now.push({ ...item, _view: 'now', _past: false });
          continue;
        }
      }
    }

    // Future activity (start time is in the future)
    if (currentMins !== null && startMins > currentMins) {
      if (!next.length) {
        next.push({ ...item, _view: 'next', _past: false });
      } else {
        laterFuture.push({ ...item, _view: 'later', _past: false });
      }
      continue;
    }

    // Past uncompleted (start was before current time, not currently happening)
    laterPast.push({ ...item, _view: 'later', _past: true });
  }

  return { now, next, laterFuture, laterPast };
}

// ── Day tabs ───────────────────────────────────────────

function renderDayTabs() {
  const container = document.getElementById('dayTabs');
  const today = new Date();
  const todayDow = today.getDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i + (weekOffset * 7));
    const dateStr = d.toLocaleDateString('sv-SE');
    const isToday = dateStr === todayStr;
    const dow = d.getDay();
    days.push({ dateStr, dow, isToday, dayNum: d.getDate(), month: d.getMonth() });
  }

  // Update week label
  const weekLabel = document.getElementById('weekLabel');
  if (weekLabel) {
    const first = days[0];
    const last = days[6];
    if (weekOffset === 0) {
      weekLabel.textContent = 'Denna vecka';
    } else {
      // Get ISO week number of Monday
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
      const startOfYear = new Date(monday.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((monday - startOfYear) / 86400000);
      const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
      weekLabel.textContent = `Vecka ${weekNum} · ${first.dayNum} ${MONTH_NAMES[first.month]} – ${last.dayNum} ${MONTH_NAMES[last.month]}`;
    }
  }

  // Show/hide Idag button
  updateTodayBtn();

  container.innerHTML = days.map(d => `
    <button
      class="day-tab flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold text-center min-w-[44px] ${d.dateStr === currentDate ? 'active' : 'bg-sky text-navy hover:bg-lavender'}"
      onclick="loadDay('${d.dateStr}')"
    >
      <div>${DAY_SHORT[d.dow]}</div>
      <div class="text-base font-bold">${d.dayNum}</div>
      ${d.isToday ? '<div class="text-[9px] opacity-75">idag</div>' : ''}
    </button>
  `).join('');
}

function navigateWeek(direction) {
  weekOffset += direction;
  // Select Monday of the new week
  const today = new Date();
  const todayDow = today.getDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
  const newDate = monday.toLocaleDateString('sv-SE');
  updateTodayBtn();
  loadDay(newDate);
}

function goToToday() {
  weekOffset = 0;
  updateTodayBtn();
  loadDay(todayStr);
}

function updateTodayBtn() {
  const btn = document.getElementById('todayBtn');
  if (!btn) return;
  if (weekOffset !== 0) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

function updateDateLine() {
  const el = document.getElementById('childDateLine');
  if (el) {
    el.textContent = formatDateDisplay(currentDate || todayStr);
  }
}

// ── Tabs ───────────────────────────────────────────────

let rewardsLoaded = false;
let childUiMagic = false;

function applyChildViewChrome() {
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

function applyChildViewMode() {
  applyChildViewChrome();

  if (window.ChildWorlds && ChildWorlds.V2_ENABLED) {
    document.body.classList.remove('child-home-active');
    showTab('schedule');
    return;
  }

  if (childUiMagic) {
    showTab('home');
    if (!rewardsLoaded) loadRewards();
  } else {
    document.body.classList.remove('child-home-active');
    showTab('schedule');
  }
}

function showTab(tab) {
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

  document.body.classList.toggle('child-has-bottom-nav', childUiMagic);
  document.body.classList.toggle('child-home-active', childUiMagic && isHome);

  if (isToday) {
    if (!window.ChildTodayFocus) {
      if (weekNav) { weekNav.classList.remove('hidden'); weekNav.removeAttribute('aria-hidden'); }
      if (progress) { progress.classList.remove('hidden'); progress.removeAttribute('aria-hidden'); }
    }
  } else {
    if (weekNav) { weekNav.classList.add('hidden'); weekNav.setAttribute('aria-hidden', 'true'); }
    if (progress) { progress.classList.add('hidden'); progress.setAttribute('aria-hidden', 'true'); }
  }

  if ((isHome || isUniverse) && !rewardsLoaded) loadRewards();
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

  if (isHome && rewardsLoaded && window.ChildSkattHouse) {
    ChildSkattHouse.showHub();
  }
}

// ── Rewards & Goals ────────────────────────────────────

let _currentGoalData = null; // cache for goal-picker
let _currentRewardsData = null;

async function loadRewards() {
  // Show loader, hide content
  const loader = document.getElementById('skattkammarLoading');
  const view = document.getElementById('skattkammarView');

  // Use shimmer skeleton on Capacitor, spinner on web
  let skeletonTimer;
  if (window.Skeleton && window.Skeleton.isNative()) {
    if (loader) loader.style.display = 'none';
    skeletonTimer = window.Skeleton.createTimer(function () {
      window.Skeleton.showChildRewardsSkeleton();
    });
  } else {
    if (loader) { loader.style.display = ''; loader.innerHTML = '<p class="text-5xl mb-3" style="display:inline-block;animation:skattSpin 1.5s linear infinite">⭐</p><p class="text-text-soft font-semibold mt-3">Öppnar Skattkammaren...</p>'; }
  }
  if (view) view.style.display = 'none';

  // ── Offline path: serve cached rewards from IndexedDB ─────────
  if (!navigator.onLine) {
    const cached = await (window.OfflineStore
      ? OfflineStore.getRewards(me?.id)
      : Promise.resolve(null));
    if (skeletonTimer) skeletonTimer.stop();
    if (cached) {
      rewardsLoaded = true;
      _currentRewardsData = cached;
      renderSkattkammaren(cached, _currentGoalData, { grants: [] });
      showOfflineBanner('📶 Offline — visar sparat data');
    } else {
      if (loader) loader.innerHTML = '<div class="text-center py-12"><p class="text-4xl mb-3">📶</p><p class="text-text-soft">Ingen uppkoppling. Koppla upp för att se belöningar.</p></div>';
    }
    return;
  }

  try {
    const [rewardsData, goalData, manualData] = await Promise.all([
      Auth.api('/api/me/rewards'),
      Auth.api('/api/me/goal').catch(() => null),
      Auth.api('/api/me/manual-stars').catch(() => ({ grants: [] })),
    ]);
    if (skeletonTimer) skeletonTimer.stop();

    // Cache rewards for offline use
    if (window.OfflineStore && me?.id) {
      OfflineStore.saveRewards(me.id, rewardsData).catch(() => {});
    }

    hideOfflineBanner();
    rewardsLoaded = true;
    _currentGoalData = goalData;
    _currentRewardsData = rewardsData;
    updateGoalBar(goalData);
    renderSkattkammaren(rewardsData, goalData, manualData);
    if (window.ChildRewardsEngine) {
      ChildRewardsEngine.setGoalData(goalData);
      ChildRewardsEngine.setRewardsData(rewardsData);
      ChildRewardsEngine.mountGoalProgress();
      ChildRewardsEngine.mountPendingBannerIfNeeded();
    }
  } catch (err) {
    // Fallback to IndexedDB cache on API failure
    const cached = await (window.OfflineStore
      ? OfflineStore.getRewards(me?.id)
      : Promise.resolve(null));
    if (skeletonTimer) skeletonTimer.stop();
    if (cached) {
      rewardsLoaded = true;
      _currentRewardsData = cached;
      renderSkattkammaren(cached, _currentGoalData, { grants: [] });
      showOfflineBanner('📶 Offline — visar sparat data');
    } else if (loader) {
      loader.innerHTML = '<div class="text-center py-12"><p class="text-4xl mb-3">😕</p><p class="text-text-soft">Kunde inte ladda belöningar.</p></div>';
    }
  }
}

// ══════════════════════════════════════════════════════════
// SKATTKAMMAREN — renderSkattkammaren()
// ══════════════════════════════════════════════════════════

function renderSkattkammaren(rewardsData, goalData, manualData) {
  const { rewards, starBalance, redemptions } = rewardsData;
  const pending = redemptions.filter(r => r.status === 'pending');
  const deniedRecent = redemptions.filter(r => r.status === 'denied').slice(0, 3);
  const goal = goalData ? goalData.goal : null;
  const progressPct = goalData ? Math.min(100, goalData.progress_pct || 0) : 0;
  const pendingChangeReq = goalData ? goalData.pending_change_request : null;
  const grants = (manualData && manualData.grants) ? manualData.grants : [];
  const trophies = redemptions.filter(r => r.status === 'approved' || r.status === 'auto');

  // ── Hide loader, show content ──────────────────────────
  const loader = document.getElementById('skattkammarLoading');
  const view = document.getElementById('skattkammarView');
  if (loader) loader.style.display = 'none';
  if (!view) return;
  view.style.display = '';
  view.style.animation = 'skattEntrance 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';

  // ── Play coin sound (Web Audio API - generates sound without files) ──
  playCoinSound();

  let html = '';

  // ══════════════════════════════════════════════════════
  // 1. FESTIVE BANNER — Stjärnkistan
  // ══════════════════════════════════════════════════════
  const totalEarned = starBalance + redemptions
    .filter(r => r.status === 'approved' || r.status === 'auto')
    .reduce((acc, r) => acc + (r.star_cost || 0), 0);

  // Twinkle stars positions
  const twinkleStars = [
    { top: '15%', left: '8%', dur: '1.8s', delay: '0s' },
    { top: '30%', left: '90%', dur: '2.2s', delay: '0.5s' },
    { top: '60%', left: '5%', dur: '1.5s', delay: '0.8s' },
    { top: '75%', left: '92%', dur: '2.5s', delay: '0.3s' },
    { top: '20%', left: '50%', dur: '1.9s', delay: '1.1s' },
    { top: '80%', left: '40%', dur: '2.1s', delay: '0.6s' },
    { top: '45%', left: '85%', dur: '1.7s', delay: '1.4s' },
    { top: '10%', left: '70%', dur: '2.3s', delay: '0.2s' },
  ];
  const twinkleHtml = twinkleStars.map(s =>
    `<span class="skatt-banner-star" style="top:${s.top};left:${s.left};--dur:${s.dur};--delay:${s.delay}">✦</span>`
  ).join('');

  html += `
  <div class="skatt-banner">
    <div class="skatt-banner-stars">${twinkleHtml}</div>
    <div style="position:relative;z-index:2;">
      <!-- Title -->
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-family:'Outfit',sans-serif;font-size:0.7rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:4px;">Min</div>
        <div style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:white;letter-spacing:0.02em;">${minimalUiActive ? '🤝 Be om hjälp' : '💎 Skattkammaren'}</div>
      </div>

      <!-- Chest + balance -->
      <div style="display:flex;align-items:center;justify-content:center;gap:20px;">
        <div style="text-align:center;">
          <div class="skatt-chest" style="font-size:3rem;line-height:1;">🪙</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:'Outfit',sans-serif;font-size:0.65rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,215,0,0.7);margin-bottom:2px;">Dina sparade stjärnor</div>
          <div style="font-family:'Outfit',sans-serif;font-size:3.2rem;font-weight:800;color:#FFD700;line-height:1;text-shadow:0 0 20px rgba(255,215,0,0.5);">⭐ ${starBalance}</div>
          ${window.ChildDashboardWarmth ? window.ChildDashboardWarmth.renderEconomyHintHtml(starBalance, totalEarned) : (totalEarned > starBalance ? `<div style="font-size:0.65rem;color:rgba(255,255,255,0.45);margin-top:4px;">Totalt tjänat: ⭐ ${totalEarned}</div>` : '')}
        </div>
        <div style="text-align:center;">
          <div class="skatt-chest" style="font-size:3rem;line-height:1;animation-delay:-1.5s;">🎁</div>
        </div>
      </div>
    </div>
  </div>`;

  // ══════════════════════════════════════════════════════
  // 2. ÖNSKELISTAN — Active Goal
  // ══════════════════════════════════════════════════════
  html += `<div class="skatt-section">
    <div class="skatt-section-header">
      <div class="skatt-section-icon" style="background:linear-gradient(135deg,#ff6b6b,#ffd93d);">🎯</div>
      <span class="skatt-section-title" style="color:#d63031;">Önskelistan</span>
    </div>
    <div class="skatt-section-body">`;

  if (goal && goal.reward_id) {
    const starsToGo = Math.max(0, goal.star_cost - starBalance);
    const canAffordGoal = starBalance >= goal.star_cost;
    html += `
      <div class="skatt-goal-wrap">
        <div class="skatt-goal-shine"></div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;position:relative;z-index:1;">
          <div style="width:60px;height:60px;min-width:60px;background:rgba(245,166,35,0.15);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:2rem;border:1.5px solid rgba(245,166,35,0.3);">${escHtml(goal.reward_icon || '🎯')}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B8860B;margin-bottom:2px;font-family:'Outfit',sans-serif;">Mitt drömtid</div>
            <div style="font-family:'Outfit',sans-serif;font-size:1.1rem;font-weight:800;color:#1B2340;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(goal.reward_name)}</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div style="margin-bottom:8px;position:relative;z-index:1;">
          <div class="skatt-progress-track">
            <div class="skatt-progress-fill" id="skattGoalBar" style="width:${progressPct}%">
              ${progressPct > 20 ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-family:'Outfit',sans-serif;font-weight:800;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.4);">⭐ ${starBalance} av ${goal.star_cost}</span>` : ''}
            </div>
            <!-- Milestone marks -->
            <div style="position:absolute;left:25%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.5);border-radius:1px;"></div>
            <div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.5);border-radius:1px;"></div>
            <div style="position:absolute;left:75%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.5);border-radius:1px;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:5px;">
            <span style="font-size:0.65rem;color:#B8860B;font-weight:600;font-family:'Outfit',sans-serif;">${progressPct}%${starsToGo > 0 ? ` — ${starsToGo} ⭐ kvar` : ''}</span>
            ${progressPct <= 20 ? `<span style="font-size:0.65rem;color:#5A6178;">⭐ ${starBalance} av ${goal.star_cost}</span>` : ''}
          </div>
        </div>

        <!-- Action -->
        <div style="display:flex;gap:8px;margin-top:12px;position:relative;z-index:1;">
          ${canAffordGoal ?
            `<button onclick="requestRedeem('${goal.reward_id}')" class="skatt-redeem-btn" style="flex:1;">
              📨 Fråga om att lösa in
            </button>` :
            `<div style="flex:1;background:rgba(245,166,35,0.1);border-radius:14px;padding:12px;text-align:center;border:1.5px dashed rgba(245,166,35,0.4);">
              <div style="font-size:0.75rem;font-weight:700;color:#B8860B;font-family:'Outfit',sans-serif;">Samla ${starsToGo} ⭐ till! 💪</div>
            </div>`
          }
          ${pendingChangeReq ?
            `<div style="min-height:44px;display:flex;align-items:center;justify-content:center;background:#EDE7F6;border-radius:14px;padding:8px 14px;font-size:0.75rem;font-weight:700;color:#1B2340;white-space:nowrap;">⏳ Väntar på svar</div>` :
            `<button onclick="openGoalPicker()" style="min-height:44px;background:#EDE7F6;border:none;border-radius:14px;padding:8px 14px;font-size:0.75rem;font-weight:700;color:#1B2340;cursor:pointer;white-space:nowrap;transition:background 0.15s;" onmouseover="this.style.background='#DDD6FE'" onmouseout="this.style.background='#EDE7F6'">🔄 Byt mål</button>`
          }
        </div>
      </div>`;
  } else {
    html += `
      <div style="text-align:center;padding:20px 0;">
        <div style="font-size:3rem;margin-bottom:12px;animation:skattFloat 3s ease-in-out infinite;display:inline-block;">🎯</div>
        <div style="font-family:'Outfit',sans-serif;font-size:1.1rem;font-weight:800;color:#1B2340;margin-bottom:6px;">Välj ett drömtid!</div>
        <div style="font-size:0.82rem;color:#5A6178;margin-bottom:18px;">Vad sparar du stjärnor till?</div>
        <button onclick="openGoalPicker()" class="skatt-redeem-btn" style="width:auto;padding:14px 28px;">
          ✨ Välj mitt mål
        </button>
      </div>`;
  }

  html += `</div></div>`;

  // ══════════════════════════════════════════════════════
  // 3. TROFÉHYLLAN — Trophies
  // ══════════════════════════════════════════════════════
  if (trophies.length > 0) {
    html += `<div class="skatt-section">
      <div class="skatt-section-header">
        <div class="skatt-section-icon" style="background:linear-gradient(135deg,#fdcb6e,#e17055);">🏆</div>
        <span class="skatt-section-title" style="color:#c0392b;">Troféhyllan</span>
        <span style="margin-left:auto;font-size:0.7rem;font-weight:700;background:#ffeaa7;color:#d4a017;border-radius:50px;padding:2px 10px;">${trophies.length} st</span>
      </div>
      <div class="skatt-section-body">
        <div class="skatt-trophy-grid">`;

    trophies.slice(0, 9).forEach((r, i) => {
      const d = new Date(r.created_at);
      const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      html += `<div class="skatt-trophy-item" style="animation-delay:${i * 60}ms;" title="${escHtml(r.reward_name)} · ${dateStr}">
        <span class="skatt-trophy-emoji">${r.reward_icon || '🎁'}</span>
        <span class="skatt-trophy-name">${escHtml(r.reward_name)}</span>
        <span class="skatt-trophy-badge">✅</span>
      </div>`;
    });

    if (trophies.length > 9) {
      html += `<div class="skatt-trophy-item" style="background:linear-gradient(135deg,#f0f0f0,#e8e8e8);">
        <span class="skatt-trophy-emoji" style="font-size:1.2rem;">+${trophies.length - 9}</span>
        <span class="skatt-trophy-name">fler trofeer</span>
      </div>`;
    }

    html += `</div>`;

    // Pending redemptions (inside trophy shelf)
    if (pending.length > 0) {
      html += `<div style="margin-top:14px;border-top:1.5px dashed rgba(0,0,0,0.06);padding-top:12px;">
        <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9AA0B8;margin-bottom:8px;font-family:'Outfit',sans-serif;">Väntar på godkännande</div>`;
      for (const r of pending) {
        html += `<div style="display:flex;align-items:center;gap:10px;background:#faf0ff;border:1.5px solid rgba(168,85,247,0.2);border-radius:14px;padding:10px 12px;margin-bottom:6px;">
          <span style="font-size:1.5rem;">${r.reward_icon || '🎁'}</span>
          <div style="flex:1;">
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.85rem;color:#1B2340;">${escHtml(r.reward_name)}</div>
            <div style="font-size:0.7rem;color:#A855F7;">⏳ Föräldern godkänner snart</div>
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    if (deniedRecent.length > 0) {
      html += `<div style="margin-top:14px;border-top:1.5px dashed rgba(0,0,0,0.06);padding-top:12px;">
        <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9AA0B8;margin-bottom:8px;font-family:'Outfit',sans-serif;">Inte den här gången</div>`;
      for (const r of deniedRecent) {
        html += `<div style="display:flex;align-items:center;gap:10px;background:#FEF2F2;border:1.5px solid rgba(239,68,68,0.2);border-radius:14px;padding:10px 12px;margin-bottom:6px;">
          <span style="font-size:1.5rem;">${r.reward_icon || '🎁'}</span>
          <div style="flex:1;">
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.85rem;color:#1B2340;">${escHtml(r.reward_name)}</div>
            <div style="font-size:0.7rem;color:#EF4444;">En vuxen sa nej — fråga igen senare 💛</div>
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    html += `</div></div>`;
  } else {
    // Empty trophy shelf — show placeholder
    html += `<div class="skatt-section">
      <div class="skatt-section-header">
        <div class="skatt-section-icon" style="background:linear-gradient(135deg,#fdcb6e,#e17055);">🏆</div>
        <span class="skatt-section-title" style="color:#c0392b;">Troféhyllan</span>
      </div>
      <div class="skatt-section-body" style="text-align:center;padding:20px 16px;">
        ${pending.length > 0 ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9AA0B8;margin-bottom:8px;font-family:'Outfit',sans-serif;">Väntar på godkännande</div>
            ${pending.map(r => `<div style="display:flex;align-items:center;gap:10px;background:#faf0ff;border:1.5px solid rgba(168,85,247,0.2);border-radius:14px;padding:10px 12px;margin-bottom:6px;">
              <span style="font-size:1.5rem;">${r.reward_icon || '🎁'}</span>
              <div style="flex:1;text-align:left;">
                <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.85rem;color:#1B2340;">${escHtml(r.reward_name)}</div>
                <div style="font-size:0.7rem;color:#A855F7;">⏳ Föräldern godkänner snart</div>
              </div>
            </div>`).join('')}
          </div>` : ''}
        <div style="font-size:2.5rem;margin-bottom:8px;opacity:0.4;">🏆</div>
        <div style="font-size:0.85rem;color:#9AA0B8;">Lös in en belöning — och vinn din första trofé!</div>
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════
  // 4. BELÖNINGSHYLLAN — All Rewards Grid (locked + unlocked)
  // ══════════════════════════════════════════════════════
  html += `<div class="skatt-section">
    <div class="skatt-section-header">
      <div class="skatt-section-icon" style="background:linear-gradient(135deg,#6c5ce7,#a29bfe);">🛍️</div>
      <span class="skatt-section-title" style="color:#6c5ce7;">Belöningshyllan</span>
      ${rewards.length > 0 ? `<span style="margin-left:auto;font-size:0.7rem;font-weight:700;background:#EDE7F6;color:#6c5ce7;border-radius:50px;padding:2px 10px;">${rewards.length} st</span>` : ''}
    </div>
    <div class="skatt-section-body">`;

  if (rewards.length === 0) {
    html += `<div style="text-align:center;padding:20px 0;">
      <div style="font-size:3rem;margin-bottom:10px;opacity:0.5;">🎁</div>
      <div style="font-family:'Outfit',sans-serif;font-weight:700;color:#1B2340;margin-bottom:4px;">Inga belöningar ännu!</div>
      <div style="font-size:0.82rem;color:#9AA0B8;">Be din förälder lägga till belöningar 🌟</div>
    </div>`;
  } else {
    // Grid: 3 columns on mobile, 4 on wider screens
    html += `<div class="skatt-reward-grid">`;
    for (const r of rewards) {
      const isRedeemed = redemptions.some(rd => rd.reward_id === r.id && (rd.status === 'approved' || rd.status === 'auto'));
      const hasPending = redemptions.some(rd => rd.reward_id === r.id && rd.status === 'pending');
      const canAfford = starBalance >= r.star_cost;
      const isCurrentGoal = goal && goal.reward_id === r.id;
      const pct = Math.min(100, Math.round((starBalance / r.star_cost) * 100));
      const isLocked = !canAfford && !isRedeemed && !hasPending;

      // Determine badge
      let badge = '';
      if (isRedeemed) badge = `<span class="skatt-rg-badge earned">✅</span>`;
      else if (hasPending) badge = `<span class="skatt-rg-badge pending">⏳</span>`;
      else if (isCurrentGoal) badge = `<span class="skatt-rg-badge goal">🎯</span>`;
      else if (isLocked) badge = `<span class="skatt-rg-badge locked">🔒</span>`;

      const cardClass = isRedeemed ? 'earned' : hasPending ? 'pending' : canAfford ? 'affordable' : 'locked';

      html += `<div class="skatt-rg-item ${cardClass}" ${!isLocked && !isRedeemed && !hasPending ? `onclick="requestRedeem('${r.id}')" style="cursor:pointer;"` : ''}>
        ${badge}
        <div class="skatt-rg-icon">${r.icon || '🎁'}</div>
        <div class="skatt-rg-name">${escHtml(r.name)}</div>
        <div class="skatt-rg-cost">⭐ ${r.star_cost}</div>
        ${isLocked ? `<div class="skatt-rg-bar"><div class="skatt-rg-bar-fill" style="width:${pct}%"></div></div>` : ''}
      </div>`;
    }
    html += `</div>`;

    // Affordables CTA strip — full-width redeem buttons for affordable rewards not yet redeemed
    const affordableUnredeemed = rewards.filter(r => {
      const isRedeemed = redemptions.some(rd => rd.reward_id === r.id && (rd.status === 'approved' || rd.status === 'auto'));
      const hasPending = redemptions.some(rd => rd.reward_id === r.id && rd.status === 'pending');
      return starBalance >= r.star_cost && !isRedeemed && !hasPending;
    });
    if (affordableUnredeemed.length > 0) {
      html += `<div style="margin-top:14px;border-top:1.5px dashed rgba(245,166,35,0.3);padding-top:14px;">
        <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B8860B;margin-bottom:8px;font-family:'Outfit',sans-serif;">✨ Du har råd nu!</div>`;
      for (const r of affordableUnredeemed) {
        html += `<div style="display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#FFFBEB,#FFF3D6);border:1.5px solid rgba(245,166,35,0.4);border-radius:14px;padding:10px 12px;margin-bottom:6px;">
          <span style="font-size:1.5rem;">${r.icon || '🎁'}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.85rem;color:#1B2340;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(r.name)}</div>
            <div style="font-size:0.7rem;color:#B8860B;">⭐ ${r.star_cost} stjärnor</div>
          </div>
          <button onclick="requestRedeem('${r.id}')" class="skatt-redeem-btn" style="min-height:40px;font-size:0.8rem;padding:8px 14px;width:auto;flex-shrink:0;">📨 Fråga</button>
        </div>`;
      }
      html += `</div>`;
    }
  }

  html += `</div></div>`;

  // ══════════════════════════════════════════════════════
  // 5. STJÄRNFRONTEN — Manual Star Grants
  // ══════════════════════════════════════════════════════
  if (grants.length > 0) {
    html += `<div class="skatt-section">
      <div class="skatt-section-header">
        <div class="skatt-section-icon" style="background:linear-gradient(135deg,#00b894,#55efc4);">✨</div>
        <span class="skatt-section-title" style="color:#00864e;">Bonus-stjärnor</span>
      </div>
      <div class="skatt-section-body">`;

    for (const g of grants.slice(0, 8)) {
      const d = new Date(g.created_at);
      const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      html += `<div class="skatt-grant-card">
        ${g.image_url ? `<img src="${escHtml(g.image_url)}" alt="" style="width:52px;height:52px;border-radius:14px;object-fit:cover;flex-shrink:0;border:2px solid rgba(34,197,94,0.2);">` :
          `<div style="width:44px;height:44px;min-width:44px;background:rgba(34,197,94,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;border:1.5px solid rgba(34,197,94,0.2);">⭐</div>`
        }
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-family:'Outfit',sans-serif;font-weight:800;font-size:0.9rem;color:#00864e;">+${g.star_count} ⭐</span>
            <span style="font-size:0.68rem;color:#9AA0B8;">${dateStr}</span>
          </div>
          <div style="font-size:0.82rem;color:#1B2340;line-height:1.35;">${escHtml(g.reason)}</div>
          <div style="font-size:0.68rem;color:#9AA0B8;margin-top:4px;">— ${escHtml(g.parent_name || 'Förälder')}</div>
        </div>
      </div>`;
    }
    html += `</div></div>`;
  }

  // ══════════════════════════════════════════════════════
  // 6. HISTORIKBOKEN — Redemption History
  // ══════════════════════════════════════════════════════
  const historyWins = [...trophies].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (historyWins.length > 0) {
    html += `<div class="skatt-section" style="margin-bottom:24px;">
      <div class="skatt-section-header">
        <div class="skatt-section-icon" style="background:linear-gradient(135deg,#74b9ff,#0984e3);">📖</div>
        <span class="skatt-section-title" style="color:#0652c5;">Historikboken</span>
      </div>
      <div class="skatt-section-body" style="padding-bottom:8px;">`;

    for (const r of historyWins.slice(0, 10)) {
      html += window.ChildDashboardWarmth
        ? window.ChildDashboardWarmth.renderHistoryStoryHtml(r)
        : `<div class="skatt-history-story"><div class="skatt-history-story-text">Du låste upp ${escHtml(r.reward_name)} ${r.reward_icon || '🎁'} 🎉</div></div>`;
    }

    html += `</div></div>`;
  }

  // Done — render to DOM
  const hubMeta = {
    starBalance,
    trophies,
    economyHtml: totalEarned > starBalance
      ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.55);margin-top:12px;font-family:'Plus Jakarta Sans',sans-serif;">Totalt tjänat: ⭐ ${totalEarned}</div>`
      : '',
    childName: me && me.name,
    childEmoji: me && me.emoji,
    avatarUrl: me && me.avatar_url,
  };

  if (!minimalUiActive && childUiMagic && window.ChildSkattHouse) {
    const homeMount = document.getElementById('homeHubMount');
    const homeLoader = document.getElementById('homeHubLoading');
    if (homeMount) {
      ChildSkattHouse.mountHome(homeMount, html, hubMeta).then(function () {
        if (homeLoader) homeLoader.style.display = 'none';
        homeMount.style.display = '';
      });
    }
    view.innerHTML = html;
  } else {
    view.innerHTML = html;
  }

  // Animate trophy items with staggered delays
  const trophyItems = view.querySelectorAll('.skatt-trophy-item');
  trophyItems.forEach((el, i) => {
    el.style.animationDelay = `${i * 70}ms`;
    el.style.opacity = '0';
    el.style.animationFillMode = 'forwards';
    setTimeout(() => { el.style.opacity = ''; }, i * 70 + 400);
  });
}

// ── Coin sound generator (Web Audio API) ──────────────
function playCoinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [880, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.2);
    });
    setTimeout(() => { try { ctx.close(); } catch(e) {} }, 1200);
  } catch(e) { /* Audio not available - silent fail */ }
}

// ── Coin ripple visual on entry ─────────────────────────
function coinEntryRipple() {
  const banner = document.querySelector('.skatt-banner');
  if (!banner) return;
  const r = document.createElement('div');
  r.className = 'coin-ripple';
  const rect = banner.getBoundingClientRect();
  r.style.left = (rect.left + rect.width / 2 - 10) + 'px';
  r.style.top = (rect.top + rect.height / 2 - 10) + 'px';
  document.body.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

// ── Redeem: sends request to parent ───────────────────
async function requestRedeem(rewardId) {
  // ── Offline: queue the request and show notice ──────────────────
  const isOffline = !navigator.onLine;
  if (isOffline) {
    if (window.OfflineQueue && me?.id) {
      OfflineQueue.queueRedeem(me.id, rewardId).catch(() => {});
      showToast('📶 Sparas — skickas när nätverket är tillbaka', false);
    } else {
      showToast('Kräver internet för att lösa in.', true);
    }
    return;
  }

  try {
    const data = await Auth.api('/api/me/rewards/' + rewardId + '/redeem', { method: 'POST' });
    rewardsLoaded = false;
    if (window.Platform && window.Platform.haptics) {
      window.Platform.haptics.medium();
    }
    showToast('📨 Inlösningsförfrågan skickad till föräldern!');
    await loadRewards();
  } catch (err) {
    const netErr = err && (err.message === 'Failed to fetch' || err.message === 'NetworkError when attempting to fetch resource.');
    if (netErr && window.OfflineQueue && me?.id) {
      OfflineQueue.queueRedeem(me.id, rewardId).catch(() => {});
      showToast('📶 Sparas — skickas när nätverket är tillbaka', false);
    } else {
      showToast(err.message || 'Kunde inte lösa in.', true);
    }
  }
}

// Keep backward compat
async function redeemReward(rewardId) { return requestRedeem(rewardId); }

// ── Goal picker modal ─────────────────────────────────
function openGoalPicker() {
  const rewards = _currentRewardsData ? _currentRewardsData.rewards : [];
  const goal = _currentGoalData ? _currentGoalData.goal : null;
  const hasGoal = !!(goal && goal.reward_id);
  const modal = document.getElementById('goalPickerModal');
  const list = document.getElementById('goalPickerList');
  if (!modal || !list) return;

  if (rewards.length === 0) {
    list.innerHTML = '<p class="text-text-soft text-center py-6">Inga belöningar tillgängliga ännu.</p>';
  } else {
    list.innerHTML = rewards.map(r => `
      <button onclick="setGoal('${r.id}', ${hasGoal})" class="w-full flex items-center gap-3 bg-white hover:bg-gold-light rounded-xl p-3 text-left transition-colors border border-lavender mb-2 min-h-[56px]">
        <span class="text-3xl">${r.icon || '🎁'}</span>
        <div class="flex-1 min-w-0">
          <p class="font-heading font-bold text-sm text-navy truncate">${escHtml(r.name)}</p>
          <p class="text-xs text-text-soft">⭐ ${r.star_cost} stjärnor</p>
        </div>
        ${(goal && goal.reward_id === r.id) ? '<span class="text-xs bg-gold text-white px-2 py-0.5 rounded-full">Nuvarande</span>' : ''}
      </button>
    `).join('');
  }
  modal.classList.remove('hidden');
}

function closeGoalPicker() {
  const modal = document.getElementById('goalPickerModal');
  if (modal) modal.classList.add('hidden');
}

async function setGoal(rewardId, isChange) {
  closeGoalPicker();
  try {
    if (isChange) {
      // Send change request to parent
      const data = await Auth.api('/api/me/goal/change-request', {
        method: 'POST',
        body: JSON.stringify({ to_reward_id: rewardId }),
      });
      showToast('📨 Bytebegäran skickad till föräldern!');
    } else {
      // Set directly (no existing goal)
      const data = await Auth.api('/api/me/goal', {
        method: 'POST',
        body: JSON.stringify({ reward_id: rewardId }),
      });
      showToast('🎯 ' + data.message);
      launchMilestoneConfetti();
    }
    rewardsLoaded = false;
    await loadRewards();
  } catch (err) {
    showToast(err.message || 'Kunde inte sätta mål.', true);
  }
}

// ── Milestone tracking ──────────────────────────────
// Each milestone fires once per child per day
// Stored in localStorage as { childId_date: [25, 50, 75, 100] }

// ── Milestone + celebration effects ──────────────────────
// Extracted to /js/child-dashboard-celebrations.js (Fas 8 F3).
// Exposes window.checkMilestones / launchMilestoneConfetti / launchDopaminBurst.

// ── Time Timer — circular SVG countdown ────────────────
// SVG circle circumference = 2π × r = 2π × 15.9 ≈ 99.9 ≈ 100
// stroke-dasharray="progress remaining" where progress+remaining=100.
// remaining = (1 - elapsed_fraction) * 100
// We update every 5 seconds for smoothness without battery drain.

let _timerInterval = null;
let _timerDoneFired = new Map(); // itemId → true (haptic already fired for this timer completion)

function initTimeTimers() {
  // Clear any previous ticker
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  _timerDoneFired.clear();
  if (!visualTimer) return;

  function tick() {
    const wraps = document.querySelectorAll('.time-timer-wrap[id]');
    if (wraps.length === 0) return;

    const nowMins = (() => {
      const d = new Date();
      return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    })();

    wraps.forEach(wrap => {
      const fill = wrap.querySelector('.time-timer-fill');
      if (!fill) return;

      const itemId = wrap.id.replace('timer-', '');
      const startMins = getTimeMinutes(fill.dataset.start);
      const endMins   = getTimeMinutes(fill.dataset.end);
      if (startMins === null || endMins === null || endMins <= startMins) return;

      const total = endMins - startMins;
      const elapsed = Math.max(0, Math.min(total, nowMins - startMins));
      const remaining = 1 - elapsed / total; // 1 = full, 0 = done
      const progress = Math.max(0, remaining * 100);

      // stroke-dasharray = "progress gap"
      fill.setAttribute('stroke-dasharray', `${progress.toFixed(1)} ${(100 - progress).toFixed(1)}`);

      // Colour shift: green → orange → red as time runs out
      if (remaining > 0.5) {
        fill.style.stroke = '#22C55E'; // plenty of time
      } else if (remaining > 0.2) {
        fill.style.stroke = '#F97316'; // getting close
      } else {
        fill.style.stroke = '#EF4444'; // urgent
      }

      // Haptic: fire once when timer hits 0 (remaining < 1%)
      if (remaining <= 0.01 && !_timerDoneFired.get(itemId)) {
        _timerDoneFired.set(itemId, true);
        if (window.Platform && window.Platform.haptics) {
          window.Platform.haptics.medium();
        }
      }
    });
  }

  tick(); // immediate first pass
  _timerInterval = setInterval(tick, 5000); // update every 5s
}

// ── Goal progress bar (top) ─────────────────────────────

function isTodayFocusLayer() {
  return document.documentElement.classList.contains('today-focus-mode');
}

function updateGoalBar(goalData) {
  if (isTodayFocusLayer()) {
    if (window.ChildTodayFocus) ChildTodayFocus.updateGoal(goalData);
    return;
  }
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
  if (window.ChildTodayFocus) ChildTodayFocus.updateGoal(goalData);
  if (window.ChildDashboardWarmth) window.ChildDashboardWarmth.updateGoalTeaser(goalData);
}

// ── Schedule / Activities ──────────────────────────────

function renderActivities(data, trueStarBalance) {
  const container = document.getElementById('scheduleView');
  const items = data.items || [];
  const isToday = currentDate === todayStr;

  // Use server-provided totals (covers full list even when items are pre-filtered)
  const total = data.total != null ? data.total : items.length;
  const completed = data.completed != null ? data.completed : items.filter(i => i.completed).length;
  const todayStars = items.filter(i => i.completed).reduce((s, i) => s + (i.star_value || 1), 0);
  const totalStarCount = total > 0 ? items.reduce((s, i) => s + (i.star_value || 1), 0) : 0;

  if (isTodayFocusLayer()) {
    if (window.ChildTodayFocus) ChildTodayFocus.updateProgress(completed, total);
  } else {
    // Legacy dashboard chrome (hidden in today-focus-mode)
    if (document.getElementById('progressLabel')) {
      document.getElementById('progressLabel').textContent = `${completed} av ${total} klara`;
    }
    if (document.getElementById('starCount')) {
      document.getElementById('starCount').textContent = `${todayStars} / ${totalStarCount} ⭐`;
    }
    if (window.ChildDashboardWarmth) window.ChildDashboardWarmth.updateTodayStars(todayStars);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (document.getElementById('progressBar')) {
      document.getElementById('progressBar').style.width = `${pct}%`;
    }
    const ringEl = document.getElementById('emojiProgressRing');
    if (ringEl) {
      const circ = 2 * Math.PI * 18;
      const filled = total > 0 ? (completed / total) * circ : 0;
      const remaining = circ - filled;
      ringEl.setAttribute('stroke-dasharray', `${filled.toFixed(1)} ${remaining.toFixed(1)}`);
      if (total === 0 || completed === 0) {
        ringEl.setAttribute('stroke', 'rgba(255,255,255,0.18)');
      } else if (completed === total) {
        ringEl.setAttribute('stroke', '#22C55E');
      } else {
        ringEl.setAttribute('stroke', '#F5A623');
      }
    }
    const ringBadge = document.getElementById('ringActivityBadge');
    if (ringBadge) {
      ringBadge.textContent = `${completed}/${total}`;
      if (total === 0 || completed === 0) {
        ringBadge.style.background = '#6B7280';
      } else if (completed === total) {
        ringBadge.style.background = '#22C55E';
      } else {
        ringBadge.style.background = '#F5A623';
      }
    }
    const totalBalanceEl = document.getElementById('totalStarBalance');
    if (totalBalanceEl) {
      totalBalanceEl.textContent = `⭐ ${trueStarBalance !== undefined ? trueStarBalance : todayStars}`;
    }
  }
  if (isToday) {
    checkMilestones(total, completed);
  }

  // When backend has pre-filtered for NOW/NEXT/LATER and returned 0 items,
  // it means all activities are completed — show celebration
  const backendFiltered = !!data.now_next_filtered;
  if (items.length === 0 && backendFiltered && total > 0 && completed === total) {
    // All done — show celebration (handled below after the rendering block)
  } else if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16 bg-white rounded-2xl mt-2">
        <p class="text-6xl mb-4">${isToday ? '🌟' : '📅'}</p>
        <p class="text-xl font-heading font-bold text-navy mb-2">${isToday ? 'Inga aktiviteter idag!' : 'Inget schema den här dagen'}</p>
        <p class="text-text-soft text-sm">${isToday ? 'Njut av din lediga dag ⭐' : 'Välj en annan dag för att se schemat'}</p>
      </div>`;
    return;
  }

  let html = '';

  // ── Group items by section (MORGON/DAG/KVÄLL/NATT) ───────
  const sectionOrder = ['morgon', 'dag', 'kvall', 'natt'];
  const sections = {};
  for (const item of items) {
    const s = item.section || 'dag';
    if (!sections[s]) sections[s] = [];
    sections[s].push(item);
  }

  if (viewType === 'day_sections') {
    // ── Dagsvy: Färgkodade dagdelssektioner ──────────────────
    // 'dag' items are split visually: <12:00 → förmiddag, ≥12:00 or no time → eftermiddag
    // Section rendering order: morgon → förmiddag → eftermiddag → kvall → natt

    const dagItems = sections['dag'] || [];
    const formiddagItems = [];
    const eftermiddagItems = [];
    for (const item of dagItems) {
      const startMins = getTimeMinutes(item.start_time);
      // No time or before noon → förmiddag; noon onwards → eftermiddag
      if (startMins !== null && startMins >= 12 * 60) {
        eftermiddagItems.push(item);
      } else {
        formiddagItems.push(item);
      }
    }

    // Sort each sub-group by start_time
    const sortByTime = (arr) => [...arr].sort((a, b) => {
      const am = getTimeMinutes(a.start_time);
      const bm = getTimeMinutes(b.start_time);
      if (am === null && bm === null) return 0;
      if (am === null) return 1;
      if (bm === null) return -1;
      return am - bm;
    });

    const dagdelGroups = [
      { key: 'morgon',      items: sortByTime(sections['morgon'] || []) },
      { key: 'formiddag',   items: sortByTime(formiddagItems) },
      { key: 'eftermiddag', items: sortByTime(eftermiddagItems) },
      { key: 'kvall',       items: sortByTime(sections['kvall'] || []) },
      { key: 'natt',        items: sortByTime(sections['natt'] || []) },
    ];

    for (const group of dagdelGroups) {
      if (group.items.length === 0) continue; // hide empty sections
      const cfg = DAG_DEL_CONFIG[group.key];
      const doneCount = group.items.filter(i => i.completed).length;
      const totalCount = group.items.length;

      const progress = doneCount === 0 ? 'none' : doneCount === totalCount ? 'done' : 'partial';
      html += `<div class="dagdel-section" data-section="${group.key}" style="background:${cfg.bg};border:2px solid ${cfg.border};">
        <div class="dagdel-header" style="background:${cfg.headerBg};">
          <span class="dagdel-emoji">${cfg.emoji}</span>
          <span class="dagdel-label" style="color:${cfg.headerText};">${cfg.label}</span>
          <span class="dagdel-count" data-progress="${progress}" onclick="toggleNextInSection('${group.key}', event)" title="Bocka av nästa aktivitet">${doneCount}/${totalCount}</span>
        </div>
        <div class="dagdel-body">
          <div class="sortable-section space-y-3" data-sortable-section="${group.key}">`;

      for (const item of group.items) {
        html += renderActivityCard(item, isToday, null);
      }
      html += `</div>
        </div>
      </div>`;
    }

  } else {
    // ── NOW/NEXT/LATER timeline layout ────────────────────────

    // Determine NOW/NEXT/LATER status for each item.
    // If backend already filtered (now_next_filtered=true), use _nnl_status from API.
    // Otherwise, fall back to client-side classification.
    let timeStatusMap = {};
    if (backendFiltered) {
      // Backend tagged all items: done/now/next/later
      for (const item of items) {
        timeStatusMap[item.id] = item._nnl_status || 'now';
      }
    } else if (isToday && showNowNext) {
      // Client-side fallback: tag ALL items (done/now/next/later)
      let globalUnchecked = 0;
      for (const section of sectionOrder) {
        if (!sections[section]) continue;
        for (const item of sections[section]) {
          if (item.completed) {
            timeStatusMap[item.id] = 'done';
          } else {
            globalUnchecked++;
            if (globalUnchecked === 1) {
              timeStatusMap[item.id] = 'now';
            } else if (globalUnchecked === 2) {
              timeStatusMap[item.id] = 'next';
            } else {
              timeStatusMap[item.id] = 'later';
            }
          }
        }
      }
    }

    const filterActive = backendFiltered || (isToday && showNowNext);

    if (filterActive) {
      // Timeline layout: completed history → NU → NÄSTA → SEDAN
      const doneItems = [];
      const nowItems = [];
      const nextItems = [];
      const laterItems = [];
      for (const section of sectionOrder) {
        if (!sections[section]) continue;
        for (const item of sections[section]) {
          const status = timeStatusMap[item.id];
          if (status === 'done') doneItems.push(item);
          else if (status === 'now') nowItems.push(item);
          else if (status === 'next') nextItems.push(item);
          else if (status === 'later') laterItems.push(item);
        }
      }

      // 1. Completed history at top (dimmed, not clickable)
      if (doneItems.length > 0) {
        html += `<div class="mb-4">
          <div class="nl-section-label" style="color:#22C55E;">✅ Klart</div>
          <div class="space-y-2">`;
        for (const item of doneItems) {
          html += renderDoneHistoryCard(item);
        }
        html += `</div></div>`;
      }

      // 2. NOW card (featured)
      if (nowItems.length > 0) {
        html += `<div class="mb-4"><div class="sortable-section space-y-3" data-sortable-section="now">`;
        for (const item of nowItems) {
          html += renderNowCard(item, true);
        }
        html += `</div></div>`;
      }

      // 3. NEXT card
      if (nextItems.length > 0) {
        html += `<div class="mb-4"><div class="sortable-section space-y-3" data-sortable-section="next">`;
        for (const item of nextItems) {
          html += renderActivityCard(item, isToday, 'next');
        }
        html += `</div></div>`;
      }

      // 4. LATER cards (ALL remaining)
      if (laterItems.length > 0) {
        html += `<div class="mb-4">
          <div class="nl-section-label">📋 Sedan</div>
          <div class="sortable-section space-y-3" data-sortable-section="later">`;
        for (const item of laterItems) {
          html += renderActivityCard(item, isToday, 'later');
        }
        html += `</div></div>`;
      }
    } else {
      // Normal section-grouped layout (non-filtered view for now_next_later on non-today)
      for (const section of sectionOrder) {
        if (!sections[section]) continue;
        html += `<div class="mb-6" data-section="${section}">
          <h3 class="text-sm font-heading font-bold text-text-soft uppercase tracking-wider mb-3">${getSectionLabel(section)}</h3>
          <div class="sortable-section space-y-3" data-sortable-section="${section}">`;
        for (const item of sections[section]) {
          html += renderActivityCard(item, isToday, null);
        }
        html += '</div></div>';
      }
    }
  }

  // Initialize SortableJS on section containers (if reorder is allowed)
  setTimeout(() => initChildSortable(), 50);

  // Celebration (today only — when all activities are completed)
  if (isToday && completed === total && total > 0) {
    const celebEmojis = ['🌟', '🎉', '⭐', '🏆', '🎈', '🌈', '🥳'];
    const mainEmoji = celebEmojis[Math.floor(Math.random() * celebEmojis.length)];
    const messages = [
      'Du är en stjärna! ⭐', 'Fantastiskt jobbat! 🙌', 'Vilken superdag! 🚀',
      'Du klarade allt! 🎯', 'Imponerande! 💪', 'Duktig! Helt otroligt! 🏅', 'Alla bockar! Wooho! 🎊',
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    html += `<div class="text-center py-10 bg-gradient-to-br from-gold-light to-mint rounded-2xl mt-4 celeb-slide" id="celebCard">
      <div class="text-7xl mb-4 celeb-emoji">${mainEmoji}</div>
      <h3 class="text-2xl font-heading font-bold text-navy mb-2">Alla klara!</h3>
      <p class="text-text-soft text-base mb-3">${msg}</p>
      <div class="inline-flex items-center gap-2 bg-white/70 rounded-full px-5 py-2 font-heading font-bold text-navy">
        ⭐ ${completed} aktiviteter klara idag!
      </div>
    </div>`;
    setTimeout(() => launchConfetti(), 200);
  }

  container.innerHTML = html;
  // Start Time Timer ticks after DOM is updated
  initTimeTimers();

  // Auto-expand sub-steps for the NOW activity (first incomplete item with sub-steps)
  // so the child immediately sees what to do without extra taps.
  const allCards = container.querySelectorAll('[data-sub-step-count]');
  for (const card of allCards) {
    const count = parseInt(card.dataset.subStepCount || '0', 10);
    const itemId = card.dataset.itemId;
    if (count > 0 && itemId && !subStepExpanded[itemId]) {
      // Auto-expand: simulate the expand click
      const btn = document.getElementById('expand-btn-' + itemId);
      if (btn) {
        expandSubSteps(new Event('click'), itemId);
      }
      break; // Only auto-expand the first one (the NOW item)
    }
  }
  if (window.ChildTodayTasks) ChildTodayTasks.afterRender(data, isToday);
}

// ── NOW card (large, featured) ──────────────────────────

function renderNowCard(item, canToggle) {
  if (window.ChildSevenQuestions && typeof ChildSevenQuestions.tryRender === 'function') {
    const teacchHtml = ChildSevenQuestions.tryRender(item, canToggle);
    if (teacchHtml) {
      if (window.ChildPackageNav) ChildPackageNav.setNavHidden(true);
      return teacchHtml;
    }
  }
  if (window.ChildPackageNav) ChildPackageNav.setNavHidden(false);

  const isDone = item.completed;
  const timeStr = item.start_time ? (item.end_time ? `${item.start_time}–${item.end_time}` : item.start_time) : '';
  const checkAttr = canToggle && !isDone ? `onclick="toggleItem('${item.id}', false)"` : '';
  const hasSubSteps = (item.sub_step_count || 0) > 0;
  const subStepCount = item.sub_step_count || 0;
  const cachedSteps = subStepCache[item.id];
  const subDone = cachedSteps ? cachedSteps.filter(s => s.completed).length : 0;
  const isExpanded = !!subStepExpanded[item.id];

  // Time Timer: show only if visualTimer is on, item is not done, and has start+end
  const showTimer = visualTimer && !isDone && item.start_time && item.end_time;
  const timerHtml = showTimer ? `
    <div class="time-timer-wrap" id="timer-${item.id}" aria-hidden="true">
      <svg class="time-timer-svg" width="52" height="52" viewBox="0 0 36 36">
        <circle class="time-timer-track" cx="18" cy="18" r="15.9"/>
        <circle class="time-timer-fill" id="timer-fill-${item.id}"
          cx="18" cy="18" r="15.9"
          stroke-dasharray="100 0"
          data-start="${item.start_time}"
          data-end="${item.end_time}"/>
      </svg>
    </div>` : '';

  const nowColorCls = getChildColorClass(item.name);
  return `
    <div class="now-card ${isDone ? 'done' : ''} ${nowColorCls}" id="card-${item.id}"
         data-feedback-for="${item.feedback_for || 'both'}"
         data-item-icon="${item.icon || '⭐'}"
         data-item-name="${escHtml(item.name)}"
         data-item-id="${item.id}"
         data-sub-step-count="${subStepCount}">
      <div class="now-badge"><div class="pulse-dot"></div> NU</div>
      <div class="now-activity">
        <div class="now-emoji">${item.icon || '⭐'}</div>
        <div class="now-details">
          <div class="now-title ${isDone ? 'line-through text-text-soft' : ''}">${escHtml(item.name)}</div>
          <div class="flex items-center gap-2 mt-0.5">
            ${timeStr && !hideClock ? `<span class="now-time"><span>🕐</span> ${timeStr}</span>` : ''}
            ${item.star_value > 0 ? `<span class="inline-flex items-center gap-0.5 text-sm font-bold" style="color:#F5A623;">${'⭐'.repeat(Math.min(item.star_value, 5))}</span>` : ''}
            ${hasSubSteps ? `<span class="substep-progress ${subDone === subStepCount ? 'all-done' : ''}" id="substep-badge-${item.id}">${subDone}/${subStepCount}</span>` : ''}
          </div>
        </div>
        ${timerHtml}
        ${isDone
          ? `<div class="now-check" style="background:#22C55E; border-color:#22C55E;"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>`
          : `<button class="now-check" ${checkAttr}></button>`
        }
      </div>
      ${hasSubSteps ? `
      <div class="mt-3 pt-2 border-t" style="border-color:rgba(245,166,35,0.25)" onclick="event.stopPropagation()">
        <div style="position:relative;display:inline-block;">
          <button class="expand-btn ${isExpanded ? 'open' : ''} ${!isExpanded && !_substepIntroSeen ? 'intro-hint' : ''}" id="expand-btn-${item.id}"
                  onclick="expandSubSteps(event, '${item.id}')">
            📋 Delsteg <span class="chevron">▾</span>
          </button>
          ${!isExpanded && !_substepIntroSeen ? `<div class="intro-tooltip" id="intro-tooltip-${item.id}">Tryck för att se stegen! 👆</div>` : ''}
        </div>
        <div class="substep-container ${isExpanded ? 'expanded' : ''}" id="substeps-${item.id}">
          ${isExpanded && cachedSteps ? renderSubStepListHtml(item.id, cachedSteps) : ''}
        </div>
      </div>` : ''}
    </div>`;
}

// ── DONE history card (compact, dimmed, non-interactive) ───

function renderDoneHistoryCard(item) {
  const timeStr = item.start_time || '';
  return `
    <div class="nl-card done" style="opacity:0.55; background:#F0FDF4; border-color:#BBF7D0; pointer-events:none;" id="card-${item.id}"
         data-item-id="${item.id}">
      <div style="width:32px;height:32px;background:#22C55E;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
      </div>
      <div class="nl-emoji" style="background:#E0F5EC;">${item.icon || '⭐'}</div>
      <div class="nl-info">
        <div class="nl-title" style="text-decoration:line-through; color:#6B7280;">${escHtml(item.name)}</div>
        ${timeStr && !hideClock ? `<div class="nl-time"><span>🕐</span> ${timeStr}</div>` : ''}
      </div>
    </div>`;
}

// ── NEXT / LATER / PAST cards (compact row) ──────────────

function renderNLCard(item, view, canToggle) {
  const isDone = item.completed;
  const timeStr = item.start_time || '';
  const isPast = view === 'past';
  const chipClass = isPast ? 'chip-redan' : view === 'next' ? 'chip-next' : 'chip-later';
  const chipLabel = isPast ? 'Redan' : view === 'next' ? 'Nästa' : 'Sedan';
  const cardClass = view === 'next' ? 'next-card' : view === 'past' ? 'past-card' : 'later-card';
  const clickAttr = canToggle && !isDone ? `onclick="toggleItem('${item.id}', ${isDone})"` : '';

  const nlColorCls = getChildColorClass(item.name);
  return `
    <div class="nl-card ${cardClass} ${isDone ? 'done' : ''} ${nlColorCls}" id="card-${item.id}"
         data-feedback-for="${item.feedback_for || 'both'}"
         data-item-icon="${item.icon || '⭐'}"
         data-item-name="${escHtml(item.name)}"
         data-item-id="${item.id}"
         ${clickAttr}>
      ${isPast ? '' : `<div class="nl-chip ${chipClass}">${chipLabel}</div>`}
      ${isPast ? `<div class="nl-chip chip-redan">Redan</div>` : ''}
      <div class="nl-emoji">${item.icon || '⭐'}</div>
      <div class="nl-info">
        <div class="nl-title ${isDone ? 'line-through' : ''}">${escHtml(item.name)}</div>
        ${timeStr && !hideClock ? `<div class="nl-time"><span>🕐</span> ${timeStr}</div>` : ''}
      </div>
      ${isDone
        ? `<div style="width:32px;height:32px;background:#22C55E;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>`
        : ''
      }
    </div>`;
}

function renderActivityCard(item, isToday, timeStatus) {
  const isDone = item.completed;
  // In filtered NOW/NEXT/LATER view, only NOW cards (and section-grouped cards where timeStatus is null) are toggleable.
  // NEXT and LATER cards should NOT be clickable or show a checkbox.
  const isNextOrLater = timeStatus === 'next' || timeStatus === 'later';
  const canToggle = isToday && !isNextOrLater;
  const timeStr = item.start_time ? (item.end_time ? `${item.start_time}–${item.end_time}` : item.start_time) : '';
  const rating = itemRatings[item.id];
  const feedbackFor = item.feedback_for || 'both';
  const isPast = timeStatus === 'past';
  const isNext = timeStatus === 'next';

  // Rating display (child score shown as n/10, parent score as stars)
  let ratingHtml = '';
  if (rating && rating.child_score) {
    ratingHtml = `<span class="text-xs ml-1 font-semibold" title="Ditt betyg" style="color:#F5A623">${rating.child_score}/10</span>`;
    if (rating.parent_score) {
      ratingHtml += `<span class="text-xs text-text-soft ml-1" title="Förälderns betyg">👨‍👩‍👧 ${'⭐'.repeat(rating.parent_score)}</span>`;
    }
  } else if (rating && rating.parent_score) {
    ratingHtml = `<span class="text-xs ml-1 text-text-soft" title="Förälderns betyg">👨‍👩‍👧 ${'⭐'.repeat(rating.parent_score)}</span>`;
  }

  // NU/NÄSTA/SEDAN badge (only for today's view when feature is enabled)
  const isLater = timeStatus === 'later';
  let badgeHtml = '';
  if (isNext) {
    badgeHtml = '<span class="inline-block text-[0.62rem] font-bold font-heading uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDE9FF] text-[#6B50F5] mb-1">▶ Nästa</span>';
  } else if (isLater && !isDone) {
    badgeHtml = '<span class="inline-block text-[0.62rem] font-bold font-heading uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669] mb-1">Sedan</span>';
  }

  const hasSubSteps = (item.sub_step_count || 0) > 0;
  const subStepCount = item.sub_step_count || 0;
  // Pre-compute completed sub-steps from cache (updated optimistically)
  const cachedSteps = subStepCache[item.id];
  const subDone = cachedSteps ? cachedSteps.filter(s => s.completed).length : 0;
  const isExpanded = !!subStepExpanded[item.id];

  const actColorCls = getChildColorClass(item.name);
  return `
    <div class="activity-card ${isDone ? 'done' : ''} ${isLater && !isDone ? 'opacity-60' : ''} ${actColorCls} bg-white rounded-xl p-4 shadow-sm border-2 ${isDone ? 'border-green-200' : isNext ? 'border-[#6B50F5]/30' : 'border-transparent'} ${canToggle ? 'cursor-pointer' : ''} group"
         id="card-${item.id}"
         data-feedback-for="${feedbackFor}"
         data-item-icon="${item.icon || '⭐'}"
         data-item-name="${escHtml(item.name)}"
         data-item-id="${item.id}"
         data-sub-step-count="${subStepCount}"
         ${canToggle ? `onclick="toggleItem('${item.id}', ${isDone})"` : ''}>
      ${badgeHtml ? `<div class="mb-1">${badgeHtml}</div>` : ''}
      <div class="flex items-center gap-3">
        ${allowChildReorder ? `<div class="drag-handle shrink-0 flex items-center justify-center w-11 h-11 cursor-grab active:cursor-grabbing text-text-soft hover:text-navy active:text-navy transition-colors select-none touch-none" title="Dra för att ändra ordning" aria-label="Dra för att ändra ordning">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="7" cy="4" r="1.5"/><circle cx="13" cy="4" r="1.5"/>
            <circle cx="7" cy="10" r="1.5"/><circle cx="13" cy="10" r="1.5"/>
            <circle cx="7" cy="16" r="1.5"/><circle cx="13" cy="16" r="1.5"/>
          </svg>
        </div>` : ''}
        ${!isNextOrLater || isDone ? `<div class="card-check w-12 h-12 rounded-full border-2 ${isDone ? 'bg-green-500 border-green-500' : 'border-lavender'} flex items-center justify-center flex-shrink-0">
          ${isDone ? '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>' : ''}
        </div>` : ''}
        <div class="text-3xl flex-shrink-0">${item.icon || '⭐'}</div>
        <div class="flex-1 min-w-0">
          <h4 class="font-heading font-bold text-base ${isDone ? 'line-through text-text-soft' : 'text-navy'} truncate">${escHtml(item.name)}</h4>
          <div class="flex items-center flex-wrap gap-1 mt-0.5">
            ${timeStr && !hideClock ? `<span class="text-xs text-text-soft">${timeStr}</span>` : ''}
            ${item.star_value > 0 ? `<span class="inline-flex items-center gap-0.5 text-xs font-bold" style="color:#F5A623;">${'⭐'.repeat(Math.min(item.star_value, 5))}</span>` : ''}
            ${ratingHtml}
            ${hasSubSteps ? `<span class="substep-progress ${subDone === subStepCount ? 'all-done' : ''}" id="substep-badge-${item.id}">${subDone}/${subStepCount}</span>` : ''}
          </div>
        </div>
      </div>
      ${hasSubSteps ? `
      <div class="mt-3 pt-2 border-t border-lavender/50" onclick="event.stopPropagation()">
        <div style="position:relative;display:inline-block;">
          <button class="expand-btn ${isExpanded ? 'open' : ''} ${!isExpanded && !_substepIntroSeen ? 'intro-hint' : ''}" id="expand-btn-${item.id}"
                  onclick="expandSubSteps(event, '${item.id}')">
            📋 Delsteg <span class="chevron">▾</span>
          </button>
          ${!isExpanded && !_substepIntroSeen ? `<div class="intro-tooltip" id="intro-tooltip-${item.id}">Tryck för att se stegen! 👆</div>` : ''}
        </div>
        <div class="substep-container ${isExpanded ? 'expanded' : ''}" id="substeps-${item.id}">
          ${isExpanded && cachedSteps ? renderSubStepListHtml(item.id, cachedSteps) : ''}
        </div>
      </div>` : ''}
    </div>`;
}

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
let _expandLoading = {}; // itemId -> true while a fetch is in-flight
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
  _pendingLoadDay = loadDay(currentDate, false).finally(() => {
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
    if (typeof loadRewards === 'function' && rewardsLoaded) {
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
    if (window.ChildRewardsEngine && goalData) {
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

// ── Child logout ────────────────────────────────────────
async function childLogout() {
  await Auth.logout({ childFlow: true });
}

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
    if (window.ChildWorldsNav && ChildWorlds.V2_ENABLED) ChildWorldsNav.renderBottomNav();
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