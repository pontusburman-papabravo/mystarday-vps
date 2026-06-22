/**
 * home-readiness.js — Hem readiness / action center (vuxenmeny v2.1 Sprint 6).
 */
(function () {
  'use strict';

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

  function renderCard(item) {
    return '<a href="' + esc(item.href) + '" data-readiness-type="' + esc(item.type) + '" data-child-id="' + esc(item.child_id || '') + '" class="block p-4 mb-3 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors">' +
      '<p class="font-semibold text-navy">' + esc(item.title) + '</p>' +
      '<p class="text-sm text-text-soft">' + esc(item.sub) + '</p></a>';
  }

  async function load() {
    var mount = document.getElementById('homeReadinessMount');
    if (!mount) return;
    try {
      var res = await window.apiFetch('/api/family/readiness');
      if (!res.ok) return;
      var data = await res.json();
      var items = data.items || [];
      if (!items.length) {
        mount.classList.add('hidden');
        return;
      }
      mount.classList.remove('hidden');
      mount.innerHTML = '<h2 class="text-lg font-heading font-bold text-navy mb-3">Kräver åtgärd</h2>' +
        items.map(renderCard).join('');
      mount.querySelectorAll('[data-readiness-type]').forEach(function (el) {
        el.addEventListener('click', function () {
          var type = el.getAttribute('data-readiness-type');
          var childId = el.getAttribute('data-child-id');
          var item = items.find(function (i) {
            return i.type === type && (!childId || i.child_id === childId);
          });
          if (item) trackClick(item);
        });
      });
    } catch (_) {
      mount.classList.add('hidden');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
