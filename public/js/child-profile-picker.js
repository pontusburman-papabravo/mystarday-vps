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

  const FALLBACK_EMOJI = '😊';

  function profileAvatarHtml(member, memberType) {
    const fallback = memberType === 'parent'
      ? FALLBACK_EMOJI
      : (member.emoji || FALLBACK_EMOJI);
    if (window.MemberAvatar && typeof MemberAvatar.renderMemberAvatar === 'function') {
      return (
        '<span class="cpp-avatar-wrap">' +
        MemberAvatar.renderMemberAvatar(member, 64, {
          memberType: memberType,
          displayEmoji: fallback,
        }) +
        '</span>'
      );
    }
    if (member.has_avatar && member.avatar_src) {
      return (
        '<span class="cpp-avatar-wrap">' +
        '<img src="' + escHtml(member.avatar_src) + '" alt="" ' +
        'onerror="this.outerHTML=\'<span class=\\\'cfh-person-emoji\\\' aria-hidden=\\\'true\\\'>' +
        escHtml(fallback) + '</span>\'">' +
        '</span>'
      );
    }
    return '<span class="cpp-avatar-wrap"><span class="cfh-person-emoji" aria-hidden="true">' +
      escHtml(fallback) + '</span></span>';
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
        profileAvatarHtml(child, 'child') +
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
        profileAvatarHtml(parent, 'parent') +
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

  async function onPickParent(parentId, btn) {
    if (!parentId) return;
    if (btn) btn.disabled = true;
    showError('');

    if (!window.AdultPrivilege || typeof AdultPrivilege.requestTrustedProfileUnlock !== 'function') {
      showError('Kunde inte låsa upp vuxenläge. Försök igen.');
      if (btn) btn.disabled = false;
      return;
    }

    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: parentId });
    if (!result || !result.ok) {
      if (result && result.code === 'PARENT_PIN_INVALID') {
        showError('Fel PIN. Försök igen.');
      } else if (result && result.code === 'ADULT_PIN_SETUP_REQUIRED') {
        showError('En vuxen behöver ställa in app-lås-PIN först.');
      } else if (result && (result.code === 'PIN_CANCEL' || result.code === 'BIOMETRIC_CANCEL')) {
        showError('');
      } else {
        showError('Kunde inte logga in som vuxen. Försök igen.');
      }
      if (btn) btn.disabled = false;
      return;
    }
    if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
      DeviceMode.enterParent();
    }
    window.location.replace(result.redirect || '/home');
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
