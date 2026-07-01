/**
 * custody-settings.js — FEAT-1 boendeschema på /family (flag-gated).
 * Sparar pattern_type + hem via API — ingen egen datumlogik.
 */
(function () {
  'use strict';

  let _config = null;

  const PATTERN_WEEKS = 'alternate_weeks';
  const PATTERN_WEEKENDS = 'alternate_weekends';

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

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function homeOptions(homes, selectedId) {
    return homes.map(function (h) {
      const sel = h.id === selectedId ? ' selected' : '';
      return '<option value="' + h.id + '"' + sel + '>' + escapeHtml(h.label) + '</option>';
    }).join('');
  }

  function patternTypeFromPat(pat) {
    if (!pat) return PATTERN_WEEKS;
    return pat.pattern_type === PATTERN_WEEKENDS ? PATTERN_WEEKENDS : PATTERN_WEEKS;
  }

  function defaultHomeFromPat(pat) {
    if (!pat || !pat.configuration) return pat ? pat.week_a_home_id : '';
    const cfg = typeof pat.configuration === 'string'
      ? JSON.parse(pat.configuration)
      : pat.configuration;
    return cfg.default_home || pat.week_a_home_id || '';
  }

  function togglePatternFields(block) {
    const type = block.querySelector('.custody-pattern-type').value;
    const weeks = block.querySelector('.custody-fields-weeks');
    const weekends = block.querySelector('.custody-fields-weekends');
    if (weeks) weeks.classList.toggle('hidden', type !== PATTERN_WEEKS);
    if (weekends) weekends.classList.toggle('hidden', type !== PATTERN_WEEKENDS);
  }

  function childBlockHtml(c, pat, homes) {
    const enabled = Boolean(pat);
    const patternType = patternTypeFromPat(pat);
    const anchor = pat ? pat.anchor_date : todayIso();
    const homeA = pat ? pat.week_a_home_id : (homes[0] && homes[0].id);
    const homeB = pat ? pat.week_b_home_id : (homes[1] && homes[1].id);
    const defaultHome = defaultHomeFromPat(pat) || homeA;
    const opts = homeOptions(homes);

    return (
      '<div class="border border-lavender rounded-xl p-3 space-y-2 custody-child-block" data-child-id="' + c.id + '">' +
      '<label class="flex items-center gap-2 font-semibold text-sm text-navy dark:text-white">' +
      '<input type="checkbox" class="custody-child-enable" ' + (enabled ? 'checked' : '') + ' /> ' +
      escapeHtml(c.emoji || '⭐') + ' ' + escapeHtml(c.name) +
      '</label>' +
      '<div class="custody-child-fields space-y-2 ' + (enabled ? '' : 'hidden') + '">' +
      '<div><label class="block text-xs text-text-soft mb-1">Mönster</label>' +
      '<select class="custody-pattern-type w-full border rounded-lg px-2 py-1 text-sm">' +
      '<option value="' + PATTERN_WEEKS + '"' + (patternType === PATTERN_WEEKS ? ' selected' : '') + '>Varannan vecka</option>' +
      '<option value="' + PATTERN_WEEKENDS + '"' + (patternType === PATTERN_WEEKENDS ? ' selected' : '') + '>Varannan helg (fre–sön)</option>' +
      '</select></div>' +
      '<label class="block text-xs text-text-soft">Ankardatum (första perioden enligt mönster)</label>' +
      '<input type="date" class="custody-anchor w-full border rounded-lg px-2 py-1 text-sm" value="' + anchor + '" />' +
      '<div class="custody-fields-weeks space-y-2 ' + (patternType === PATTERN_WEEKS ? '' : 'hidden') + '">' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-text-soft">Hem period 1</label>' +
      '<select class="custody-week-a w-full border rounded-lg px-2 py-1 text-sm">' + opts + '</select></div>' +
      '<div><label class="text-xs text-text-soft">Hem period 2</label>' +
      '<select class="custody-week-b w-full border rounded-lg px-2 py-1 text-sm">' + opts + '</select></div>' +
      '</div></div>' +
      '<div class="custody-fields-weekends space-y-2 ' + (patternType === PATTERN_WEEKENDS ? '' : 'hidden') + '">' +
      '<div><label class="text-xs text-text-soft">Bashem vardagar (mån–tors)</label>' +
      '<select class="custody-default-home w-full border rounded-lg px-2 py-1 text-sm">' + opts + '</select></div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-text-soft">Helg hem A</label>' +
      '<select class="custody-week-a w-full border rounded-lg px-2 py-1 text-sm">' + opts + '</select></div>' +
      '<div><label class="text-xs text-text-soft">Helg hem B</label>' +
      '<select class="custody-week-b w-full border rounded-lg px-2 py-1 text-sm">' + opts + '</select></div>' +
      '</div></div>' +
      '</div></div>'
    );
  }

  function bindChildBlock(block, pat, homes) {
    const homeA = pat ? pat.week_a_home_id : homes[0]?.id;
    const homeB = pat ? pat.week_b_home_id : homes[1]?.id;
    const defaultHome = defaultHomeFromPat(pat) || homeA;

    const wa = block.querySelector('.custody-fields-weeks .custody-week-a')
      || block.querySelector('.custody-fields-weekends .custody-week-a');
    const wb = block.querySelector('.custody-fields-weeks .custody-week-b')
      || block.querySelector('.custody-fields-weekends .custody-week-b');
    // Set values on all matching selects (weeks + weekends share class names in separate containers)
    block.querySelectorAll('.custody-week-a').forEach(function (s) { if (homeA) s.value = homeA; });
    block.querySelectorAll('.custody-week-b').forEach(function (s) { if (homeB) s.value = homeB; });
    const defSel = block.querySelector('.custody-default-home');
    if (defSel && defaultHome) defSel.value = defaultHome;

    const typeSel = block.querySelector('.custody-pattern-type');
    if (typeSel) {
      typeSel.addEventListener('change', function () { togglePatternFields(block); });
    }
  }

  function render() {
    const section = el('custodyScheduleSection');
    const body = el('custodyScheduleBody');
    if (!section || !body || !_config) return;

    section.classList.remove('hidden');
    if (window.location.hash === '#custodyScheduleSection' || window.location.hash === '#boendeschema') {
      setTimeout(function () {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
    const homes = _config.homes || [];
    const parents = _config.parents || [];
    const patterns = _config.patterns || [];
    const children = (window.familyChildren || []);

    if (homes.length < 2) {
      body.innerHTML =
        '<p class="text-sm text-text-soft mb-3">Boendeschema hjälper dig hålla reda på vilket hem barnet är på — med hemnamn och färger, inte vecka A/B.</p>' +
        '<button type="button" id="custodySetupBtn" class="px-4 py-2 bg-gold text-white rounded-lg font-semibold text-sm">Kom igång med boendeschema</button>';
      el('custodySetupBtn').addEventListener('click', runSetup);
      return;
    }

    const homeOpts = homeOptions(homes);
    const parentRows = parents.map(function (p) {
      const mapped = (_config.parentHomes || []).find(function (m) { return m.parent_id === p.id; });
      const selected = mapped ? mapped.custody_home_id : '';
      return (
        '<div class="flex flex-wrap items-center gap-2 text-sm">' +
        '<span class="min-w-[8rem] text-navy dark:text-white">' + escapeHtml(p.name || p.email) + '</span>' +
        '<select class="custody-parent-home border rounded-lg px-2 py-1" data-parent-id="' + p.id + '">' +
        '<option value="">—</option>' + homeOpts +
        '</select></div>'
      );
    }).join('');

    const childBlocks = children.map(function (c) {
      const pat = patterns.find(function (p) { return p.child_id === c.id; });
      return childBlockHtml(c, pat, homes);
    }).join('');

    body.innerHTML =
      '<p class="text-sm text-text-soft">Etikett och färg per hem. Välj mönster per barn — varannan vecka eller varannan helg.</p>' +
      '<div class="space-y-3 mt-3" id="custodyHomesEditor">' +
      homes.map(function (h) {
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
      const mapped = (_config.parentHomes || []).find(function (m) { return m.parent_id === p.id; });
      const sel = document.querySelector('.custody-parent-home[data-parent-id="' + p.id + '"]');
      if (sel && mapped) sel.value = mapped.custody_home_id;
    });

    children.forEach(function (c) {
      const pat = patterns.find(function (p) { return p.child_id === c.id; });
      const block = document.querySelector('[data-child-id="' + c.id + '"]');
      if (block) bindChildBlock(block, pat, homes);
    });

    body.querySelectorAll('.custody-child-enable').forEach(function (cb) {
      cb.addEventListener('change', function () {
        const fields = cb.closest('[data-child-id]').querySelector('.custody-child-fields');
        if (fields) fields.classList.toggle('hidden', !cb.checked);
      });
    });

    const saveBtn = el('custodySaveBtn');
    if (saveBtn) saveBtn.onclick = saveAll;
  }

  async function runSetup() {
    try {
      await Auth.api('/api/family/custody/setup', { method: 'POST' });
      await load();
    } catch (err) {
      showToast('Kunde inte starta: ' + (err.message || 'fel'), true);
    }
  }

  function readPatternPayload(block) {
    const patternType = block.querySelector('.custody-pattern-type').value;
    const visible = patternType === PATTERN_WEEKENDS
      ? block.querySelector('.custody-fields-weekends')
      : block.querySelector('.custody-fields-weeks');
    const weekA = visible.querySelector('.custody-week-a').value;
    const weekB = visible.querySelector('.custody-week-b').value;
    const payload = {
      anchor_date: block.querySelector('.custody-anchor').value,
      week_a_home_id: weekA,
      week_b_home_id: weekB,
      pattern_type: patternType,
      clone_week_b: true,
    };
    if (patternType === PATTERN_WEEKENDS) {
      const defSel = block.querySelector('.custody-default-home');
      payload.default_home_id = defSel ? defSel.value : weekA;
    }
    return payload;
  }

  async function saveAll() {
    const msg = el('custodySaveMsg');
    if (msg) { msg.textContent = 'Sparar…'; msg.classList.remove('hidden'); }

    try {
      const homeRows = document.querySelectorAll('.custody-home-row');
      const homes = [];
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

      const mappings = [];
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

      const childBlocks = document.querySelectorAll('.custody-child-block');
      for (let i = 0; i < childBlocks.length; i++) {
        const block = childBlocks[i];
        const childId = block.getAttribute('data-child-id');
        const enabled = block.querySelector('.custody-child-enable').checked;
        if (!enabled) {
          await Auth.api('/api/family/custody/pattern/' + childId, {
            method: 'PUT',
            body: JSON.stringify({ enabled: false }),
          });
          continue;
        }
        await Auth.api('/api/family/custody/pattern/' + childId, {
          method: 'PUT',
          body: JSON.stringify(readPatternPayload(block)),
        });
      }

      track('custody_schedule_updated', { source: 'family_settings_save' });
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
