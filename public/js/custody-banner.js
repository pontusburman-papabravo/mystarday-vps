/**
 * custody-banner.js — FEAT-1 BC-5: "Denna vecka hos …" on dashboard.
 */
(function () {
  'use strict';

  var BANNER_ID = 'custodyWeekBanner';
  var _lastChildId = null;
  var _seenForChild = {};

  function track(event, meta) {
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track(event, meta || {});
    }
  }

  function getActiveChildId() {
    var tab = document.querySelector('.child-tab.bg-navy, .child-tab.border-navy');
    if (tab && tab.getAttribute('data-id')) return tab.getAttribute('data-id');
    var card = document.querySelector('.dash-child-card.is-expanded');
    if (card) return card.getAttribute('data-child-id');
    var first = document.querySelector('.dash-child-card[data-child-id]');
    if (first) return first.getAttribute('data-child-id');
    return null;
  }

  function ensureBanner() {
    var existing = document.getElementById(BANNER_ID);
    if (existing) return existing;
    var anchor = document.getElementById('childCardsGrid');
    var banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'hidden mb-3 mx-0 rounded-xl border-2 px-4 py-3 text-sm font-semibold text-navy flex flex-wrap items-center gap-2';
    banner.setAttribute('role', 'status');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(banner, anchor);
    } else {
      var main = document.querySelector('main') || document.body;
      main.insertBefore(banner, main.firstChild);
    }
    return banner;
  }

  async function refresh() {
    var childId = getActiveChildId();
    if (!childId) {
      var b = document.getElementById(BANNER_ID);
      if (b) b.classList.add('hidden');
      return;
    }

    try {
      var res = await window.apiFetch(
        '/api/family/custody/context?childId=' + encodeURIComponent(childId)
      );
      if (!res.ok) {
        if (res.status === 404) return;
        return;
      }
      var data = await res.json();
      var banner = ensureBanner();

      if (!data.active || !data.weekBanner) {
        banner.classList.add('hidden');
        _lastChildId = childId;
        return;
      }

      if (childId !== _lastChildId) {
        _lastChildId = childId;
        if (!_seenForChild[childId]) {
          _seenForChild[childId] = true;
          track('custody_banner_seen', { child_id: childId, variant: data.weekBanner.variant });
        }
      }

      var wb = data.weekBanner;
      banner.style.borderColor = wb.color;
      banner.style.backgroundColor = wb.color + '18';
      var textSpan = banner.querySelector('[data-custody-banner-text]');
      if (!textSpan) {
        textSpan = document.createElement('span');
        textSpan.setAttribute('data-custody-banner-text', '1');
        banner.insertBefore(textSpan, banner.firstChild);
      }
      textSpan.textContent = 'Denna vecka: hos ' + wb.label;
      banner.classList.remove('hidden');

      if (window.DashboardCustody) {
        if (typeof DashboardCustody.ensureMyDaysToggle === 'function') {
          DashboardCustody.ensureMyDaysToggle();
        }
        if (typeof DashboardCustody.apply === 'function') {
          var ids = Array.from(document.querySelectorAll('.dash-child-card[data-child-id]'))
            .map(function (el) { return el.getAttribute('data-child-id'); })
            .filter(Boolean);
          DashboardCustody.apply(ids.length ? ids : [childId]);
        }
      }
    } catch (err) {
      if (err && err.status === 404) return;
    }
  }

  function init() {
    refresh();
    setInterval(refresh, 5000);
    document.addEventListener('click', function (e) {
      if (e.target.closest('.child-tab') || e.target.closest('.dash-child-card')) {
        _lastChildId = null;
        setTimeout(refresh, 150);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
