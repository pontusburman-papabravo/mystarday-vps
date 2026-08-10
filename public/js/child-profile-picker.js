/**
 * child-profile-picker.js — Fas 4A trusted shared-device profile picker (no child PIN).
 */
(function () {
  'use strict';

  const DAILY_UX_KEY = 'stjarndag_family_device_daily_ux_v1';
  const ALLOWED_COUNT_KEY = 'stjarndag_entry_allowed_count';

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

  function renderCards(children) {
    const grid = document.getElementById('cppGrid');
    if (!grid) return;
    grid.innerHTML = children.map(function (child) {
      const emoji = child.emoji || '⭐';
      const name = child.name || '';
      return (
        '<button type="button" class="cpp-profile-card" role="listitem" data-child-id="' +
        escHtml(child.id) +
        '" aria-label="' + escHtml(name) + '">' +
        '<span class="cpp-avatar" aria-hidden="true">' + escHtml(emoji) + '</span>' +
        '<span>' + escHtml(name) + '</span>' +
        '</button>'
      );
    }).join('');

    grid.querySelectorAll('[data-child-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        onPick(btn.getAttribute('data-child-id'), btn);
      });
    });
  }

  async function onPick(childId, btn) {
    if (!childId || !window.TrustedDeviceBootstrap) return;
    if (btn) btn.disabled = true;
    showError('');
    const result = await TrustedDeviceBootstrap.pickSharedChild(childId, {
      source: 'profile_picker',
      bucket: sessionStorage.getItem(ALLOWED_COUNT_KEY) || '2',
    });
    if (!result.ok && btn) btn.disabled = false;
    if (!result.ok) {
      showError('Kunde inte byta barn. Be en vuxen om hjälp.');
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

    const legacy = document.getElementById('cppLegacyLink');
    if (legacy) {
      legacy.classList.toggle('hidden', body.dailyUxActive === true);
    }

    if (!body.orchestratorActive) {
      window.location.replace('/child-login?shared_device=1');
      return;
    }

    const children = body.allowedChildren || [];
    if (children.length === 0) {
      showError('Inga barn är tillgängliga på den här enheten.');
      return;
    }
    if (children.length === 1 && !isSwitch) {
      await onPick(children[0].id, null);
      return;
    }

    const sub = document.getElementById('cppSub');
    if (sub && isSwitch) {
      sub.textContent = 'Välj vem som ska använda appen nu';
    }
    renderCards(children);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
