/**
 * "+ Lägg till" — Phase 1B primary Weekly Schedule action (Aktivitet / Från mall / Kopiera dag)
 * plus the "Spara dagen som mall" day action.
 *
 * "+ Skapa" opens the library activity editor and returns to this day. The schedule
 * does not mint activity templates. Picking an existing activity and Save still applies
 * it here, including an exact name match. Rapid Entry of existing activities stays:
 * overlapping Save taps coalesce, a distinct next activity can queue, Save stays
 * visibly disabled while in flight, and failures stay explicit. A normal Save closes the
 * dialog and refreshes the day list. The dialog stays open for another existing activity
 * only when the parent chooses "Lägg till en till" (days/section/time preserved).
 * Template and Copy Day still close on success — do not change closeAddMenu() globally.
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
  let activitySubmitInFlight = false;
  let inFlightSnapshot = null;
  const activitySubmitQueue = [];
  let activityContextChildId = null;
  let nextEntryFocusGuard = null;

  function clearActivitySubmitQueue() {
    activitySubmitQueue.length = 0;
    inFlightSnapshot = null;
    activitySubmitInFlight = false;
  }

  function stopNextEntryFocusGuard() {
    if (!nextEntryFocusGuard) return;
    nextEntryFocusGuard.disconnect();
    nextEntryFocusGuard = null;
  }

  function startNextEntryFocusGuard() {
    stopNextEntryFocusGuard();
    const content = document.getElementById('scheduleContent');
    if (!content || typeof MutationObserver === 'undefined') return;
    nextEntryFocusGuard = new MutationObserver(() => {
      const modal = document.getElementById('scheduleAddMenuModal');
      if (!modal || modal.classList.contains('hidden')) {
        stopNextEntryFocusGuard();
        return;
      }
      const search = document.getElementById('samActivitySearch');
      if (!search) return;
      const active = document.activeElement;
      if (active === search) return;
      const saveBtn = document.getElementById('samActivitySaveBtn');
      const activeInModal = modal.contains(active);
      if (activeInModal && active !== saveBtn) return;
      restoreSearchFocus();
    });
    nextEntryFocusGuard.observe(content, { childList: true, subtree: true });
  }

  // ── Modal shell (one shared container, step-based) ─────────────────────────

  function ensureModal() {
    let modal = document.getElementById('scheduleAddMenuModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'scheduleAddMenuModal';
    modal.className = 'sam-add-modal hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4';
    modal.setAttribute('data-overlay', 'modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'scheduleAddMenuTitle');
    modal.innerHTML = `
      <div class="schedule-menu-surface rounded-2xl max-w-md w-full shadow-xl" id="scheduleAddMenuPanel">
        <div class="p-6" id="scheduleAddMenuBody"></div>
      </div>`;
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
    stopNextEntryFocusGuard();
    const modal = document.getElementById('scheduleAddMenuModal');
    if (modal) modal.classList.add('hidden');
    clearActivitySubmitQueue();
    activityContextChildId = null;
    if (opTracker) opTracker.reset();
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const modal = document.getElementById('scheduleAddMenuModal');
    if (modal && !modal.classList.contains('hidden')) closeAddMenu();
  });

  // 44x44 effective touch target on every interactive control below (min-h-11 = 44px @ 4px/unit).
  const TOUCH_BTN = 'min-h-[44px] min-w-[44px]';

  function normalizeActivityName(name) {
    return String(name == null ? '' : name).trim();
  }

  function activityNameKey(name) {
    return normalizeActivityName(name).toLowerCase();
  }

  function findExactActivityMatch(templates, query) {
    const key = activityNameKey(query);
    if (!key) return null;
    return (templates || []).find((tpl) => tpl.name && activityNameKey(tpl.name) === key) || null;
  }

  function shouldShowCreateRow(query, templates) {
    const name = normalizeActivityName(query);
    if (!name) return false;
    return !findExactActivityMatch(templates, name);
  }

  // ── Entry menu ───────────────────────────────────────────────────────────

  function openAddMenu() {
    if (!currentChildId) return;
    bodyEl().innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 id="scheduleAddMenuTitle" class="text-xl font-heading font-bold text-navy">${t('schedule.addMenu.title')}</h3>
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

  function setsEqual(selected, preset) {
    if (!selected || !preset || selected.size !== preset.size) return false;
    for (const day of preset) if (!selected.has(day)) return false;
    return true;
  }

  function choiceClass(active) {
    return active ? 'schedule-choice-selected' : 'border-lavender text-navy';
  }

  function presetButtons(selected, toggleFn) {
    const presets = [
      { key: 'all', label: t('schedule.addMenu.weekdaysAll'), set: WEEKDAY_SET_ALL },
      { key: 'weekday', label: t('schedule.addMenu.weekdaysWeekday'), set: WEEKDAY_SET_WEEKDAY },
      { key: 'weekend', label: t('schedule.addMenu.weekdaysWeekend'), set: WEEKDAY_SET_WEEKEND },
    ];
    return presets.map((preset) => {
      const active = setsEqual(selected, preset.set);
      return `<button type="button" onclick="${toggleFn}(null,'${preset.key}')" aria-pressed="${active}"
        class="${TOUCH_BTN} px-3 py-2 rounded-xl text-xs font-semibold border-2 ${choiceClass(active)}">
        ${active ? '✓ ' : ''}${preset.label}
      </button>`;
    }).join('');
  }

  function renderWeekdayChips(selected, toggleFn) {
    return `
      <div class="flex gap-2 mb-2 flex-wrap" role="group" aria-label="${t('schedule.addMenu.weekdayPickerTitle')}">
        ${presetButtons(selected, toggleFn)}
      </div>
      <div class="flex gap-2 flex-wrap" role="group" aria-label="${t('schedule.addMenu.weekdayPickerTitle')}">
        ${WEEKDAYS.map((dow) => {
          const active = selected.has(dow);
          return `<button type="button" onclick="${toggleFn}(${dow})" aria-pressed="${active}"
            class="${TOUCH_BTN} px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${choiceClass(active)}">
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
    btn.setAttribute('aria-busy', pending ? 'true' : 'false');
    btn.setAttribute('aria-disabled', pending ? 'true' : 'false');
    btn.textContent = pending ? t('schedule.addMenu.saving') : t('schedule.addMenu.save');
  }

  function afterSuccessfulMutation() {
    if (typeof window.loadScheduleForDay === 'function' && currentChildId) {
      return loadScheduleForDay();
    }
    return undefined;
  }

  // ── 1) Aktivitet ─────────────────────────────────────────────────────────

  const activityState = {
    templateId: null,
    days: new Set([currentDay || 1]),
    section: 'dag',
    startTime: '',
    endTime: '',
    query: '',
    dayKnown: false,
    sectionKnown: false,
    editContext: false,
  };

  function resetActivityCreateState() {
    activityState.templateId = null;
  }

  function resetActivityForNextEntry() {
    const days = activityState.days;
    const section = activityState.section;
    const startTime = activityState.startTime;
    const endTime = activityState.endTime;
    const dayKnown = activityState.dayKnown;
    const sectionKnown = activityState.sectionKnown;
    const editContext = activityState.editContext;
    resetActivityCreateState();
    activityState.query = '';
    activityState.days = days;
    activityState.section = section;
    activityState.startTime = startTime;
    activityState.endTime = endTime;
    activityState.dayKnown = dayKnown;
    activityState.sectionKnown = sectionKnown;
    activityState.editContext = editContext;
    if (opTracker) opTracker.reset();
  }

  async function openActivity() {
    if (!currentChildId) return;
    activityContextChildId = currentChildId;
    clearActivitySubmitQueue();
    resetActivityCreateState();
    activityState.days = new Set([currentDay || 1]);
    activityState.section = 'dag';
    activityState.startTime = '';
    activityState.endTime = '';
    activityState.query = '';
    activityState.dayKnown = false;
    activityState.sectionKnown = false;
    activityState.editContext = false;
    if (!allTemplates || allTemplates.length === 0) {
      if (typeof window.loadTemplates === 'function') await loadTemplates();
    }
    renderActivityStep();
    showModal();
    restoreSearchFocus();
  }

  /**
   * Phase 1C custody-safety hardening — the ONE canonical entry point every remaining "quick
   * add" shortcut on this page now converges on. Opens the exact same Aktivitet flow as
   * "+ Lägg till → Aktivitet" (same modal, same merge default, same
   * runIdempotentScheduleCommand/custody scoping server-side — nothing new is introduced here),
   * with the requested day/section preselected so the parent never has to re-enter context the
   * page already knows (§7).
   *
   * `dayOfWeek` intentionally does NOT touch the page's own `currentDay` (the day the parent is
   * currently viewing) — tapping "+" under a DIFFERENT weekday tab than the one currently open
   * must preselect THAT day inside the modal without navigating the background view away from
   * where the parent was, matching the exact non-disruptive convenience the legacy
   * openInsertDayModal(dow)/openAddModal(section) controls already offered.
   *
   * @param {number} [dayOfWeek] — defaults to the currently-viewed day when omitted
   * @param {string} [section] — defaults to 'dag' when omitted
   */
  async function openActivityForDay(dayOfWeek, section) {
    await openActivity();
    if (typeof dayOfWeek === 'number') activityState.days = new Set([dayOfWeek]);
    activityState.dayKnown = typeof dayOfWeek === 'number';
    activityState.sectionKnown = Boolean(section);
    activityState.editContext = false;
    if (section) activityState.section = section;
    renderActivityStep();
    restoreSearchFocus();
  }

  function contextDayLabel(dow) {
    if (window.ScheduleCore && typeof ScheduleCore.dayName === 'function') return ScheduleCore.dayName(dow);
    return dayLabel(dow);
  }

  function contextSectionLabel(section) {
    if (window.ScheduleCore && typeof ScheduleCore.sectionName === 'function') return ScheduleCore.sectionName(section);
    return section;
  }

  function showDayPicker() {
    return !activityState.dayKnown || activityState.editContext;
  }

  function showSectionPicker() {
    return !activityState.sectionKnown || activityState.editContext;
  }

  function editActivityContext() {
    activityState.editContext = true;
    renderActivityStep();
    restoreSearchFocus();
  }

  function renderActivityPicker(templates, filtered) {
    const showCreate = shouldShowCreateRow(activityState.query, templates);
    const createName = normalizeActivityName(activityState.query);
    const emptyCopy = createName
      ? t('schedule.addMenu.activity.noneFound')
      : t('schedule.addMenu.activity.noneYet');

    return `
      <input type="text" id="samActivitySearch" value="${escHtml(activityState.query)}" placeholder="${t('schedule.addMenu.activity.pickActivityPlaceholder')}"
        aria-label="${t('schedule.addMenu.activity.pickActivityPlaceholder')}"
        class="${TOUCH_BTN} w-full px-3 py-2 border-2 border-lavender rounded-xl text-sm mb-2" oninput="ScheduleAddMenu.filterActivity(this.value)" />
      ${showCreate ? `
        <button type="button" onclick="ScheduleAddMenu.selectPendingCreate()"
          class="${TOUCH_BTN} w-full mb-2 px-4 py-3 rounded-2xl border-2 border-gold bg-white text-left font-semibold text-sm text-navy">
          ${t('schedule.addMenu.activity.createFromSearch', { name: escHtml(createName) })}
        </button>
        <p class="text-xs text-text-soft mb-3">${t('schedule.addMenu.activity.libraryAutoSaveNote')}</p>` : ''}
      <div class="max-h-40 overflow-y-auto space-y-1 mb-4" id="samActivityList">
        ${filtered.length === 0 ? `<p class="text-sm text-text-soft py-2">${escHtml(emptyCopy)}</p>` : filtered.map((tpl) => `
          <button type="button" onclick="ScheduleAddMenu.selectActivity('${tpl.id}')" aria-pressed="${activityState.templateId === tpl.id}" class="${TOUCH_BTN} w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${activityState.templateId === tpl.id ? 'bg-sky border-2 border-gold' : 'border-2 border-transparent hover:bg-sky'}">
            <span class="text-xl" aria-hidden="true">${tpl.icon || '📌'}</span>
            <span class="font-semibold text-sm text-navy truncate">${escHtml(tpl.name)}</span>
          </button>`).join('')}
      </div>`;
  }

  function renderActivityStep() {
    const templates = (allTemplates || []);
    const q = activityState.query.toLowerCase();
    const filtered = q ? templates.filter((tpl) => tpl.name && tpl.name.toLowerCase().includes(q)) : templates;
    const sections = window.ScheduleCore ? ScheduleCore.SECTIONS : [
      { key: 'morgon', emoji: '🌅' }, { key: 'dag', emoji: '☀️' }, { key: 'kvall', emoji: '🌆' }, { key: 'natt', emoji: '🌙' },
    ];

    const dayLocked = activityState.dayKnown && !activityState.editContext;
    const sectionLocked = activityState.sectionKnown && !activityState.editContext;
    const knownDay = activityState.days.size === 1 ? contextDayLabel([...activityState.days][0]) : '';
    const knownSection = contextSectionLabel(activityState.section);
    const contextText = dayLocked && sectionLocked
      ? t('schedule.addMenu.activity.contextSummary', { day: knownDay, section: knownSection })
      : [dayLocked ? knownDay : '', sectionLocked ? knownSection : ''].filter(Boolean).join(' · ');
    const contextHtml = (dayLocked || sectionLocked) ? `
          <p id="samActivityContext" class="text-sm font-semibold text-navy mb-2">${escHtml(contextText)}</p>
          <button type="button" id="samActivityChangeContext" onclick="ScheduleAddMenu.editActivityContext()" class="${TOUCH_BTN} mb-4 px-3 py-2 rounded-xl border-2 border-lavender text-sm font-semibold text-navy">${t('schedule.addMenu.activity.changeDaySection')}</button>` : '';
    const dayPickerHtml = showDayPicker() ? `
          <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.activity.pickDays')}</p>
          <div class="mb-4" id="samActivityDayPicker">${renderWeekdayChips(activityState.days, 'ScheduleAddMenu.toggleActivityDay')}</div>` : '';
    const sectionPickerHtml = showSectionPicker() ? `
          <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.activity.pickSection')}</p>
          <div class="flex gap-2 flex-wrap mb-4" id="samActivitySectionPicker">
            ${sections.map((s) => {
              const active = activityState.section === s.key;
              return `<button type="button" onclick="ScheduleAddMenu.selectActivitySection('${s.key}')"
              aria-pressed="${active}"
              class="${TOUCH_BTN} px-3 py-2 rounded-xl text-sm font-semibold border-2 ${choiceClass(active)}">
              ${active ? '✓ ' : ''}${s.emoji || ''} ${window.ScheduleCore ? ScheduleCore.sectionName(s.key) : s.key}</button>`;
            }).join('')}
          </div>` : '';

    bodyEl().innerHTML = `
      <div class="sam-activity-shell">
        <div class="sam-activity-scroll">
          <div class="flex items-center justify-between mb-4">
            <button type="button" onclick="ScheduleAddMenu.openMenu()" class="${TOUCH_BTN} text-text-soft hover:text-navy text-sm font-semibold">${t('schedule.addMenu.back')}</button>
            <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex items-center justify-center text-text-soft hover:text-navy" aria-label="${t('schedule.addMenu.close')}">✕</button>
          </div>
          <h3 id="scheduleAddMenuTitle" class="text-lg font-heading font-bold text-navy mb-3">${t('schedule.addMenu.activity.title')}</h3>
          ${contextHtml}

          <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.activity.pickActivity')}</p>
          ${renderActivityPicker(templates, filtered)}
          ${dayPickerHtml}
          ${sectionPickerHtml}

          <details class="mb-4">
            <summary class="text-xs font-semibold text-navy uppercase tracking-wide cursor-pointer">${t('schedule.addMenu.activity.pickTime')}</summary>
            <div class="flex gap-2 mt-2">
              ${renderTimeField('start', activityState.startTime)}
              ${renderTimeField('end', activityState.endTime)}
            </div>
          </details>
        <div class="sam-activity-footer border-t border-lavender schedule-menu-surface" id="samActivityFooter">
          <p id="samActivityStatus" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
          <p id="samActivityQueueNote" class="text-sm text-navy font-semibold mb-2 hidden" role="status"></p>
          <p id="samActivityError" class="text-sm text-red-600 mb-2 hidden"></p>
          <button type="button" id="samActivityAddAnotherBtn" onclick="ScheduleAddMenu.addAnother()" class="${TOUCH_BTN} w-full mb-2 px-4 py-3 border-2 border-lavender rounded-xl font-semibold text-sm text-navy">${t('schedule.addMenu.activity.addAnother')}</button>
          <div class="flex gap-3">
            <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex-1 px-4 py-3 border-2 border-lavender rounded-xl font-semibold text-sm text-navy">${t('schedule.addMenu.cancel')}</button>
            <button type="button" id="samActivitySaveBtn" onclick="ScheduleAddMenu.submitActivity()" class="${TOUCH_BTN} flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-semibold text-sm">${t('schedule.addMenu.save')}</button>
          </div>
        </div>
        </div>
      </div>`;
    paintTimeField('start', activityState.startTime);
    paintTimeField('end', activityState.endTime);
    syncActivitySavePending();
  }

  function timeFieldIds(which) {
    return which === 'start'
      ? { inputId: 'samActivityStartTime', valueId: 'samActivityStartTimeValue' }
      : { inputId: 'samActivityEndTime', valueId: 'samActivityEndTimeValue' };
  }

  function timeFieldLabelKey(which) {
    return which === 'start'
      ? 'schedule.chrome.startTimePlaceholder'
      : 'schedule.chrome.endTimePlaceholder';
  }

  function renderTimeField(which, value) {
    const label = t(timeFieldLabelKey(which));
    const filled = Boolean(value);
    const ids = timeFieldIds(which);
    return `<label class="sam-time-field ${TOUCH_BTN} relative flex-1 flex items-center justify-center px-3 py-2 border-2 border-lavender rounded-xl" data-time-field="${which}">
      <span id="${ids.valueId}" class="sam-time-value pointer-events-none text-sm font-semibold ${filled ? 'text-navy' : 'text-text-soft'}">${escHtml(filled ? value : label)}</span>
      <input type="time" id="${ids.inputId}" value="${escHtml(value || '')}" onchange="ScheduleAddMenu.setActivityTime('${which}', this.value)"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="${escHtml(label)}" />
    </label>`;
  }

  function paintTimeField(which, value) {
    const span = document.getElementById(timeFieldIds(which).valueId);
    if (!span) return;
    const filled = Boolean(value);
    span.textContent = filled ? value : t(timeFieldLabelKey(which));
    span.classList.toggle('text-navy', filled);
    span.classList.toggle('text-text-soft', !filled);
  }

  function restoreSearchFocus() {
    const search = document.getElementById('samActivitySearch');
    if (!search) return;
    search.focus();
    search.selectionStart = search.value.length;
  }

  function filterActivity(q) {
    activityState.query = q;
    const match = findExactActivityMatch(allTemplates, q);
    activityState.templateId = match ? match.id : null;
    renderActivityStep();
    restoreSearchFocus();
  }

  function selectActivity(id) {
    activityState.templateId = id;
    renderActivityStep();
  }

  function scheduleReturnPath() {
    const back = new URLSearchParams(window.location.search || '');
    if (typeof currentChildId === 'string' && currentChildId && !back.get('child')) {
      back.set('child', currentChildId);
    }
    let day = null;
    if (activityState.days && activityState.days.size === 1) day = [...activityState.days][0];
    else if (typeof currentDay === 'number') day = currentDay;
    if (day != null && back.get('day') == null) back.set('day', String(day));
    const returnSections = { morgon: true, dag: true, kvall: true, natt: true };
    if (activityState.section && returnSections[activityState.section] && back.get('section') == null) {
      back.set('section', activityState.section);
    }
    const path = (window.location.pathname || '/schedule') + (back.toString() ? '?' + back.toString() : '');
    if (!path.startsWith('/schedule') || path.indexOf('://') !== -1 || path.indexOf('\\') !== -1 || path.indexOf('#') !== -1) return '';
    return path;
  }

  function selectPendingCreate() {
    const name = normalizeActivityName(activityState.query);
    if (!shouldShowCreateRow(name, allTemplates)) return;
    const params = new URLSearchParams();
    params.set('new', '1');
    params.set('name', name);
    const ret = scheduleReturnPath();
    if (ret) params.set('return', ret);
    window.location.assign('/library?' + params.toString() + '#activities');
  }

  function selectActivitySection(key) { activityState.section = key; renderActivityStep(); }
  function setActivityTime(which, val) {
    if (which === 'start') activityState.startTime = val;
    else activityState.endTime = val;
    paintTimeField(which, val);
  }
  function toggleActivityDay(dow, shortcut) {
    if (shortcut === 'all') activityState.days = new Set(WEEKDAY_SET_ALL);
    else if (shortcut === 'weekday') activityState.days = new Set(WEEKDAY_SET_WEEKDAY);
    else if (shortcut === 'weekend') activityState.days = new Set(WEEKDAY_SET_WEEKEND);
    else if (activityState.days.has(dow)) activityState.days.delete(dow);
    else activityState.days.add(dow);
    renderActivityStep();
  }

  function stagedNameFromSnapshot(snapshot) {
    if (!snapshot) return '';
    return normalizeActivityName(snapshot.query);
  }

  function captureActivitySnapshot() {
    return {
      query: activityState.query,
      templateId: activityState.templateId,
      days: new Set(activityState.days),
      section: activityState.section,
      startTime: activityState.startTime,
      endTime: activityState.endTime,
    };
  }

  function activityIntentKey(snapshot) {
    const days = [...(snapshot.days || [])].map(Number).sort((a, b) => a - b).join(',');
    return [
      snapshot.templateId || '',
      activityNameKey(stagedNameFromSnapshot(snapshot)),
      days,
      snapshot.section || '',
      snapshot.startTime || '',
      snapshot.endTime || '',
    ].join('|');
  }

  function snapshotsMatch(a, b) {
    return Boolean(a && b && activityIntentKey(a) === activityIntentKey(b));
  }

  function restoreSnapshotToForm(snapshot) {
    activityState.query = snapshot.query;
    activityState.templateId = snapshot.templateId;
    activityState.days = new Set(snapshot.days);
    activityState.section = snapshot.section;
    activityState.startTime = snapshot.startTime;
    activityState.endTime = snapshot.endTime;
  }

  function isDuplicateSubmit(snapshot) {
    if (inFlightSnapshot && snapshotsMatch(snapshot, inFlightSnapshot)) return true;
    return activitySubmitQueue.some((queued) => snapshotsMatch(snapshot, queued));
  }

  function syncActivitySavePending() {
    setPending('samActivitySaveBtn', activitySubmitInFlight);
    const note = document.getElementById('samActivityQueueNote');
    if (!note) return;
    if (activitySubmitInFlight && activitySubmitQueue.length > 0) {
      const next = activitySubmitQueue[activitySubmitQueue.length - 1];
      const name = stagedNameFromSnapshot(next) || stagedNameFromSnapshot(inFlightSnapshot);
      note.textContent = t('schedule.addMenu.activity.queued', {
        name: name || '…',
        count: activitySubmitQueue.length,
      });
      note.classList.remove('hidden');
    } else {
      note.textContent = '';
      note.classList.add('hidden');
    }
  }

  /**
   * Persist one captured Save. Uses the snapshot, not live form fields, so a queued
   * next activity cannot mutate an in-flight apply. New names are not created here;
   * "+ Skapa" opens the library editor instead.
   */
  async function persistActivitySnapshot(snapshot) {
    const errEl = document.getElementById('samActivityError');
    if (errEl) errEl.classList.add('hidden');
    if (!currentChildId || currentChildId !== activityContextChildId) {
      closeAddMenu();
      showToast(t('schedule.addMenu.activity.childChanged'), true);
      return { ok: false, childChanged: true };
    }
    if (!snapshot.days || snapshot.days.size === 0) {
      if (errEl) {
        errEl.textContent = t('schedule.addMenu.selectAtLeastOneDay');
        errEl.classList.remove('hidden');
      }
      return { ok: false };
    }

    let templateId = snapshot.templateId;
    const stagedName = stagedNameFromSnapshot(snapshot);

    if (!templateId) {
      let exact = findExactActivityMatch(allTemplates, stagedName);
      if (!exact && typeof window.loadTemplates === 'function') {
        try { await loadTemplates(); } catch (_refreshErr) { /* match check still proceeds */ }
        exact = findExactActivityMatch(allTemplates, stagedName);
      }
      if (exact) {
        templateId = exact.id;
        snapshot.templateId = exact.id;
      }
    }

    if (!templateId) {
      if (errEl) {
        errEl.textContent = t('schedule.addMenu.activity.selectActivityFirst');
        errEl.classList.remove('hidden');
      }
      return { ok: false };
    }

    if (!currentChildId || currentChildId !== activityContextChildId) {
      closeAddMenu();
      showToast(t('schedule.addMenu.activity.childChanged'), true);
      return { ok: false, childChanged: true };
    }

    const days = [...snapshot.days];
    const custodyHomeId = activeCustodyHomeId();
    const operationId = opTracker ? opTracker.forCommand({
      cmd: 'apply-activity', childId: currentChildId, activityTemplateId: templateId,
      days: [...days].sort(), section: snapshot.section, startTime: snapshot.startTime, endTime: snapshot.endTime,
      custodyHomeId,
    }) : null;

    const { ok, data } = await ScheduleApplyClient.applyActivity(currentChildId, {
      activityTemplateId: templateId, days, section: snapshot.section,
      startTime: snapshot.startTime || null, endTime: snapshot.endTime || null, operationId, custodyHomeId,
    });

    if (!ok) {
      if (errEl) {
        errEl.textContent = (data && data.error) || t('schedule.addMenu.activity.applyFailed');
        errEl.classList.remove('hidden');
      }
      return { ok: false };
    }

    const tpl = (allTemplates || []).find((x) => x.id === templateId);
    const name = tpl ? tpl.name : stagedName;
    const toastKey = 'schedule.addMenu.activity.added';
    const successMsg = t(toastKey, { name, count: days.length });
    showToast(successMsg);
    const statusEl = document.getElementById('samActivityStatus');
    if (statusEl) statusEl.textContent = successMsg;
    return { ok: true, successMsg };
  }

  async function drainActivitySubmitQueue() {
    if (activitySubmitInFlight) return Promise.resolve();
    activitySubmitInFlight = true;
    syncActivitySavePending();
    let restoreNextEntryFocus = false;
    let lastOk = false;
    let endStayOpen = false;
    try {
      while (activitySubmitQueue.length) {
        const snapshot = activitySubmitQueue.shift();
        inFlightSnapshot = snapshot;
        syncActivitySavePending();
        const result = await persistActivitySnapshot(snapshot);
        if (result.childChanged) {
          activitySubmitQueue.length = 0;
          lastOk = false;
          restoreNextEntryFocus = false;
          return;
        }
        if (!result.ok) {
          activitySubmitQueue.unshift(snapshot);
          restoreSnapshotToForm(snapshot);
          renderActivityStep();
          lastOk = false;
          break;
        }
        lastOk = true;
        endStayOpen = snapshot.stayOpen === true;
      }
      if (lastOk && activitySubmitQueue.length === 0) {
        if (endStayOpen) {
          resetActivityForNextEntry();
          renderActivityStep();
          startNextEntryFocusGuard();
          restoreNextEntryFocus = true;
          try {
            await afterSuccessfulMutation();
          } catch (_refreshErr) {
            /* schedule refresh must not block the next name */
          }
        } else {
          try {
            await afterSuccessfulMutation();
          } catch (_refreshErr) {
            /* the list refresh must not block closing the dialog */
          }
          closeAddMenu();
        }
      }
    } finally {
      inFlightSnapshot = null;
      activitySubmitInFlight = false;
      setPending('samActivitySaveBtn', false);
      syncActivitySavePending();
      if (restoreNextEntryFocus && activitySubmitQueue.length === 0) restoreSearchFocus();
    }
  }

  function addAnother() {
    return submitActivity(true);
  }

  async function submitActivity(stayOpen) {
    const errEl = document.getElementById('samActivityError');
    if (errEl) errEl.classList.add('hidden');
    if (!currentChildId || currentChildId !== activityContextChildId) {
      closeAddMenu();
      showToast(t('schedule.addMenu.activity.childChanged'), true);
      return;
    }
    if (activityState.days.size === 0) {
      if (errEl) {
        errEl.textContent = t('schedule.addMenu.selectAtLeastOneDay');
        errEl.classList.remove('hidden');
      }
      return;
    }

    const snapshot = captureActivitySnapshot();
    snapshot.stayOpen = stayOpen === true;

    if (activitySubmitInFlight) {
      if (isDuplicateSubmit(snapshot)) {
        syncActivitySavePending();
        return;
      }
      activitySubmitQueue.push(snapshot);
      syncActivitySavePending();
      return;
    }

    if (activitySubmitQueue.length) {
      if (!snapshotsMatch(snapshot, activitySubmitQueue[0])) {
        activitySubmitQueue[0] = snapshot;
      }
      await drainActivitySubmitQueue();
      return;
    }

    activitySubmitQueue.push(snapshot);
    await drainActivitySubmitQueue();
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
          class="${TOUCH_BTN} flex-1 px-3 py-2 rounded-xl text-sm font-semibold border-2 ${choiceClass(templateState.tab === 'mine')}">${t('schedule.addMenu.template.tabMine')}</button>
        <button type="button" role="tab" aria-selected="${templateState.tab === 'standard'}" onclick="ScheduleAddMenu.switchTemplateTab('standard')"
          class="${TOUCH_BTN} flex-1 px-3 py-2 rounded-xl text-sm font-semibold border-2 ${choiceClass(templateState.tab === 'standard')}">${t('schedule.addMenu.template.tabStandard')}</button>
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
        <button type="button" id="samTemplateSaveBtn" onclick="ScheduleAddMenu.submitTemplate()" class="${TOUCH_BTN} flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-semibold text-sm">${t('schedule.addMenu.save')}</button>
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

  function findDefaultCopySourceDay(excludeDay) {
    const schedules = typeof window.getChildWeekSchedules === 'function'
      ? window.getChildWeekSchedules()
      : [];
    for (const dow of WEEKDAYS) {
      if (dow === excludeDay) continue;
      if (schedules.some((row) => row.day_of_week === dow)) return dow;
    }
    return excludeDay;
  }

  /** Empty selected day — preselect copy FROM another populated day TO currentDay. */
  function openCopyDayToCurrentDay() {
    const targetDay = typeof currentDay === 'number' ? currentDay : 1;
    copyDayState.sourceDay = findDefaultCopySourceDay(targetDay);
    copyDayState.targetDays = new Set([targetDay]);
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
          aria-pressed="${copyDayState.sourceDay === dow}"
          class="${TOUCH_BTN} px-3 py-2 rounded-xl text-sm font-semibold border-2 ${choiceClass(copyDayState.sourceDay === dow)}">${copyDayState.sourceDay === dow ? '✓ ' : ''}${dayLabel(dow)}</button>`).join('')}
      </div>

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.copyDay.pickTargetDays')}</p>
      <div class="mb-1">${renderWeekdayChips(copyDayState.targetDays, 'ScheduleAddMenu.toggleCopyDayTarget')}</div>
      ${copyDayState.targetDays.has(copyDayState.sourceDay) ? `<p class="text-xs text-amber-700 mb-3">${t('schedule.addMenu.copyDay.sourceEqualsTargetWarning')}</p>` : '<div class="mb-4"></div>'}

      <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-2">${t('schedule.addMenu.copyDay.pickMode')}</p>
      <div class="mb-4">${renderModeSelector(copyDayState.mode, 'ScheduleAddMenu.setCopyDayMode')}</div>

      <p id="samCopyDayError" class="text-sm text-red-600 mb-2 hidden"></p>
      <div class="flex gap-3">
        <button type="button" onclick="ScheduleAddMenu.close()" class="${TOUCH_BTN} flex-1 px-4 py-3 border-2 border-lavender rounded-xl font-semibold text-sm">${t('schedule.addMenu.cancel')}</button>
        <button type="button" id="samCopyDaySaveBtn" onclick="ScheduleAddMenu.submitCopyDay()" class="${TOUCH_BTN} flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-semibold text-sm">${t('schedule.addMenu.save')}</button>
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
        <button type="button" id="samSaveTemplateBtn" onclick="ScheduleAddMenu.submitSaveAsTemplate()" class="${TOUCH_BTN} flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-semibold text-sm">${t('schedule.addMenu.save')}</button>
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
    openActivityForDay,
    filterActivity,
    selectActivity,
    selectPendingCreate,
    selectActivitySection,
    setActivityTime,
    toggleActivityDay,
    editActivityContext,
    addAnother,
    submitActivity,
    openTemplate,
    switchTemplateTab,
    selectTemplateItem,
    toggleTemplateDay,
    setTemplateMode,
    submitTemplate,
    openCopyDay,
    openCopyDayToCurrentDay,
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
    const mobile = window.ScheduleDaySheet && ScheduleDaySheet.isMobile();
    addBtn.classList.toggle('hidden', fwBtn.classList.contains('hidden') || Boolean(mobile));
  }

  function closeIfChildContextChanged(nextChildId) {
    const modal = document.getElementById('scheduleAddMenuModal');
    if (!modal || modal.classList.contains('hidden')) return;
    if (activityContextChildId && nextChildId !== activityContextChildId) {
      closeAddMenu();
    }
  }

  function bindChildContextGuards() {
    if (typeof window.selectChild === 'function' && !window.selectChild.__samGuarded) {
      const original = window.selectChild;
      function wrappedSelectChild(id) {
        closeIfChildContextChanged(id);
        return original.apply(this, arguments);
      }
      wrappedSelectChild.__samGuarded = true;
      window.selectChild = wrappedSelectChild;
    }
    if (typeof window.backToChildrenList === 'function' && !window.backToChildrenList.__samGuarded) {
      const original = window.backToChildrenList;
      function wrappedBackToChildren() {
        closeIfChildContextChanged(null);
        return original.apply(this, arguments);
      }
      wrappedBackToChildren.__samGuarded = true;
      window.backToChildrenList = wrappedBackToChildren;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const fwBtn = document.getElementById('fillWeekBtn');
    if (fwBtn) {
      new MutationObserver(syncAddMenuButtonVisibility).observe(fwBtn, { attributes: true, attributeFilter: ['class'] });
    }
    syncAddMenuButtonVisibility();
    bindChildContextGuards();
  });
  bindChildContextGuards();
})();
