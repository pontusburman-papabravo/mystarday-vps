/**
 * profile-switch-chrome.js — "Byt profil" on all logged-in pages (family shared device).
 */
(function () {
  'use strict';

  const DAILY_UX_KEY = 'stjarndag_family_device_daily_ux_v1';
  const PROFILE_COUNT_KEY = 'stjarndag_entry_profile_count';
  const ALLOWED_COUNT_KEY = 'stjarndag_entry_allowed_count';
  const FLOAT_BTN_ID = 'profileSwitchFloatBtn';
  const RETURN_CHILD_BTN_ID = 'profileReturnToChildBtn';

  function returnToChildLabel() {
    if (typeof window.childT === 'function') {
      const t = childT('settings.returnToChild');
      if (t) return t;
    }
    return 'Tillbaka till barn';
  }

  function isDailyUxActive() {
    if (window.AppEntryOrchestrator && typeof AppEntryOrchestrator.isDailyUxActive === 'function') {
      return AppEntryOrchestrator.isDailyUxActive();
    }
    try {
      return sessionStorage.getItem(DAILY_UX_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function getProfileCount() {
    try {
      const n = parseInt(sessionStorage.getItem(PROFILE_COUNT_KEY), 10);
      if (Number.isFinite(n) && n > 0) return n;
      const children = parseInt(sessionStorage.getItem(ALLOWED_COUNT_KEY), 10);
      if (Number.isFinite(children) && children > 0) return children;
    } catch (_) { /* ignore */ }
    return 0;
  }

  function shouldShow() {
    return isDailyUxActive() && getProfileCount() > 1;
  }

  function labelText() {
    if (typeof window.childT === 'function') {
      const t = childT('settings.switchProfile');
      if (t) return t;
    }
    if (typeof window.cpt === 'function') {
      const t = cpt('settings.switchProfile');
      if (t) return t;
    }
    return 'Byt profil';
  }

  function goSwitch() {
    if (window.Auth && typeof Auth.switchChildMember === 'function') {
      Auth.switchChildMember();
      return;
    }
    if (typeof window.switchChildMember === 'function') {
      window.switchChildMember();
    }
  }

  function storeEntryMeta(body) {
    if (!body || typeof body !== 'object') return;
    try {
      const children = Array.isArray(body.allowedChildren) ? body.allowedChildren.length : 0;
      const parents = Array.isArray(body.allowedParents) ? body.allowedParents.length : 0;
      const total = children + parents;
      if (total > 0) {
        sessionStorage.setItem(PROFILE_COUNT_KEY, String(total));
      }
      if (Array.isArray(body.allowedChildren)) {
        sessionStorage.setItem(ALLOWED_COUNT_KEY, String(children));
      }
    } catch (_) { /* ignore */ }
  }

  function isSamlingMode() {
    try {
      return document.documentElement.getAttribute('data-barnets-samling') === 'on';
    } catch (_) {
      return false;
    }
  }

  function isChildShellPath() {
    const p = (window.location.pathname || '').replace(/\/$/, '') || '/';
    return p.indexOf('/child/') === 0 || p === '/child-dashboard';
  }

  function isParentShellPath() {
    if (window.NavConfig && typeof NavConfig.isParentShellPath === 'function') {
      return NavConfig.isParentShellPath(window.location.pathname);
    }
    const p = (window.location.pathname || '').replace(/\/$/, '') || '/';
    return p === '/settings' || p === '/home' || p === '/dashboard' || p.indexOf('/family/child/') === 0;
  }

  function syncLegacyHeaderBtn() {
    const legacy = document.getElementById('switchChildBtn');
    if (!legacy) return;
    const show = shouldShow() && !isSamlingMode();
    if (show) {
      legacy.style.display = '';
      legacy.setAttribute('aria-hidden', 'false');
      const spans = legacy.querySelectorAll('span');
      if (spans.length) spans[spans.length - 1].textContent = labelText();
      legacy.setAttribute('title', labelText());
      legacy.setAttribute('aria-label', labelText());
    } else if (isDailyUxActive()) {
      legacy.style.display = 'none';
      legacy.setAttribute('aria-hidden', 'true');
    }
  }

  function ensureFloatingBtn() {
    const existing = document.getElementById(FLOAT_BTN_ID);
    if (!shouldShow() || !isChildShellPath() || !isSamlingMode()) {
      if (existing) existing.remove();
      return;
    }
    let btn = existing;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = FLOAT_BTN_ID;
      btn.className = 'profile-switch-float-btn';
      btn.addEventListener('click', goSwitch);
      document.body.appendChild(btn);
    }
    btn.innerHTML = '<span aria-hidden="true">🔄</span><span>' + labelText() + '</span>';
    btn.setAttribute('aria-label', labelText());
  }

  function hasParentSessionHint() {
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn()) return true;
    try {
      return document.cookie.indexOf('access_token=') !== -1;
    } catch (_) {
      return false;
    }
  }

  function isAdultPrivilegeActive() {
    return !!(window.AdultPrivilege
      && typeof AdultPrivilege.isPrivilegeActive === 'function'
      && AdultPrivilege.isPrivilegeActive());
  }

  function ensureReturnToChildBtn() {
    const existing = document.getElementById(RETURN_CHILD_BTN_ID);
    const show = isDailyUxActive() && isParentShellPath() && isAdultPrivilegeActive();
    if (!show) {
      if (existing) existing.remove();
      return;
    }
    let btn = existing;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = RETURN_CHILD_BTN_ID;
      btn.className = 'profile-return-child-btn';
      btn.addEventListener('click', function () {
        if (window.AdultPrivilege && typeof AdultPrivilege.returnToChildExperience === 'function') {
          AdultPrivilege.returnToChildExperience();
        }
      });
      const bar = document.querySelector('[data-parent-nav-header]');
      if (bar) {
        bar.appendChild(btn);
      } else {
        btn.classList.add('profile-return-child-fallback');
        document.body.appendChild(btn);
      }
    }
    const label = returnToChildLabel();
    btn.innerHTML = '<span aria-hidden="true">👶</span><span>' + label + '</span>';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  function ensureParentBtn() {
    const selector = '[data-profile-switch-parent]';
    const existing = document.querySelector(selector);
    // While an adult has temporarily escalated privilege from a child session,
    // "Tillbaka till barn" (ensureReturnToChildBtn) is the one canonical action —
    // showing the general "Byt profil" picker alongside it creates two controls
    // with overlapping, ambiguous outcomes (resume this child vs. pick anyone).
    if (!shouldShow() || !isParentShellPath() || isAdultPrivilegeActive()) {
      if (existing) existing.remove();
      return;
    }
    if (!hasParentSessionHint()) {
      if (existing) existing.remove();
      return;
    }

    let btn = existing;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'profile-switch-parent-btn';
      btn.setAttribute('data-profile-switch-parent', '1');
      btn.addEventListener('click', goSwitch);
      const bar = document.querySelector('[data-parent-nav-header]');
      if (bar) {
        bar.insertBefore(btn, bar.firstChild);
      } else {
        btn.classList.add('profile-switch-parent-fallback');
        document.body.appendChild(btn);
      }
    }
    btn.innerHTML = '<span aria-hidden="true">🔄</span><span>' + labelText() + '</span>';
    btn.setAttribute('aria-label', labelText());
    btn.setAttribute('title', labelText());
  }

  function apply() {
    if (!isDailyUxActive()) return;
    syncLegacyHeaderBtn();
    ensureFloatingBtn();
    ensureReturnToChildBtn();
    ensureParentBtn();
  }

  async function refreshFromServer() {
    if (!isDailyUxActive()) return;
    try {
      if (typeof Auth !== 'undefined' && Auth.hydrateParentSessionFromCookies) {
        await Auth.hydrateParentSessionFromCookies();
      }
      const res = await fetch('/api/auth/app-entry', { credentials: 'include' });
      const body = await res.json().catch(function () { return {}; });
      storeEntryMeta(body);
      apply();
    } catch (_) { /* ignore */ }
  }

  function boot() {
    if (!isDailyUxActive()) return;
    apply();
    refreshFromServer();
  }

  document.addEventListener('stjarndag-parent-nav-layout', apply);
  document.addEventListener('stjarndag-magic-navigated', apply);
  document.addEventListener('child-worlds-configured', apply);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.ProfileSwitchChrome = {
    isDailyUxActive: isDailyUxActive,
    getProfileCount: getProfileCount,
    shouldShow: shouldShow,
    labelText: labelText,
    storeEntryMeta: storeEntryMeta,
    apply: apply,
    refreshFromServer: refreshFromServer,
    returnToChildLabel: returnToChildLabel,
  };
})();
