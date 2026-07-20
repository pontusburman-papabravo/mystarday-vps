/**
 * library-magic-hub.js — Bibliotek mockup navigation (ny design).
 * Reuses switchTab / switchStdSubTab from library.js.
 * Section screens: library-magic-schedules.js, library-magic-mine.js.
 */
(function () {
  'use strict';

  const SECTIONS = {
    standard: {
      tab: 'standard',
      title: 'Standardscheman',
      subtitle: 'Färdiga mallar att kopiera',
      icon: 'schema',
      iconClass: 'schedules',
    },
    activities: {
      tab: 'activities',
      title: 'Aktiviteter',
      subtitle: 'Dina aktiviteter — emoji eller eget foto',
      icon: 'aktiviteter',
      iconClass: 'activities',
    },
    bilder: {
      tab: 'activities',
      title: 'Bildarkiv',
      subtitle: 'Egna foton — tandborste, säng, skola',
      icon: 'redigera',
      iconClass: 'images',
    },
    rewards: {
      tab: 'rewards',
      title: 'Belöningar',
      subtitle: 'Mål barnen strävar mot',
      icon: 'beloningar',
      iconClass: 'rewards',
    },
    mine: {
      tab: 'schema',
      title: 'Mina bibliotek',
      subtitle: 'Egna scheman och mallor',
      icon: 'historik',
      iconClass: 'mine',
    },
  };

  let _section = null;
  let _hubSearch = '';
  let _navLock = false;
  let _hubClicksBound = false;

  function markPlanningEntry(directSection) {
    try {
      sessionStorage.setItem('libFromPlanning', '1');
      if (directSection) sessionStorage.setItem('libDirectSection', '1');
      else sessionStorage.removeItem('libDirectSection');
    } catch (_) {}
  }

  function clearPlanningEntry() {
    try {
      sessionStorage.removeItem('libFromPlanning');
      sessionStorage.removeItem('libDirectSection');
    } catch (_) {}
  }

  function isFromPlanning() {
    try { return sessionStorage.getItem('libFromPlanning') === '1'; } catch (_) { return false; }
  }

  function isDirectSectionEntry() {
    try { return sessionStorage.getItem('libDirectSection') === '1'; } catch (_) { return false; }
  }

  function goBackFromSection() {
    if (isDirectSectionEntry() || (_section === 'bilder' && isFromPlanning())) {
      clearPlanningEntry();
      window.location.href = '/planning';
      return;
    }
    showHub();
  }

  function goBackFromHub() {
    if (isFromPlanning()) {
      clearPlanningEntry();
      window.location.href = '/planning';
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    }
  }

  function bindHubClicks() {
    if (_hubClicksBound) return;
    _hubClicksBound = true;
    document.addEventListener('click', function (e) {
      const hub = document.getElementById('libraryMagicHubMount');
      if (!hub || hub.classList.contains('hidden')) return;
      if (!document.body.classList.contains('parent-magic-library')) return;
      const card = e.target.closest('[data-library-section]');
      if (!card || !hub.contains(card)) return;
      e.preventDefault();
      try { sessionStorage.removeItem('libDirectSection'); } catch (_) {}
      openSection(card.getAttribute('data-library-section'), false);
    });
  }

  function setMagicHash(hash) {
    const current = (window.location.hash || '').replace('#', '');
    if (current === hash) return;
    _navLock = true;
    window.location.hash = hash;
    setTimeout(function () { _navLock = false; }, 0);
  }

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

  function clearSectionClasses() {
    document.body.classList.remove(
      'library-magic-section-standard',
      'library-magic-section-activities',
      'library-magic-section-bilder',
      'library-magic-section-rewards',
      'library-magic-section-mine',
      'library-magic-has-section-mount'
    );
  }

  function applyLayout() {
    const magic = isMagic();
    document.body.classList.toggle('parent-magic-library', magic);
    if (!magic) {
      document.body.classList.remove('library-magic-on-hub', 'library-magic-in-section');
      clearSectionClasses();
      const hub = document.getElementById('libraryMagicHubMount');
      const chrome = document.getElementById('libraryMagicChrome');
      const sectionMount = document.getElementById('libraryMagicSectionMount');
      const mineSeg = document.getElementById('libraryMagicMineSegments');
      if (hub) { hub.innerHTML = ''; hub.classList.add('hidden'); }
      if (chrome) { chrome.classList.add('hidden'); chrome.innerHTML = ''; }
      if (sectionMount) { sectionMount.innerHTML = ''; sectionMount.classList.add('hidden'); }
      if (mineSeg) mineSeg.innerHTML = '';
      if (window.LibraryMagicSchedules) LibraryMagicSchedules.refresh();
      if (window.LibraryMagicMine) LibraryMagicMine.refresh();
      return;
    }
    routeFromHash();
    if (window.ParentMagicShell && ParentMagicShell.refresh) {
      ParentMagicShell.refresh();
    }
  }

  function renderHub() {
    const mount = document.getElementById('libraryMagicHubMount');
    if (!mount) return;
    mount.classList.remove('hidden');
    mount.innerHTML =
      '<div class="library-magic-hub magic-3d-scene">' +
      (isFromPlanning()
        ? '<button type="button" class="library-magic-planning-back" data-library-planning-back="1">← Till planering</button>'
        : '') +
      '<div class="library-magic-hub-head">' +
      '<div><h1>📚 Biblioteket</h1><p>Scheman, aktiviteter och belöningar för er familj</p></div>' +
      '<div class="library-magic-mascot" aria-hidden="true">⭐</div></div>' +
      '<input type="search" class="library-magic-search" id="libraryMagicSearch" placeholder="Sök i biblioteket…" value="' + escHtml(_hubSearch) + '">' +
      '<div class="library-magic-menu">' +
      menuCard('standard') +
      menuCard('activities') +
      menuCard('bilder') +
      menuCard('rewards') +
      menuCard('mine') +
      '</div></div>';

    const search = mount.querySelector('#libraryMagicSearch');
    if (search) {
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          _hubSearch = search.value.trim();
          openSection('activities', true);
        }
      });
    }

    mount.querySelectorAll('[data-library-section]').forEach(function (card) {
      card.addEventListener('click', function (e) {
        e.preventDefault();
        try { sessionStorage.removeItem('libDirectSection'); } catch (_) {}
        openSection(card.getAttribute('data-library-section'), false);
      });
    });

    const planningBack = mount.querySelector('[data-library-planning-back]');
    if (planningBack) {
      planningBack.addEventListener('click', function () {
        goBackFromHub();
      });
    }
  }

  const SECTION_ICON_EMOJI = {
    schema: '📅',
    aktiviteter: '📋',
    redigera: '🖼️',
    beloningar: '🎁',
    historik: '📚',
  };

  function notifyParentNavRefresh() {
    if (window.ParentMagicShell && ParentMagicShell.refresh) {
      ParentMagicShell.refresh();
    } else if (window.NativeTabBar && NativeTabBar.remount) {
      NativeTabBar.remount();
    }
  }

  function menuSectionIcon(iconKey) {
    if (window.IconSystem && IconSystem.has(iconKey)) {
      return IconSystem.render(iconKey, {
        size: 28,
        className: 'app-icon app-icon--library-menu',
      });
    }
    return SECTION_ICON_EMOJI[iconKey] || '⭐';
  }

  function chromeSectionIcon(iconKey, iconClass) {
    const glyph = (window.IconSystem && IconSystem.has(iconKey))
      ? IconSystem.render(iconKey, {
        size: 28,
        className: 'app-icon app-icon--library-chrome',
      })
      : (SECTION_ICON_EMOJI[iconKey] || '⭐');
    const cls = 'library-magic-chrome-icon library-magic-chrome-icon--' + (iconClass || 'default');
    const emojiCls = (window.IconSystem && IconSystem.has(iconKey)) ? '' : ' library-magic-chrome-icon--emoji';
    return '<span class="' + cls + emojiCls + '" aria-hidden="true">' + glyph + '</span>';
  }

  function sectionIcon(iconKey) {
    return menuSectionIcon(iconKey);
  }

  function menuCard(key) {
    const s = SECTIONS[key];
    return '<button type="button" class="library-magic-menu-card magic-3d-card" data-library-section="' + key + '">' +
      '<span class="library-magic-menu-icon ' + s.iconClass + '" aria-hidden="true">' + sectionIcon(s.icon) + '</span>' +
      '<span class="library-magic-menu-text"><strong>' + escHtml(s.title) + '</strong><span>' + escHtml(s.subtitle) + '</span></span>' +
      '<span class="library-magic-menu-arrow" aria-hidden="true">›</span></button>';
  }

  function renderChrome(sectionKey) {
    const chrome = document.getElementById('libraryMagicChrome');
    if (!chrome) return;
    const s = SECTIONS[sectionKey];
    if (!s) {
      chrome.classList.add('hidden');
      chrome.innerHTML = '';
      return;
    }

    let actionHtml = '';
    if (sectionKey === 'activities' && typeof window.openActivityModal === 'function') {
      actionHtml = '<button type="button" class="library-magic-chrome-action" data-library-action="new-activity">+ Ny</button>';
    } else if (sectionKey === 'rewards' && typeof window.openRewardModal === 'function') {
      actionHtml = '<button type="button" class="library-magic-chrome-action" data-library-action="new-reward">+ Ny</button>';
    } else if (sectionKey === 'mine' && typeof window.openCreateTemplateModal === 'function') {
      actionHtml = '<button type="button" class="library-magic-chrome-action" data-library-action="new-template">+ Schema</button>';
    }

    chrome.classList.remove('hidden');
    chrome.innerHTML =
      '<div class="library-magic-chrome">' +
      '<button type="button" class="library-magic-back" data-library-action="back" aria-label="Tillbaka">←</button>' +
      '<div class="library-magic-chrome-title"><h2 class="library-magic-chrome-heading">' + chromeSectionIcon(s.icon, s.iconClass) + '<span>' + escHtml(s.title) + '</span></h2><p>' + escHtml(s.subtitle) + '</p></div>' +
      actionHtml +
      '</div>';

    chrome.onclick = function (e) {
      const btn = e.target.closest('[data-library-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-library-action');
      if (action === 'back') {
        goBackFromSection();
      } else if (action === 'new-activity') {
        window.openActivityModal();
      } else if (action === 'new-reward') {
        window.openRewardModal();
      } else if (action === 'new-template') {
        window.openCreateTemplateModal();
      }
    };
  }

  function afterSectionOpen(key, fromSearch) {
    if (key === 'standard' && window.LibraryMagicSchedules) {
      LibraryMagicSchedules.show();
    } else if (key === 'mine' && window.LibraryMagicMine) {
      LibraryMagicMine.show();
    } else {
      const sectionMount = document.getElementById('libraryMagicSectionMount');
      if (sectionMount) {
        sectionMount.classList.add('hidden');
        sectionMount.innerHTML = '';
      }
      if (window.LibraryMagicSchedules) LibraryMagicSchedules.refresh();
      if (window.LibraryMagicMine) LibraryMagicMine.refresh();
    }

    if (fromSearch && _hubSearch) {
      setTimeout(function () {
        const input = document.getElementById(key === 'rewards' ? 'rewardSearchInput' : 'activitySearchInput');
        if (input) {
          input.value = _hubSearch;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
      }, 100);
    }

    if (key === 'bilder') {
      setTimeout(function () {
        const archive = document.getElementById('familyImageArchive');
        if (archive) archive.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }

  function closeLibraryModals() {
    if (typeof window.closeAllLibraryModals === 'function') {
      window.closeAllLibraryModals();
    }
  }

  function openSection(key, fromSearch) {
    closeLibraryModals();
    const s = SECTIONS[key];
    if (!s || typeof window.switchTab !== 'function') {
      console.warn('[LibraryMagicHub] switchTab saknas — ladda om sidan');
      return;
    }

    const targetHash = 'magic-' + key;
    if (_section === key && !fromSearch &&
        (window.location.hash || '').replace('#', '') === targetHash) {
      return;
    }

    _section = key;
    document.body.classList.remove('library-magic-on-hub');
    document.body.classList.add('library-magic-in-section');
    clearSectionClasses();
    document.body.classList.add('library-magic-section-' + key);

    const hub = document.getElementById('libraryMagicHubMount');
    if (hub) {
      hub.classList.add('hidden');
      hub.innerHTML = '';
    }

    if (key === 'standard' && window.LibraryMagicSchedules) {
      LibraryMagicSchedules.reset();
    }
    if (key === 'mine' && window.LibraryMagicMine) {
      LibraryMagicMine.reset();
    }

    window.switchTab(s.tab);
    if (key === 'standard' && typeof window.switchStdSubTab === 'function') {
      window.switchStdSubTab('schedules');
    }

    renderChrome(key);
    setMagicHash(targetHash);
    notifyParentNavRefresh();
    afterSectionOpen(key, fromSearch);
  }

  function showHub() {
    closeLibraryModals();
    if (_section === null && document.body.classList.contains('library-magic-on-hub')) {
      const existing = document.getElementById('libraryMagicHubMount');
      if (existing && existing.innerHTML) return;
    }

    _section = null;
    document.body.classList.add('library-magic-on-hub');
    document.body.classList.remove('library-magic-in-section');
    clearSectionClasses();

    const chrome = document.getElementById('libraryMagicChrome');
    if (chrome) {
      chrome.classList.add('hidden');
      chrome.innerHTML = '';
    }

    const sectionMount = document.getElementById('libraryMagicSectionMount');
    if (sectionMount) {
      sectionMount.classList.add('hidden');
      sectionMount.innerHTML = '';
    }

    const mineSeg = document.getElementById('libraryMagicMineSegments');
    if (mineSeg) mineSeg.innerHTML = '';

    if (window.LibraryMagicSchedules) LibraryMagicSchedules.refresh();
    if (window.LibraryMagicMine) LibraryMagicMine.refresh();

    ['schema', 'activities', 'standard', 'rewards'].forEach(function (t) {
      const pane = document.getElementById('tab-' + t);
      if (pane) pane.classList.remove('active');
    });

    renderHub();
    setMagicHash('magic-hub');
    notifyParentNavRefresh();
  }

  function routeFromHash() {
    if (_navLock) return;
    if (!isMagic()) return;

    const hash = (window.location.hash || '').replace('#', '');
    if (hash === 'treasury') {
      window.location.href = '/skattkammaren';
      return;
    }
    if (hash.indexOf('magic-') === 0) {
      const key = hash.slice(6);
      if (SECTIONS[key]) {
        if (isFromPlanning() && (key === 'bilder' || key === 'activities')) {
          try { sessionStorage.setItem('libDirectSection', '1'); } catch (_) {}
        }
        openSection(key, false);
        return;
      }
    }
    if (hash === 'standard' || hash === 'activities' || hash === 'rewards' || hash === 'schema') {
      const map = { standard: 'standard', activities: 'activities', rewards: 'rewards', schema: 'mine' };
      openSection(map[hash], false);
      return;
    }
    showHub();
  }

  function init() {
    bindHubClicks();
    if (!window.AppViewMode) {
      applyLayout();
      return Promise.resolve(false);
    }

    return AppViewMode.initParent().then(function () {
      const toggleMount = document.getElementById('appViewToggleMount');
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
    getSection: function () { return _section; },
    markPlanningEntry: markPlanningEntry,
    clearPlanningEntry: clearPlanningEntry,
  };
})();
