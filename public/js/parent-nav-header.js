/**
 * parent-nav-header.js — Top chrome: Notiser + Inställningar + Tipsa.
 */
(function () {
  'use strict';

  if (!window.NavConfig) return;

  const path = NavConfig.normalizePath(window.location.pathname);
  if (path === '/login' || path === '/child-login' || path.indexOf('/admin') === 0) return;
  if (!NavConfig.isParentShellPath(path) && path !== '/settings') return;

  const ICON_BTN =
    'parent-hub-icon-btn min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/80 border border-lavender shadow-sm';

  function iconMarkup(action) {
    if (window.IconSystem && IconSystem.has(action.icon)) {
      return IconSystem.header(action.icon);
    }
    if (window.ParentNavIcons) {
      if (action.icon === 'notiser' || action.id === 'notifications') return ParentNavIcons.notiser;
      if (action.icon === 'installningar' || action.icon === 'settings') return ParentNavIcons.settings;
      if (action.icon === 'tipsa' || action.icon === 'share') return ParentNavIcons.tipsa;
    }
    return action.icon || '';
  }

  function fetchUnreadBadge(link) {
    if (!link || typeof fetch !== 'function') return;
    fetch('/api/notifications/unread-count', { credentials: 'include' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return;
        const count = parseInt(data.count, 10) || 0;
        let badge = link.querySelector('.parent-nav-notif-badge');
        if (count <= 0) {
          if (badge) badge.hidden = true;
          return;
        }
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'parent-nav-notif-badge';
          badge.setAttribute('aria-hidden', 'true');
          link.appendChild(badge);
        }
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.hidden = false;
      })
      .catch(function () {});
  }

  function buildActionElement(action) {
    if (action.action === 'tipsa' || action.action === 'share') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = ICON_BTN;
      btn.setAttribute('aria-label', action.label || 'Tipsa en familj');
      btn.setAttribute('data-parent-nav-tipsa', '1');
      btn.setAttribute('data-parent-nav-share', '1');
      btn.title = action.label || 'Tipsa';
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
    link.className = ICON_BTN;
    link.setAttribute('aria-label', action.label || '');
    link.title = action.label || '';

    if (action.id === 'notifications') {
      link.setAttribute('data-parent-nav-notifications', '1');
      link.innerHTML = iconMarkup(action);
      fetchUnreadBadge(link);
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

  function selectorForAction(action) {
    if (action.id === 'notifications') return '[data-parent-nav-notifications]';
    if (action.id === 'settings') return '[data-parent-nav-settings]';
    if (action.action === 'tipsa' || action.action === 'share' || action.id === 'tipsa') {
      return '[data-parent-nav-tipsa]';
    }
    return null;
  }

  function refreshHeaderIcons(bar) {
    const actions = NavConfig.HEADER_ACTIONS || [];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const sel = selectorForAction(action);
      if (!sel) continue;
      const el = bar.querySelector(sel);
      if (!el) continue;
      const markup = iconMarkup(action);
      if (markup && el.innerHTML !== markup) el.innerHTML = markup;
      if (action.id === 'notifications') fetchUnreadBadge(el);
    }
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
        const selector = selectorForAction(action);
        if (selector && !bar.querySelector(selector)) {
          bar.appendChild(buildActionElement(action));
        }
      }
      refreshHeaderIcons(bar);
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
    refreshBadges: function () {
      const link = document.querySelector('[data-parent-nav-notifications]');
      if (link) fetchUnreadBadge(link);
    },
  };
})();
