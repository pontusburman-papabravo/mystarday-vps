/**
 * custody-banner.js — FEAT-1 BC-5/BC-8: boendeschema-banner på dashboard.
 * Konsumerar endast GET /api/family/custody/context — ingen egen datumlogik.
 */
(function () {
  'use strict';

  const BANNER_ID = 'custodyWeekBanner';
  let _lastChildId = null;
  const _seenForChild = {};

  function track(event, meta) {
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track(event, meta || {});
    }
  }

  function getActiveChildId() {
    const tab = document.querySelector('.child-tab.bg-navy, .child-tab.border-navy');
    if (tab && tab.getAttribute('data-id')) return tab.getAttribute('data-id');
    const magicActive = document.querySelector('.parent-ready-child.is-active[data-child-id]');
    if (magicActive) return magicActive.getAttribute('data-child-id');
    const magicChild = document.querySelector('.parent-ready-child[data-child-id]');
    if (magicChild) return magicChild.getAttribute('data-child-id');
    const card = document.querySelector('.dash-child-card.is-expanded');
    if (card) return card.getAttribute('data-child-id');
    const first = document.querySelector('.dash-child-card[data-child-id]');
    if (first) return first.getAttribute('data-child-id');
    return null;
  }

  function ensureBanner() {
    const existing = document.getElementById(BANNER_ID);
    if (existing) return existing;
    const anchor = document.getElementById('childCardsGrid')
      || document.getElementById('parentHomeHubMount')
      || document.querySelector('main');
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'hidden mb-3 mx-0 rounded-xl border-2 px-4 py-3 text-sm font-semibold text-navy flex flex-wrap items-center gap-x-3 gap-y-1';
    banner.setAttribute('role', 'status');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(banner, anchor);
    } else {
      const main = document.querySelector('main') || document.body;
      main.insertBefore(banner, main.firstChild);
    }
    return banner;
  }

  /** @param {string} isoDate YYYY-MM-DD */
  function handoffWeekdayLabel(isoDate) {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const d = new Date(isoDate + 'T12:00:00');
    return d.toLocaleDateString('sv-SE', { weekday: 'long' });
  }

  /** Prefer engine field; nextHandoff is legacy alias from API. */
  function nextHandoffDate(data) {
    return data.nextTransition || data.nextHandoff || null;
  }

  function renderBanner(banner, data) {
    const wb = data.weekBanner;
    const home = wb || data.activeHome;
    const homeLabel = (wb && wb.label) || (data.activeHome && data.activeHome.label) || '';
    if (!homeLabel) {
      banner.classList.add('hidden');
      return;
    }

    banner.style.borderColor = home.color || data.activeHome.color;
    banner.style.backgroundColor = (home.color || data.activeHome.color) + '18';

    let markerSpan = banner.querySelector('[data-custody-banner-marker]');
    const a11yApi = window.CustodyA11y;
    if (a11yApi && a11yApi.bannerMarkerHtml) {
      if (!markerSpan) {
        markerSpan = document.createElement('span');
        markerSpan.setAttribute('data-custody-banner-marker', '1');
        banner.insertBefore(markerSpan, banner.firstChild);
      }
      markerSpan.innerHTML = a11yApi.bannerMarkerHtml(home, function (s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      });
    }

    let textSpan = banner.querySelector('[data-custody-banner-text]');
    if (!textSpan) {
      textSpan = document.createElement('span');
      textSpan.setAttribute('data-custody-banner-text', '1');
      banner.appendChild(textSpan);
    }
    textSpan.textContent = 'Denna vecka: hos ' + homeLabel;

    const handoffIso = nextHandoffDate(data);
    const weekday = handoffWeekdayLabel(handoffIso);
    let handoffSpan = banner.querySelector('[data-custody-banner-handoff]');
    if (weekday) {
      if (!handoffSpan) {
        handoffSpan = document.createElement('span');
        handoffSpan.setAttribute('data-custody-banner-handoff', '1');
        handoffSpan.className = 'text-xs font-medium text-navy/80 w-full sm:w-auto';
        banner.appendChild(handoffSpan);
      }
      handoffSpan.textContent = 'Nästa byte på ' + weekday;
      handoffSpan.classList.remove('hidden');
    } else if (handoffSpan) {
      handoffSpan.classList.add('hidden');
      handoffSpan.textContent = '';
    }

    banner.classList.remove('hidden');
  }

  async function refresh() {
    const childId = getActiveChildId();
    if (!childId) {
      const b = document.getElementById(BANNER_ID);
      if (b) b.classList.add('hidden');
      return;
    }

    try {
      const res = await window.apiFetch(
        '/api/family/custody/context?childId=' + encodeURIComponent(childId)
      );
      if (!res.ok) {
        if (res.status === 404) return;
        return;
      }
      const data = await res.json();
      const banner = ensureBanner();

      if (!data.active) {
        banner.classList.add('hidden');
        _lastChildId = childId;
        return;
      }

      if (childId !== _lastChildId) {
        _lastChildId = childId;
        if (!_seenForChild[childId]) {
          _seenForChild[childId] = true;
          track('custody_banner_seen', {
            child_id: childId,
            home_id: data.activeHome && data.activeHome.id,
          });
        }
      }

      renderBanner(banner, data);

      if (window.DashboardCustody) {
        if (typeof DashboardCustody.ensureMyDaysToggle === 'function') {
          DashboardCustody.ensureMyDaysToggle();
        }
        if (typeof DashboardCustody.apply === 'function') {
          const ids = Array.from(document.querySelectorAll('.dash-child-card[data-child-id]'))
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
      if (e.target.closest('.child-tab') || e.target.closest('.dash-child-card') || e.target.closest('.parent-ready-child')) {
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
