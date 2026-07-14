/**
 * parent-nav-header.js — Top chrome: Dela + Notiser + Inställningar (kugghjul).
 * Avatar-meny hanteras inte här — inställningar nås via kugghjulsikonen.
 */
(function () {
  'use strict';

  if (!window.NavConfig) return;

  const path = NavConfig.normalizePath(window.location.pathname);
  if (path === '/login' || path === '/child-login' || path.indexOf('/admin') === 0) return;
  if (!NavConfig.isParentShellPath(path) && path !== '/settings') return;

  const ICON_BTN =
    'parent-hub-icon-btn min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/80 border border-lavender';

  function iconMarkup(action) {
    if (action.icon === 'share' && window.ParentNavIcons) return window.ParentNavIcons.share;
    if (action.icon === 'settings' && window.ParentNavIcons) return window.ParentNavIcons.settings;
    return action.icon || '';
  }

  function buildActionElement(action) {
    if (action.action === 'share') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = ICON_BTN;
      btn.setAttribute('aria-label', action.label || 'Dela appen');
      btn.setAttribute('data-parent-nav-share', '1');
      btn.title = action.label || 'Dela appen';
      btn.innerHTML = iconMarkup(action);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        trackHeaderEvent('cta_share_app_clicked');
        if (window.ParentShareFlow && ParentShareFlow.open) {
          ParentShareFlow.open({ trackFn: trackHeaderEvent });
        }
      });
      return btn;
    }

    const link = document.createElement('a');
    link.href = action.href || '/settings';
    link.className = ICON_BTN + ' text-lg';
    link.setAttribute('aria-label', action.label || '');
    link.title = action.label || '';

    if (action.id === 'notifications') {
      link.setAttribute('data-parent-nav-notifications', '1');
      link.textContent = '🔔';
      return link;
    }

    if (action.id === 'settings') {
      link.setAttribute('data-parent-nav-settings', '1');
      link.innerHTML = iconMarkup(action);
      link.addEventListener('click', function (e) {
        const router = window.ParentMagicRouter;
        if (
          router &&
          router.shouldSoftNav &&
          router.shouldSoftNav() &&
          router.isSoftNavPath &&
          router.isSoftNavPath('/settings')
        ) {
          e.preventDefault();
          router.navigateTo('/settings');
        }
      });
      return link;
    }

    link.textContent = action.icon || '';
    return link;
  }

  function trackHeaderEvent(eventType, metadata) {
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
        credentials: 'include',
        keepalive: true,
      }).catch(function () {});
    } catch (_) {}
  }

  function ensureHeaderBar() {
    let bar = document.querySelector('[data-parent-nav-header]');
    const actions = NavConfig.HEADER_ACTIONS || [];

    if (!bar) {
      const main = document.querySelector('main') || document.querySelector('.flex-1') || document.body;
      bar = document.createElement('div');
      bar.className = 'parent-nav-header-actions';
      bar.setAttribute('data-parent-nav-header', '1');

      for (let i = 0; i < actions.length; i++) {
        bar.appendChild(buildActionElement(actions[i]));
      }

      if (main && main.firstChild) {
        main.insertBefore(bar, main.firstChild);
      } else {
        document.body.insertBefore(bar, document.body.firstChild);
      }
    } else {
      for (let j = 0; j < actions.length; j++) {
        const action = actions[j];
        const selector =
          action.id === 'share'
            ? '[data-parent-nav-share]'
            : action.id === 'notifications'
              ? '[data-parent-nav-notifications]'
              : action.id === 'settings'
                ? '[data-parent-nav-settings]'
                : null;
        if (selector && !bar.querySelector(selector)) {
          bar.appendChild(buildActionElement(action));
        }
      }
      // Remove legacy gold avatar button from older header chrome
      const legacyAvatar = bar.querySelector('#parentAvatarBtn');
      if (legacyAvatar && legacyAvatar.parentNode) {
        legacyAvatar.parentNode.remove();
      }
    }

    if (window.ParentMagicAuto && ParentMagicAuto.ensureTopChrome) {
      ParentMagicAuto.ensureTopChrome();
    }
    return bar;
  }

  function boot() {
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn && !Auth.isLoggedIn()) return;
    ensureHeaderBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.ParentNavHeader = {
    ensure: ensureHeaderBar,
  };
})();
