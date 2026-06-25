/**
 * parent-avatar-menu.js — Header avatar dropdown (vuxenmeny v2 Sprint 4).
 * Settings, subscription, pedagog switch, logout — required on native (no sidebar logout).
 */
(function () {
  'use strict';

  if (!window.NavConfig || !window.Auth) return;

  function isNativeShell() {
    if (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) return true;
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) return true;
    return false;
  }

  var path = NavConfig.normalizePath(window.location.pathname);
  if (path === '/login' || path === '/child-login' || path.indexOf('/admin') === 0) return;
  if (!NavConfig.isParentShellPath(path) && path !== '/settings') return;

  var MENU_ID = 'parentAvatarMenu';
  var BTN_ID = 'parentAvatarBtn';

  function ensureHeaderBar() {
    var bar = document.querySelector('[data-parent-nav-header]');
    if (bar) return bar;

    var main = document.querySelector('main') || document.querySelector('.flex-1') || document.body;
    bar = document.createElement('div');
    bar.className = 'parent-nav-header-actions';
    bar.setAttribute('data-parent-nav-header', '1');

    if (!document.querySelector('[data-parent-nav-notifications]')) {
      var notif = document.createElement('a');
      notif.href = '/notifications';
      notif.className =
        'parent-hub-icon-btn min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/80 border border-lavender text-lg';
      notif.setAttribute('aria-label', 'Notiser');
      notif.setAttribute('data-parent-nav-notifications', '1');
      notif.textContent = '🔔';
      bar.appendChild(notif);
    }

    if (main && main.firstChild) {
      main.insertBefore(bar, main.firstChild);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
    return bar;
  }

  function userInitial(user) {
    if (!user) return '👤';
    if (user.name) return user.name.trim().charAt(0).toUpperCase();
    if (user.email) return user.email.trim().charAt(0).toUpperCase();
    return '👤';
  }

  function buildMenuItems(user) {
    var items = [];
    var avatarActions = NavConfig.AVATAR_ACTIONS || [];

    for (var i = 0; i < avatarActions.length; i++) {
      var action = avatarActions[i];
      if (action.role === 'dual_or_educator') {
        var accountType = user && user.account_type;
        if (accountType !== 'dual' && accountType !== 'educator') continue;
        if (user.preferred_view_mode === 'pedagog') continue;
      }
      if (action.id === 'subscription' && isNativeShell()) continue;
      if (action.id === 'subscription' && window.BillingUi && !window.BillingUi.isEnabled()) continue;
      if (action.feature && NavConfig.hasFeatureAccess) {
        var access = window._packageAccess;
        if (!NavConfig.hasFeatureAccess(access, action.feature)) continue;
      }
      if (action.id === 'subscription' && user) {
        var showSub = action.showWhenTrialUnder7 !== false;
        if (showSub && window._packageAccess) {
          /* always show subscription link in avatar */
        }
      }
      items.push(action);
    }

    if (!items.length) {
      items = [
        { id: 'settings', href: '/settings', label: 'Inställningar' },
        { id: 'subscription', href: '/settings#prenumeration', label: 'Prenumeration' },
        { id: 'logout', action: 'logout', label: 'Logga ut' },
      ];
    }

    return items;
  }

  function closeMenu() {
    var menu = document.getElementById(MENU_ID);
    var btn = document.getElementById(BTN_ID);
    var wrap = document.getElementById('parentAvatarWrap');
    if (menu) {
      menu.classList.add('hidden');
      if (wrap && menu.parentNode === document.body) {
        wrap.appendChild(menu);
      }
    }
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function positionMenu() {
    var menu = document.getElementById(MENU_ID);
    var btn = document.getElementById(BTN_ID);
    if (!menu || !btn) return;
    var rect = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = Math.round(rect.bottom + 8) + 'px';
    menu.style.right = Math.round(window.innerWidth - rect.right) + 'px';
    menu.style.left = 'auto';
    menu.style.bottom = 'auto';
  }

  function openMenu() {
    var menu = document.getElementById(MENU_ID);
    var btn = document.getElementById(BTN_ID);
    if (!menu || !btn) return;
    if (menu.parentNode !== document.body) {
      document.body.appendChild(menu);
    }
    positionMenu();
    menu.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
  }

  function toggleMenu() {
    var menu = document.getElementById(MENU_ID);
    if (!menu) return;
    if (menu.classList.contains('hidden')) openMenu();
    else closeMenu();
  }

  async function handleAction(action) {
    closeMenu();
    if (action.action === 'logout') {
      await Auth.logout();
      return;
    }
    if (action.id === 'switch_pedagog') {
      try {
        await Auth.api('/api/auth/me/preferences', {
          method: 'POST',
          body: JSON.stringify({ preferredViewMode: 'pedagog' }),
        });
        localStorage.removeItem('viewMode');
        window.location.href = '/pedagog-oversikt';
      } catch (err) {
        console.error('[avatar-menu] pedagog switch failed:', err);
      }
      return;
    }
    if (action.href) {
      if (
        window.ParentMagicRouter &&
        ParentMagicRouter.shouldSoftNav &&
        ParentMagicRouter.shouldSoftNav() &&
        ParentMagicRouter.isSoftNavPath &&
        ParentMagicRouter.isSoftNavPath(action.href)
      ) {
        ParentMagicRouter.navigateTo(action.href);
        return;
      }
      window.location.href = action.href;
    }
  }

  function renderAvatar(user) {
    if (document.getElementById(BTN_ID)) return;

    var bar = ensureHeaderBar();
    var wrap = document.createElement('div');
    wrap.className = 'relative parent-avatar-wrap';
    wrap.id = 'parentAvatarWrap';
    wrap.style.position = 'relative';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = BTN_ID;
    btn.className =
      'parent-hub-icon-btn min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-gold text-navy font-heading font-bold text-sm border border-lavender';
    btn.setAttribute('aria-label', 'Kontomeny');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = userInitial(user);

    var menu = document.createElement('div');
    menu.id = MENU_ID;
    menu.className = 'hidden parent-avatar-menu-dropdown absolute right-0 top-full mt-2 min-w-[220px] rounded-xl shadow-xl z-[9000] py-1';
    menu.setAttribute('role', 'menu');

    var items = buildMenuItems(user);
    menu.innerHTML = items
      .map(function (action) {
        if (action.action === 'logout') {
          return (
            '<button type="button" class="parent-avatar-menu-item parent-avatar-menu-item--danger w-full text-left px-4 py-3 text-sm font-semibold min-h-[44px]" role="menuitem" data-avatar-action="' +
            action.id +
            '">' +
            action.label +
            '</button>'
          );
        }
        return (
          '<button type="button" class="parent-avatar-menu-item w-full text-left px-4 py-3 text-sm font-semibold min-h-[44px]" role="menuitem" data-avatar-action="' +
          action.id +
          '" data-avatar-href="' +
          (action.href || '') +
          '">' +
          action.label +
          '</button>'
        );
      })
      .join('');

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMenu();
    });

    menu.addEventListener('click', function (e) {
      var item = e.target.closest('[data-avatar-action]');
      if (!item) return;
      var id = item.getAttribute('data-avatar-action');
      var found = items.find(function (a) {
        return a.id === id;
      });
      if (found) handleAction(found);
    });

    document.addEventListener('click', function () {
      closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', function () {
      var menu = document.getElementById(MENU_ID);
      if (menu && !menu.classList.contains('hidden')) positionMenu();
    }, true);

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    bar.appendChild(wrap);
    if (window.ParentMagicAuto && ParentMagicAuto.ensureTopChrome) {
      ParentMagicAuto.ensureTopChrome();
    }
  }

  async function boot() {
    if (!Auth.isLoggedIn()) return;
    if (window.BillingUi && BillingUi.refresh) {
      try { await BillingUi.refresh(); } catch (_) { /* ignore */ }
    }
    var user = Auth.getUser();
    renderAvatar(user);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
