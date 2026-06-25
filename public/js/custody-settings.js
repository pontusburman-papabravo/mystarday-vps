/**
 * custody-settings.js — FEAT-1 boendeschema setup on /family (flag-gated).
 */
(function () {
  'use strict';

  var COLORS = ['#4F46E5', '#22C55E', '#F59E0B', '#EC4899', '#0EA5E9', '#8B5CF6'];
  var _config = null;

  function track(event, meta) {
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track(event, meta || {});
    }
  }

  function el(id) {
    return document.getElementById(id);
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function render() {
    var section = el('custodyScheduleSection');
    var body = el('custodyScheduleBody');
    if (!section || !body || !_config) return;

    section.classList.remove('hidden');
    var homes = _config.homes || [];
    var parents = _config.parents || [];
    var patterns = _config.patterns || [];
    var children = (window.familyChildren || []);

    if (homes.length < 2) {
      body.innerHTML =
        '<p class="text-sm text-text-soft mb-3">Växelvis boende: två veckoscheman (A/B) som växlar varannan vecka.</p>' +
        '<button type="button" id="custodySetupBtn" class="px-4 py-2 bg-gold text-white rounded-lg font-semibold text-sm">Kom igång med boendeschema</button>';
      el('custodySetupBtn').addEventListener('click', runSetup);
      return;
    }

    var homeOptions = homes.map(function (h) {
      return '<option value="' + h.id + '">' + escapeHtml(h.label) + '</option>';
    }).join('');

    var parentRows = parents.map(function (p) {
      var mapped = (_config.parentHomes || []).find(function (m) { return m.parent_id === p.id; });
      var selected = mapped ? mapped.custody_home_id : '';
      return (
        '<div class="flex flex-wrap items-center gap-2 text-sm">' +
        '<span class="min-w-[8rem] text-navy dark:text-white">' + escapeHtml(p.name || p.email) + '</span>' +
        '<select class="custody-parent-home border rounded-lg px-2 py-1" data-parent-id="' + p.id + '">' +
        '<option value="">—</option>' + homeOptions +
        '</select></div>'
      );
    }).join('');

    var childBlocks = children.map(function (c) {
      var pat = patterns.find(function (p) { return p.child_id === c.id; });
      var enabled = Boolean(pat);
      return (
        '<div class="border border-lavender rounded-xl p-3 space-y-2 custody-child-block" data-child-id="' + c.id + '">' +
        '<label class="flex items-center gap-2 font-semibold text-sm text-navy dark:text-white">' +
        '<input type="checkbox" class="custody-child-enable" ' + (enabled ? 'checked' : '') + ' /> ' +
        escapeHtml(c.emoji || '⭐') + ' ' + escapeHtml(c.name) +
        '</label>' +
        '<div class="custody-child-fields space-y-2 ' + (enabled ? '' : 'hidden') + '">' +
        '<label class="block text-xs text-text-soft">Första vecka A började</label>' +
        '<input type="date" class="custody-anchor w-full border rounded-lg px-2 py-1 text-sm" value="' + (pat ? pat.anchor_date : todayIso()) + '" />' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-text-soft">Vecka A hem</label>' +
        '<select class="custody-week-a w-full border rounded-lg px-2 py-1 text-sm">' + homeOptions + '</select></div>' +
        '<div><label class="text-xs text-text-soft">Vecka B hem</label>' +
        '<select class="custody-week-b w-full border rounded-lg px-2 py-1 text-sm">' + homeOptions + '</select></div>' +
        '</div></div></div>'
      );
    }).join('');

    body.innerHTML =
      '<p class="text-sm text-text-soft">Etikett och färg per hem. Varannan vecka växlar barnet mellan vecka A och B.</p>' +
      '<p class="text-xs text-text-soft mt-2 rounded-lg bg-sky/50 border border-lavender px-3 py-2">' +
      '💡 <strong>Skriv ut dina dagar:</strong> gå till ' +
      '<a href="/daily-log?print=1" class="text-gold font-semibold hover:underline">Daglig logg → 🖨️ Skriv ut → Mina dagar</a> ' +
      '(kräver att boendeschema är sparat).</p>' +
      '<div class="space-y-3 mt-3" id="custodyHomesEditor">' +
      homes.map(function (h, i) {
        return (
          '<div class="flex flex-wrap gap-2 items-center custody-home-row" data-home-id="' + h.id + '">' +
          '<input type="color" class="custody-color w-10 h-10 rounded border-0" value="' + h.color + '" />' +
          '<input type="text" class="custody-label flex-1 min-w-[8rem] border rounded-lg px-2 py-1 text-sm" value="' + escapeHtml(h.label) + '" maxlength="64" />' +
          '</div>'
        );
      }).join('') +
      '</div>' +
      '<div class="mt-4"><h4 class="text-sm font-semibold text-navy dark:text-white mb-2">Förälder ↔ hem</h4><div class="space-y-2">' + parentRows + '</div></div>' +
      '<div class="mt-4"><h4 class="text-sm font-semibold text-navy dark:text-white mb-2">Barn</h4><div class="space-y-3">' + (childBlocks || '<p class="text-sm text-text-soft">Lägg till ett barn först.</p>') + '</div></div>' +
      '<button type="button" id="custodySaveBtn" class="mt-4 px-4 py-2 bg-navy text-white rounded-lg font-semibold text-sm">Spara boendeschema</button>' +
      '<p id="custodySaveMsg" class="mt-2 text-sm text-gold font-medium hidden"></p>';

    parents.forEach(function (p) {
      var mapped = (_config.parentHomes || []).find(function (m) { return m.parent_id === p.id; });
      var sel = document.querySelector('.custody-parent-home[data-parent-id="' + p.id + '"]');
      if (sel && mapped) sel.value = mapped.custody_home_id;
    });

    patterns.forEach(function (pat) {
      var block = document.querySelector('[data-child-id="' + pat.child_id + '"]');
      if (!block) return;
      var wa = block.querySelector('.custody-week-a');
      var wb = block.querySelector('.custody-week-b');
      if (wa) wa.value = pat.week_a_home_id;
      if (wb) wb.value = pat.week_b_home_id;
    });

    body.querySelectorAll('.custody-child-enable').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var fields = cb.closest('[data-child-id]').querySelector('.custody-child-fields');
        if (fields) fields.classList.toggle('hidden', !cb.checked);
      });
    });

    var saveBtn = el('custodySaveBtn');
    if (saveBtn) saveBtn.onclick = saveAll;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  async function runSetup() {
    try {
      await Auth.api('/api/family/custody/setup', { method: 'POST' });
      await load();
    } catch (err) {
      showToast('Kunde inte starta: ' + (err.message || 'fel'), true);
    }
  }

  async function saveAll() {
    var msg = el('custodySaveMsg');
    if (msg) { msg.textContent = 'Sparar…'; msg.classList.remove('hidden'); }

    try {
      var homeRows = document.querySelectorAll('.custody-home-row');
      var homes = [];
      homeRows.forEach(function (row, i) {
        homes.push({
          id: row.getAttribute('data-home-id'),
          label: row.querySelector('.custody-label').value.trim(),
          color: row.querySelector('.custody-color').value,
          sort_order: i,
        });
      });
      await Auth.api('/api/family/custody/homes', {
        method: 'PUT',
        body: JSON.stringify({ homes: homes }),
      });

      var mappings = [];
      document.querySelectorAll('.custody-parent-home').forEach(function (sel) {
        mappings.push({
          parentId: sel.getAttribute('data-parent-id'),
          custodyHomeId: sel.value || null,
        });
      });
      await Auth.api('/api/family/custody/parent-homes', {
        method: 'PUT',
        body: JSON.stringify({ mappings: mappings }),
      });

      var childBlocks = document.querySelectorAll('.custody-child-block');
      for (var i = 0; i < childBlocks.length; i++) {
        var block = childBlocks[i];
        var childId = block.getAttribute('data-child-id');
        var enabled = block.querySelector('.custody-child-enable').checked;
        if (!enabled) {
          await Auth.api('/api/family/custody/pattern/' + childId, {
            method: 'PUT',
            body: JSON.stringify({ enabled: false }),
          });
          continue;
        }
        await Auth.api('/api/family/custody/pattern/' + childId, {
          method: 'PUT',
          body: JSON.stringify({
            anchor_date: block.querySelector('.custody-anchor').value,
            week_a_home_id: block.querySelector('.custody-week-a').value,
            week_b_home_id: block.querySelector('.custody-week-b').value,
            clone_week_b: true,
          }),
        });
      }

      track('custody_view_filtered', { source: 'family_settings_save' });
      if (msg) { msg.textContent = '✓ Sparat!'; setTimeout(function () { msg.classList.add('hidden'); }, 2000); }
      await load();
    } catch (err) {
      if (msg) msg.classList.add('hidden');
      showToast('Kunde inte spara: ' + (err.message || 'fel'), true);
    }
  }

  async function load() {
    try {
      _config = await Auth.api('/api/family/custody');
      render();
    } catch (err) {
      if (err.status === 404) return;
      console.warn('[custody-settings]', err.message);
    }
  }

  function init() {
    load();
  }

  window.CustodySettings = { init: init, reload: load };
})();
