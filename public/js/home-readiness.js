/**
 * home-readiness.js — Home exceptions (approvals, invites) — parent menu v2.2 / Home 10/10.
 */
(function () {
  'use strict';

  const FILTER_KEY = 'homeReadinessWarningsOnly';
  let loadOutcome = 'loading';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function isMagicHome() {
    return window.DashboardHomeHub &&
      typeof DashboardHomeHub.shouldUse === 'function' &&
      DashboardHomeHub.shouldUse();
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
    if (isMagicHome()) return true;
    try {
      return localStorage.getItem(FILTER_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  /** priority 0–1 = undantag; 2+ informational (not shown on magic Hem). */
  function isExceptionItem(item) {
    return item.priority != null ? item.priority <= 1 : (
      item.type === 'pending_invite' ||
      item.type === 'pending_approval' ||
      item.type === 'incomplete_past_days'
    );
  }

  function filterItems(items) {
    if (warningsOnlyEnabled()) {
      return items.filter(isExceptionItem);
    }
    return items;
  }

  function renderCard(item, magic) {
    if (magic) {
      return '<a href="' + esc(item.href) + '" data-readiness-type="' + esc(item.type) + '" data-child-id="' + esc(item.child_id || '') + '" class="parent-readiness-card block p-4 mb-2 parent-glass-card hover:border-gold transition-colors no-underline">' +
        '<p class="font-semibold text-base mb-0.5">⚠️ ' + esc(item.title) + '</p>' +
        '<p class="text-sm opacity-80">' + esc(item.sub) + '</p></a>';
    }
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

  function renderLoadError(mount, magic) {
    loadOutcome = 'error';
    mount.classList.remove('hidden');
    mount.setAttribute('data-hem-load', 'error');
    const retryLabel = esc(pt('home.readiness.retry'));
    const body = esc(pt('home.readiness.loadError'));
    if (magic) {
      mount.innerHTML = '<div class="parent-readiness-card parent-glass-card p-4 mb-2" data-readiness-error="1" role="alert">' +
        '<p class="font-semibold text-base mb-1">⚠️ ' + esc(pt('home.readiness.heading')) + '</p>' +
        '<p class="text-sm opacity-80 mb-3">' + body + '</p>' +
        '<button type="button" class="parent-handoff-secondary" data-readiness-retry="1">' + retryLabel + '</button></div>';
    } else {
      mount.innerHTML = '<div class="p-4 mb-3 bg-white rounded-2xl border border-lavender" data-readiness-error="1" role="alert">' +
        '<p class="font-semibold text-navy">' + esc(pt('home.readiness.heading')) + '</p>' +
        '<p class="text-sm text-text-soft mb-3">' + body + '</p>' +
        '<button type="button" class="px-4 py-2 bg-gold text-white rounded-xl text-sm font-semibold" data-readiness-retry="1">' + retryLabel + '</button></div>';
    }
    const retry = mount.querySelector('[data-readiness-retry]');
    if (retry) {
      retry.addEventListener('click', function (e) {
        e.preventDefault();
        load();
      });
    }
    if (window.HomePrimaryAction && typeof HomePrimaryAction.apply === 'function') {
      HomePrimaryAction.apply();
    }
  }

  async function load() {
    const mount = document.getElementById('homeReadinessMount');
    if (!mount) return;
    const magic = isMagicHome();
    loadOutcome = 'loading';
    mount.setAttribute('data-hem-load', 'loading');
    try {
      const res = await window.apiFetch('/api/family/readiness');
      if (!res.ok) {
        renderLoadError(mount, magic);
        return;
      }
      const data = await res.json();
      let items = data.items || [];
      items = filterItems(items);
      if (!items.length) {
        loadOutcome = 'ok_empty';
        mount.setAttribute('data-hem-load', 'ok_empty');
        mount.classList.add('hidden');
        mount.innerHTML = '';
        if (window.HomePrimaryAction && typeof HomePrimaryAction.apply === 'function') {
          HomePrimaryAction.apply();
        }
        return;
      }
      loadOutcome = 'ok_items';
      mount.setAttribute('data-hem-load', 'ok_items');
      mount.classList.remove('hidden');
      const filterOn = warningsOnlyEnabled();
      let html = '';
      if (magic) {
        html = '<h2 class="parent-readiness-heading text-lg font-heading font-bold mb-2">' + esc(pt('home.readiness.heading')) + '</h2>' +
          items.map(function (item) { return renderCard(item, true); }).join('');
      } else {
        html =
          '<div class="flex items-center justify-between mb-3 gap-2">' +
          '<h2 class="text-lg font-heading font-bold text-navy">' + esc(pt('home.readiness.heading')) + '</h2>' +
          '<label class="flex items-center gap-2 text-xs text-text-soft whitespace-nowrap cursor-pointer">' +
          '<input type="checkbox" id="homeReadinessFilter" class="rounded border-lavender"' + (filterOn ? ' checked' : '') + ' />' +
          esc(pt('home.readiness.warningsOnly')) + '</label></div>' +
          items.map(function (item) { return renderCard(item, false); }).join('');
      }
      mount.innerHTML = html;
      bindClicks(mount, items);

      const filterEl = document.getElementById('homeReadinessFilter');
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
      renderLoadError(mount, magic);
    }
  }

  window.HomeReadiness = {
    warningsOnlyEnabled: warningsOnlyEnabled,
    isExceptionItem: isExceptionItem,
    reload: load,
    getLoadOutcome: function () { return loadOutcome; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
  document.addEventListener('parent-i18n-ready', load);
  document.addEventListener('locale-changed', load);
})();
