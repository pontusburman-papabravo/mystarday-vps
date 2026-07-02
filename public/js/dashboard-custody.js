/**
 * dashboard-custody.js — FEAT-1 BC-6/BC-9 on parent dashboard (day colors + Mina dagar).
 * Konsumerar context API + calendar-week — ingen egen boendeschemalogik.
 */
(function () {
  'use strict';

  const _contextByChild = {};
  const _weekByChild = {};
  let myDaysOnly = false;

  function track(event, meta) {
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track(event, meta || {});
    }
  }

  function todayIso() {
    return new Date().toLocaleDateString('sv-SE');
  }

  /** @param {object|null} ctx */
  function homeFromContext(ctx) {
    if (!ctx) return null;
    return ctx.activeHome || ctx.home || null;
  }

  /** @param {object|null} ctx */
  function isParentDay(ctx) {
    if (!ctx) return null;
    if (typeof ctx.isParentDay === 'boolean') return ctx.isParentDay;
    if (typeof ctx.isMyDay === 'boolean') return ctx.isMyDay;
    return null;
  }

  async function fetchContext(childId) {
    try {
      const res = await window.apiFetch(
        '/api/family/custody/context?childId=' + encodeURIComponent(childId) + '&date=' + encodeURIComponent(todayIso())
      );
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  async function fetchWeek(childId) {
    try {
      const res = await window.apiFetch(
        '/api/children/' + encodeURIComponent(childId) + '/calendar-week?weekOffset=0'
      );
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  function applyCardStyles(childId) {
    const card = document.querySelector('.dash-child-card[data-child-id="' + childId + '"]');
    if (!card) return;

    const ctx = _contextByChild[childId];
    const home = homeFromContext(ctx);
    card.style.borderLeftWidth = '';
    card.style.borderLeftStyle = '';
    card.style.borderLeftColor = '';
    card.style.opacity = '';
    card.removeAttribute('data-custody-home-label');
    card.removeAttribute('aria-label');

    if (!ctx || !ctx.active) return;

    if (home && home.color) {
      card.style.borderLeftWidth = '4px';
      card.style.borderLeftStyle = 'solid';
      card.style.borderLeftColor = home.color;
    }

    if (home && home.label) {
      card.setAttribute('data-custody-home-label', home.label);
      const icon = home.icon ? home.icon + ' ' : '';
      card.setAttribute('aria-label', icon + 'Hos ' + home.label);
    }

    const parentDay = isParentDay(ctx);
    if (myDaysOnly && parentDay === false) {
      card.style.opacity = '0.4';
    }
  }

  function applyWeekDayColors(childId) {
    const week = _weekByChild[childId];
    if (!week || !week.custody || !week.custody.active || !week.days) return;

    const card = document.querySelector('.dash-child-card[data-child-id="' + childId + '"]');
    if (!card) return;

    const dayMap = {};
    week.days.forEach(function (d) { dayMap[d.dayOfWeek] = d; });

    const dowForIndex = [1, 2, 3, 4, 5, 6, 0];
    card.querySelectorAll('.mini-week-day').forEach(function (el, idx) {
      const dow = dowForIndex[idx];
      const day = dayMap[dow];
      el.style.opacity = '';
      el.style.borderColor = '';
      el.removeAttribute('title');
      el.removeAttribute('aria-label');
      if (!day || !day.custody) return;

      const dayParent = typeof day.custody.isMyDay === 'boolean' ? day.custody.isMyDay : null;
      if (myDaysOnly && dayParent === false) {
        el.style.opacity = '0.35';
      } else if (day.custody.color) {
        el.style.borderColor = day.custody.color;
      }

      if (day.custody.label) {
        const hint = 'Hos ' + day.custody.label;
        el.setAttribute('title', hint);
        el.setAttribute('aria-label', hint);
      }
    });
  }

  async function apply(childIds) {
    if (!Array.isArray(childIds) || !childIds.length) return;

    await Promise.all(childIds.map(async function (id) {
      const ctx = await fetchContext(id);
      _contextByChild[id] = ctx;
      if (ctx && ctx.active) {
        _weekByChild[id] = await fetchWeek(id);
      } else {
        _weekByChild[id] = null;
      }
      applyCardStyles(id);
      applyWeekDayColors(id);
    }));
  }

  function isMyDaysOnly() {
    return myDaysOnly;
  }

  function setMyDaysOnly(enabled) {
    myDaysOnly = Boolean(enabled);
    Object.keys(_contextByChild).forEach(applyCardStyles);
    Object.keys(_weekByChild).forEach(applyWeekDayColors);
    track('custody_filter_changed', { context: 'dashboard', enabled: myDaysOnly });
    track('custody_view_filtered', { context: 'dashboard', enabled: myDaysOnly });
  }

  function ensureMyDaysToggle() {
    const banner = document.getElementById('custodyWeekBanner');
    if (!banner || document.getElementById('custodyDashboardMyDaysChk')) return;

    const label = document.createElement('label');
    label.id = 'custodyDashboardMyDays';
    label.className = 'ml-auto flex items-center gap-2 text-xs font-semibold cursor-pointer whitespace-nowrap';
    label.innerHTML = '<input type="checkbox" class="rounded" id="custodyDashboardMyDaysChk" /> Mina dagar';
    banner.appendChild(label);

    const chk = document.getElementById('custodyDashboardMyDaysChk');
    if (chk) {
      chk.checked = myDaysOnly;
      chk.onchange = function () { setMyDaysOnly(chk.checked); };
    }
  }

  window.DashboardCustody = {
    apply: apply,
    setMyDaysOnly: setMyDaysOnly,
    isMyDaysOnly: isMyDaysOnly,
    ensureMyDaysToggle: ensureMyDaysToggle,
  };
})();
