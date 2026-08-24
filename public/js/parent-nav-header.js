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

  function iconMarkup(action, opts) {
    opts = opts || {};
    if (window.IconSystem && IconSystem.has(action.icon)) {
      if (action.icon === 'notiser' && IconSystem.isChromeV4 && IconSystem.isChromeV4('notiser')) {
        return IconSystem.header('notiser', undefined, !!opts.notiserActive);
      }
      return IconSystem.header(action.icon);
    }
    if (window.ParentNavIcons) {
      if (action.icon === 'notiser' || action.id === 'notifications') {
        return ParentNavIcons.renderNotiser
          ? ParentNavIcons.renderNotiser(!!opts.notiserActive)
          : ParentNavIcons.notiser;
      }
      if (action.icon === 'installningar' || action.icon === 'settings') return ParentNavIcons.settings;
      if (action.icon === 'tipsa' || action.icon === 'share') return ParentNavIcons.tipsa;
    }
    return action.icon || '';
  }

  let _unreadInflight = null;
  let _unreadFetchedAt = 0;
  const UNREAD_COALESCE_MS = 5000;

  function fetchUnreadBadge(link) {
    if (!link || typeof fetch !== 'function') return;
    const now = Date.now();
    if (_unreadInflight) {
      _unreadInflight.then(function (data) { applyUnreadBadge(link, data); }).catch(function () {});
      return;
    }
    if (now - _unreadFetchedAt < UNREAD_COALESCE_MS) return;
    _unreadInflight = fetch('/api/notifications/unread-count', { credentials: 'include' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        _unreadFetchedAt = Date.now();
        applyUnreadBadge(link, data);
        return data;
      })
      .catch(function () {})
      .finally(function () {
        _unreadInflight = null;
      });
  }

  function applyUnreadBadge(link, data) {
    if (!link || !data) return;
    const count = parseInt(data.count, 10) || 0;
        let badge = link.querySelector('.parent-nav-notif-badge');
        if (count <= 0) {
          if (badge) badge.hidden = true;
          link.removeAttribute('data-has-unread');
          link.innerHTML = iconMarkup({ icon: 'notiser', id: 'notifications' }, { notiserActive: false });
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
    link.setAttribute('data-has-unread', '1');
    link.innerHTML = iconMarkup({ icon: 'notiser', id: 'notifications' }, { notiserActive: true });
  }

  function buildActionElement(action) {
    const label = (window.NavConfig && typeof window.NavConfig.resolveLabel === 'function')
      ? window.NavConfig.resolveLabel(action)
      : (action.label || '');
    if (action.id === 'settings' && path === '/settings') {
      return null;
    }
    if (action.action === 'tipsa' || action.action === 'share') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = ICON_BTN;
      btn.setAttribute('aria-label', label || 'Tipsa en familj');
      btn.setAttribute('data-parent-nav-tipsa', '1');
      btn.setAttribute('data-parent-nav-share', '1');
      btn.title = label || 'Tipsa';
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
    link.setAttribute('aria-label', label);
    link.title = label;

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
    } catch {}
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
      const markup = iconMarkup(action, {
        notiserActive: action.id === 'notifications' && el.getAttribute('data-has-unread') === '1',
      });
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
        const el = buildActionElement(actions[i]);
        if (el) bar.appendChild(el);
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
          const el = buildActionElement(action);
          if (el) bar.appendChild(el);
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
    if (window.ProfileSwitchChrome && typeof ProfileSwitchChrome.apply === 'function') {
      ProfileSwitchChrome.apply();
    }
    return bar;
  }

  function hasParentSessionHint() {
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn()) return true;
    try {
      return document.cookie.indexOf('access_token=') !== -1;
    } catch (_) {
      return false;
    }
  }

  async function boot() {
    if (document.querySelector('.landing-nav') || document.body.classList.contains('landing-page')) return;
    if (!hasParentSessionHint()) return;
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn && !Auth.isLoggedIn()
        && typeof Auth.hydrateParentSessionFromCookies === 'function') {
      try { await Auth.hydrateParentSessionFromCookies(); } catch (_) { /* ignore */ }
    }
    ensureHeaderBar();
    if (window.ProfileSwitchChrome && typeof ProfileSwitchChrome.apply === 'function') {
      ProfileSwitchChrome.apply();
    }
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
