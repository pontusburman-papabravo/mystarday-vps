/**
 * schedule-custody.js — FEAT-1 schemasida: hemnamn, dagsfärger, Mina dagar.
 * Konsumerar calendar-week (engine) — ingen egen boendeschemalogik.
 * week_variant i schedule-API är legacy; custody_home_id är primär (Phase 5).
 */
(function () {
  'use strict';

  const PERIOD_FALLBACK = { a: 'Period 1', b: 'Period 2' };

  const state = {
    active: false,
    editVariant: 'a',
    myDaysOnly: false,
    weekData: null,
    childId: null,
    weekOffset: 0,
    variantLabels: { a: PERIOD_FALLBACK.a, b: PERIOD_FALLBACK.b },
    variantHomes: { a: null, b: null },
  };

  function track(event, meta) {
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track(event, meta || {});
    }
  }

  function esc(s) {
    return typeof window.escHtml === 'function' ? window.escHtml(s) : String(s || '');
  }

  function dayMap() {
    const map = {};
    if (!state.weekData || !state.weekData.days) return map;
    state.weekData.days.forEach(function (d) {
      map[d.dayOfWeek] = d;
    });
    return map;
  }

  /** Home labels per variant key from engine-backed day.custody. */
  function syncVariantLabelsFromWeek(weekData) {
    state.variantLabels = { a: PERIOD_FALLBACK.a, b: PERIOD_FALLBACK.b };
    state.variantHomes = { a: null, b: null };
    if (!weekData || !weekData.days) return;
    weekData.days.forEach(function (d) {
      if (!d.custody || !d.custody.variant || !d.custody.label) return;
      state.variantLabels[d.custody.variant] = d.custody.label;
      state.variantHomes[d.custody.variant] = {
        id: d.custody.homeId,
        label: d.custody.label,
        color: d.custody.color,
      };
    });
  }

  function ensureMount() {
    const wrap = document.getElementById('daySelectorWrap');
    if (!wrap) return null;
    let mount = document.getElementById('custodyScheduleChrome');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'custodyScheduleChrome';
      mount.className = 'hidden mb-3';
      wrap.parentNode.insertBefore(mount, wrap);
    }
    return mount;
  }

  function renderChrome() {
    const mount = ensureMount();
    if (!mount) return;

    if (!state.active || !state.weekData) {
      mount.innerHTML = '';
      mount.classList.add('hidden');
      return;
    }

    mount.classList.remove('hidden');
    const wb = state.weekData.custody && state.weekData.custody.weekBanner;
    const bannerHtml = wb && wb.label
      ? '<div class="rounded-xl border-2 px-4 py-2.5 mb-3 text-sm font-semibold text-navy" role="status" style="border-color:' + esc(wb.color) + ';background:' + esc(wb.color) + '18">Denna vecka: hos ' + esc(wb.label) + '</div>'
      : '';

    const labelA = esc(state.variantLabels.a);
    const labelB = esc(state.variantLabels.b);

    mount.innerHTML = bannerHtml + [
      '<div class="flex flex-wrap items-center gap-2 mb-2">',
      '<span class="text-xs text-text-soft font-medium">Redigera schema:</span>',
      '<button type="button" data-custody-var="a" class="custody-var-btn px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-colors" aria-label="Redigera schema för ' + labelA + '">' + labelA + '</button>',
      '<button type="button" data-custody-var="b" class="custody-var-btn px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-colors" aria-label="Redigera schema för ' + labelB + '">' + labelB + '</button>',
      '<label class="ml-auto flex items-center gap-2 text-xs font-semibold text-navy cursor-pointer">',
      '<input type="checkbox" id="custodyMyDaysChk" class="rounded" /> Mina dagar',
      '</label>',
      '</div>',
    ].join('');

    mount.querySelectorAll('.custody-var-btn').forEach(function (btn) {
      const v = btn.getAttribute('data-custody-var');
      const selected = v === state.editVariant;
      const home = state.variantHomes[v];
      btn.classList.toggle('bg-navy', selected);
      btn.classList.toggle('text-white', selected);
      btn.classList.toggle('border-navy', selected);
      btn.classList.toggle('border-lavender', !selected);
      btn.classList.toggle('text-navy', !selected);
      if (!selected && home && home.color) {
        btn.style.borderColor = home.color;
      } else {
        btn.style.borderColor = '';
      }
      btn.onclick = function () {
        if (state.editVariant === v) return;
        state.editVariant = v;
        renderChrome();
        styleDayTabs();
        if (typeof loadScheduleForDay === 'function') loadScheduleForDay();
        const meta = { context: 'schedule_editor', variant: v };
        if (home && home.id) meta.home_id = home.id;
        track('custody_week_variant_changed', meta);
      };
    });

    const chk = document.getElementById('custodyMyDaysChk');
    if (chk) {
      chk.checked = state.myDaysOnly;
      chk.onchange = function () {
        state.myDaysOnly = chk.checked;
        styleDayTabs();
        track('custody_filter_changed', { context: 'schedule_editor', enabled: state.myDaysOnly });
        track('custody_view_filtered', { context: 'schedule', enabled: state.myDaysOnly });
        if (typeof loadScheduleForDay === 'function') loadScheduleForDay();
      };
    }
  }

  function styleDayTabs() {
    if (!state.active) return;
    const map = dayMap();
    document.querySelectorAll('.day-tab').forEach(function (btn) {
      const d = parseInt(btn.getAttribute('data-day'), 10);
      const day = map[d];
      const isSelected = btn.classList.contains('bg-gold');
      btn.style.opacity = '';
      btn.style.borderColor = '';
      btn.removeAttribute('title');
      btn.removeAttribute('aria-label');
      if (!day || !day.custody) return;

      const parentDay = typeof day.custody.isMyDay === 'boolean' ? day.custody.isMyDay : null;
      if (state.myDaysOnly && parentDay === false) {
        btn.style.opacity = '0.35';
      }
      if (!isSelected && day.custody.color) {
        btn.style.borderColor = day.custody.color;
      }
      if (day.custody.label) {
        const hint = 'Hos ' + day.custody.label;
        btn.setAttribute('title', hint);
        btn.setAttribute('aria-label', hint);
      }
    });
  }

  async function refresh(childId, weekOffset) {
    state.childId = childId;
    state.weekOffset = weekOffset || 0;
    if (!childId) {
      state.active = false;
      state.weekData = null;
      renderChrome();
      return;
    }

    try {
      const res = await window.apiFetch(
        '/api/children/' + encodeURIComponent(childId) + '/calendar-week?weekOffset=' + encodeURIComponent(state.weekOffset)
      );
      if (!res.ok) {
        state.active = false;
        renderChrome();
        return;
      }
      state.weekData = await res.json();
      state.active = Boolean(state.weekData.custody && state.weekData.custody.active);
      syncVariantLabelsFromWeek(state.weekData);
      if (state.active && state.weekData.custody.weekBanner && state.weekData.custody.weekBanner.variant) {
        if (state.editVariant !== 'a' && state.editVariant !== 'b') {
          state.editVariant = state.weekData.custody.weekBanner.variant;
        }
      }
      renderChrome();
      styleDayTabs();
    } catch {
      state.active = false;
      renderChrome();
    }
  }

  /** Phase 5: prefer custody_home_id; keep week_variant for legacy clients one deploy. */
  function scheduleQuery() {
    if (!state.active) return '';
    const home = state.variantHomes[state.editVariant];
    if (home && home.id) {
      return '?custody_home_id=' + encodeURIComponent(home.id);
    }
    return '?week_variant=' + encodeURIComponent(state.editVariant);
  }

  /** Phase 5: send custody_home_id on create; week_variant kept in parallel during transition. */
  function getCreateExtras() {
    if (!state.active) return {};
    const home = state.variantHomes[state.editVariant];
    const extras = { week_variant: state.editVariant };
    if (home && home.id) extras.custody_home_id = home.id;
    return extras;
  }

  function isDayHidden(dayOfWeek) {
    if (!state.active || !state.myDaysOnly) return false;
    const day = dayMap()[dayOfWeek];
    return Boolean(day && day.custody && day.custody.isMyDay === false);
  }

  function getEditVariantLabel() {
    const label = state.variantLabels[state.editVariant];
    if (label && label !== PERIOD_FALLBACK.a && label !== PERIOD_FALLBACK.b) {
      return 'hos ' + label;
    }
    return label || PERIOD_FALLBACK[state.editVariant] || '';
  }

  window.ScheduleCustody = {
    refresh: refresh,
    styleDayTabs: styleDayTabs,
    scheduleQuery: scheduleQuery,
    getCreateExtras: getCreateExtras,
    isDayHidden: isDayHidden,
    getEditVariantLabel: getEditVariantLabel,
    isActive: function () { return state.active; },
  };
})();
