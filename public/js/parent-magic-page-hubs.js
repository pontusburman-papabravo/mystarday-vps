/**
 * parent-magic-page-hubs.js — Mockup heroes for schedule / family / settings.
 */
(function () {
  'use strict';

  const SETTINGS_GROUPS = [
    { id: 'profile', icon: '👤', iconClass: 'profile', title: 'Profil & konto', sub: 'Inloggning, PIN och konto' },
    { id: 'family', icon: '👨‍👩‍👧', iconClass: 'family', title: 'Familj', sub: 'Lägg till vuxen, namn och pedagoger' },
    { id: 'appearance', icon: '🎨', iconClass: 'app', title: 'Utseende', sub: 'Mörkt eller ljust tema' },
    { id: 'app', icon: '📱', iconClass: 'app', title: 'App', sub: 'Notiser, push och integritet' },
  ];

  const PAGE_HEROES = {
    planning: { icon: '📅', title: 'Planering', sub: 'Bygg innehåll eller planera barnens vecka.' },
    rewards: { icon: '🎁', title: 'Belöningar', sub: 'Stjärnor, belöningar och familjekista.' },
    calendar: { icon: '📆', title: 'Kalender', sub: 'Månadsvy över alla barn' },
    activities: { icon: '📋', title: 'Aktiviteter', sub: 'Hantera barnens aktiviteter' },
    'assign-schedule': { icon: '📅', title: 'Tilldela schema', sub: 'Kopiera schema till barn' },
    'daily-log': { icon: '📝', title: 'Daglig logg', sub: 'Följ barnens dag — fyll i stjärnor i efterhand' },
    skattkammaren: { icon: '🏆', title: 'Skattkammaren', sub: 'Belöningar och stjärnor' },
    'child-settings': { icon: '⭐', title: 'Barninställningar', sub: 'Vy, PIN och anpassning' },
    'family-child': { icon: '⚙️', title: 'Barnets inställningar', sub: 'Schema, vy, PIN och anpassning' },
    notifications: { icon: '🔔', title: 'Notiser', sub: 'Påminnelser och meddelanden' },
  };

  let _activeSettingsGroup = null;

  function escHtml(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function mount() {
    return document.getElementById('parentMagicPageMount');
  }

  function planningBackButton() {
    if (window.PlanningBackNav && PlanningBackNav.isFromPlanning()) {
      return '<button type="button" class="library-magic-planning-back planning-magic-back" data-planning-back="1">← Till planering</button>';
    }
    return '';
  }

  function bindPlanningBack(root) {
    if (!root) return;
    const btn = root.querySelector('[data-planning-back]');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      if (window.PlanningBackNav) PlanningBackNav.goBack();
      else window.location.href = '/planning';
    });
  }

  function renderScheduleModeBar() {
    return '<div class="schedule-mode-toggle schedule-magic-mode-bar" role="group" aria-label="Schemavy">' +
      '<button type="button" class="schedule-mode-btn active" data-schedule-mode="single">👤 Mitt barn</button>' +
      '<button type="button" class="schedule-mode-btn" data-schedule-mode="family">👨‍👩‍👧 Alla barn</button>' +
      '</div>';
  }

  function bindScheduleModeBar(root) {
    if (!root || typeof window.setScheduleMode !== 'function') return;
    root.querySelectorAll('[data-schedule-mode]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        const mode = btn.getAttribute('data-schedule-mode');
        window.setScheduleMode(mode);
        root.querySelectorAll('.schedule-magic-mode-bar .schedule-mode-btn').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-schedule-mode') === mode);
        });
      });
    });
  }

  function renderGenericHero(cfg) {
    return '<div class="magic-page-shell magic-3d-scene">' +
      planningBackButton() +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">' + cfg.icon + '</div>' +
      '<div><h1>' + escHtml(cfg.title) + '</h1><p>' + escHtml(cfg.sub) + '</p></div>' +
      '</div></div>';
  }

  function renderScheduleHero() {
    let childCount = 0;
    if (typeof children !== 'undefined' && Array.isArray(children)) {
      childCount = children.length;
    }
    return '<div class="magic-page-shell magic-3d-scene">' +
      planningBackButton() +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">📅</div>' +
      '<div><h1>Veckoschema</h1><p>Planera och anpassa barnens dagar</p></div>' +
      '</div>' +
      renderScheduleModeBar() +
      '<div class="magic-page-stats">' +
      '<div class="magic-page-stat-card magic-3d-card"><strong>' + childCount + '</strong><span>Barn</span></div>' +
      '<div class="magic-page-stat-card magic-3d-card"><strong>7</strong><span>Dagar</span></div>' +
      '</div></div>';
  }

  function renderForDigHero(opts) {
    const greeting = (opts && opts.greeting) || 'Hej 👋';
    const focus = (opts && opts.focus) || 'Vad vill du fokusera på just nu?';
    return '<div class="magic-page-shell magic-3d-scene">' +
      '<div class="magic-page-hero for-dig-magic-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">✨</div>' +
      '<div><h1>' + escHtml(greeting) + '</h1><p class="for-dig-magic-focus">' + escHtml(focus) + '</p></div>' +
      '</div></div>';
  }

  function updateForDigHero(opts) {
    const el = mount();
    if (!el || !(window.ParentMagicShell && ParentMagicShell.isMagic())) return;
    const page = document.body.getAttribute('data-magic-page');
    if (page !== 'for-dig') return;
    el.innerHTML = renderForDigHero(opts);
    el.classList.remove('hidden');
  }

  function renderFamilyHero() {
    const summary = document.getElementById('familySummary');
    const sub = summary && summary.textContent ? summary.textContent : 'Er familj på ett ställe';
    const childN = document.querySelectorAll('#childrenGrid > *').length;
    const adultN = document.querySelectorAll('#adultsGrid > *').length;
    return '<div class="magic-page-shell magic-3d-scene">' +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">👨‍👩‍👧</div>' +
      '<div><h1>Familjen</h1><p>' + escHtml(sub) + '</p></div>' +
      '</div>' +
      '<div class="magic-page-stats">' +
      '<div class="magic-page-stat-card magic-3d-card"><strong>' + childN + '</strong><span>Barn</span></div>' +
      '<div class="magic-page-stat-card magic-3d-card"><strong>' + adultN + '</strong><span>Vuxna</span></div>' +
      '</div>' +
      '<div class="magic-hub-links grid gap-3 mt-3 max-w-lg">' +
      '<a href="#custodyScheduleSection" class="flex items-center gap-3 p-4 bg-white/80 rounded-2xl border-2 border-lavender no-underline text-navy">' +
      '<span class="text-2xl" aria-hidden="true">🏠</span>' +
      '<span><strong class="block">Boendeschema</strong>' +
      '<span class="text-text-soft text-sm">Växelvis boende — vecka A/B</span></span></a>' +
      '</div></div>';
  }

  function renderSettingsMenu() {
    return '<div class="magic-page-shell magic-3d-scene magic-page-hero-wrap">' +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">⚙️</div>' +
      '<div><h1>Inställningar</h1><p>Profil, familj och app — grupperat som i mockupen</p></div>' +
      '</div></div>' +
      '<div class="magic-settings-menu">' +
      SETTINGS_GROUPS.map(function (g) {
        return '<button type="button" class="magic-settings-group-card magic-3d-card" data-settings-group="' + g.id + '">' +
          '<span class="magic-settings-group-icon ' + g.iconClass + '" aria-hidden="true">' + g.icon + '</span>' +
          '<span class="magic-settings-group-text"><strong>' + escHtml(g.title) + '</strong>' +
          '<span>' + escHtml(g.sub) + '</span></span>' +
          '<span class="library-magic-menu-arrow" aria-hidden="true">›</span></button>';
      }).join('') +
      '</div>';
  }

  function renderSettingsBackBar() {
    const g = SETTINGS_GROUPS.find(function (x) { return x.id === _activeSettingsGroup; });
    const title = g ? g.title : 'Tillbaka';
    return '<div class="magic-settings-back-bar">' +
      '<button type="button" class="magic-settings-back" data-settings-back="1">← ' + escHtml(title) + '</button>' +
      '</div>';
  }

  function showSettingsGroup(groupId) {
    _activeSettingsGroup = groupId;
    document.body.classList.add('magic-settings-in-group');
    document.querySelectorAll('[data-magic-settings-content]').forEach(function (el) {
      const show = el.getAttribute('data-magic-settings-content') === groupId;
      el.classList.toggle('hidden', !show);
    });
    const backBar = document.getElementById('magicSettingsBackBar');
    if (backBar) backBar.innerHTML = renderSettingsBackBar();
    if (groupId === 'appearance') updateThemePickerUi();
  }

  function hideSettingsGroup() {
    resetSettingsState();
  }

  function bindSettingsEvents(root) {
    root.onclick = function (e) {
      const groupBtn = e.target.closest('[data-settings-group]');
      if (groupBtn) {
        showSettingsGroup(groupBtn.getAttribute('data-settings-group'));
        return;
      }
      if (e.target.closest('[data-settings-back]')) {
        hideSettingsGroup();
        refresh('settings', true);
      }
    };
    const backMount = document.getElementById('magicSettingsBackBar');
    if (backMount) {
      backMount.onclick = function (e) {
        if (e.target.closest('[data-settings-back]')) {
          hideSettingsGroup();
          refresh('settings', true);
        }
      };
    }
  }

  function renderThemePicker() {
    const current = (window.AppViewMode && AppViewMode.getTheme) ? AppViewMode.getTheme() : 'dark';
    function opt(value, label, swatch) {
      const active = current === value ? ' is-active' : '';
      return '<button type="button" class="magic-theme-option' + active + '" data-theme="' + value + '" ' +
        'aria-pressed="' + (current === value) + '">' +
        '<span class="magic-theme-swatch ' + swatch + '" aria-hidden="true"></span>' + escHtml(label) + '</button>';
    }
    return '<div class="magic-theme-picker" id="magicThemePicker">' +
      opt('dark', 'Mörkt', 'dark') +
      opt('light', 'Ljust', 'light') +
      '</div>';
  }

  function updateThemePickerUi() {
    const current = (window.AppViewMode && AppViewMode.getTheme) ? AppViewMode.getTheme() : 'dark';
    document.querySelectorAll('#magicThemePicker .magic-theme-option').forEach(function (btn) {
      const on = btn.getAttribute('data-theme') === current;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on);
    });
  }

  function handleThemePickerActivate(e) {
    const btn = e.target.closest('.magic-theme-option[data-theme]');
    if (!btn || !btn.closest('#magicAppearanceSection')) return;
    if (!window.AppViewMode || !AppViewMode.setTheme) return;
    AppViewMode.setTheme(btn.getAttribute('data-theme'));
    updateThemePickerUi();
  }

  // Document-level delegation — survives soft-nav DOM swaps and works on mobile
  // (per-section listeners were lost when swapMain replaced <main> children).
  function bindThemePickerDelegation() {
    if (window._magicThemePickerBound) return;
    window._magicThemePickerBound = true;
    document.addEventListener('click', handleThemePickerActivate, true);
    if (window.AppViewMode && AppViewMode.onThemeChange) {
      AppViewMode.onThemeChange(updateThemePickerUi);
    }
  }

  // Appearance has no legacy DOM section — inject one so the group system
  // (show/hide by data-magic-settings-content) works like the others.
  function ensureAppearanceSection() {
    if (document.getElementById('magicAppearanceSection')) return;
    // Anchor next to an existing settings section so it lives in the same column.
    const anchor = document.getElementById('notifForm');
    const refSec = anchor ? anchor.closest('section') : null;
    const container = refSec ? refSec.parentNode : null;
    if (!container) return;
    const sec = document.createElement('section');
    sec.id = 'magicAppearanceSection';
    sec.className = 'hidden';
    sec.innerHTML =
      '<div class="bg-white rounded-2xl border border-lavender p-5">' +
      '<h2 class="font-heading text-navy text-lg mb-1">Utseende</h2>' +
      '<p class="text-text-soft text-sm mb-3">Välj mörk eller ljus bakgrund. Valet följer ditt konto på alla enheter.</p>' +
      renderThemePicker() +
      '</div>';
    container.appendChild(sec);
    bindThemePickerDelegation();
  }

  function tagSettingsSections() {
    bindThemePickerDelegation();
    ensureAppearanceSection();
    function tagChild(childId, groupId) {
      const child = document.getElementById(childId);
      if (!child) return;
      const sec = child.closest('section');
      if (!sec) return;
      sec.setAttribute('data-magic-settings-content', groupId);
      sec.classList.add('hidden');
    }
    tagChild('magicAppearanceSection', 'appearance');
    tagChild('nativeAccountActions', 'profile');
    tagChild('accountSection', 'profile');
    tagChild('parentPinSection', 'profile');
    tagChild('legacyPasswordSection', 'profile');
    tagChild('prenumeration', 'profile');
    tagChild('settingsLegalSection', 'app');
    tagChild('familyName', 'family');
    tagChild('viewSwitchSection', 'family');
    tagChild('coParentInviteSection', 'family');
    tagChild('pedagogInviteSection', 'family');
    tagChild('notifForm', 'app');
    tagChild('pushSection', 'app');
    tagChild('reminderSection', 'app');
    tagChild('consentSection', 'app');
    tagChild('dataExportSection', 'app');
    tagChild('deletionSection', 'app');
  }

  function resetSettingsState() {
    _activeSettingsGroup = null;
    document.body.classList.remove('magic-settings-in-group');
    document.querySelectorAll('[data-magic-settings-content]').forEach(function (el) {
      el.classList.add('hidden');
    });
  }

  function openFromHash() {
    const hash = (window.location.hash || '').replace('#', '');
    if (hash === 'prenumeration') {
      showSettingsGroup('profile');
      setTimeout(function () {
        const el = document.getElementById('prenumeration');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return true;
    }
    return false;
  }

  function refresh(page, magic) {
    const el = mount();
    if (!el) return;

    if (!magic || !(window.ParentMagicShell && ParentMagicShell.isMagic())) {
      el.innerHTML = '';
      el.classList.add('hidden');
      resetSettingsState();
      document.querySelectorAll('[data-magic-settings-content]').forEach(function (sec) {
        sec.classList.remove('hidden');
      });
      return;
    }

    if (page !== 'settings') {
      resetSettingsState();
    }

    el.classList.remove('hidden');
    if (page === 'schedule') {
      el.innerHTML = renderScheduleHero();
      bindPlanningBack(el);
      bindScheduleModeBar(el);
    } else if (page === 'for-dig') {
      el.innerHTML = renderForDigHero();
    } else if (page === 'family') {
      el.innerHTML = renderFamilyHero();
    } else if (page === 'settings') {
      resetSettingsState();
      tagSettingsSections();
      el.innerHTML = renderSettingsMenu();
      bindSettingsEvents(el);
      const backBar = document.getElementById('magicSettingsBackBar');
      if (backBar) backBar.innerHTML = '';
      openFromHash();
    } else if (PAGE_HEROES[page]) {
      el.innerHTML = renderGenericHero(PAGE_HEROES[page]);
      bindPlanningBack(el);
    } else {
      el.innerHTML = '';
      el.classList.add('hidden');
    }
  }

  window.ParentMagicPageHub = {
    refresh: refresh,
    updateForDigHero: updateForDigHero,
    refreshScheduleHero: function () {
      const magic = window.ParentMagicShell && ParentMagicShell.isMagic();
      if (magic) refresh('schedule', true);
    },
    tagSettingsSections: tagSettingsSections,
    resetSettingsState: resetSettingsState,
    openFromHash: openFromHash,
    showSettingsGroup: showSettingsGroup,
  };

  bindThemePickerDelegation();
})();
