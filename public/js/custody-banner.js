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
    return null;
  }

  function ensureBanner() {
    var existing = document.getElementById(BANNER_ID);
    if (existing) return existing;
    var main = document.querySelector('main') || document.body;
    var banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'hidden mx-4 mt-3 rounded-xl border-2 px-4 py-3 text-sm font-semibold text-navy';
    banner.setAttribute('role', 'status');
    if (main.firstChild) main.insertBefore(banner, main.firstChild);
    else main.appendChild(banner);
    return banner;
  }

  async function refresh() {
    var childId = getActiveChildId();
    if (!childId) {
      var b = document.getElementById(BANNER_ID);
      if (b) b.classList.add('hidden');
      return;
    }
    if (childId === _lastChildId) return;
    _lastChildId = childId;

    try {
      var data = await window.apiFetch('/api/family/custody/context?childId=' + encodeURIComponent(childId));
      var banner = ensureBanner();
      if (!data.active || !data.weekBanner) {
        banner.classList.add('hidden');
        return;
      }
      var wb = data.weekBanner;
      banner.style.borderColor = wb.color;
      banner.style.backgroundColor = wb.color + '18';
      banner.textContent = 'Denna vecka: hos ' + wb.label;
      banner.classList.remove('hidden');
      if (!_seenForChild[childId]) {
        _seenForChild[childId] = true;
        track('custody_banner_seen', { child_id: childId, variant: wb.variant });
      }
    } catch (err) {
      if (err.status === 404) return;
    }
  }

  function init() {
    refresh();
    setInterval(refresh, 3000);
    document.addEventListener('click', function (e) {
      if (e.target.closest('.child-tab') || e.target.closest('.dash-child-card')) {
        _lastChildId = null;
        setTimeout(refresh, 100);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
