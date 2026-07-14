/**
 * child-system-menu.js — Header vuxenikon + Parental Gate system actions (barnmeny v2 Sprint 1).
 */
(function () {
  'use strict';

  if (!window.ChildWorlds || !ChildWorlds.V2_ENABLED || !window.ChildCapabilities) return;

  const MENU_ID = 'childSystemMenu';
  const BTN_ID = 'childSystemIconBtn';

  function shouldMount() {
    return !(
      window.ChildWorlds &&
      ChildWorlds.isBarnetsSamlingEnabled &&
      ChildWorlds.isBarnetsSamlingEnabled()
    );
  }

  function hideLegacyHeaderActions() {
    ['childDarkBtn', 'viewToggleBtn', 'printBtn', 'switchChildBtn', 'logoutBtn'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function runAction(actionId) {
    closeMenu();
    if (actionId === 'switch_child' && typeof window.switchChildMember === 'function') {
      window.switchChildMember();
      return;
    }
  }

  function openMenu() {
    const menu = document.getElementById(MENU_ID);
    const btn = document.getElementById(BTN_ID);
    if (menu) menu.classList.remove('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    const menu = document.getElementById(MENU_ID);
    const btn = document.getElementById(BTN_ID);
    if (menu) menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function onSystemIconClick() {
    const open = function () {
      openMenu();
    };
    if (window.ParentalGate && ParentalGate.requireParentMode) {
      ParentalGate.requireParentMode(open, closeMenu);
    } else {
      open();
    }
  }

  function mount() {
    if (!shouldMount()) return;
    if (document.getElementById(BTN_ID)) return;

    let header = document.querySelector('#childMainHeader .flex.items-center.gap-1\\.5');
    if (!header) {
      header = document.querySelector('#childMainHeader .flex.items-center.justify-between');
      if (header) {
        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-1.5';
        header.appendChild(actions);
        header = actions;
      }
    }
    if (!header) return;

    hideLegacyHeaderActions();

    const wrap = document.createElement('div');
    wrap.className = 'relative';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = BTN_ID;
    btn.className =
      'min-h-[44px] flex items-center justify-center gap-1 px-2.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors';
    btn.setAttribute('aria-label', 'Förälder');
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span aria-hidden="true">' + (window.IconSystem ? IconSystem.nav('installningar') : '⚙️') + '</span><span>Förälder</span>';

    const menu = document.createElement('div');
    menu.id = MENU_ID;
    menu.className =
      'hidden absolute right-0 top-full mt-2 min-w-[200px] bg-white text-navy border border-lavender rounded-xl shadow-lg z-50 py-1';
    menu.setAttribute('role', 'menu');

    menu.innerHTML = ChildCapabilities.CHILD_SYSTEM_ACTIONS.map(function (action) {
      return (
        '<button type="button" role="menuitem" class="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-sky min-h-[44px]" data-system-action="' +
        action.id +
        '">' +
        action.label +
        '</button>'
      );
    }).join('');

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      onSystemIconClick();
    });

    menu.addEventListener('click', function (e) {
      const item = e.target.closest('[data-system-action]');
      if (!item) return;
      runAction(item.getAttribute('data-system-action'));
    });

    document.addEventListener('click', function () {
      closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    header.appendChild(wrap);
  }

  window.ChildSystemMenu = { mount: mount, closeMenu: closeMenu, shouldMount: shouldMount };
})();
