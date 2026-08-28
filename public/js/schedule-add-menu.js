/**
 * "+ Lägg till" — Phase 1B primary Weekly Schedule action (Aktivitet / Från mall / Kopiera dag)
 * plus the "Spara dagen som mall" day action.
 *
 * Reads globals from schedule.js (currentChildId, currentDay, allTemplates, loadTemplates,
 * loadScheduleForDay) the same way schedule-special-days.js / schedule-activity-modals.js do —
 * classic <script> tags on this page share one global lexical scope.
 *
 * Strangler pattern (§1B.13): this is an ADDITIVE new entry point. It does not replace or
 * modify the legacy "Fyll vecka" / day-header copy/delete buttons / assign-schedule / Library
 * copy dialog — those remain fully reachable.
 *
 * Multi-child decision (§1B.8, §15): this flow is single-child only, always operating on
 * `currentChildId` (the child already open in the editor). `applyScheduleSourceToTargets`
 * (multi-child) is not used here — it still lacks a promised cross-child atomicity contract
 * (see docs/schedule-canonical-architecture.md). No "Alla barn" option is exposed.
 */
(function () {
  'use strict';

  function t(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function escHtml(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]; // Monday-first display order (matches day tabs)
  const WEEKDAY_SET_ALL = new Set(WEEKDAYS);
  const WEEKDAY_SET_WEEKDAY = new Set([1, 2, 3, 4, 5]);
  const WEEKDAY_SET_WEEKEND = new Set([6, 0]);

  function dayLabel(dow) {
    return window.ScheduleCore ? ScheduleCore.dayShort(dow) : String(dow);
  }

  /**
   * Phase 1B custody hardening — "what the parent sees is what the parent edits". Every
   * canonical mutation below reads the SAME active custody home the Weekly Schedule editor
   * (schedule-custody.js) is currently showing, via its explicit accessor. Returns null when
   * custody is inactive (§12 — no custody_home_id is ever required for a non-custody child,
   * and no "choose home" step appears in this menu).
   */
  function activeCustodyHomeId() {
    return window.ScheduleCustody ? ScheduleCustody.getActiveHomeId() : null;
  }

  const opTracker = window.ScheduleApplyClient ? ScheduleApplyClient.createOperationTracker() : null;

  // ── Modal shell (one shared container, step-based) ─────────────────────────

  function ensureModal() {
    let modal = document.getElementById('scheduleAddMenuModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'scheduleAddMenuModal';
    modal.className = 'hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto" id="scheduleAddMenuBody"></div>`;
    modal.addEventListener('mousedown', (ev) => {
      if (ev.target === modal) closeAddMenu();
    });
    document.body.appendChild(modal);
    return modal;
  }

  function bodyEl() {
    ensureModal();
    return document.getElementById('scheduleAddMenuBody');
  }

  function showModal() {
    ensureModal().classList.remove('hidden');
  }

  function closeAddMenu() {
    const modal = document.getElementById('scheduleAddMenuModal');
    if (modal) modal.classList.add('hidden');
    if (opTracker) opTracker.reset();
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const modal = document.getElementById('scheduleAddMenuModal');
    if (modal && !modal.classList.contains('hidden')) closeAddMenu();
  });

  // 44x44 effective touch target on every interactive control below (min-h-11 = 44px @ 4px/unit).
  const TOUCH_BTN = 'min-h-[44px] min-w-[44px]';

  // ── Entry menu ───────────────────────────────────────────────────────────

  function openAddMenu() {
    if (!currentChildId) return;
    bodyEl().innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-heading font-bold text-navy">${t('schedule.addMenu.title')}</h3>
        <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex items-center justify-center text-text-soft hover:text-navy" aria-label="${t('schedule.addMenu.close')}">✕</button>
      </div>
      <div class="space-y-3">
        <button type="button" onclick="ScheduleAddMenu.openActivity()" class="${TOUCH_BTN} w-full text-left px-4 py-4 rounded-2xl border-2 border-lavender hover:border-gold transition-colors flex items-center gap-3">
          <span class="text-2xl" aria-hidden="true">📌</span>
          <span class="flex-1"><span class="block font-semibold text-navy">${t('schedule.addMenu.optionActivity')}</span><span class="block text-xs text-text-soft">${t('schedule.addMenu.optionActivityHint')}</span></span>
        </button>
        <button type="button" onclick="ScheduleAddMenu.openTemplate()" class="${TOUCH_BTN} w-full text-left px-4 py-4 rounded-2xl border-2 border-lavender hover:border-gold transition-colors flex items-center gap-3">
          <span class="text-2xl" aria-hidden="true">🗂️</span>
          <span class="flex-1"><span class="block font-semibold text-navy">${t('schedule.addMenu.optionTemplate')}</span><span class="block text-xs text-text-soft">${t('schedule.addMenu.optionTemplateHint')}</span></span>
        </button>
        <button type="button" onclick="ScheduleAddMenu.openCopyDay()" class="${TOUCH_BTN} w-full text-left px-4 py-4 rounded-2xl border-2 border-lavender hover:border-gold transition-colors flex items-center gap-3">
          <span class="text-2xl" aria-hidden="true">📋</span>
          <span class="flex-1"><span class="block font-semibold text-navy">${t('schedule.addMenu.optionCopyDay')}</span><span class="block text-xs text-text-soft">${t('schedule.addMenu.optionCopyDayHint')}</span></span>
        </button>
      </div>`;
    showModal();
  }

  // ── Shared UI fragments ──────────────────────────────────────────────────

  function renderWeekdayChips(selected, toggleFn) {
    return `
      <div class="flex gap-2 mb-2 flex-wrap">
        <button type="button" onclick="${toggleFn}(null,'all')" class="${TOUCH_BTN} px-3 py-2 rounded-xl text-xs font-semibold border-2 border-lavender hover:border-gold">${t('schedule.addMenu.weekdaysAll')}</button>
        <button type="button" onclick="${toggleFn}(null,'weekday')" class="${TOUCH_BTN} px-3 py-2 rounded-xl text-xs font-semibold border-2 border-lavender hover:border-gold">${t('schedule.addMenu.weekdaysWeekday')}</button>
        <button type="button" onclick="${toggleFn}(null,'weekend')" class="${TOUCH_BTN} px-3 py-2 rounded-xl text-xs font-semibold border-2 border-lavender hover:border-gold">${t('schedule.addMenu.weekdaysWeekend')}</button>
      </div>
      <div class="flex gap-2 flex-wrap" role="group" aria-label="${t('schedule.addMenu.weekdayPickerTitle')}">
        ${WEEKDAYS.map((dow) => {
          const active = selected.has(dow);
          return `<button type="button" onclick="${toggleFn}(${dow})" aria-pressed="${active}"
            class="${TOUCH_BTN} px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${active ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-lavender'}">
            ${active ? '✓ ' : ''}${dayLabel(dow)}
          </button>`;
        }).join('')}
      </div>`;
  }

  function renderModeSelector(selectedMode, changeFn) {
    const modes = [
      { key: 'merge', label: t('schedule.addMenu.mode.merge'), hint: t('schedule.addMenu.mode.mergeHint') },
      { key: 'replace_sections', label: t('schedule.addMenu.mode.replaceSections'), hint: t('schedule.addMenu.mode.replaceSectionsHint') },
      { key: 'replace_day', label: t('schedule.addMenu.mode.replaceDay'), hint: t('schedule.addMenu.mode.replaceDayHint') },
    ];
    return `
      <div class="space-y-2" role="radiogroup" aria-label="${t('schedule.addMenu.mode.merge')}">
        ${modes.map((m) => {
          const active = selectedMode === m.key;
          return `<button type="button" onclick="${changeFn}('${m.key}')" role="radio" aria-checked="${active}"
            class="${TOUCH_BTN} w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${active ? 'border-gold bg-lavender/40' : 'border-lavender'} ${m.key === 'replace_day' ? 'border-coral/60' : ''}">
            <span class="flex items-center gap-2 font-semibold text-sm text-navy">${active ? '●' : '○'} ${m.label}</span>
            <span class="block text-xs text-text-soft mt-0.5">${m.hint}</span>
          </button>`;
        }).join('')}
      </div>`;
  }

  /**
   * Destructive confirmation for replace_day (§7/§1B.3). Never rely on colour alone — explicit
   * text + explicit action labels (Ersätt / Avbryt), never a generic "OK".
   */
  function confirmReplaceDay(days, onConfirm) {
    const body = days.length === 1
      ? t('schedule.addMenu.confirmReplaceDay.bodyOne', { day: dayLabel(days[0]) })
      : t('schedule.addMenu.confirmReplaceDay.bodyMany');
    bodyEl().innerHTML = `
      <div class="text-center">
        <div class="text-4xl mb-2" aria-hidden="true">⚠️</div>
        <h3 class="text-lg font-heading font-bold text-navy mb-2">${t('schedule.addMenu.confirmReplaceDay.title')}</h3>
        <p class="text-sm text-text-soft mb-6">${escHtml(body)}</p>
        <div class="flex gap-3">
          <button type="button" id="samConfirmCancelBtn" class="${TOUCH_BTN} flex-1 px-4 py-3 border-2 border-lavender rounded-xl font-semibold text-sm">${t('schedule.addMenu.confirmReplaceDay.cancelBtn')}</button>
          <button type="button" id="samConfirmOkBtn" class="${TOUCH_BTN} flex-1 px-4 py-3 bg-coral hover:bg-red-300 text-navy rounded-xl font-semibold text-sm">${t('schedule.addMenu.confirmReplaceDay.confirmBtn')}</button>
        </div>
      </div>`;
    document.getElementById('samConfirmCancelBtn').onclick = () => onConfirm(false);
    document.getElementById('samConfirmOkBtn').onclick = () => onConfirm(true);
  }

  function setPending(btnId, pending) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = pending;
    btn.textContent = pending ? t('schedule.addMenu.saving') : t('schedule.addMenu.save');
  }

  function afterSuccessfulMutation() {
    if (typeof window.loadScheduleForDay === 'function' && currentChildId) {
      loadScheduleForDay();
    }
  }

  // ── 1) Aktivitet ─────────────────────────────────────────────────────────

  const activityState = { templateId: null, days: new Set([currentDay || 1]), section: 'dag', startTime: '', endTime: '', query: '' };

  async function openActivity() {
    activityState.templateId = null;
    activityState.days = new Set([currentDay || 1]);
    activityState.section = 'dag';
    activityState.startTime = '';
    activityState.endTime = '';
    activityState.query = '';
    if (!allTemplates || allTemplates.length === 0) {
      if (typeof window.loadTemplates === 'function') await loadTemplates();
    }
    renderActivityStep();
    showModal();
  }

  function renderActivityStep() {
    const templates = (allTemplates || []);
    const q = activityState.query.toLowerCase();
    const filtered = q ? templates.filter((tpl) => tpl.name && tpl.name.toLowerCase().includes(q)) : templates;
    const sections = window.ScheduleCore ? ScheduleCore.SECTIONS : [
      { key: 'morgon', emoji: '🌅' }, { key: 'dag', emoji: '☀️' }, { key: 'kvall', emoji: '🌆' }, { key: 'natt', emoji: '🌙' },
    ];

    bodyEl().innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <button type="button" onclick="ScheduleAddMenu.openMenu()" class="${TOUCH_BTN} text-text-soft hover:text-navy text-sm font-semibold">${t('schedule.addMenu.back')}</button>
        <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex items-center justify-center text-text-soft hover:text-navy" aria-label="${t('schedule.addMenu.close')}">✕</button>
      </div>
      <h3 class="text-lg font-heading font-bold text-navy mb-3">${t('schedule.addMenu.activity.title')}</h3>

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.activity.pickActivity')}</p>
      <input type="text" id="samActivitySearch" value="${escHtml(activityState.query)}" placeholder="${t('schedule.addMenu.activity.pickActivityPlaceholder')}"
        class="${TOUCH_BTN} w-full px-3 py-2 border-2 border-lavender rounded-xl text-sm mb-2" oninput="ScheduleAddMenu.filterActivity(this.value)" />
      <div class="max-h-40 overflow-y-auto space-y-1 mb-4" id="samActivityList">
        ${filtered.length === 0 ? `<p class="text-sm text-text-soft py-2">${t('schedule.addMenu.template.noneMine')}</p>` : filtered.map((tpl) => `
          <button type="button" onclick="ScheduleAddMenu.selectActivity('${tpl.id}')" class="${TOUCH_BTN} w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${activityState.templateId === tpl.id ? 'bg-sky border-2 border-gold' : 'border-2 border-transparent hover:bg-sky'}">
            <span class="text-xl" aria-hidden="true">${tpl.icon || '📌'}</span>
            <span class="font-semibold text-sm text-navy truncate">${escHtml(tpl.name)}</span>
          </button>`).join('')}
      </div>

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.activity.pickDays')}</p>
      <div class="mb-4">${renderWeekdayChips(activityState.days, 'ScheduleAddMenu.toggleActivityDay')}</div>

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.activity.pickSection')}</p>
      <div class="flex gap-2 flex-wrap mb-4">
        ${sections.map((s) => `<button type="button" onclick="ScheduleAddMenu.selectActivitySection('${s.key}')"
          class="${TOUCH_BTN} px-3 py-2 rounded-xl text-sm font-semibold border-2 ${activityState.section === s.key ? 'bg-navy text-white border-navy' : 'border-lavender text-navy'}">
          ${s.emoji || ''} ${window.ScheduleCore ? ScheduleCore.sectionName(s.key) : s.key}</button>`).join('')}
      </div>

      <details class="mb-4">
        <summary class="text-xs font-semibold text-navy uppercase tracking-wide cursor-pointer">${t('schedule.addMenu.activity.pickTime')}</summary>
        <div class="flex gap-2 mt-2">
          <input type="time" value="${activityState.startTime}" onchange="ScheduleAddMenu.setActivityTime('start', this.value)" class="${TOUCH_BTN} flex-1 px-2 py-2 border-2 border-lavender rounded-xl text-sm" />
          <input type="time" value="${activityState.endTime}" onchange="ScheduleAddMenu.setActivityTime('end', this.value)" class="${TOUCH_BTN} flex-1 px-2 py-2 border-2 border-lavender rounded-xl text-sm" />
        </div>
      </details>

      <p id="samActivityError" class="text-sm text-red-600 mb-2 hidden"></p>
      <div class="flex gap-3">
        <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex-1 px-4 py-3 border-2 border-lavender rounded-xl font-semibold text-sm">${t('schedule.addMenu.cancel')}</button>
        <button type="button" id="samActivitySaveBtn" onclick="ScheduleAddMenu.submitActivity()" class="${TOUCH_BTN} flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm">${t('schedule.addMenu.save')}</button>
      </div>`;
  }

  function filterActivity(q) { activityState.query = q; renderActivityStep(); document.getElementById('samActivitySearch').focus(); document.getElementById('samActivitySearch').selectionStart = document.getElementById('samActivitySearch').value.length; }
  function selectActivity(id) { activityState.templateId = id; renderActivityStep(); }
  function selectActivitySection(key) { activityState.section = key; renderActivityStep(); }
  function setActivityTime(which, val) { if (which === 'start') activityState.startTime = val; else activityState.endTime = val; }
  function toggleActivityDay(dow, shortcut) {
    if (shortcut === 'all') activityState.days = new Set(WEEKDAY_SET_ALL);
    else if (shortcut === 'weekday') activityState.days = new Set(WEEKDAY_SET_WEEKDAY);
    else if (shortcut === 'weekend') activityState.days = new Set(WEEKDAY_SET_WEEKEND);
    else if (activityState.days.has(dow)) activityState.days.delete(dow);
    else activityState.days.add(dow);
    renderActivityStep();
  }

  async function submitActivity() {
    const errEl = document.getElementById('samActivityError');
    errEl.classList.add('hidden');
    if (!activityState.templateId) {
      errEl.textContent = t('schedule.addMenu.activity.selectActivityFirst');
      errEl.classList.remove('hidden');
      return;
    }
    if (activityState.days.size === 0) {
      errEl.textContent = t('schedule.addMenu.selectAtLeastOneDay');
      errEl.classList.remove('hidden');
      return;
    }
    const days = [...activityState.days];
    const custodyHomeId = activeCustodyHomeId();
    const operationId = opTracker ? opTracker.forCommand({
      cmd: 'apply-activity', childId: currentChildId, activityTemplateId: activityState.templateId,
      days: [...days].sort(), section: activityState.section, startTime: activityState.startTime, endTime: activityState.endTime,
      custodyHomeId,
    }) : null;

    setPending('samActivitySaveBtn', true);
    const { ok, data } = await ScheduleApplyClient.applyActivity(currentChildId, {
      activityTemplateId: activityState.templateId, days, section: activityState.section,
      startTime: activityState.startTime || null, endTime: activityState.endTime || null, operationId, custodyHomeId,
    });
    setPending('samActivitySaveBtn', false);

    if (!ok) {
      errEl.textContent = (data && data.error) || t('schedule.addMenu.saveFailed');
      errEl.classList.remove('hidden');
      return;
    }
    const tpl = (allTemplates || []).find((x) => x.id === activityState.templateId);
    showToast(t('schedule.addMenu.activity.added', { name: tpl ? tpl.name : '', count: days.length }));
    closeAddMenu();
    afterSuccessfulMutation();
  }

  // ── 2) Från mall ─────────────────────────────────────────────────────────

  const templateState = { tab: 'mine', mine: [], standard: [], selected: null, days: new Set([currentDay || 1]), mode: 'merge' };

  async function openTemplate() {
    templateState.tab = 'mine';
    templateState.selected = null;
    templateState.days = new Set([currentDay || 1]);
    templateState.mode = 'merge';
    renderTemplateLoading();
    showModal();
    await loadTemplateLists();
    renderTemplateStep();
  }

  function renderTemplateLoading() {
    bodyEl().innerHTML = `<p class="text-sm text-text-soft py-8 text-center">${t('schedule.addMenu.template.loading')}</p>`;
  }

  async function loadTemplateLists() {
    try {
      const [mineRes, stdRes] = await Promise.all([
        window.apiFetch('/api/schedule-templates'),
        window.apiFetch('/api/standard-library/schedules'),
      ]);
      templateState.mine = mineRes.ok ? await mineRes.json() : [];
      templateState.standard = stdRes.ok ? await stdRes.json() : [];
    } catch {
      templateState.mine = [];
      templateState.standard = [];
    }
  }

  function switchTemplateTab(tab) { templateState.tab = tab; templateState.selected = null; renderTemplateStep(); }

  function renderTemplateStep() {
    const list = templateState.tab === 'mine' ? templateState.mine : templateState.standard;
    const emptyKey = templateState.tab === 'mine' ? 'schedule.addMenu.template.noneMine' : 'schedule.addMenu.template.noneStandard';

    bodyEl().innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <button type="button" onclick="ScheduleAddMenu.openMenu()" class="${TOUCH_BTN} text-text-soft hover:text-navy text-sm font-semibold">${t('schedule.addMenu.back')}</button>
        <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex items-center justify-center text-text-soft hover:text-navy" aria-label="${t('schedule.addMenu.close')}">✕</button>
      </div>
      <h3 class="text-lg font-heading font-bold text-navy mb-3">${t('schedule.addMenu.template.title')}</h3>

      <div class="flex gap-2 mb-3" role="tablist">
        <button type="button" role="tab" aria-selected="${templateState.tab === 'mine'}" onclick="ScheduleAddMenu.switchTemplateTab('mine')"
          class="${TOUCH_BTN} flex-1 px-3 py-2 rounded-xl text-sm font-semibold border-2 ${templateState.tab === 'mine' ? 'bg-navy text-white border-navy' : 'border-lavender text-navy'}">${t('schedule.addMenu.template.tabMine')}</button>
        <button type="button" role="tab" aria-selected="${templateState.tab === 'standard'}" onclick="ScheduleAddMenu.switchTemplateTab('standard')"
          class="${TOUCH_BTN} flex-1 px-3 py-2 rounded-xl text-sm font-semibold border-2 ${templateState.tab === 'standard' ? 'bg-navy text-white border-navy' : 'border-lavender text-navy'}">${t('schedule.addMenu.template.tabStandard')}</button>
      </div>

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.template.pickTemplate')}</p>
      <div class="max-h-40 overflow-y-auto space-y-1 mb-4">
        ${list.length === 0 ? `<p class="text-sm text-text-soft py-2">${t(emptyKey)}</p>` : list.map((item) => {
          const active = templateState.selected && templateState.selected.id === item.id;
          return `<button type="button" onclick="ScheduleAddMenu.selectTemplateItem('${item.id}')"
            class="${TOUCH_BTN} w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors ${active ? 'bg-sky border-2 border-gold' : 'border-2 border-transparent hover:bg-sky'}">
            <span class="font-semibold text-sm text-navy truncate">${escHtml(item.name)}</span>
            <span class="text-xs text-text-soft flex-shrink-0">${item.item_count != null ? item.item_count : ''}</span>
          </button>`;
        }).join('')}
      </div>

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.template.pickDays')}</p>
      <div class="mb-4">${renderWeekdayChips(templateState.days, 'ScheduleAddMenu.toggleTemplateDay')}</div>

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.template.pickMode')}</p>
      <div class="mb-4">${renderModeSelector(templateState.mode, 'ScheduleAddMenu.setTemplateMode')}</div>

      <p id="samTemplateError" class="text-sm text-red-600 mb-2 hidden"></p>
      <div class="flex gap-3">
        <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex-1 px-4 py-3 border-2 border-lavender rounded-xl font-semibold text-sm">${t('schedule.addMenu.cancel')}</button>
        <button type="button" id="samTemplateSaveBtn" onclick="ScheduleAddMenu.submitTemplate()" class="${TOUCH_BTN} flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm">${t('schedule.addMenu.save')}</button>
      </div>`;
  }

  function selectTemplateItem(id) {
    const list = templateState.tab === 'mine' ? templateState.mine : templateState.standard;
    templateState.selected = list.find((x) => x.id === id) || null;
    renderTemplateStep();
  }
  function toggleTemplateDay(dow, shortcut) {
    if (shortcut === 'all') templateState.days = new Set(WEEKDAY_SET_ALL);
    else if (shortcut === 'weekday') templateState.days = new Set(WEEKDAY_SET_WEEKDAY);
    else if (shortcut === 'weekend') templateState.days = new Set(WEEKDAY_SET_WEEKEND);
    else if (templateState.days.has(dow)) templateState.days.delete(dow);
    else templateState.days.add(dow);
    renderTemplateStep();
  }
  function setTemplateMode(mode) { templateState.mode = mode; renderTemplateStep(); }

  async function submitTemplate() {
    const errEl = document.getElementById('samTemplateError');
    errEl.classList.add('hidden');
    if (!templateState.selected) {
      errEl.textContent = t('schedule.addMenu.template.pickTemplate');
      errEl.classList.remove('hidden');
      return;
    }
    if (templateState.days.size === 0) {
      errEl.textContent = t('schedule.addMenu.selectAtLeastOneDay');
      errEl.classList.remove('hidden');
      return;
    }
    const days = [...templateState.days];
    if (templateState.mode === 'replace_day') {
      confirmReplaceDay(days, (confirmed) => {
        if (confirmed) doSubmitTemplate(days);
        else renderTemplateStep();
      });
      return;
    }
    await doSubmitTemplate(days);
  }

  async function doSubmitTemplate(days) {
    const sourceType = templateState.tab === 'mine' ? 'family_template' : 'standard_schedule';
    const custodyHomeId = activeCustodyHomeId();
    const operationId = opTracker ? opTracker.forCommand({
      cmd: 'apply-template', childId: currentChildId, sourceType, sourceId: templateState.selected.id,
      days: [...days].sort(), mode: templateState.mode, custodyHomeId,
    }) : null;

    setPending('samTemplateSaveBtn', true);
    const { ok, data } = await ScheduleApplyClient.applyTemplate(currentChildId, {
      sourceType, sourceId: templateState.selected.id, days, mode: templateState.mode, operationId, custodyHomeId,
    });
    setPending('samTemplateSaveBtn', false);

    if (!ok) {
      renderTemplateStep();
      const errEl = document.getElementById('samTemplateError');
      if (errEl) { errEl.textContent = (data && data.error) || t('schedule.addMenu.saveFailed'); errEl.classList.remove('hidden'); }
      return;
    }
    showToast(t('schedule.addMenu.template.applied', { name: templateState.selected.name, count: days.length }));
    closeAddMenu();
    afterSuccessfulMutation();
  }

  // ── 3) Kopiera dag ───────────────────────────────────────────────────────

  const copyDayState = { sourceDay: currentDay || 1, targetDays: new Set(), mode: 'merge' };

  function openCopyDay() {
    copyDayState.sourceDay = currentDay || 1;
    copyDayState.targetDays = new Set();
    copyDayState.mode = 'merge';
    renderCopyDayStep();
    showModal();
  }

  function renderCopyDayStep() {
    bodyEl().innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <button type="button" onclick="ScheduleAddMenu.openMenu()" class="${TOUCH_BTN} text-text-soft hover:text-navy text-sm font-semibold">${t('schedule.addMenu.back')}</button>
        <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex items-center justify-center text-text-soft hover:text-navy" aria-label="${t('schedule.addMenu.close')}">✕</button>
      </div>
      <h3 class="text-lg font-heading font-bold text-navy mb-3">${t('schedule.addMenu.copyDay.title')}</h3>

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.copyDay.pickSourceDay')}</p>
      <div class="flex gap-2 flex-wrap mb-4">
        ${WEEKDAYS.map((dow) => `<button type="button" onclick="ScheduleAddMenu.setCopyDaySource(${dow})"
          class="${TOUCH_BTN} px-3 py-2 rounded-xl text-sm font-semibold border-2 ${copyDayState.sourceDay === dow ? 'bg-navy text-white border-navy' : 'border-lavender text-navy'}">${dayLabel(dow)}</button>`).join('')}
      </div>

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.copyDay.pickTargetDays')}</p>
      <div class="mb-1">${renderWeekdayChips(copyDayState.targetDays, 'ScheduleAddMenu.toggleCopyDayTarget')}</div>
      ${copyDayState.targetDays.has(copyDayState.sourceDay) ? `<p class="text-xs text-amber-700 mb-3">${t('schedule.addMenu.copyDay.sourceEqualsTargetWarning')}</p>` : '<div class="mb-4"></div>'}

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.copyDay.pickMode')}</p>
      <div class="mb-4">${renderModeSelector(copyDayState.mode, 'ScheduleAddMenu.setCopyDayMode')}</div>

      <p id="samCopyDayError" class="text-sm text-red-600 mb-2 hidden"></p>
      <div class="flex gap-3">
        <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex-1 px-4 py-3 border-2 border-lavender rounded-xl font-semibold text-sm">${t('schedule.addMenu.cancel')}</button>
        <button type="button" id="samCopyDaySaveBtn" onclick="ScheduleAddMenu.submitCopyDay()" class="${TOUCH_BTN} flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm">${t('schedule.addMenu.save')}</button>
      </div>`;
  }

  function setCopyDaySource(dow) { copyDayState.sourceDay = dow; renderCopyDayStep(); }
  function setCopyDayMode(mode) { copyDayState.mode = mode; renderCopyDayStep(); }
  function toggleCopyDayTarget(dow, shortcut) {
    if (shortcut === 'all') copyDayState.targetDays = new Set(WEEKDAY_SET_ALL);
    else if (shortcut === 'weekday') copyDayState.targetDays = new Set(WEEKDAY_SET_WEEKDAY);
    else if (shortcut === 'weekend') copyDayState.targetDays = new Set(WEEKDAY_SET_WEEKEND);
    else if (copyDayState.targetDays.has(dow)) copyDayState.targetDays.delete(dow);
    else copyDayState.targetDays.add(dow);
    renderCopyDayStep();
  }

  async function submitCopyDay() {
    const errEl = document.getElementById('samCopyDayError');
    errEl.classList.add('hidden');
    // Source day is never a valid target — it would be a same-day "copy to itself", never
    // modifying the source (the source is read-only regardless), so simply exclude it.
    const targetDays = [...copyDayState.targetDays].filter((d) => d !== copyDayState.sourceDay);
    if (targetDays.length === 0) {
      errEl.textContent = t('schedule.addMenu.selectAtLeastOneDay');
      errEl.classList.remove('hidden');
      return;
    }
    if (copyDayState.mode === 'replace_day') {
      confirmReplaceDay(targetDays, (confirmed) => {
        if (confirmed) doSubmitCopyDay(targetDays);
        else renderCopyDayStep();
      });
      return;
    }
    await doSubmitCopyDay(targetDays);
  }

  async function doSubmitCopyDay(targetDays) {
    const custodyHomeId = activeCustodyHomeId();
    const operationId = opTracker ? opTracker.forCommand({
      cmd: 'copy-day', childId: currentChildId, sourceDay: copyDayState.sourceDay,
      targetDays: [...targetDays].sort(), mode: copyDayState.mode, custodyHomeId,
    }) : null;

    setPending('samCopyDaySaveBtn', true);
    const { ok, data } = await ScheduleApplyClient.copyDay(currentChildId, {
      sourceDayOfWeek: copyDayState.sourceDay, targetDays, mode: copyDayState.mode, operationId, custodyHomeId,
    });
    setPending('samCopyDaySaveBtn', false);

    if (!ok) {
      renderCopyDayStep();
      const err = document.getElementById('samCopyDayError');
      if (err) { err.textContent = (data && data.error) || t('schedule.addMenu.saveFailed'); err.classList.remove('hidden'); }
      return;
    }
    showToast(t('schedule.addMenu.copyDay.copied', { count: targetDays.length }));
    closeAddMenu();
    afterSuccessfulMutation();
  }

  // ── 4) Spara dagen som mall (day action, §1B.5/§1B.10) ──────────────────

  function openSaveAsTemplate() {
    if (!currentChildId) return;
    bodyEl().innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-heading font-bold text-navy">${t('schedule.addMenu.saveAsTemplate.title')}</h3>
        <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex items-center justify-center text-text-soft hover:text-navy" aria-label="${t('schedule.addMenu.close')}">✕</button>
      </div>
      <p class="text-xs text-text-soft mb-4">${escHtml(t('schedule.addMenu.saveAsTemplate.hint', { day: dayLabel(currentDay || 1) }))}</p>
      <label class="block text-xs font-semibold text-navy uppercase tracking-wide mb-2" for="samTemplateNameInput">${t('schedule.addMenu.saveAsTemplate.nameLabel')}</label>
      <input type="text" id="samTemplateNameInput" placeholder="${t('schedule.addMenu.saveAsTemplate.namePlaceholder')}" class="${TOUCH_BTN} w-full px-3 py-2 border-2 border-lavender rounded-xl text-sm mb-4" />
      <p id="samSaveTemplateError" class="text-sm text-red-600 mb-2 hidden"></p>
      <div class="flex gap-3">
        <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex-1 px-4 py-3 border-2 border-lavender rounded-xl font-semibold text-sm">${t('schedule.addMenu.cancel')}</button>
        <button type="button" id="samSaveTemplateBtn" onclick="ScheduleAddMenu.submitSaveAsTemplate()" class="${TOUCH_BTN} flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm">${t('schedule.addMenu.save')}</button>
      </div>`;
    showModal();
    setTimeout(() => document.getElementById('samTemplateNameInput')?.focus(), 50);
  }

  async function submitSaveAsTemplate() {
    const nameInput = document.getElementById('samTemplateNameInput');
    const errEl = document.getElementById('samSaveTemplateError');
    errEl.classList.add('hidden');
    const name = (nameInput.value || '').trim();
    if (!name) {
      errEl.textContent = t('schedule.addMenu.saveAsTemplate.nameRequired');
      errEl.classList.remove('hidden');
      return;
    }
    const custodyHomeId = activeCustodyHomeId();
    const operationId = opTracker ? opTracker.forCommand({
      cmd: 'save-as-template', childId: currentChildId, dayOfWeek: currentDay, templateName: name, custodyHomeId,
    }) : null;

    setPending('samSaveTemplateBtn', true);
    const { ok, data } = await ScheduleApplyClient.saveDayAsTemplate(currentChildId, {
      dayOfWeek: currentDay, templateName: name, operationId, custodyHomeId,
    });
    setPending('samSaveTemplateBtn', false);

    if (!ok) {
      errEl.textContent = (data && data.error) || t('schedule.addMenu.saveFailed');
      errEl.classList.remove('hidden');
      return;
    }
    showToast(t('schedule.addMenu.saveAsTemplate.saved', { name }));
    closeAddMenu();
  }

  // ── Public API + entry-button visibility sync ───────────────────────────

  window.ScheduleAddMenu = {
    open: openAddMenu,
    openMenu: openAddMenu,
    close: closeAddMenu,
    openActivity,
    filterActivity,
    selectActivity,
    selectActivitySection,
    setActivityTime,
    toggleActivityDay,
    submitActivity,
    openTemplate,
    switchTemplateTab,
    selectTemplateItem,
    toggleTemplateDay,
    setTemplateMode,
    submitTemplate,
    openCopyDay,
    setCopyDaySource,
    setCopyDayMode,
    toggleCopyDayTarget,
    submitCopyDay,
    openSaveAsTemplate,
    submitSaveAsTemplate,
  };

  /**
   * Mirrors the visibility of the existing "Fyll vecka" button (already tied to the correct
   * "is a single child's week editor currently shown" state via schedule.js/schedule-cal-nav.js)
   * rather than duplicating that visibility logic here.
   */
  function syncAddMenuButtonVisibility() {
    const fwBtn = document.getElementById('fillWeekBtn');
    const addBtn = document.getElementById('scheduleAddMenuBtn');
    if (!fwBtn || !addBtn) return;
    addBtn.classList.toggle('hidden', fwBtn.classList.contains('hidden'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const fwBtn = document.getElementById('fillWeekBtn');
    if (fwBtn) {
      new MutationObserver(syncAddMenuButtonVisibility).observe(fwBtn, { attributes: true, attributeFilter: ['class'] });
    }
    syncAddMenuButtonVisibility();
  });
})();
