/**
 * schedule-custody.js — FEAT-1 BC-4/BC-6: vecka A/B-växlare, dagsfärger, "Mina dagar" på schemasidan.
 */
(function () {
  'use strict';

  const state = {
    active: false,
    editVariant: 'a',
    myDaysOnly: false,
    weekData: null,
    childId: null,
    weekOffset: 0,
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
    const bannerHtml = wb
      ? '<div class="rounded-xl border-2 px-4 py-2.5 mb-3 text-sm font-semibold text-navy" role="status" style="border-color:' + esc(wb.color) + ';background:' + esc(wb.color) + '18">Denna vecka: hos ' + esc(wb.label) + '</div>'
      : '';

    mount.innerHTML = bannerHtml + [
      '<div class="flex flex-wrap items-center gap-2 mb-2">',
      '<span class="text-xs text-text-soft font-medium">Redigera schema:</span>',
      '<button type="button" data-custody-var="a" class="custody-var-btn px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-colors">Vecka A</button>',
      '<button type="button" data-custody-var="b" class="custody-var-btn px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-colors">Vecka B</button>',
      '<label class="ml-auto flex items-center gap-2 text-xs font-semibold text-navy cursor-pointer">',
      '<input type="checkbox" id="custodyMyDaysChk" class="rounded" /> Mina dagar',
      '</label>',
      '</div>',
    ].join('');

    mount.querySelectorAll('.custody-var-btn').forEach(function (btn) {
      const v = btn.getAttribute('data-custody-var');
      const selected = v === state.editVariant;
      btn.classList.toggle('bg-navy', selected);
      btn.classList.toggle('text-white', selected);
      btn.classList.toggle('border-navy', selected);
      btn.classList.toggle('border-lavender', !selected);
      btn.classList.toggle('text-navy', !selected);
      btn.onclick = function () {
        if (state.editVariant === v) return;
        state.editVariant = v;
        renderChrome();
        styleDayTabs();
        if (typeof loadScheduleForDay === 'function') loadScheduleForDay();
        track('custody_week_variant_changed', { context: 'schedule_editor', variant: v });
      };
    });

    const chk = document.getElementById('custodyMyDaysChk');
    if (chk) {
      chk.checked = state.myDaysOnly;
      chk.onchange = function () {
        state.myDaysOnly = chk.checked;
        styleDayTabs();
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
      if (!day || !day.custody) return;
      if (state.myDaysOnly && day.custody.isMyDay === false) {
        btn.style.opacity = '0.35';
      }
      if (!isSelected && day.custody.color) {
        btn.style.borderColor = day.custody.color;
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
      if (state.active && state.weekData.custody.weekBanner && state.weekData.custody.weekBanner.variant) {
        if (state.editVariant !== 'a' && state.editVariant !== 'b') {
          state.editVariant = state.weekData.custody.weekBanner.variant;
        }
      }
      renderChrome();
      styleDayTabs();
    } catch (err) {
      state.active = false;
      renderChrome();
    }
  }

  function scheduleQuery() {
    if (!state.active) return '';
    return '?week_variant=' + encodeURIComponent(state.editVariant);
  }

  function getCreateExtras() {
    if (!state.active) return {};
    return { week_variant: state.editVariant };
  }

  function isDayHidden(dayOfWeek) {
    if (!state.active || !state.myDaysOnly) return false;
    const day = dayMap()[dayOfWeek];
    return Boolean(day && day.custody && day.custody.isMyDay === false);
  }

  function getEditVariantLabel() {
    return state.editVariant === 'b' ? 'Vecka B' : 'Vecka A';
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
