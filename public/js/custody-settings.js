/**
 * custody-settings.js — FEAT-1 boendeschema på /family (flag-gated).
 * Sparar pattern_type + hem via API — ingen egen datumlogik.
 */
(function () {
  'use strict';

  let _config = null;

  const PATTERN_WEEKS = 'alternate_weeks';
  const PATTERN_WEEKENDS = 'alternate_weekends';
  const PATTERN_CUSTOM = 'custom';

  const CYCLE_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const CYCLE_DAY_LABELS = {
    mon: 'Mån',
    tue: 'Tis',
    wed: 'Ons',
    thu: 'Tor',
    fri: 'Fre',
    sat: 'Lör',
    sun: 'Sön',
  };

  const CUSTOM_HELP_TEXT =
    'Det här är barnets normala veckomönster. Lov, högtider och enstaka byten läggs senare som undantag, utan att ändra grundschemat.';

  const ANCHOR_SNAP_TEXT =
    'Cykeln börjar alltid på en måndag. Datumet har justerats till måndagen i samma vecka.';

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

  function mondayOfWeek(dateStr) {
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return dateStr;
    const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
    const day = dt.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setUTCDate(dt.getUTCDate() + diff);
    return dt.toISOString().slice(0, 10);
  }

  function addDaysIso(dateStr, days) {
    const parts = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  }

  function previewRangeFromToday() {
    const from = mondayOfWeek(todayIso());
    const to = addDaysIso(from, 27);
    return { from: from, to: to };
  }

  function parseConfiguration(pat) {
    if (!pat || !pat.configuration) return {};
    if (typeof pat.configuration === 'string') {
      try {
        return JSON.parse(pat.configuration);
      } catch (_e) {
        return {};
      }
    }
    return pat.configuration;
  }

  function homeOptions(homes, selectedId) {
    return homes.map(function (h) {
      const sel = h.id === selectedId ? ' selected' : '';
      return (
        '<option value="' + h.id + '" data-color="' + escapeHtml(h.color || '#4F46E5') + '"' + sel + '>' +
        escapeHtml(h.label) +
        '</option>'
      );
    }).join('');
  }

  function homeById(homes, id) {
    return homes.find(function (h) { return h.id === id; }) || homes[0];
  }

  function patternTypeFromPat(pat) {
    if (!pat) return PATTERN_WEEKS;
    if (pat.pattern_type === PATTERN_WEEKENDS) return PATTERN_WEEKENDS;
    if (pat.pattern_type === PATTERN_CUSTOM) return PATTERN_CUSTOM;
    return PATTERN_WEEKS;
  }

  function defaultHomeFromPat(pat) {
    if (!pat) return '';
    const cfg = parseConfiguration(pat);
    return cfg.default_home || pat.week_a_home_id || '';
  }

  function defaultCycleWeek(homes, homeId) {
    const id = homeId || (homes[0] && homes[0].id);
    const row = {};
    CYCLE_DAY_KEYS.forEach(function (k) { row[k] = id; });
    return row;
  }

  function defaultCycleWeeks(homes, count) {
    const a = homes[0] && homes[0].id;
    const b = (homes[1] && homes[1].id) || a;
    const weeks = [];
    for (let i = 0; i < count; i += 1) {
      weeks.push(defaultCycleWeek(homes, i % 2 === 0 ? a : b));
    }
    return weeks;
  }

  function cycleWeeksFromPat(pat, homes) {
    const cfg = parseConfiguration(pat);
    const weeks = cfg.cycle_weeks;
    if (Array.isArray(weeks) && weeks.length >= 1) return weeks;
    return defaultCycleWeeks(homes, 2);
  }

  function a11y() {
    return window.CustodyA11y || null;
  }

  function customDaySelectHtml(homes, weekIndex, dayKey, selectedId) {
    const home = homeById(homes, selectedId);
    const marker = a11y() ? a11y().homeMarkerHtml(home, escapeHtml) : '';
    return (
      '<div class="flex items-center gap-2 min-h-[44px]">' +
      marker +
      '<select class="custody-custom-day flex-1 border rounded-lg px-2 py-2 text-sm min-h-[44px]" data-week="' + weekIndex + '" data-day="' + dayKey + '">' +
      homeOptions(homes, selectedId) +
      '</select></div>'
    );
  }

  function customWeekPanelHtml(weekIndex, weekRow, homes, visible) {
    const dayRows = CYCLE_DAY_KEYS.map(function (dayKey) {
      return (
        '<div class="grid grid-cols-[3rem_1fr] gap-2 items-center">' +
        '<span class="text-xs font-medium text-text-soft">' + CYCLE_DAY_LABELS[dayKey] + '</span>' +
        customDaySelectHtml(homes, weekIndex, dayKey, weekRow[dayKey]) +
        '</div>'
      );
    }).join('');

    return (
      '<div class="custody-custom-week space-y-2 border border-lavender/60 rounded-lg p-2 ' + (visible ? '' : 'hidden') + '" data-week-index="' + weekIndex + '">' +
      '<p class="text-xs font-semibold text-navy dark:text-white">Vecka ' + (weekIndex + 1) + ' i cykeln</p>' +
      '<div class="space-y-1">' + dayRows + '</div></div>'
    );
  }

  function customFieldsHtml(pat, homes) {
    const cycleWeeks = cycleWeeksFromPat(pat, homes);
    const cycleLen = cycleWeeks.length;
    const panels = cycleWeeks.map(function (weekRow, i) {
      return customWeekPanelHtml(i, weekRow, homes, i < cycleLen);
    }).join('');

    let lengthOpts = '';
    for (let n = 1; n <= 4; n += 1) {
      lengthOpts += '<option value="' + n + '"' + (n === cycleLen ? ' selected' : '') + '>' + n + ' vecka' + (n > 1 ? 'r' : '') + '</option>';
    }

    return (
      '<div class="custody-fields-custom space-y-3 hidden">' +
      '<p class="text-xs text-text-soft leading-relaxed custody-custom-help">' + escapeHtml(CUSTOM_HELP_TEXT) + '</p>' +
      '<div><label class="block text-xs text-text-soft mb-1">Längd på cykeln</label>' +
      '<select class="custody-cycle-length w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]">' + lengthOpts + '</select></div>' +
      '<div class="custody-custom-weeks space-y-2">' + panels + '</div>' +
      '<p class="text-xs text-gold custody-anchor-snap hidden" role="status"></p>' +
      '</div>'
    );
  }

  function togglePatternFields(block) {
    const type = block.querySelector('.custody-pattern-type').value;
    const weeks = block.querySelector('.custody-fields-weeks');
    const weekends = block.querySelector('.custody-fields-weekends');
    const custom = block.querySelector('.custody-fields-custom');
    if (weeks) weeks.classList.toggle('hidden', type !== PATTERN_WEEKS);
    if (weekends) weekends.classList.toggle('hidden', type !== PATTERN_WEEKENDS);
    if (custom) custom.classList.toggle('hidden', type !== PATTERN_CUSTOM);
  }

  function readCustomWeeksFromDom(block) {
    const cycleLen = parseInt(block.querySelector('.custody-cycle-length').value, 10) || 1;
    const weeks = [];
    for (let w = 0; w < cycleLen; w += 1) {
      const row = {};
      CYCLE_DAY_KEYS.forEach(function (dayKey) {
        const sel = block.querySelector(
          '.custody-custom-day[data-week="' + w + '"][data-day="' + dayKey + '"]'
        );
        row[dayKey] = sel ? sel.value : '';
      });
      weeks.push(row);
    }
    return weeks;
  }

  function syncCustomWeekVisibility(block) {
    const cycleLen = parseInt(block.querySelector('.custody-cycle-length').value, 10) || 1;
    block.querySelectorAll('.custody-custom-week').forEach(function (panel) {
      const idx = parseInt(panel.getAttribute('data-week-index'), 10);
      panel.classList.toggle('hidden', idx >= cycleLen);
    });
  }

  function ensureCustomWeekPanels(block, homes) {
    const container = block.querySelector('.custody-custom-weeks');
    const cycleLen = parseInt(block.querySelector('.custody-cycle-length').value, 10) || 1;
    const existing = readCustomWeeksFromDom(block);
    const weeks = existing.slice(0, cycleLen);
    while (weeks.length < cycleLen) {
      weeks.push(defaultCycleWeek(homes, weeks.length % 2 === 0 ? homes[0]?.id : homes[1]?.id));
    }
    container.innerHTML = weeks.map(function (weekRow, i) {
      return customWeekPanelHtml(i, weekRow, homes, true);
    }).join('');
    bindCustomDaySelects(block, homes);
    syncCustomWeekVisibility(block);
  }

  function updateSwatchForSelect(select) {
    const opt = select.options[select.selectedIndex];
    const color = opt ? opt.getAttribute('data-color') : null;
    const label = opt ? opt.textContent.trim() : '';
    const row = select.closest('.flex');
    if (!row) return;
    const swatch = row.querySelector('.custody-home-swatch');
    if (swatch && color) swatch.style.backgroundColor = color;
    const markerLabel = row.querySelector('.custody-home-marker span:last-child');
    if (markerLabel && label) markerLabel.textContent = label;
  }

  function bindCustomDaySelects(block, homes) {
    block.querySelectorAll('.custody-custom-day').forEach(function (sel) {
      updateSwatchForSelect(sel);
      sel.addEventListener('change', function () { updateSwatchForSelect(sel); });
    });
  }

  function snapAnchorField(block) {
    const input = block.querySelector('.custody-anchor');
    const note = block.querySelector('.custody-anchor-snap');
    if (!input || !input.value) return;
    const type = block.querySelector('.custody-pattern-type').value;
    if (type !== PATTERN_CUSTOM) return;

    const monday = mondayOfWeek(input.value);
    if (monday !== input.value) {
      input.value = monday;
      if (note) {
        note.textContent = ANCHOR_SNAP_TEXT;
        note.classList.remove('hidden');
      }
    } else if (note) {
      note.classList.add('hidden');
    }
  }

  function formatOverrideRange(start, end) {
    if (start === end) return start;
    return start + ' – ' + end;
  }

  function previewSectionHtml() {
    return (
      '<div class="custody-preview-section space-y-2 mt-3 border-t border-lavender/50 pt-3">' +
      '<h4 class="text-xs font-semibold text-navy dark:text-white">Kommande 4 veckor</h4>' +
      '<p class="text-xs text-text-soft leading-relaxed">Från denna veckas måndag — inklusive undantag.</p>' +
      '<div class="custody-preview-grid text-xs text-text-soft" aria-live="polite">Laddar…</div>' +
      '</div>'
    );
  }

  function previewGridHtml(days) {
    if (!days || !days.length) {
      return '<p class="text-text-soft">Ingen förhandsvisning tillgänglig.</p>';
    }
    const header =
      '<div class="grid grid-cols-7 gap-0.5 mb-1 text-[10px] text-text-soft text-center">' +
      CYCLE_DAY_KEYS.map(function (k) { return '<span>' + CYCLE_DAY_LABELS[k] + '</span>'; }).join('') +
      '</div>';
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    const previewCell = a11y() && a11y().previewCellHtml;
    const rows = weeks.map(function (weekDays, wi) {
      const cells = weekDays.map(function (day) {
        if (previewCell) {
          return previewCell(day.activeHome, {
            esc: escapeHtml,
            isOverride: day.source === 'override',
            isParentDay: day.isParentDay,
          });
        }
        const home = day.activeHome;
        if (!home) {
          return '<span class="block aspect-square rounded bg-lavender/30" title="—"></span>';
        }
        const initial = escapeHtml((home.label || '?').charAt(0));
        return (
          '<span class="block aspect-square rounded flex items-center justify-center text-[10px] text-white" ' +
          'style="background:' + escapeHtml(home.color || '#4F46E5') + ';" ' +
          'title="' + escapeHtml(home.label) + '" aria-label="' + escapeHtml(home.label) + '">' +
          initial + '</span>'
        );
      }).join('');
      return (
        '<div class="custody-preview-week" data-week-index="' + wi + '">' +
        '<div class="grid grid-cols-7 gap-0.5">' + cells + '</div></div>'
      );
    }).join('');
    return header + '<div class="space-y-1">' + rows + '</div>';
  }

  async function loadPreviewForBlock(block, childId) {
    const grid = block.querySelector('.custody-preview-grid');
    if (!grid) return;
    const range = previewRangeFromToday();
    grid.textContent = 'Laddar…';
    try {
      const data = await Auth.api(
        '/api/family/custody/context-range?childId=' + encodeURIComponent(childId) +
        '&from=' + encodeURIComponent(range.from) +
        '&to=' + encodeURIComponent(range.to)
      );
      if (!data.active || !data.days || !data.days.length) {
        grid.innerHTML = '<p class="text-text-soft">Aktivera mönster för att se förhandsvisning.</p>';
        return;
      }
      grid.innerHTML = previewGridHtml(data.days);
    } catch (err) {
      grid.innerHTML = '<p class="text-text-soft">Kunde inte ladda förhandsvisning.</p>';
      console.warn('[custody-settings] preview', err.message);
    }
  }

  function overrideListHtml(overrides, homes) {
    if (!overrides.length) {
      return '<p class="text-xs text-text-soft custody-override-empty">Inga undantag ännu.</p>';
    }
    const marker = a11y() && a11y().homeMarkerHtml;
    return overrides.map(function (o) {
      const home = homeById(homes, o.home_id);
      const homeMark = marker ? marker(home, escapeHtml) : (
        '<span class="truncate">' + escapeHtml(home.label) + '</span>'
      );
      return (
        '<div class="flex flex-wrap items-center gap-2 custody-override-row text-sm" data-override-id="' + o.id + '">' +
        homeMark +
        '<span class="text-text-soft">' + escapeHtml(formatOverrideRange(o.start_date, o.end_date)) + '</span>' +
        (o.reason ? '<span class="text-text-soft truncate max-w-[10rem]">' + escapeHtml(o.reason) + '</span>' : '') +
        '<button type="button" class="custody-override-delete text-red-600 text-xs min-h-[44px] px-2 ml-auto">Ta bort</button>' +
        '</div>'
      );
    }).join('');
  }

  function overrideSectionHtml(overrides, homes) {
    return (
      '<div class="custody-overrides-section space-y-2 mt-3 border-t border-lavender/50 pt-3">' +
      '<h4 class="text-xs font-semibold text-navy dark:text-white">Undantag</h4>' +
      '<p class="text-xs text-text-soft leading-relaxed">När verkligheten avviker — lov, resor eller enstaka byte. Grundschemat ändras inte.</p>' +
      '<div class="custody-override-list space-y-1">' + overrideListHtml(overrides, homes) + '</div>' +
      '<div class="custody-override-form space-y-2">' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-text-soft">Från</label>' +
      '<input type="date" class="custody-override-start w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]" /></div>' +
      '<div><label class="text-xs text-text-soft">Till</label>' +
      '<input type="date" class="custody-override-end w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]" /></div>' +
      '</div>' +
      '<div><label class="text-xs text-text-soft">Hem under perioden</label>' +
      '<select class="custody-override-home w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]">' +
      homeOptions(homes) +
      '</select></div>' +
      '<div><label class="text-xs text-text-soft">Orsak (valfritt)</label>' +
      '<input type="text" class="custody-override-reason w-full border rounded-lg px-2 py-2 text-sm" maxlength="280" placeholder="t.ex. Sportlov" /></div>' +
      '<button type="button" class="custody-override-add px-3 py-2 bg-lavender text-navy rounded-lg text-sm font-semibold min-h-[44px]">Lägg till undantag</button>' +
      '</div></div>'
    );
  }

  function validateCustomBeforeSave(cycleWeeks) {
    const homeIds = new Set();
    for (let w = 0; w < cycleWeeks.length; w += 1) {
      for (let d = 0; d < CYCLE_DAY_KEYS.length; d += 1) {
        const dayKey = CYCLE_DAY_KEYS[d];
        const id = cycleWeeks[w][dayKey];
        if (!id) {
          return 'Välj hem för alla dagar i vecka ' + (w + 1) + ' (' + CYCLE_DAY_LABELS[dayKey] + ').';
        }
        homeIds.add(id);
      }
    }
    if (homeIds.size < 2) {
      return 'Eget mönster behöver minst två olika hem. Stäng av boendeschema om barnet alltid bor på samma ställe.';
    }
    return null;
  }

  function childBlockHtml(c, pat, homes, childOverrides) {
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
      '<select class="custody-pattern-type w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]">' +
      '<option value="' + PATTERN_WEEKS + '"' + (patternType === PATTERN_WEEKS ? ' selected' : '') + '>Varannan vecka</option>' +
      '<option value="' + PATTERN_WEEKENDS + '"' + (patternType === PATTERN_WEEKENDS ? ' selected' : '') + '>Varannan helg (fre–sön)</option>' +
      '<option value="' + PATTERN_CUSTOM + '"' + (patternType === PATTERN_CUSTOM ? ' selected' : '') + '>Eget mönster</option>' +
      '</select></div>' +
      '<label class="block text-xs text-text-soft">Ankardatum (första måndagen i cykeln)</label>' +
      '<input type="date" class="custody-anchor w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]" value="' + anchor + '" />' +
      '<div class="custody-fields-weeks space-y-2 ' + (patternType === PATTERN_WEEKS ? '' : 'hidden') + '">' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-text-soft">Hem period 1</label>' +
      '<select class="custody-week-a w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]">' + opts + '</select></div>' +
      '<div><label class="text-xs text-text-soft">Hem period 2</label>' +
      '<select class="custody-week-b w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]">' + opts + '</select></div>' +
      '</div></div>' +
      '<div class="custody-fields-weekends space-y-2 ' + (patternType === PATTERN_WEEKENDS ? '' : 'hidden') + '">' +
      '<div><label class="text-xs text-text-soft">Bashem vardagar (mån–tors)</label>' +
      '<select class="custody-default-home w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]">' + opts + '</select></div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-text-soft">Helg hem A</label>' +
      '<select class="custody-week-a w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]">' + opts + '</select></div>' +
      '<div><label class="text-xs text-text-soft">Helg hem B</label>' +
      '<select class="custody-week-b w-full border rounded-lg px-2 py-2 text-sm min-h-[44px]">' + opts + '</select></div>' +
      '</div></div>' +
      customFieldsHtml(pat, homes) +
      (enabled ? previewSectionHtml() : '') +
      (enabled ? overrideSectionHtml(childOverrides || [], homes) : '') +
      '</div></div>'
    );
  }

  function bindChildBlock(block, pat, homes) {
    const homeA = pat ? pat.week_a_home_id : homes[0]?.id;
    const homeB = pat ? pat.week_b_home_id : homes[1]?.id;
    const defaultHome = defaultHomeFromPat(pat) || homeA;

    block.querySelectorAll('.custody-week-a').forEach(function (s) { if (homeA) s.value = homeA; });
    block.querySelectorAll('.custody-week-b').forEach(function (s) { if (homeB) s.value = homeB; });
    const defSel = block.querySelector('.custody-default-home');
    if (defSel && defaultHome) defSel.value = defaultHome;

    const typeSel = block.querySelector('.custody-pattern-type');
    if (typeSel) {
      typeSel.addEventListener('change', function () {
        togglePatternFields(block);
        if (typeSel.value === PATTERN_CUSTOM) {
          snapAnchorField(block);
        }
      });
    }

    const anchorInput = block.querySelector('.custody-anchor');
    if (anchorInput) {
      anchorInput.addEventListener('change', function () { snapAnchorField(block); });
    }

    const cycleLenSel = block.querySelector('.custody-cycle-length');
    if (cycleLenSel) {
      cycleLenSel.addEventListener('change', function () {
        ensureCustomWeekPanels(block, homes);
      });
    }

    bindCustomDaySelects(block, homes);
    togglePatternFields(block);
    bindOverrides(block, block.getAttribute('data-child-id'), homes);
    if (pat) {
      loadPreviewForBlock(block, block.getAttribute('data-child-id'));
    }
  }

  function bindOverrides(block, childId, homes) {
    const addBtn = block.querySelector('.custody-override-add');
    if (!addBtn) return;

    addBtn.addEventListener('click', async function () {
      const startEl = block.querySelector('.custody-override-start');
      const endEl = block.querySelector('.custody-override-end');
      const homeEl = block.querySelector('.custody-override-home');
      const reasonEl = block.querySelector('.custody-override-reason');
      const start = startEl ? startEl.value : '';
      const end = endEl ? endEl.value : '';
      const homeId = homeEl ? homeEl.value : '';
      if (!start || !end || !homeId) {
        showToast('Fyll i datum och hem för undantaget', true);
        return;
      }
      if (start > end) {
        showToast('Startdatum får inte vara efter slutdatum', true);
        return;
      }
      try {
        await Auth.api('/api/family/custody/overrides/' + childId, {
          method: 'POST',
          body: JSON.stringify({
            start_date: start,
            end_date: end,
            home_id: homeId,
            reason: reasonEl && reasonEl.value.trim() ? reasonEl.value.trim() : undefined,
          }),
        });
        track('custody_override_created', { child_id: childId });
        if (startEl) startEl.value = '';
        if (endEl) endEl.value = '';
        if (reasonEl) reasonEl.value = '';
        await load();
      } catch (err) {
        showToast('Kunde inte lägga till undantag: ' + (err.message || 'fel'), true);
      }
    });

    block.querySelectorAll('.custody-override-delete').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const row = btn.closest('.custody-override-row');
        const overrideId = row ? row.getAttribute('data-override-id') : null;
        if (!overrideId) return;
        try {
          await Auth.api('/api/family/custody/overrides/' + childId + '/' + overrideId, {
            method: 'DELETE',
          });
          track('custody_override_deleted', { child_id: childId, override_id: overrideId });
          await load();
        } catch (err) {
          showToast('Kunde inte ta bort undantag: ' + (err.message || 'fel'), true);
        }
      });
    });
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
    const overrides = _config.overrides || [];
    const children = (window.familyChildren || []);

    if (homes.length < 2) {
      body.innerHTML =
        '<p class="text-sm text-text-soft mb-3">Boendeschema hjälper dig hålla reda på vilket hem barnet är på — med hemnamn och färger, inte vecka A/B.</p>' +
        '<button type="button" id="custodySetupBtn" class="px-4 py-2 bg-gold text-white rounded-lg font-semibold text-sm min-h-[44px]">Kom igång med boendeschema</button>';
      el('custodySetupBtn').addEventListener('click', runSetup);
      return;
    }

    const homeOpts = homeOptions(homes);
    const parentRows = parents.map(function (p) {
      const mapped = (_config.parentHomes || []).find(function (m) { return m.parent_id === p.id; });
      return (
        '<div class="flex flex-wrap items-center gap-2 text-sm">' +
        '<span class="min-w-[8rem] text-navy dark:text-white">' + escapeHtml(p.name || p.email) + '</span>' +
        '<select class="custody-parent-home border rounded-lg px-2 py-1">' +
        '<option value="">—</option>' + homeOpts +
        '</select></div>'
      );
    }).join('');

    const childBlocks = children.map(function (c) {
      const pat = patterns.find(function (p) { return p.child_id === c.id; });
      const childOverrides = overrides.filter(function (o) { return o.child_id === c.id; });
      return childBlockHtml(c, pat, homes, childOverrides);
    }).join('');

    body.innerHTML =
      '<p class="text-sm text-text-soft">Etikett och färg per hem. Välj mönster per barn — varannan vecka, varannan helg eller eget mönster.</p>' +
      '<div class="space-y-3 mt-3" id="custodyHomesEditor">' +
      homes.map(function (h) {
        const colorLabel = 'Färg för ' + (h.label || 'hem');
        return (
          '<div class="flex flex-wrap gap-2 items-center custody-home-row" data-home-id="' + h.id + '">' +
          '<label class="sr-only" for="custody-color-' + h.id + '">' + escapeHtml(colorLabel) + '</label>' +
          '<input type="color" id="custody-color-' + h.id + '" class="custody-color w-10 h-10 rounded border-0" value="' + h.color + '" aria-label="' + escapeHtml(colorLabel) + '" />' +
          '<label class="sr-only" for="custody-label-' + h.id + '">Namn på hem</label>' +
          '<input type="text" id="custody-label-' + h.id + '" class="custody-label flex-1 min-w-[8rem] border rounded-lg px-2 py-1 text-sm" value="' + escapeHtml(h.label) + '" maxlength="64" placeholder="Hemnamn" aria-label="Namn på hem" />' +
          '</div>'
        );
      }).join('') +
      '</div>' +
      '<div class="mt-4"><h4 class="text-sm font-semibold text-navy dark:text-white mb-2">Förälder ↔ hem</h4><div class="space-y-2">' + parentRows + '</div></div>' +
      '<div class="mt-4"><h4 class="text-sm font-semibold text-navy dark:text-white mb-2">Barn</h4><div class="space-y-3">' + (childBlocks || '<p class="text-sm text-text-soft">Lägg till ett barn först.</p>') + '</div></div>' +
      '<button type="button" id="custodySaveBtn" class="mt-4 px-4 py-2 bg-navy text-white rounded-lg font-semibold text-sm min-h-[44px]">Spara boendeschema</button>' +
      '<p id="custodySaveMsg" class="mt-2 text-sm text-gold font-medium hidden"></p>';

    parents.forEach(function (p) {
      const mapped = (_config.parentHomes || []).find(function (m) { return m.parent_id === p.id; });
      const sel = document.querySelector('.custody-parent-home[data-parent-id="' + p.id + '"]');
      if (sel && mapped) sel.value = mapped.custody_home_id;
    });
    document.querySelectorAll('.custody-parent-home').forEach(function (sel, idx) {
      const p = parents[idx];
      if (!p) return;
      sel.setAttribute('data-parent-id', p.id);
      const mapped = (_config.parentHomes || []).find(function (m) { return m.parent_id === p.id; });
      if (mapped) sel.value = mapped.custody_home_id;
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
    const anchorDate = block.querySelector('.custody-anchor').value;

    if (patternType === PATTERN_CUSTOM) {
      snapAnchorField(block);
      const cycleWeeks = readCustomWeeksFromDom(block);
      const validationError = validateCustomBeforeSave(cycleWeeks);
      if (validationError) {
        throw new Error(validationError);
      }
      return {
        anchor_date: block.querySelector('.custody-anchor').value,
        pattern_type: PATTERN_CUSTOM,
        configuration: { cycle_weeks: cycleWeeks },
        clone_week_b: true,
      };
    }

    const visible = patternType === PATTERN_WEEKENDS
      ? block.querySelector('.custody-fields-weekends')
      : block.querySelector('.custody-fields-weeks');
    const weekA = visible.querySelector('.custody-week-a').value;
    const weekB = visible.querySelector('.custody-week-b').value;
    const payload = {
      anchor_date: anchorDate,
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
        let payload;
        try {
          payload = readPatternPayload(block);
        } catch (validationErr) {
          if (msg) msg.classList.add('hidden');
          showToast(validationErr.message || 'Kontrollera mönstret', true);
          return;
        }
        await Auth.api('/api/family/custody/pattern/' + childId, {
          method: 'PUT',
          body: JSON.stringify(payload),
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
