/**
 * parent-magic-page-hubs.js — Mockup heroes for schedule / family / settings.
 */
(function () {
  'use strict';

  function pt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  const SETTINGS_GROUPS = [
    { id: 'profile', icon: 'profil', iconClass: 'profile', titleKey: 'settings.groups.profile.title', subKey: 'settings.groups.profile.sub' },
    { id: 'family', icon: 'familj', iconClass: 'family', titleKey: 'settings.groups.family.title', subKey: 'settings.groups.family.sub' },
    { id: 'appearance', icon: 'info', iconClass: 'app', titleKey: 'settings.groups.appearance.title', subKey: 'settings.groups.appearance.sub' },
    { id: 'app', icon: 'notiser', iconClass: 'app', titleKey: 'settings.groups.app.title', subKey: 'settings.groups.app.sub' },
  ];

  const PAGE_HEROES = {
    planning: { icon: 'schema', titleKey: 'settings.heroes.planning.title', subKey: 'settings.heroes.planning.sub' },
    rewards: { icon: 'beloningar', titleKey: 'settings.heroes.rewards.title', subKey: 'settings.heroes.rewards.sub' },
    calendar: { icon: 'kalender', titleKey: 'settings.heroes.calendar.title', subKey: 'schedule.calendar.legacySub' },
    activities: { icon: 'aktiviteter', titleKey: 'settings.heroes.activities.title', subKey: 'settings.heroes.activities.sub' },
    'assign-schedule': { icon: 'kopiera-aktivitet', titleKey: 'settings.heroes.assignSchedule.title', subKey: 'settings.heroes.assignSchedule.sub' },
    'daily-log': { icon: 'historik', titleKey: 'home.hubs.dailyLogTitle', subKey: 'home.hubs.dailyLogSub' },
    skattkammaren: { icon: 'skattkammaren', titleKey: 'settings.heroes.treasureChest.title', subKey: 'settings.heroes.treasureChest.sub' },
    'child-settings': { icon: 'barn', titleKey: 'settings.heroes.childSettings.title', subKey: 'settings.heroes.childSettings.sub' },
    'family-child': { icon: 'installningar', titleKey: 'settings.heroes.familyChild.title', subKey: 'settings.heroes.familyChild.sub' },
    notifications: { icon: 'notiser', titleKey: 'settings.heroes.notifications.title', subKey: 'settings.heroes.notifications.sub' },
    library: { icon: 'aktiviteter', titleKey: 'settings.heroes.library.title', subKey: 'settings.heroes.library.sub' },
  };

  function heroCopy(cfg) {
    if (!cfg) return { title: '', sub: '' };
    return {
      title: cfg.titleKey ? pt(cfg.titleKey) : (cfg.title || ''),
      sub: cfg.subKey ? pt(cfg.subKey) : (cfg.sub || ''),
    };
  }

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
      return '<button type="button" class="library-magic-planning-back planning-magic-back" data-planning-back="1">' + escHtml(pt('settings.backToPlanning')) + '</button>';
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

  function dailyLogHomeButton() {
    return '<a href="/dashboard" class="library-magic-planning-back planning-magic-back" data-daily-log-home="1">' +
      escHtml(pt('today.shell.backToHome')) + '</a>';
  }

  function bindDailyLogHome(root) {
    if (!root) return;
    const link = root.querySelector('[data-daily-log-home]');
    if (!link || link.dataset.bound) return;
    link.dataset.bound = '1';
    link.addEventListener('click', function (e) {
      if (window.NavConfig && NavConfig.navigateHomeFromDailyLog('/dashboard', e)) return;
      e.preventDefault();
      window.location.href = '/dashboard';
    });
  }

  function renderDailyLogHero() {
    const cfg = PAGE_HEROES['daily-log'] || { icon: 'historik', titleKey: 'home.hubs.dailyLogTitle', subKey: 'home.hubs.dailyLogSub' };
    const copy = heroCopy(cfg);
    return '<div class="magic-page-shell magic-3d-scene">' +
      planningBackButton() +
      dailyLogHomeButton() +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">' + pageIcon(cfg.icon) + '</div>' +
      '<div><h1>' + escHtml(copy.title) + '</h1><p>' + escHtml(copy.sub) + '</p></div>' +
      '</div></div>';
  }

  function renderScheduleModeBar() {
    return '<div class="schedule-mode-toggle schedule-magic-mode-bar" role="group" aria-label="' + escHtml(pt('schedule.mode.aria')) + '">' +
      '<button type="button" class="schedule-mode-btn active" data-schedule-mode="single">👤 ' + escHtml(pt('schedule.mode.single')) + '</button>' +
      '<button type="button" class="schedule-mode-btn" data-schedule-mode="family">👨‍👩‍👧 ' + escHtml(pt('schedule.mode.family')) + '</button>' +
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

  function pageIcon(iconKey, size) {
    if (window.IconSystem && IconSystem.has(iconKey)) {
      return IconSystem.render(iconKey, {
        size: size || IconSystem.SIZES.hero,
        className: 'app-icon app-icon--hero',
      });
    }
    return iconKey;
  }

  function renderGenericHero(cfg) {
    const copy = heroCopy(cfg);
    return '<div class="magic-page-shell magic-3d-scene">' +
      planningBackButton() +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">' + pageIcon(cfg.icon) + '</div>' +
      '<div><h1>' + escHtml(copy.title) + '</h1><p>' + escHtml(copy.sub) + '</p></div>' +
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
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">' + pageIcon('schema') + '</div>' +
      '<div><h1>' + escHtml(pt('settings.heroes.schedule.title')) + '</h1><p>' + escHtml(pt('settings.heroes.schedule.sub')) + '</p></div>' +
      '</div>' +
      renderScheduleModeBar() +
      '<div class="magic-page-stats">' +
      '<div class="magic-page-stat-card magic-3d-card"><strong>' + childCount + '</strong><span>' + escHtml(pt('schedule.chrome.statChildren')) + '</span></div>' +
      '<div class="magic-page-stat-card magic-3d-card"><strong>7</strong><span>' + escHtml(pt('schedule.chrome.statDays')) + '</span></div>' +
      '</div></div>';
  }

  function renderForDigHero(opts) {
    const greeting = (opts && opts.greeting) || 'Hej 👋';
    const focus = (opts && opts.focus) || 'Vad vill du fokusera på just nu?';
    return '<div class="magic-page-shell magic-3d-scene">' +
      '<div class="magic-page-hero for-dig-magic-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">' + pageIcon('for-dig') + '</div>' +
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

  function renderSettingsMenu() {
    return '<div class="magic-page-shell magic-3d-scene magic-page-hero-wrap">' +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">' + pageIcon('installningar') + '</div>' +
      '<div><h1>' + escHtml(pt('settings.title')) + '</h1><p>' + escHtml(pt('settings.shellLead')) + '</p></div>' +
      '</div></div>' +
      '<div class="magic-settings-menu">' +
      SETTINGS_GROUPS.map(function (g) {
        return '<button type="button" class="magic-settings-group-card magic-3d-card" data-settings-group="' + g.id + '">' +
          '<span class="magic-settings-group-icon ' + g.iconClass + '" aria-hidden="true">' + pageIcon(g.icon, 28) + '</span>' +
          '<span class="magic-settings-group-text"><strong>' + escHtml(pt(g.titleKey)) + '</strong>' +
          '<span>' + escHtml(pt(g.subKey)) + '</span></span>' +
          '<span class="library-magic-menu-arrow" aria-hidden="true">›</span></button>';
      }).join('') +
      '</div>';
  }

  function renderSettingsBackBar() {
    return '<div class="magic-settings-back-bar">' +
      '<button type="button" class="magic-settings-back" data-settings-back="1" aria-label="' + escHtml(pt('settings.appearance.backToSettings')) + '">' + escHtml(pt('settings.appearance.backToSettings')) + '</button>' +
      '</div>';
  }

  function clearSettingsHash() {
    if (!window.location.hash) return;
    const url = window.location.pathname + window.location.search;
    history.replaceState(history.state, '', url);
  }

  function returnToSettingsMenu() {
    clearSettingsHash();
    hideSettingsGroup();
    refresh('settings', true, { skipHash: true });
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
    if (groupId === 'app' && global.SettingsWidgets && typeof SettingsWidgets.mount === 'function') {
      const widgetMount = document.getElementById('widgetSettingsSection');
      if (widgetMount) SettingsWidgets.mount(widgetMount);
    }
  }

  function hideSettingsGroup() {
    resetSettingsState();
  }

  function bindSettingsEvents(root) {
    root.onclick = function (e) {
      const groupBtn = e.target.closest('[data-settings-group]');
      if (groupBtn) {
        showSettingsGroup(groupBtn.getAttribute('data-settings-group'));
      }
    };
  }

  function bindSettingsDelegation() {
    if (window._magicSettingsNavBound) return;
    window._magicSettingsNavBound = true;
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('parent-magic-page-settings')) return;
      if (e.target.closest('[data-settings-back]')) {
        e.preventDefault();
        returnToSettingsMenu();
      }
    }, true);
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
      opt('dark', pt('settings.appearance.dark'), 'dark') +
      opt('light', pt('settings.appearance.light'), 'light') +
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
    const restoreGroup = _activeSettingsGroup;
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
    tagChild('settingsAvatarSection', 'profile');
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
    tagChild('widgetSettingsSection', 'app');
    tagChild('reminderSection', 'app');
    tagChild('consentSection', 'app');
    tagChild('dataExportSection', 'app');
    tagChild('deletionSection', 'app');
    if (restoreGroup) {
      showSettingsGroup(restoreGroup);
    }
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
    if (hash === 'profil' || hash === 'profile') {
      showSettingsGroup('profile');
      return true;
    }
    if (hash === 'widgetSettingsSection' || hash === 'widget') {
      showSettingsGroup('app');
      setTimeout(function () {
        const el = document.getElementById('widgetSettingsSection');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return true;
    }
    return false;
  }

  function refresh(page, magic, opts) {
    opts = opts || {};
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
      el.innerHTML = '';
      el.classList.add('hidden');
    } else if (page === 'settings') {
      resetSettingsState();
      tagSettingsSections();
      el.innerHTML = renderSettingsMenu();
      bindSettingsEvents(el);
      const backBar = document.getElementById('magicSettingsBackBar');
      if (backBar) backBar.innerHTML = '';
      if (!opts.skipHash) openFromHash();
    } else if (page === 'planning') {
      el.innerHTML = '';
      el.classList.add('hidden');
    } else if (page === 'rewards') {
      el.innerHTML = '';
      el.classList.add('hidden');
    } else if (page === 'daily-log') {
      el.innerHTML = renderDailyLogHero();
      bindPlanningBack(el);
      bindDailyLogHome(el);
    } else if (PAGE_HEROES[page]) {
      el.innerHTML = renderGenericHero(PAGE_HEROES[page]);
      bindPlanningBack(el);
    } else {
      el.innerHTML = '';
      el.classList.add('hidden');
    }
  }

  function applyHubCopy() {
    if (!window.pt) return;
    PAGE_HEROES['daily-log'] = {
      icon: 'historik',
      titleKey: 'home.hubs.dailyLogTitle',
      subKey: 'home.hubs.dailyLogSub',
    };
  }

  document.addEventListener('parent-i18n-ready', function () {
    applyHubCopy();
    if (window.ParentMagicShell && ParentMagicShell.isMagic()) {
      const page = document.body.getAttribute('data-magic-page');
      if (page) refresh(page, true);
    }
  });
  document.addEventListener('locale-changed', function () {
    applyHubCopy();
    if (window.ParentMagicShell && ParentMagicShell.isMagic()) {
      const page = document.body.getAttribute('data-magic-page');
      if (page) refresh(page, true);
    }
  });

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
    returnToSettingsMenu: returnToSettingsMenu,
    clearSettingsHash: clearSettingsHash,
    applyHubCopy: applyHubCopy,
  };

  bindThemePickerDelegation();
  bindSettingsDelegation();
})();
