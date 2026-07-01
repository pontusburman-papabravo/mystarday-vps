/**
 * home-readiness.js — Hem undantag / action center (vuxenmeny v2.2, baseline parent-hubs-10-10).
 * Shows only priority <= 1 items (undantag). Same data as Belöningar pending — no duplicate logic.
 */
(function () {
  'use strict';

  /** Hem undantag = urgency only (POS PA-06). Lower-priority readiness rows belong elsewhere. */
  const EXCEPTION_PRIORITY_MAX = 1;

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function trackClick(item) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, 'readiness_action_click', {
        type: item.type,
        child_id: item.child_id,
      });
    }
  }

  /** @deprecated Legacy filter key — undantag-only is always on per hem-vision.md */
  function warningsOnlyEnabled() {
    return true;
  }

  function isExceptionItem(item) {
    return item.priority != null ? item.priority <= EXCEPTION_PRIORITY_MAX : (
      item.type === 'pending_invite' ||
      item.type === 'pending_approval' ||
      item.type === 'incomplete_past_days'
    );
  }

  function filterItems(items) {
    return items.filter(isExceptionItem);
  }

  function resolveMount() {
    return document.getElementById('homeReadinessMount');
  }

  function renderCard(item) {
    return '<a href="' + esc(item.href) + '" data-readiness-type="' + esc(item.type) + '" data-child-id="' + esc(item.child_id || '') + '" class="block p-4 mb-3 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors">' +
      '<p class="font-semibold text-navy">' + esc(item.title) + '</p>' +
      '<p class="text-sm text-text-soft">' + esc(item.sub) + '</p></a>';
  }

  function bindClicks(mount, items) {
    mount.querySelectorAll('[data-readiness-type]').forEach(function (el) {
      el.addEventListener('click', function () {
        const type = el.getAttribute('data-readiness-type');
        const childId = el.getAttribute('data-child-id');
        const item = items.find(function (i) {
          return i.type === type && (!childId || i.child_id === childId);
        });
        if (item) trackClick(item);
      });
    });
  }

  async function load() {
    const mount = resolveMount();
    if (!mount) return;
    try {
      const res = await window.apiFetch('/api/family/readiness');
      if (!res.ok) return;
      const data = await res.json();
      const items = filterItems(data.items || []);
      if (!items.length) {
        mount.classList.add('hidden');
        mount.innerHTML = '';
        return;
      }
      mount.classList.remove('hidden');
      mount.innerHTML =
        '<h2 class="text-lg font-heading font-bold text-navy mb-3">Kräver åtgärd</h2>' +
        items.map(renderCard).join('');
      bindClicks(mount, items);
    } catch (_) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
    }
  }

  window.HomeReadiness = {
    warningsOnlyEnabled: warningsOnlyEnabled,
    reload: load,
    isExceptionItem: isExceptionItem,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
