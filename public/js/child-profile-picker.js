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
    try {
      if (body && body.dailyUxActive) {
        sessionStorage.setItem(DAILY_UX_KEY, '1');
      } else {
        sessionStorage.removeItem(DAILY_UX_KEY);
      }
      if (body && Array.isArray(body.allowedChildren)) {
        sessionStorage.setItem(ALLOWED_COUNT_KEY, String(body.allowedChildren.length));
      }
    } catch (_) { /* ignore */ }
  }

  function showError(msg) {
    const el = document.getElementById('cppError');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('hidden', !msg);
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
      return (
        '<button type="button" class="cpp-profile-card cpp-profile-card-parent" role="listitem" data-profile-kind="parent" data-parent-id="' +
        escHtml(parent.id) +
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

  async function collectParentPin() {
    if (window.AdultPinGateUI && typeof AdultPinGateUI.collectAdultPin === 'function') {
      return AdultPinGateUI.collectAdultPin();
    }
    return { ok: false, code: 'PIN_UI_UNAVAILABLE' };
  }

  async function onPickParent(parentId, btn) {
    if (!parentId) return;
    if (btn) btn.disabled = true;
    showError('');

    let pin = null;
    if (_pinRequired) {
      const pinResult = await collectParentPin();
      if (!pinResult.ok || !pinResult.pin) {
        if (btn) btn.disabled = false;
        return;
      }
      pin = pinResult.pin;
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (window.Auth && typeof Auth.getCsrfToken === 'function') {
        const csrf = Auth.getCsrfToken();
        if (csrf) headers['X-CSRF-Token'] = csrf;
      }
      const res = await fetch('/api/auth/trusted-device/select-parent', {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify({ parent_id: parentId, pin: pin }),
      });
      const body = await res.json().catch(function () { return {}; });
      if (!res.ok || !body.ok) {
        if (body.code === 'PARENT_PIN_INVALID') {
          showError('Fel PIN. Försök igen.');
        } else {
          showError('Kunde inte logga in som vuxen. Försök igen.');
        }
        if (btn) btn.disabled = false;
        return;
      }
      if (body.csrfToken && window.Auth && typeof Auth.setCsrfToken === 'function') {
        Auth.setCsrfToken(body.csrfToken);
      }
      if (window.Auth && typeof Auth.setAuth === 'function' && body.user) {
        Auth.setAuth(body.user, null);
      }
      if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
        DeviceMode.enterParent();
      }
      window.location.replace(body.redirect || '/home');
    } catch (_) {
      showError('Nätverksfel. Försök igen.');
      if (btn) btn.disabled = false;
    }
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

    const res = await fetch('/api/auth/app-entry', { credentials: 'include' });
    const body = await res.json().catch(function () { return {}; });
    storeEntryMeta(body);
    _pinRequired = body.pinRequiredForParents === true;

    const legacy = document.getElementById('cppLegacyLink');
    if (legacy) {
      legacy.classList.toggle('hidden', body.dailyUxActive === true);
    }

    if (!body.orchestratorActive) {
      window.location.replace('/child-login?shared_device=1');
      return;
    }

    const children = body.allowedChildren || [];
    const parents = body.allowedParents || [];
    const totalProfiles = children.length + parents.length;

    if (totalProfiles === 0) {
      showError('Inga profiler är tillgängliga på den här enheten.');
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
