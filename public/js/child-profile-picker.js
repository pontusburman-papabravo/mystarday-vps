/**
 * child-profile-picker.js — Netflix-style family profile picker (barn + vuxna).
 */
(function () {
  'use strict';

  const DAILY_UX_KEY = 'stjarndag_family_device_daily_ux_v1';
  const ALLOWED_COUNT_KEY = 'stjarndag_entry_allowed_count';

  let _pinRequired = false;

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function storeEntryMeta(body) {
    if (window.AdultPrivilege && typeof AdultPrivilege.storePickerPinMeta === 'function') {
      AdultPrivilege.storePickerPinMeta(body);
    }
    if (window.ProfileSwitchChrome && typeof ProfileSwitchChrome.storeEntryMeta === 'function') {
      ProfileSwitchChrome.storeEntryMeta(body);
    }
    try {
      if (body && body.dailyUxActive) {
        sessionStorage.setItem(DAILY_UX_KEY, '1');
      } else {
        sessionStorage.removeItem(DAILY_UX_KEY);
      }
      if (body && Array.isArray(body.allowedChildren)) {
        sessionStorage.setItem(ALLOWED_COUNT_KEY, String(body.allowedChildren.length));
      }
      if (body && body.pinRequiredForParents === true) {
        sessionStorage.setItem('stjarndag_entry_pin_required_for_parents', '1');
      } else if (body && body.pinRequiredForParents === false) {
        sessionStorage.setItem('stjarndag_entry_pin_required_for_parents', '0');
      }
    } catch (_) { /* ignore */ }
  }

  function showError(msg) {
    const el = document.getElementById('cppError');
    if (!el) return;
    el.textContent = msg || '';
    const on = !!msg;
    el.classList.toggle('visible', on);
    el.classList.remove('hidden');
    if (on && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function wireParentBackupLink() {
    const link = document.getElementById('cppParentBackupLink');
    if (!link || link.dataset.wired === '1') return;
    link.dataset.wired = '1';
    link.addEventListener('click', function () {
      if (window.Auth && typeof Auth.redirectToParentBackupLogin === 'function') {
        Auth.redirectToParentBackupLogin('/home');
        return;
      }
      window.location.href = '/login?parent=1&next=' + encodeURIComponent('/home');
    });
  }

  function childAvatarHtml(child) {
    if (child.has_avatar && child.avatar_src) {
      return '<img class="cpp-avatar-img" src="' + escHtml(child.avatar_src) + '" alt="">';
    }
    return '<span class="cpp-avatar" aria-hidden="true">' + escHtml(child.emoji || '⭐') + '</span>';
  }

  function parentAvatarHtml(parent) {
    if (parent.has_avatar && parent.avatar_src) {
      return '<img class="cpp-avatar-img" src="' + escHtml(parent.avatar_src) + '" alt="">';
    }
    return '<span class="cpp-avatar cpp-avatar-adult" aria-hidden="true">🔒</span>';
  }

  function renderCards(children, parents) {
    const grid = document.getElementById('cppGrid');
    if (!grid) return;

    const childCards = (children || []).map(function (child) {
      const name = child.name || '';
      return (
        '<button type="button" class="cpp-profile-card cpp-profile-card-child" role="listitem" data-profile-kind="child" data-child-id="' +
        escHtml(child.id) +
        '" aria-label="' + escHtml(name) + '">' +
        childAvatarHtml(child) +
        '<span class="cpp-profile-name">' + escHtml(name) + '</span>' +
        '</button>'
      );
    });

    const parentCards = (parents || []).map(function (parent) {
      const name = parent.name || 'Vuxen';
      const hasAppPin = parent.hasAppPin === true;
      return (
        '<button type="button" class="cpp-profile-card cpp-profile-card-parent" role="listitem" data-profile-kind="parent" data-parent-id="' +
        escHtml(parent.id) +
        '" data-parent-has-app-pin="' + (hasAppPin ? '1' : '0') +
        '" aria-label="' + escHtml(name) + ', vuxen">' +
        parentAvatarHtml(parent) +
        '<span class="cpp-profile-name">' + escHtml(name) + '</span>' +
        '<span class="cpp-profile-hint">Vuxen</span>' +
        '</button>'
      );
    });

    grid.innerHTML = childCards.concat(parentCards).join('');

    grid.querySelectorAll('[data-profile-kind="child"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        onPickChild(btn.getAttribute('data-child-id'), btn);
      });
    });
    grid.querySelectorAll('[data-profile-kind="parent"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        onPickParent(btn.getAttribute('data-parent-id'), btn);
      });
    });
  }

  async function onPickChild(childId, btn) {
    if (!childId || !window.TrustedDeviceBootstrap) return;
    if (window.ParentBackupLoginIntent && typeof ParentBackupLoginIntent.clearIntent === 'function') {
      ParentBackupLoginIntent.clearIntent();
    }
    if (btn) btn.disabled = true;
    showError('');
    const result = await TrustedDeviceBootstrap.pickSharedChild(childId, {
      source: 'profile_picker',
      bucket: sessionStorage.getItem(ALLOWED_COUNT_KEY) || '2',
    });
    if (!result.ok && btn) btn.disabled = false;
    if (!result.ok) {
      showError('Kunde inte öppna profilen. Be en vuxen om hjälp.');
    }
  }

  function fetchJsonLocal(url, options) {
    const opts = options || {};
    opts.credentials = 'same-origin';
    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        return { res: res, body: body };
      });
    });
  }

  async function resolveActiveParentId() {
    try {
      if (window.Auth && typeof Auth.hydrateParentSessionFromCookies === 'function') {
        await Auth.hydrateParentSessionFromCookies();
      }
      const out = await fetchJsonLocal('/api/auth/me', { method: 'GET' });
      if (!out.res.ok || !out.body || out.body.type !== 'parent' || !out.body.id) {
        return null;
      }
      if (window.Auth && typeof Auth.setAuth === 'function') {
        if (typeof Auth.ensureCsrfToken === 'function') {
          await Auth.ensureCsrfToken();
        }
        Auth.setAuth(null, out.body, Auth.getCsrfToken && Auth.getCsrfToken());
      }
      return out.body.id;
    } catch (_) {
      return null;
    }
  }

  function enterParentDeviceMode() {
    if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
      DeviceMode.enterParent();
      return;
    }
    try {
      localStorage.setItem('stjarndag_device_mode', 'parent');
    } catch (_) { /* ignore */ }
  }

  /**
   * Multi-profile shared devices cold-start back to profile-picker unless we pin parent-home first.
   */
  function commitParentViewFromPicker(redirectPath, leaseUntil) {
    enterParentDeviceMode();
    const target = redirectPath || '/dashboard';
    const orch = window.AppEntryOrchestrator;
    // Atomic handoff: the selected parent is already server-verified (select-parent
    // + /me id match) with an authoritative lease, so commit a *verified* resume and
    // pre-apply the parent-home decision. The destination page then trusts it without
    // re-running the /me + /status race that produced the child→adult picker loop.
    let committed = false;
    if (orch && typeof orch.commitVerifiedParentResume === 'function') {
      committed = orch.commitVerifiedParentResume(target, leaseUntil);
    }
    if (!committed && orch && typeof orch.beginExplicitParentResume === 'function') {
      orch.beginExplicitParentResume(target);
    }
    window.location.replace(target);
  }

  async function onPickParent(parentId, btn) {
    if (!parentId) return;
    if (btn) btn.disabled = true;
    showError('');

    const hasAppPin = btn && btn.getAttribute('data-parent-has-app-pin') === '1';
    if (!hasAppPin) {
      if (window.Auth && typeof Auth.redirectToParentBackupLogin === 'function') {
        Auth.redirectToParentBackupLogin('/home');
        return;
      }
      window.location.href = '/login?parent=1&next=' + encodeURIComponent('/home');
      return;
    }

    // Shared picker → adult is a security boundary. A matching /api/auth/me
    // parent cookie is not authorization for a new child→adult transition.
    if (!window.AdultPrivilege || typeof AdultPrivilege.requestTrustedProfileUnlock !== 'function') {
      showError('Kunde inte låsa upp vuxenläge. Försök igen.');
      if (btn) btn.disabled = false;
      return;
    }

    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: parentId });
    if (result && result.ok) {
      commitParentViewFromPicker(result.redirect || '/dashboard', result.privilegeLeaseUntil);
      return;
    }

    if (result && result.code === 'PARENT_PIN_INVALID') {
      showError('Fel PIN. Ange din egen app-lås-PIN (fyra siffror under Inställningar → Profil), inte barnets PIN eller lösenord.');
      if (btn) btn.disabled = false;
      return;
    }

    if (!result || !result.ok) {
      if (result && result.code === 'PARENT_PIN_NOT_SET') {
        showError('Den här vuxenprofilen har ingen app-lås-PIN än. Använd knappen nedan för att logga in med e-post eller Apple/Google.');
      } else if (result && result.code === 'ADULT_PIN_SETUP_REQUIRED') {
        showError('En vuxen behöver ställa in app-lås-PIN — eller logga in med e-post eller Apple/Google via knappen nedan.');
      } else if (result && result.code === 'ADULT_PRIVILEGE_VERIFY_FAILED') {
        showError('PIN godkändes men sessionen kunde inte startas. Stäng fliken och öppna appen igen.');
      } else if (result && result.code === 'PARENT_ACCESS_DENIED') {
        showError('Du har inte behörighet att logga in som den här vuxenprofilen.');
      } else if (result && result.code === 'DEVICE_MODE_NOT_SHARED') {
        showError('Kunde inte logga in som vuxen på den här enheten. Använd knappen nedan för att logga in med e-post eller Apple/Google.');
      } else if (result && result.code === 'TRUSTED_DEVICE_MISSING') {
        showError('Enheten är inte registrerad längre. Logga in som vuxen med e-post eller Apple/Google via knappen nedan.');
      } else if (result && result.code === 'TRUSTED_DEVICE_INVALID') {
        showError('Enheten är inte registrerad längre. Logga in som vuxen med e-post eller Apple/Google via knappen nedan.');
      } else if (result && result.code === 'TRUSTED_SELECT_PARENT_FAILED') {
        showError('PIN godkändes men sessionen kunde inte startas. Stäng fliken och öppna appen igen.');
      } else if (result && result.code === 'ADULT_PRIVILEGE_NETWORK') {
        showError('PIN godkändes men sessionen kunde inte startas. Stäng fliken och öppna appen igen.');
      } else if (result && result.code === 'ADULT_PRIVILEGE_POST_SUCCESS_FAILED') {
        showError('PIN godkändes men sessionen kunde inte startas. Stäng fliken och öppna appen igen.');
      } else if (result && result.status === 429) {
        showError('För många försök. Vänta en stund och försök igen.');
      } else if (result && (result.code === 'PIN_CANCEL' || result.code === 'BIOMETRIC_CANCEL')) {
        showError('');
      } else {
        showError('Kunde inte logga in som vuxen. Försök igen.');
      }
      if (btn) btn.disabled = false;
      return;
    }
  }

  function parseRetryAfterSec(res) {
    const header = res && res.headers ? res.headers.get('Retry-After') : null;
    const parsed = parseInt(header, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    const bodyRetry = res && res._body && res._body.retry_after;
    const bodyParsed = parseInt(bodyRetry, 10);
    if (Number.isFinite(bodyParsed) && bodyParsed > 0) return bodyParsed;
    return 60;
  }

  function showBootstrapError(message, retrySec) {
    const grid = document.getElementById('cppGrid');
    if (grid) {
      grid.innerHTML = '<button type="button" id="cppRetryBtn" class="cpp-fallback-link cpp-fallback-btn">Försök igen</button>';
      const retryBtn = grid.querySelector('#cppRetryBtn');
      if (retryBtn) retryBtn.addEventListener('click', bootstrap);
    }
    showError(message);
    const sub = document.getElementById('cppSub');
    if (sub && retrySec) {
      sub.textContent = 'Försök igen om ' + retrySec + ' s';
    }
  }

  async function fetchAppEntry() {
    const res = await fetch('/api/auth/app-entry', { credentials: 'include' });
    const body = await res.json().catch(function () { return {}; });
    body._httpStatus = res.status;
    if (!res.ok) {
      const err = new Error(body.error || ('HTTP ' + res.status));
      err.status = res.status;
      err.body = body;
      err.retryAfterSec = parseRetryAfterSec({ headers: res.headers, _body: body });
      throw err;
    }
    return body;
  }

  async function bootstrap() {
    window.__DEFER_SESSION_GATE_FOR_ENTRY__ = true;
    const params = new URLSearchParams(window.location.search);
    const isSwitch = params.get('switch') === '1';

    if (window.AppEntryOrchestrator && typeof AppEntryOrchestrator.bootstrapOnEntryPage === 'function' && !isSwitch) {
      const boot = await AppEntryOrchestrator.bootstrapOnEntryPage();
      if (boot && boot.ok && boot.code !== 'PICKER_SHOWN') {
        if (boot.decision && boot.decision.destination !== 'profile-picker') {
          return;
        }
      }
    }

    let body;
    try {
      body = await fetchAppEntry();
    } catch (err) {
      if (err && err.status === 429) {
        const retrySec = err.retryAfterSec || 60;
        showBootstrapError('För många förfrågningar. Vänta en minut och försök igen.', retrySec);
        return;
      }
      showBootstrapError('Profilerna kunde inte laddas just nu. Kontrollera nätverket och försök igen.', null);
      return;
    }

    storeEntryMeta(body);
    _pinRequired = body.pinRequiredForParents === true;

    const legacy = document.getElementById('cppLegacyLink');
    if (legacy) {
      legacy.classList.toggle('hidden', body.dailyUxActive === true);
    }

    if (body.orchestratorActive === false) {
      window.location.replace('/child-login?shared_device=1');
      return;
    }

    if (body.orchestratorActive !== true) {
      showBootstrapError('Profilerna kunde inte laddas just nu. Försök igen.', null);
      return;
    }

    const children = body.allowedChildren || [];
    const parents = body.allowedParents || [];
    const totalProfiles = children.length + parents.length;

    if (totalProfiles === 0) {
      showBootstrapError('Inga profiler är tillgängliga på den här enheten.', null);
      return;
    }
    if (totalProfiles === 1 && children.length === 1 && !isSwitch) {
      await onPickChild(children[0].id, null);
      return;
    }

    const title = document.getElementById('cppTitle');
    const sub = document.getElementById('cppSub');
    if (title) {
      title.textContent = isSwitch ? 'Byt profil' : 'Vem använder appen?';
    }
    if (sub) {
      sub.textContent = isSwitch
        ? 'Välj barn eller vuxen'
        : 'Tryck på din profil';
    }
    renderCards(children, parents);
    wireParentBackupLink();
  }

  if (typeof window !== 'undefined' && window.__exposePickerRuntimeForTests) {
    window.__PickerRuntimeTestHooks = {
      bootstrap: bootstrap,
      onPickParent: onPickParent,
      onPickChild: onPickChild,
      resolveActiveParentId: resolveActiveParentId,
    };
  }

  if (!window.__exposePickerRuntimeForTests) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
      bootstrap();
    }
  }
})();
