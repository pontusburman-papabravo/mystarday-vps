/**
 * library-activity-timer-bridge.js — koppling duration_seconds ↔ activity_timers_enabled (bibliotek).
 */
(function (global) {
  'use strict';

  let _children = null;
  let _childrenLoad = null;
  const _enabling = new Set();

  function applyParams(str, params) {
    if (!str || !params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
  }

  function t(key, fallback, params) {
    let raw = typeof global.lpt === 'function' ? global.lpt(key, params) : key;
    if (!raw || raw === key) raw = fallback;
    return applyParams(raw, params);
  }

  function formatDurationLabel(seconds) {
    const sec = Math.max(0, Math.floor(seconds));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0 && s > 0) return m + ' min ' + s + ' s';
    if (m > 0) return m + ' min';
    return s + ' s';
  }

  function settingsUrl(childId) {
    return '/family/child/' + encodeURIComponent(childId) + '?tab=setup';
  }

  async function loadChildren() {
    if (_children) return _children;
    if (_childrenLoad) return _childrenLoad;
    _childrenLoad = (async () => {
      try {
        const res = await global.apiFetch('/api/children');
        if (!res.ok) return [];
        const data = await res.json();
        _children = Array.isArray(data) ? data : [];
        return _children;
      } catch {
        return [];
      } finally {
        _childrenLoad = null;
      }
    })();
    return _childrenLoad;
  }

  function clearChildrenCache() {
    _children = null;
    _childrenLoad = null;
  }

  function readDurationFromUI() {
    if (typeof global.getActivityDurationSecondsFromUI === 'function') {
      return global.getActivityDurationSecondsFromUI();
    }
    return null;
  }

  async function refreshBridge() {
    const el = document.getElementById('activityTimerMasterBridge');
    if (!el) return;

    const duration = readDurationFromUI();
    if (duration == null || duration < 5) {
      el.classList.add('hidden');
      el.innerHTML = '';
      el.setAttribute('aria-hidden', 'true');
      return;
    }

    const children = await loadChildren();
    const rolloutOk = children.length === 0
      || children.every((c) => c.activity_timer_v2_rollout_available !== false);
    const off = children.filter((c) => c.activity_timers_enabled !== true);

    if (off.length === 0) {
      el.classList.add('hidden');
      el.innerHTML = '';
      el.setAttribute('aria-hidden', 'true');
      return;
    }

    if (!rolloutOk) {
      el.classList.remove('hidden');
      el.setAttribute('aria-hidden', 'false');
      el.innerHTML =
        '<p class="text-sm text-text-soft">' + t(
          'library.timer.bridgeUnavailable',
          'Aktivitetstimern är tillfälligt otillgänglig. Tiden du valde sparas på aktiviteten.'
        ) + '</p>';
      return;
    }

    const durLabel = formatDurationLabel(duration);
    const esc = typeof global.escHtml === 'function' ? global.escHtml : (s) => String(s || '');

    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    el.innerHTML = off.map((child) => {
      const name = esc(child.name || t('library.timer.childFallback', 'Barnet'));
      const busy = _enabling.has(child.id);
      const status = t(
        'library.timer.masterOffStatus',
        '{name}: Aktivitetstimern är av för barnet. Tiden ({duration}) sparas här — barnet ser ingen startknapp förrän du slår på timern.',
        { name, duration: durLabel }
      );
      return (
        '<div class="activity-timer-bridge-row rounded-xl bg-sky/60 border border-lavender p-3 mb-2" data-child-id="' + esc(child.id) + '">' +
          '<p class="text-sm text-navy mb-3">' + status + '</p>' +
          '<div class="flex flex-wrap gap-2 items-center">' +
            '<button type="button" class="activity-timer-bridge-enable min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl bg-gold hover:bg-yellow-500 text-white font-semibold text-sm transition-colors" ' +
              'data-child-id="' + esc(child.id) + '"' + (busy ? ' disabled aria-busy="true"' : '') + '>' +
              t('library.timer.enableCta', 'Slå på aktivitetstimer') +
            '</button>' +
            '<a href="' + settingsUrl(child.id) + '" class="min-h-[44px] inline-flex items-center px-2 text-sm font-semibold text-navy underline">' +
              t('library.timer.settingsLink', 'Barnets inställningar') +
            '</a>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  async function enableForChild(childId, btn) {
    if (!childId || _enabling.has(childId)) return;
    _enabling.add(childId);
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    }
    try {
      const res = await global.apiFetch('/api/children/' + encodeURIComponent(childId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_timers_enabled: true }),
      });
      if (res.status === 401 || res.status === 403) {
        if (typeof global.showToast === 'function') {
          global.showToast(t('library.timer.forbidden', 'Du har inte behörighet att ändra inställningen.'), true);
        }
        return;
      }
      if (!res.ok) {
        if (typeof global.showToast === 'function') {
          global.showToast(t('library.timer.enableFailed', 'Kunde inte slå på timern. Försök igen.'), true);
        }
        return;
      }
      const updated = await res.json();
      if (_children) {
        const row = _children.find((c) => c.id === childId);
        if (row) row.activity_timers_enabled = updated.activity_timers_enabled === true;
      }
      if (typeof global.showToast === 'function') {
        global.showToast(t(
          'library.timer.enabledToast',
          'Aktivitetstimer på för {name}',
          { name: updated.name || t('library.timer.childFallback', 'barnet') }
        ));
      }
      await refreshBridge();
    } finally {
      _enabling.delete(childId);
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
    }
  }

  function wireBridge() {
    const el = document.getElementById('activityTimerMasterBridge');
    if (!el || el.dataset.wired === '1') return;
    el.dataset.wired = '1';
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('.activity-timer-bridge-enable');
      if (!btn || btn.disabled) return;
      e.preventDefault();
      enableForChild(btn.dataset.childId, btn);
    });
  }

  global.LibraryActivityTimerBridge = {
    refresh: refreshBridge,
    clearChildrenCache,
    wireBridge,
    enableForChild,
  };
})(window);
