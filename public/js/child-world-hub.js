/**
 * child-world-hub.js — Min värld starts here: three clear choices, not a picture puzzle.
 */
(function () {
  'use strict';

  let _active = false;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function childName() {
    if (typeof window.me !== 'undefined' && window.me && window.me.name) {
      return window.me.name;
    }
    return 'du';
  }

  function hideLoader() {
    const loader = document.getElementById('skattkammarLoading');
    const view = document.getElementById('skattkammarView');
    if (loader) loader.style.display = 'none';
    if (view) view.style.display = '';
  }

  function deactivateScenes() {
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.deactivate === 'function') {
      window.ChildMorgonhus.deactivate();
    }
    if (window.ChildGarden && typeof window.ChildGarden.deactivate === 'function') {
      window.ChildGarden.deactivate();
    }
    if (window.ChildMemoryHall && typeof window.ChildMemoryHall.deactivate === 'function') {
      window.ChildMemoryHall.deactivate();
    }
    if (window.ChildWorldWayfinder && typeof window.ChildWorldWayfinder.clearActivePlace === 'function') {
      window.ChildWorldWayfinder.clearActivePlace(document);
    }
    document.body.classList.remove(
      'child-morgonhus-active',
      'child-garden-active',
      'child-memory-hall-active',
      'child-wayfinder-active'
    );
  }

  function renderHub(opts) {
    const o = opts || {};
    const gardenHint = o.gardenLocked
      ? 'Bocka av något på Idag först'
      : 'Plantera och skörda solrosor';
    const gardenDisabled = Boolean(o.gardenLocked);

    return '<div class="cwh-hub" data-world="hub">' +
      '<header class="cwh-header">' +
        '<h1 class="cwh-title">Hej ' + esc(childName()) + '!</h1>' +
        '<p class="cwh-sub">Vad vill du göra i din värld?</p>' +
      '</header>' +
      '<div class="cwh-choices">' +
        '<button type="button" class="cwh-choice cwh-choice--primary' + (gardenDisabled ? ' is-disabled' : '') + '"' +
          ' data-cwh-go="garden"' + (gardenDisabled ? ' disabled' : '') +
          ' aria-label="Trädgården — ' + esc(gardenHint) + '">' +
          '<span class="cwh-choice-icon" aria-hidden="true">🌻</span>' +
          '<span class="cwh-choice-body">' +
            '<span class="cwh-choice-label">Trädgården</span>' +
            '<span class="cwh-choice-hint">' + esc(gardenHint) + '</span>' +
          '</span>' +
        '</button>' +
        '<button type="button" class="cwh-choice" data-cwh-go="morgonhus" aria-label="Morgonhuset — ditt hem">' +
          '<span class="cwh-choice-icon" aria-hidden="true">🏠</span>' +
          '<span class="cwh-choice-body">' +
            '<span class="cwh-choice-label">Morgonhuset</span>' +
            '<span class="cwh-choice-hint">Ditt hem — titta runt</span>' +
          '</span>' +
        '</button>' +
        '<button type="button" class="cwh-choice" data-cwh-go="skatt" aria-label="Skattkammaren — belöningar">' +
          '<span class="cwh-choice-icon" aria-hidden="true">💎</span>' +
          '<span class="cwh-choice-body">' +
            '<span class="cwh-choice-label">Skattkammaren</span>' +
            '<span class="cwh-choice-hint">Dina stjärnor och belöningar</span>' +
          '</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  async function fetchGardenLocked() {
    if (!window.Auth || typeof window.Auth.api !== 'function') return true;
    try {
      const payload = await window.Auth.api('/api/me/garden/slots');
      if (!payload || !payload.slots || !payload.slots.length) return false;
      const bed = payload.slots.find(function (s) { return s.slot_id === 'bed_1'; }) || payload.slots[0];
      return Boolean(bed.plant_locked && bed.state_key === 'empty');
    } catch (_) {
      return false;
    }
  }

  async function enterGarden() {
    if (window.LivingWorldTransition && typeof window.LivingWorldTransition.enterGarden === 'function') {
      return window.LivingWorldTransition.enterGarden({ doorEl: null });
    }
    if (window.ChildGarden && typeof window.ChildGarden.mount === 'function') {
      _active = false;
      return window.ChildGarden.mount();
    }
    return false;
  }

  async function enterMorgonhus() {
    if (!window.ChildMorgonhus || typeof window.ChildMorgonhus.tryMountWorld !== 'function') {
      return false;
    }
    _active = false;
    return window.ChildMorgonhus.tryMountWorld();
  }

  function enterSkatt() {
    _active = false;
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.openSkattkammaren === 'function') {
      window.ChildMorgonhus.openSkattkammaren();
      return true;
    }
    if (typeof window.loadRewards === 'function') {
      window.rewardsLoaded = false;
      if (window.ChildMorgonhus && typeof window.ChildMorgonhus.clearPreferSkatt === 'function') {
        window.ChildMorgonhus.clearPreferSkatt();
      }
      window.loadRewards({ force: true, skipHub: true });
      return true;
    }
    return false;
  }

  function bindHub(root) {
    if (!root) return;
    root.querySelectorAll('[data-cwh-go]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (btn.disabled || btn.classList.contains('is-disabled')) return;
        const dest = btn.getAttribute('data-cwh-go');
        if (dest === 'garden') {
          await enterGarden();
          return;
        }
        if (dest === 'morgonhus') {
          await enterMorgonhus();
          return;
        }
        if (dest === 'skatt') {
          enterSkatt();
        }
      });
    });
  }

  async function show() {
    const view = document.getElementById('skattkammarView');
    if (!view) return false;

    deactivateScenes();
    const gardenLocked = await fetchGardenLocked();
    view.innerHTML = renderHub({ gardenLocked: gardenLocked });
    bindHub(view);
    hideLoader();
    _active = true;
    document.body.classList.add('child-world-hub-active');
    return true;
  }

  async function tryShow() {
    const view = document.getElementById('skattkammarView');
    if (!view) return false;
    return show();
  }

  function isActive() {
    return _active;
  }

  function deactivate() {
    _active = false;
    document.body.classList.remove('child-world-hub-active');
  }

  window.ChildWorldHub = {
    show: show,
    tryShow: tryShow,
    isActive: isActive,
    deactivate: deactivate,
    renderHub: renderHub,
  };
})();
