/**
 * home-readiness.js — Hem readiness / action center (vuxenmeny v2.2).
 */
(function () {
  'use strict';

  var FILTER_KEY = 'homeReadinessWarningsOnly';

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

  function warningsOnlyEnabled() {
    try {
      return localStorage.getItem(FILTER_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  /** priority 0–1 = urgent/warning; 2+ informational */
  function isWarningItem(item) {
    return item.priority != null ? item.priority <= 1 : (
      item.type === 'pending_invite' ||
      item.type === 'pending_approval' ||
      item.type === 'incomplete_past_days'
    );
  }

  function filterItems(items) {
    if (!warningsOnlyEnabled()) return items;
    return items.filter(isWarningItem);
  }

  function renderCard(item) {
    return '<a href="' + esc(item.href) + '" data-readiness-type="' + esc(item.type) + '" data-child-id="' + esc(item.child_id || '') + '" class="block p-4 mb-3 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors">' +
      '<p class="font-semibold text-navy">' + esc(item.title) + '</p>' +
      '<p class="text-sm text-text-soft">' + esc(item.sub) + '</p></a>';
  }

  function bindClicks(mount, items) {
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
  }

  async function load() {
    var mount = document.getElementById('homeReadinessMount');
    if (!mount) return;
    try {
      var res = await window.apiFetch('/api/family/readiness');
      if (!res.ok) return;
      var data = await res.json();
      var items = data.items || [];
      items = filterItems(items);
      if (!items.length) {
        mount.classList.add('hidden');
        return;
      }
      mount.classList.remove('hidden');
      var filterOn = warningsOnlyEnabled();
      var html =
        '<div class="flex items-center justify-between mb-3 gap-2">' +
        '<h2 class="text-lg font-heading font-bold text-navy">Kräver åtgärd</h2>' +
        '<label class="flex items-center gap-2 text-xs text-text-soft whitespace-nowrap cursor-pointer">' +
        '<input type="checkbox" id="homeReadinessFilter" class="rounded border-lavender"' + (filterOn ? ' checked' : '') + ' />' +
        'Bara varningar</label></div>' +
        items.map(renderCard).join('');
      mount.innerHTML = html;
      bindClicks(mount, items);

      var filterEl = document.getElementById('homeReadinessFilter');
      if (filterEl) {
        filterEl.addEventListener('change', function () {
          try {
            localStorage.setItem(FILTER_KEY, filterEl.checked ? '1' : '0');
          } catch (_) { /* ignore */ }
          load();
          if (typeof window.renderDashboardCards === 'function') {
            window.renderDashboardCards();
          }
        });
      }
    } catch (_) {
      mount.classList.add('hidden');
    }
  }

  window.HomeReadiness = {
    warningsOnlyEnabled: warningsOnlyEnabled,
    reload: load,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
