/**
 * parent-magic-page-hubs.js — Mockup heroes for schedule / family / settings.
 */
(function () {
  'use strict';

  var SETTINGS_GROUPS = [
    { id: 'profile', icon: '👤', iconClass: 'profile', title: 'Profil & konto', sub: 'Inloggning, PIN och konto' },
    { id: 'family', icon: '👨‍👩‍👧', iconClass: 'family', title: 'Familj', sub: 'Familjenamn, pedagoger och data' },
    { id: 'app', icon: '📱', iconClass: 'app', title: 'App', sub: 'Notiser, push och integritet' },
  ];

  var PAGE_HEROES = {
    planning: { icon: '📅', title: 'Planering', sub: 'Schema, logg och bibliotek' },
    rewards: { icon: '🎁', title: 'Belöningar', sub: 'Stjärnor och belöningar' },
    calendar: { icon: '📆', title: 'Kalender', sub: 'Månadsvy över alla barn' },
    activities: { icon: '📋', title: 'Aktiviteter', sub: 'Hantera barnens aktiviteter' },
    'assign-schedule': { icon: '📅', title: 'Tilldela schema', sub: 'Kopiera schema till barn' },
    'daily-log': { icon: '📝', title: 'Daglig logg', sub: 'Följ barnens dag — fyll i stjärnor i efterhand' },
    skattkammaren: { icon: '🏆', title: 'Skattkammaren', sub: 'Belöningar och stjärnor' },
    'child-settings': { icon: '⭐', title: 'Barninställningar', sub: 'Vy, PIN och anpassning' },
    notifications: { icon: '🔔', title: 'Notiser', sub: 'Påminnelser och meddelanden' },
  };

  var _activeSettingsGroup = null;

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

  function renderGenericHero(cfg) {
    return '<div class="magic-page-shell magic-3d-scene">' +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">' + cfg.icon + '</div>' +
      '<div><h1>' + escHtml(cfg.title) + '</h1><p>' + escHtml(cfg.sub) + '</p></div>' +
      '</div></div>';
  }

  function renderScheduleHero() {
    var childCount = 0;
    if (typeof children !== 'undefined' && Array.isArray(children)) {
      childCount = children.length;
    }
    return '<div class="magic-page-shell magic-3d-scene">' +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">📅</div>' +
      '<div><h1>Veckoschema</h1><p>Planera och anpassa barnens dagar</p></div>' +
      '</div>' +
      '<div class="magic-page-stats">' +
      '<div class="magic-page-stat-card magic-3d-card"><strong>' + childCount + '</strong><span>Barn</span></div>' +
      '<div class="magic-page-stat-card magic-3d-card"><strong>7</strong><span>Dagar</span></div>' +
      '</div></div>';
  }

  function renderForDigHero() {
    return '<div class="magic-page-shell magic-3d-scene">' +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">✨</div>' +
      '<div><h1>För dig</h1><p>Mål, favoriter och rekommendationer</p></div>' +
      '</div></div>';
  }

  function renderFamilyHero() {
    var summary = document.getElementById('familySummary');
    var sub = summary && summary.textContent ? summary.textContent : 'Er familj på ett ställe';
    var childN = document.querySelectorAll('#childrenGrid > *').length;
    var adultN = document.querySelectorAll('#adultsGrid > *').length;
    return '<div class="magic-page-shell magic-3d-scene">' +
      '<div class="magic-page-hero">' +
      '<div class="magic-page-hero-icon magic-3d-card" aria-hidden="true">👨‍👩‍👧</div>' +
      '<div><h1>Familjen</h1><p>' + escHtml(sub) + '</p></div>' +
      '</div>' +
      '<div class="magic-page-stats">' +
      '<div class="magic-page-stat-card magic-3d-card"><strong>' + childN + '</strong><span>Barn</span></div>' +
      '<div class="magic-page-stat-card magic-3d-card"><strong>' + adultN + '</strong><span>Vuxna</span></div>' +
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
    var g = SETTINGS_GROUPS.find(function (x) { return x.id === _activeSettingsGroup; });
    var title = g ? g.title : 'Tillbaka';
    return '<div class="magic-settings-back-bar">' +
      '<button type="button" class="magic-settings-back" data-settings-back="1">← ' + escHtml(title) + '</button>' +
      '</div>';
  }

  function showSettingsGroup(groupId) {
    _activeSettingsGroup = groupId;
    document.body.classList.add('magic-settings-in-group');
    document.querySelectorAll('[data-magic-settings-content]').forEach(function (el) {
      var show = el.getAttribute('data-magic-settings-content') === groupId;
      el.classList.toggle('hidden', !show);
    });
    var backBar = document.getElementById('magicSettingsBackBar');
    if (backBar) backBar.innerHTML = renderSettingsBackBar();
  }

  function hideSettingsGroup() {
    _activeSettingsGroup = null;
    document.body.classList.remove('magic-settings-in-group');
    document.querySelectorAll('[data-magic-settings-content]').forEach(function (el) {
      el.classList.add('hidden');
    });
  }

  function bindSettingsEvents(root) {
    root.onclick = function (e) {
      var groupBtn = e.target.closest('[data-settings-group]');
      if (groupBtn) {
        showSettingsGroup(groupBtn.getAttribute('data-settings-group'));
        return;
      }
      if (e.target.closest('[data-settings-back]')) {
        hideSettingsGroup();
        refresh('settings', true);
      }
    };
    var backMount = document.getElementById('magicSettingsBackBar');
    if (backMount) {
      backMount.onclick = function (e) {
        if (e.target.closest('[data-settings-back]')) {
          hideSettingsGroup();
          refresh('settings', true);
        }
      };
    }
  }

  function tagSettingsSections() {
    function tagChild(childId, groupId) {
      var child = document.getElementById(childId);
      if (!child) return;
      var sec = child.closest('section');
      if (!sec) return;
      sec.setAttribute('data-magic-settings-content', groupId);
      sec.classList.add('hidden');
    }
    tagChild('nativeAccountActions', 'profile');
    tagChild('accountSection', 'profile');
    tagChild('parentPinSection', 'profile');
    tagChild('legacyPasswordSection', 'profile');
    tagChild('familyName', 'family');
    tagChild('viewSwitchSection', 'family');
    tagChild('pedagogInviteSection', 'family');
    tagChild('notifForm', 'app');
    tagChild('pushSection', 'app');
    tagChild('reminderSection', 'app');
    tagChild('consentSection', 'app');
    tagChild('dataExportSection', 'app');
    tagChild('deletionSection', 'app');
  }

  function refresh(page, magic) {
    var el = mount();
    if (!el) return;

    if (!magic || !(window.ParentMagicShell && ParentMagicShell.isMagic())) {
      el.innerHTML = '';
      el.classList.add('hidden');
      document.body.classList.remove('magic-settings-in-group');
      document.querySelectorAll('[data-magic-settings-content]').forEach(function (sec) {
        sec.classList.remove('hidden');
      });
      return;
    }

    el.classList.remove('hidden');
    if (page === 'schedule') {
      el.innerHTML = renderScheduleHero();
    } else if (page === 'for-dig') {
      el.innerHTML = renderForDigHero();
    } else if (page === 'family') {
      el.innerHTML = renderFamilyHero();
    } else if (page === 'settings') {
      if (!_activeSettingsGroup) {
        tagSettingsSections();
        el.innerHTML = renderSettingsMenu();
        bindSettingsEvents(el);
        var backBar = document.getElementById('magicSettingsBackBar');
        if (backBar) backBar.innerHTML = '';
      }
    } else if (PAGE_HEROES[page]) {
      el.innerHTML = renderGenericHero(PAGE_HEROES[page]);
    } else {
      el.innerHTML = '';
      el.classList.add('hidden');
    }
  }

  window.ParentMagicPageHub = {
    refresh: refresh,
    tagSettingsSections: tagSettingsSections,
  };
})();
