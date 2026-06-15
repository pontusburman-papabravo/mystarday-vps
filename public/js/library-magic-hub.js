/**
 * library-magic-hub.js — Bibliotek mockup navigation (ny design).
 * Reuses switchTab / switchStdSubTab from library.js.
 */
(function () {
  'use strict';

  var SECTIONS = {
    standard: {
      tab: 'standard',
      title: 'Standardscheman',
      subtitle: 'Färdiga mallar att kopiera',
      icon: '📕',
      iconClass: 'schedules',
    },
    activities: {
      tab: 'activities',
      title: 'Aktiviteter',
      subtitle: 'Dina och kopierade aktiviteter',
      icon: '📋',
      iconClass: 'activities',
    },
    rewards: {
      tab: 'rewards',
      title: 'Belöningar',
      subtitle: 'Mål barnen strävar mot',
      icon: '🏆',
      iconClass: 'rewards',
    },
    mine: {
      tab: 'schema',
      title: 'Mina bibliotek',
      subtitle: 'Egna scheman och mallar',
      icon: '📁',
      iconClass: 'mine',
    },
  };

  var _section = null;
  var _hubSearch = '';

  function isMagic() {
    return window.AppViewMode && AppViewMode.isAllowed() && AppViewMode.isMagic();
  }

  function escHtml(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function applyLayout() {
    var magic = isMagic();
    document.body.classList.toggle('parent-magic-library', magic);
    if (!magic) {
      document.body.classList.remove('library-magic-on-hub', 'library-magic-in-section');
      var hub = document.getElementById('libraryMagicHubMount');
      var chrome = document.getElementById('libraryMagicChrome');
      if (hub) { hub.innerHTML = ''; hub.classList.add('hidden'); }
      if (chrome) { chrome.classList.add('hidden'); chrome.innerHTML = ''; }
      return;
    }
    routeFromHash();
  }

  function renderHub() {
    var mount = document.getElementById('libraryMagicHubMount');
    if (!mount) return;
    mount.classList.remove('hidden');
    mount.innerHTML =
      '<div class="library-magic-hub">' +
      '<div class="library-magic-hub-head">' +
      '<div><h1>📚 Biblioteket</h1><p>Scheman, aktiviteter och belöningar för er familj</p></div>' +
      '<div class="library-magic-mascot" aria-hidden="true">⭐</div></div>' +
      '<input type="search" class="library-magic-search" id="libraryMagicSearch" placeholder="Sök i biblioteket…" value="' + escHtml(_hubSearch) + '">' +
      '<div class="library-magic-menu">' +
      menuCard('standard') +
      menuCard('activities') +
      menuCard('rewards') +
      menuCard('mine') +
      '</div></div>';

    var search = mount.querySelector('#libraryMagicSearch');
    if (search) {
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          _hubSearch = search.value.trim();
          openSection('activities', true);
        }
      });
    }

    mount.onclick = function (e) {
      var card = e.target.closest('[data-library-section]');
      if (!card) return;
      openSection(card.getAttribute('data-library-section'), false);
    };
  }

  function menuCard(key) {
    var s = SECTIONS[key];
    return '<button type="button" class="library-magic-menu-card" data-library-section="' + key + '">' +
      '<span class="library-magic-menu-icon ' + s.iconClass + '" aria-hidden="true">' + s.icon + '</span>' +
      '<span class="library-magic-menu-text"><strong>' + escHtml(s.title) + '</strong><span>' + escHtml(s.subtitle) + '</span></span>' +
      '<span class="library-magic-menu-arrow" aria-hidden="true">›</span></button>';
  }

  function renderChrome(sectionKey) {
    var chrome = document.getElementById('libraryMagicChrome');
    if (!chrome) return;
    var s = SECTIONS[sectionKey];
    if (!s) {
      chrome.classList.add('hidden');
      chrome.innerHTML = '';
      return;
    }

    var actionHtml = '';
    if (sectionKey === 'activities' && typeof window.openActivityModal === 'function') {
      actionHtml = '<button type="button" class="library-magic-chrome-action" data-library-action="new-activity">+ Ny</button>';
    } else if (sectionKey === 'rewards' && typeof window.openRewardModal === 'function') {
      actionHtml = '<button type="button" class="library-magic-chrome-action" data-library-action="new-reward">+ Ny</button>';
    }

    chrome.classList.remove('hidden');
    chrome.innerHTML =
      '<div class="library-magic-chrome">' +
      '<button type="button" class="library-magic-back" data-library-action="back" aria-label="Tillbaka">←</button>' +
      '<div class="library-magic-chrome-title"><h2>' + escHtml(s.icon + ' ' + s.title) + '</h2><p>' + escHtml(s.subtitle) + '</p></div>' +
      actionHtml +
      '</div>';

    chrome.onclick = function (e) {
      var btn = e.target.closest('[data-library-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-library-action');
      if (action === 'back') {
        showHub();
      } else if (action === 'new-activity') {
        window.openActivityModal();
      } else if (action === 'new-reward') {
        window.openRewardModal();
      }
    };
  }

  function openSection(key, fromSearch) {
    var s = SECTIONS[key];
    if (!s || typeof window.switchTab !== 'function') return;

    _section = key;
    document.body.classList.remove('library-magic-on-hub');
    document.body.classList.add('library-magic-in-section');

    var hub = document.getElementById('libraryMagicHubMount');
    if (hub) {
      hub.classList.add('hidden');
      hub.innerHTML = '';
    }

    window.switchTab(s.tab);
    if (key === 'standard' && typeof window.switchStdSubTab === 'function') {
      window.switchStdSubTab('schedules');
    }

    if (fromSearch && _hubSearch) {
      setTimeout(function () {
        var input = document.getElementById(key === 'rewards' ? 'rewardSearchInput' : 'activitySearchInput');
        if (input) {
          input.value = _hubSearch;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
      }, 100);
    }

    renderChrome(key);
    window.location.hash = 'magic-' + key;
  }

  function showHub() {
    _section = null;
    document.body.classList.add('library-magic-on-hub');
    document.body.classList.remove('library-magic-in-section');

    var chrome = document.getElementById('libraryMagicChrome');
    if (chrome) {
      chrome.classList.add('hidden');
      chrome.innerHTML = '';
    }

    ['schema', 'activities', 'standard', 'rewards'].forEach(function (t) {
      var pane = document.getElementById('tab-' + t);
      if (pane) pane.classList.remove('active');
    });

    renderHub();
    window.location.hash = 'magic-hub';
  }

  function routeFromHash() {
    if (!isMagic()) return;

    var hash = (window.location.hash || '').replace('#', '');
    if (hash.indexOf('magic-') === 0) {
      var key = hash.slice(6);
      if (SECTIONS[key]) {
        openSection(key, false);
        return;
      }
    }
    if (hash === 'standard' || hash === 'activities' || hash === 'rewards' || hash === 'schema') {
      var map = { standard: 'standard', activities: 'activities', rewards: 'rewards', schema: 'mine' };
      openSection(map[hash], false);
      return;
    }
    showHub();
  }

  function init() {
    if (!window.AppViewMode) {
      applyLayout();
      return Promise.resolve(false);
    }

    return AppViewMode.initParent().then(function () {
      var toggleMount = document.getElementById('appViewToggleMount');
      if (toggleMount && AppViewMode.isAllowed()) {
        AppViewMode.mountToggle(toggleMount);
      } else if (toggleMount) {
        toggleMount.style.display = 'none';
      }

      AppViewMode.onChange(function () {
        applyLayout();
      });

      applyLayout();
      return isMagic();
    });
  }

  window.addEventListener('hashchange', function () {
    if (isMagic()) routeFromHash();
  });

  window.LibraryMagicHub = {
    init: init,
    showHub: showHub,
    openSection: openSection,
    isMagic: isMagic,
  };
})();
