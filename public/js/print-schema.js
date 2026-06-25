/**
 * print-schema.js — Print schema picker (child + period + preview).
 */
(function () {
  'use strict';

  var children = [];
  var currentChildId = null;
  var periodKey = '1w';
  var scope = 'all';
  var weekOffset = 0;
  var custodyEnabled = false;

  function showToast(msg, type) {
    if (typeof window.showToast === 'function') window.showToast(msg, type);
  }

  function trackExport(meta) {
    meta.source = 'print_schema_page';
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track('print_schema_exported', meta);
    } else {
      apiFetch('/api/analytics/event', {
        method: 'POST',
        body: JSON.stringify({ event_type: 'print_schema_exported', metadata: meta }),
      }).catch(function () {});
    }
  }

  function updateWeekLabel() {
    var core = window.PrintSchemaCore;
    var monday = core.mondayOf(new Date());
    monday = core.addDays(monday, weekOffset * 7);
    var period = core.PERIODS[periodKey];
    var end = core.addDays(monday, period.days - 1);
    document.getElementById('weekLabel').textContent = core.fmtRangeLabel(monday, end);
  }

  function setActiveBtns(container, attr, value) {
    container.querySelectorAll('[' + attr + ']').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute(attr) === value);
    });
  }

  function selectChild(id) {
    currentChildId = id;
    setActiveBtns(document.getElementById('childTabs'), 'data-id', id);
  }

  async function loadCustody() {
    try {
      var res = await apiFetch('/api/family/custody');
      if (res.status === 404) return;
      if (!res.ok) return;
      var data = await res.json();
      custodyEnabled = Boolean(data && data.patterns && data.patterns.length > 0);
      document.getElementById('myDaysScopeBtn').classList.toggle('hidden', !custodyEnabled);
      if (!custodyEnabled && scope === 'my') {
        scope = 'all';
        setActiveBtns(document.getElementById('scopeBtns'), 'data-scope', 'all');
      }
    } catch (_) {
      custodyEnabled = false;
    }
  }

  async function loadChildren() {
    var res = await apiFetch('/api/children');
    if (!res.ok) {
      showToast('Kunde inte ladda barn', 'error');
      return;
    }
    children = await res.json();
    var tabs = document.getElementById('childTabs');
    if (!children.length) {
      tabs.innerHTML = '<p class="text-text-soft text-sm">Inga barn tillagda ännu. <a href="/dashboard" class="text-gold font-semibold">Gå till Min panel</a></p>';
      document.getElementById('printBtn').disabled = true;
      document.getElementById('previewBtn').disabled = true;
      return;
    }

    tabs.innerHTML = children.map(function (c) {
      return '<button type="button" class="child-tab px-4 py-2 rounded-full border-2 border-lavender font-semibold text-sm flex items-center gap-2" data-id="' + c.id + '">' +
        renderChildAvatar(c, 22) + ' ' + escapeHtml(c.name) + '</button>';
    }).join('');

    tabs.querySelectorAll('.child-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { selectChild(btn.dataset.id); });
    });

    var params = new URLSearchParams(window.location.search);
    var paramId = params.get('childId');
    var target = paramId && children.find(function (c) { return c.id === paramId; });
    selectChild(target ? target.id : children[0].id);
  }

  async function buildDoc(mode) {
    var child = children.find(function (c) { return c.id === currentChildId; });
    if (!child) throw new Error('no_child');
    return window.PrintSchemaCore.loadAndBuild(child, {
      periodKey: periodKey,
      weekOffset: weekOffset,
      myDaysOnly: scope === 'my',
      apiFetch: apiFetch,
      mode: mode,
    });
  }

  async function runPreview() {
    if (!currentChildId) { showToast('Välj ett barn först', 'error'); return; }
    try {
      showToast('Laddar förhandsgranskning…');
      var doc = await buildDoc('preview');
      var mount = document.getElementById('previewMount');
      var wrap = document.getElementById('previewWrap');
      wrap.classList.remove('hidden');
      mount.innerHTML = '<style>' + doc.styles + '</style>' + doc.body;
      mount.scrollTop = 0;
    } catch (err) {
      if (err && err.message === 'no_my_days') {
        showToast('Inga av dina dagar i vald period', 'error');
      } else {
        showToast('Kunde inte ladda schemat', 'error');
      }
    }
  }

  async function runPrint() {
    if (!currentChildId) { showToast('Välj ett barn först', 'error'); return; }
    try {
      showToast('Förbereder utskrift…');
      var doc = await buildDoc('print');
      window.PrintSchemaCore.openPrintWindow(doc, true);
      trackExport({
        format: periodKey,
        scope: scope,
        child_id: currentChildId,
        week_offset: weekOffset,
      });
      if (scope === 'my' && window.analytics) {
        window.analytics.track('custody_view_filtered', { source: 'print_schema', period: periodKey });
      }
    } catch (err) {
      if (err && err.message === 'no_my_days') {
        showToast('Inga av dina dagar i vald period', 'error');
      } else {
        showToast('Kunde inte skapa utskriften', 'error');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    if (!Auth.requireAuth()) return;

    document.getElementById('periodBtns').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-period]');
      if (!btn) return;
      periodKey = btn.dataset.period;
      setActiveBtns(document.getElementById('periodBtns'), 'data-period', periodKey);
      updateWeekLabel();
    });

    document.getElementById('scopeBtns').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-scope]');
      if (!btn || btn.classList.contains('hidden')) return;
      scope = btn.dataset.scope;
      setActiveBtns(document.getElementById('scopeBtns'), 'data-scope', scope);
    });

    document.getElementById('weekPrev').addEventListener('click', function () {
      weekOffset -= 1;
      updateWeekLabel();
    });
    document.getElementById('weekNext').addEventListener('click', function () {
      weekOffset += 1;
      updateWeekLabel();
    });
    document.getElementById('weekToday').addEventListener('click', function () {
      weekOffset = 0;
      updateWeekLabel();
    });

    document.getElementById('previewBtn').addEventListener('click', runPreview);
    document.getElementById('printBtn').addEventListener('click', runPrint);

    await loadChildren();
    await loadCustody();
    updateWeekLabel();
  });
})();
