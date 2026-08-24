/**
 * parent-magic-page-hubs.js — Mockup heroes for schedule / family / settings.
 */
(function () {
  'use strict';

  const SETTINGS_HUB_COPY_FALLBACK = {
    'settings.title': 'Inställningar',
    'settings.shellLead': 'Profil, familj och app — grupperat som i mockupen',
    'settings.groups.profile.title': 'Profil & konto',
    'settings.groups.profile.sub': 'Inloggning, PIN och konto',
    'settings.groups.family.title': 'Familj',
    'settings.groups.family.sub': 'Lägg till vuxen, namn och pedagoger',
    'settings.groups.appearance.title': 'Utseende',
    'settings.groups.appearance.sub': 'Mörkt eller ljust tema',
    'settings.groups.app.title': 'App',
    'settings.groups.app.sub': 'Notiser, push och integritet',
    'settings.groups.premium.title': 'Prenumeration',
    'settings.groups.premium.sub': 'Premium, köp och betalning',
    'settings.appearance.backToSettings': '← Tillbaka till inställningar',
  };

  function pt(key, params) {
    if (typeof window.pt === 'function') {
      const translated = window.pt(key, params);
      if (translated && translated !== key) return translated;
    }
    return SETTINGS_HUB_COPY_FALLBACK[key] || key;
  }

  const SETTINGS_GROUPS_BASE = [
    { id: 'profile', icon: 'profil', iconClass: 'profile', titleKey: 'settings.groups.profile.title', subKey: 'settings.groups.profile.sub' },
    { id: 'family', icon: 'familj', iconClass: 'family', titleKey: 'settings.groups.family.title', subKey: 'settings.groups.family.sub' },
    { id: 'appearance', icon: 'info', iconClass: 'app', titleKey: 'settings.groups.appearance.title', subKey: 'settings.groups.appearance.sub' },
    { id: 'app', icon: 'notiser', iconClass: 'app', titleKey: 'settings.groups.app.title', subKey: 'settings.groups.app.sub' },
  ];

  const PREMIUM_SETTINGS_GROUP = {
    id: 'premium',
    icon: 'trofe',
    iconClass: 'app',
    titleKey: 'settings.groups.premium.title',
    subKey: 'settings.groups.premium.sub',
  };

  let _subscriptionUiVisible = false;
  let _subscriptionVisibilityLoaded = false;
  let _subscriptionVisibilityPromise = null;

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
    const iconSize = size || (window.IconSystem && IconSystem.SIZES ? IconSystem.SIZES.hero : 48);
    if (window.IconSystem && IconSystem.has(iconKey)) {
      if (size && size <= 32 && typeof IconSystem.hub === 'function') {
        return IconSystem.hub(iconKey);
      }
      return IconSystem.render(iconKey, {
        size: iconSize,
        className: 'app-icon app-icon--hero',
      });
    }
    if (iconKey && /^[a-z0-9-]+$/.test(iconKey)) {
      return '<img src="/img/stjarnadag-icons-v4/hub/' + iconKey + '.svg" class="app-icon app-icon--hero" width="' +
        iconSize + '" height="' + iconSize + '" alt="" decoding="async" aria-hidden="true">';
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

  function getSettingsGroups() {
    const groups = SETTINGS_GROUPS_BASE.slice();
    if (_subscriptionUiVisible) {
      groups.push(PREMIUM_SETTINGS_GROUP);
    }
    return groups;
  }

  async function refreshSubscriptionMenuVisibility() {
    if (!window.Auth || typeof Auth.api !== 'function') {
      _subscriptionUiVisible = false;
      _subscriptionVisibilityLoaded = true;
      return false;
    }
    if (_subscriptionVisibilityPromise) {
      return _subscriptionVisibilityPromise;
    }
    _subscriptionVisibilityPromise = Auth.api('/api/subscription/status')
      .then(function (status) {
        _subscriptionUiVisible = status && status.subscription_ui_visible === true;
        _subscriptionVisibilityLoaded = true;
        return _subscriptionUiVisible;
      })
      .catch(function () {
        _subscriptionUiVisible = false;
        _subscriptionVisibilityLoaded = true;
        return false;
      })
      .finally(function () {
        _subscriptionVisibilityPromise = null;
      });
    return _subscriptionVisibilityPromise;
  }

  function renderSettingsMenu() {
    let switchCard = '';
    if (window.ProfileSwitchChrome && ProfileSwitchChrome.shouldShow && ProfileSwitchChrome.shouldShow()) {
      const switchLabel = ProfileSwitchChrome.labelText ? ProfileSwitchChrome.labelText() : 'Byt profil';
      switchCard =
        '<button type="button" class="magic-settings-group-card magic-3d-card" data-profile-switch-settings="1">' +
        '<span class="magic-settings-group-icon app" aria-hidden="true">' + pageIcon('profil', 28) + '</span>' +
        '<span class="magic-settings-group-text"><strong>' + escHtml(switchLabel) + '</strong>' +
        '<span>' + escHtml((typeof window.cpt === 'function' && cpt('settings.switchProfileHint')) || 'Välj barn eller vuxen på denna enhet') + '</span></span>' +
        '<span class="library-magic-menu-arrow" aria-hidden="true">›</span></button>';
    }
    return '<div class="magic-page-shell magic-3d-scene magic-page-hero-wrap">' +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">' + pageIcon('installningar') + '</div>' +
      '<div><h1>' + escHtml(pt('settings.title')) + '</h1><p>' + escHtml(pt('settings.shellLead')) + '</p></div>' +
      '</div></div>' +
      '<div class="magic-settings-menu">' +
      switchCard +
      getSettingsGroups().map(function (g) {
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
    return launchSettingsHubAsync(showSettingsRootMenu()).then(function () {
      if (window.SettingsNativeNav && SettingsNativeNav.sync) SettingsNativeNav.sync();
    });
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
    markSettingsHubReady();
    if (window.SettingsNativeNav && SettingsNativeNav.sync) SettingsNativeNav.sync();
    if (groupId === 'appearance') updateThemePickerUi();
    if (groupId === 'premium' && window.SettingsSubscription && typeof SettingsSubscription.render === 'function') {
      SettingsSubscription.render(document.getElementById('subscriptionMount'));
    }
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
      if (e.target.closest('[data-profile-switch-settings]')) {
        if (window.Auth && typeof Auth.switchChildMember === 'function') {
          Auth.switchChildMember();
        }
        return;
      }
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

  function hasSettingsDeepLink() {
    const hash = (window.location.hash || '').replace('#', '');
    return hash === 'prenumeration' || hash === 'profil' || hash === 'profile'
      || hash === 'widgetSettingsSection' || hash === 'widget'
      || hash === 'aviseringar' || hash === 'notiser' || hash === 'notifications';
  }

  const SETTINGS_HUB_MENU_SELECTOR = '.magic-settings-menu [data-settings-group]';

  function isSettingsDomPage() {
    const page = document.body && document.body.getAttribute('data-magic-page');
    if (page === 'settings') return true;
    return (window.location.pathname || '').replace(/\/$/, '') === '/settings';
  }

  function resolveHubPage(page) {
    if (isSettingsDomPage()) return 'settings';
    return page;
  }

  function clearSettingsHubReady() {
    document.body.classList.remove('magic-settings-ready');
  }

  function markSettingsHubReady() {
    document.body.classList.add('magic-settings-ready');
  }

  function settingsHubHasMenuCards(el) {
    if (!el) return false;
    if (!el.innerHTML || !el.innerHTML.trim()) return false;
    return !!el.querySelector(SETTINGS_HUB_MENU_SELECTOR);
  }

  function settingsHubHasUsableContent(el) {
    if (!el) return false;
    if (el.classList.contains('hidden')) return false;
    return settingsHubHasMenuCards(el);
  }

  function recordMagicHiddenOwned(el) {
    if (!el || el.hasAttribute('data-magic-hidden-owned')) return;
    el.setAttribute('data-magic-hidden-owned', el.classList.contains('hidden') ? '1' : '0');
  }

  function restoreMagicOwnedVisibility() {
    document.querySelectorAll('[data-magic-settings-content]').forEach(function (el) {
      const owned = el.getAttribute('data-magic-hidden-owned');
      if (owned === '1') {
        el.classList.add('hidden');
      } else if (owned === '0') {
        el.classList.remove('hidden');
      }
      el.removeAttribute('data-magic-hidden-owned');
      el.removeAttribute('data-magic-settings-content');
    });
  }

  function showLegacySettingsFallback(reason) {
    clearSettingsHubReady();
    document.body.classList.remove('magic-settings-in-group');
    _activeSettingsGroup = null;
    const el = mount();
    if (el) {
      el.innerHTML = '';
      el.classList.add('hidden');
    }
    restoreMagicOwnedVisibility();
    if (reason) {
      console.error('[settings-magic] showing legacy settings fallback:', reason);
    }
  }

  function handleSettingsHubAsyncFailure(err) {
    showLegacySettingsFallback(err && err.message ? err.message : String(err));
  }

  function launchSettingsHubAsync(promise) {
    if (!promise || typeof promise.then !== 'function') return promise;
    return promise.catch(handleSettingsHubAsyncFailure);
  }

  function getActiveSettingsGroup() {
    return _activeSettingsGroup;
  }

  function isSettingsHubNavigationActive() {
    return !!_activeSettingsGroup || document.body.classList.contains('magic-settings-in-group');
  }

  function isSettingsRootHubReady() {
    const mountEl = mount();
    return document.body.classList.contains('magic-settings-ready')
      && !!mountEl
      && !mountEl.classList.contains('hidden')
      && settingsHubHasUsableContent(mountEl)
      && !isSettingsHubNavigationActive();
  }

  function isSettingsGroupHubReady(groupId) {
    if (!groupId) return false;
    return document.body.classList.contains('magic-settings-ready')
      && document.body.classList.contains('magic-settings-in-group')
      && _activeSettingsGroup === groupId;
  }

  async function runSettingsChromeHelpers(opts) {
    opts = opts || {};
    if (window.Auth && typeof Auth.hydrateParentSessionFromCookies === 'function') {
      try { await Auth.hydrateParentSessionFromCookies(); } catch (_) { /* ignore */ }
    }
    if (window.ParentNavHeader && typeof ParentNavHeader.ensure === 'function') {
      ParentNavHeader.ensure();
    }
    if (window.ParentMagicAuto && ParentMagicAuto.ensureTopChrome) {
      ParentMagicAuto.ensureTopChrome();
    }
    if (window.ProfileSwitchChrome && typeof ProfileSwitchChrome.apply === 'function') {
      ProfileSwitchChrome.apply();
    }
    if (window.SettingsNativeNav && SettingsNativeNav.sync) {
      SettingsNativeNav.sync();
    }
    if (window.NativeTabBar && NativeTabBar.remount) {
      NativeTabBar.remount();
    }
    if (opts.emitLayout) {
      window.dispatchEvent(new CustomEvent('stjarndag-parent-nav-layout'));
    }
  }

  function refreshSettingsChromeHelpers() {
    return runSettingsChromeHelpers({ emitLayout: false });
  }

  async function refreshSettingsHubCopy() {
    const el = mount();
    if (!el) return;
    const activeGroup = _activeSettingsGroup;
    if (!_subscriptionVisibilityLoaded) {
      await refreshSubscriptionMenuVisibility();
    }
    if (activeGroup && document.body.classList.contains('magic-settings-in-group')) {
      if (!settingsHubHasUsableContent(el)) {
        el.innerHTML = renderSettingsMenu();
        bindSettingsEvents(el);
      }
      const backBar = document.getElementById('magicSettingsBackBar');
      if (backBar) backBar.innerHTML = renderSettingsBackBar();
      return;
    }
    if (!settingsHubHasUsableContent(el)) return;
    el.innerHTML = renderSettingsMenu();
    bindSettingsEvents(el);
    const backBar = document.getElementById('magicSettingsBackBar');
    if (backBar) backBar.innerHTML = '';
  }

  async function reopenSettingsGroup(groupId) {
    if (!groupId) return false;
    try {
      await refreshSubscriptionMenuVisibility();
      tagSettingsSections();
      const el = mount();
      if (!el) throw new Error('parentMagicPageMount missing');
      if (!settingsHubHasUsableContent(el)) {
        el.innerHTML = renderSettingsMenu();
        bindSettingsEvents(el);
      }
      showSettingsGroup(groupId);
      el.classList.remove('hidden');
      return true;
    } catch (err) {
      showLegacySettingsFallback(err && err.message ? err.message : String(err));
      return false;
    }
  }

  async function renderSettingsHubRootMenu() {
    resetSettingsState();
    await refreshSubscriptionMenuVisibility();
    tagSettingsSections();
    const el = mount();
    if (!el) {
      throw new Error('parentMagicPageMount missing');
    }
    el.innerHTML = renderSettingsMenu();
    bindSettingsEvents(el);
    const backBar = document.getElementById('magicSettingsBackBar');
    if (backBar) backBar.innerHTML = '';
    if (!settingsHubHasMenuCards(el)) {
      throw new Error('settings hub rendered without menu cards');
    }
    el.classList.remove('hidden');
    markSettingsHubReady();
    return true;
  }

  async function showSettingsRootMenu() {
    try {
      return await renderSettingsHubRootMenu();
    } catch (err) {
      showLegacySettingsFallback(err && err.message ? err.message : String(err));
      return false;
    }
  }

  async function renderSettingsHubDeepLink() {
    await refreshSubscriptionMenuVisibility();
    tagSettingsSections();
    const el = mount();
    if (!el) {
      throw new Error('parentMagicPageMount missing');
    }
    el.innerHTML = renderSettingsMenu();
    bindSettingsEvents(el);
    const backBar = document.getElementById('magicSettingsBackBar');
    if (backBar) backBar.innerHTML = '';
    if (!_activeSettingsGroup) {
      openFromHash();
    }
    if (!_activeSettingsGroup) {
      throw new Error('settings deep link did not open a group');
    }
    el.classList.remove('hidden');
    markSettingsHubReady();
    return true;
  }

  function tagSettingsSections() {
    bindThemePickerDelegation();
    ensureAppearanceSection();
    function tagChild(childId, groupId) {
      const child = document.getElementById(childId);
      if (!child) return;
      const target = child.closest('section') || child;
      if (!target) return;
      recordMagicHiddenOwned(target);
      target.setAttribute('data-magic-settings-content', groupId);
      target.classList.add('hidden');
    }
    tagChild('magicAppearanceSection', 'appearance');
    tagChild('settingsAvatarSection', 'profile');
    tagChild('nativeAccountActions', 'profile');
    tagChild('accountSection', 'profile');
    tagChild('parentPinSection', 'profile');
    tagChild('legacyPasswordSection', 'profile');
    tagChild('prenumeration', 'premium');
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
    if (_activeSettingsGroup) {
      document.querySelectorAll('[data-magic-settings-content]').forEach(function (el) {
        const show = el.getAttribute('data-magic-settings-content') === _activeSettingsGroup;
        el.classList.toggle('hidden', !show);
      });
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
      showSettingsGroup('premium');
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
    if (hash === 'aviseringar' || hash === 'notiser' || hash === 'notifications') {
      showSettingsGroup('app');
      setTimeout(function () {
        const el = document.getElementById('notifForm') || document.getElementById('pushSection');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return true;
    }
    return false;
  }

  async function ensureSettingsChrome(opts) {
    opts = opts || {};
    const preserveNavigation = opts.preserveNavigation !== false;
    const forceRoot = opts.forceRoot === true;

    if (!isSettingsDomPage()) return false;

    const magic = window.ParentMagicShell && ParentMagicShell.isMagic && ParentMagicShell.isMagic();
    if (!magic) {
      showLegacySettingsFallback('parent magic mode inactive');
      return false;
    }

    const activeGroup = _activeSettingsGroup;
    if (preserveNavigation && !forceRoot) {
      if (activeGroup && isSettingsGroupHubReady(activeGroup)) {
        await refreshSettingsHubCopy();
        await refreshSettingsChromeHelpers();
        return true;
      }
      if (!hasSettingsDeepLink() && !activeGroup && isSettingsRootHubReady()) {
        await refreshSettingsHubCopy();
        await refreshSettingsChromeHelpers();
        return true;
      }
      if (activeGroup) {
        const ok = await reopenSettingsGroup(activeGroup);
        if (ok) await refreshSettingsChromeHelpers();
        return ok;
      }
    }

    const hasDeepLink = hasSettingsDeepLink();
    let ok = false;
    try {
      if (!hasDeepLink) {
        ok = await renderSettingsHubRootMenu();
      } else {
        ok = await renderSettingsHubDeepLink();
      }
    } catch (err) {
      showLegacySettingsFallback(err && err.message ? err.message : String(err));
      return false;
    }

    if (!ok) {
      return false;
    }

    const mountEl = mount();
    if (!settingsHubHasUsableContent(mountEl) && !hasDeepLink) {
      showLegacySettingsFallback('hub empty after session hydrate');
      return false;
    }
    if (hasDeepLink && !_activeSettingsGroup) {
      showLegacySettingsFallback('deep link group missing after hydrate');
      return false;
    }

    await runSettingsChromeHelpers({ emitLayout: false });
    return true;
  }

  async function refreshSettingsPage(opts) {
    opts = opts || {};
    const preserveNavigation = opts.preserveNavigation !== false;
    const forceRoot = opts.forceRoot === true;
    if (preserveNavigation && !forceRoot && isSettingsHubNavigationActive()) {
      await reopenSettingsGroup(_activeSettingsGroup);
      return;
    }
    if (opts.skipHash || !hasSettingsDeepLink()) {
      if (!forceRoot && preserveNavigation && isSettingsRootHubReady()) {
        await refreshSettingsHubCopy();
        return;
      }
      const ok = await showSettingsRootMenu();
      if (!ok) return;
    } else {
      await renderSettingsHubDeepLink();
    }
  }

  function refresh(page, magic, opts) {
    opts = opts || {};
    page = resolveHubPage(page);
    const el = mount();
    if (!el) return;

    if (!magic || !(window.ParentMagicShell && ParentMagicShell.isMagic())) {
      if (isSettingsDomPage()) {
        showLegacySettingsFallback('refresh while parent magic inactive');
        return;
      }
      el.innerHTML = '';
      el.classList.add('hidden');
      resetSettingsState();
      restoreMagicOwnedVisibility();
      return;
    }

    if (page !== 'settings') {
      resetSettingsState();
      if (!isSettingsDomPage()) {
        clearSettingsHubReady();
      }
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
      return launchSettingsHubAsync(refreshSettingsPage(opts));
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
    } else if (isSettingsDomPage()) {
      return launchSettingsHubAsync(showSettingsRootMenu());
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
      if (page === 'settings' && window.ParentMagicPageHub) {
        if (ParentMagicPageHub.refreshSettingsHubCopy) {
          launchSettingsHubAsync(ParentMagicPageHub.refreshSettingsHubCopy());
        }
        if (ParentMagicPageHub.ensureSettingsChrome) {
          launchSettingsHubAsync(ParentMagicPageHub.ensureSettingsChrome({ preserveNavigation: true }));
        }
      } else if (page) {
        refresh(page, true);
      }
    }
  });
  document.addEventListener('locale-changed', function () {
    applyHubCopy();
    if (window.ParentMagicShell && ParentMagicShell.isMagic()) {
      const page = document.body.getAttribute('data-magic-page');
      if (page === 'settings' && window.ParentMagicPageHub) {
        if (ParentMagicPageHub.refreshSettingsHubCopy) {
          launchSettingsHubAsync(ParentMagicPageHub.refreshSettingsHubCopy());
        }
        if (ParentMagicPageHub.ensureSettingsChrome) {
          launchSettingsHubAsync(ParentMagicPageHub.ensureSettingsChrome({ preserveNavigation: true }));
        }
      } else if (page) {
        refresh(page, true);
      }
    }
  });
  window.addEventListener('stjarndag-magic-navigated', function (e) {
    const pageId = e && e.detail && e.detail.pageId;
    if (pageId === 'settings' && window.ParentMagicPageHub && ParentMagicPageHub.ensureSettingsChrome) {
      launchSettingsHubAsync(ParentMagicPageHub.ensureSettingsChrome({ preserveNavigation: true }));
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
    ensureSettingsChrome: ensureSettingsChrome,
    showSettingsRootMenu: showSettingsRootMenu,
    showLegacySettingsFallback: showLegacySettingsFallback,
    markSettingsHubReady: markSettingsHubReady,
    clearSettingsHubReady: clearSettingsHubReady,
    settingsHubHasUsableContent: settingsHubHasUsableContent,
    settingsHubHasMenuCards: settingsHubHasMenuCards,
    getActiveSettingsGroup: getActiveSettingsGroup,
    isSettingsHubNavigationActive: isSettingsHubNavigationActive,
    refreshSettingsHubCopy: refreshSettingsHubCopy,
    refreshSubscriptionMenuVisibility: refreshSubscriptionMenuVisibility,
    getSettingsGroups: getSettingsGroups,
    isSubscriptionMenuVisible: function () { return _subscriptionUiVisible; },
    restoreMagicOwnedVisibility: restoreMagicOwnedVisibility,
    hasSettingsDeepLink: hasSettingsDeepLink,
    isSettingsDomPage: isSettingsDomPage,
    applyHubCopy: applyHubCopy,
  };

  bindThemePickerDelegation();
  bindSettingsDelegation();
})();
