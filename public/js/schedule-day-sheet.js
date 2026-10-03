/**
 * Mobile day actions for /schedule.
 * One ⋯ opens a solid sheet (PR1 data-overlay="modal"). Day-tab drag and the
 * per-tab plus are desktop-only. Does not introduce a z-index scale.
 */
(function () {
  'use strict';

  const MOBILE_QUERY = '(max-width: 767px)';

  function t(key, params) {
    if (window.ScheduleI18n) return ScheduleI18n.t(key, params);
    if (window.pt) return window.pt(key, params);
    return key;
  }

  function isMobile() {
    return Boolean(window.matchMedia && window.matchMedia(MOBILE_QUERY).matches);
  }

  /** Desktop keeps drag + the per-tab plus. Mobile does not. */
  function mobileDayChrome() {
    if (isMobile()) return { draggable: '', showDayAdd: false };
    return { draggable: 'draggable="true"', showDayAdd: true };
  }

  function sheetEl() {
    return document.getElementById('scheduleDaySheet');
  }

  function close() {
    const el = sheetEl();
    if (el) el.classList.add('hidden');
  }

  function actionList() {
    return [
      {
        id: 'copy-day',
        label: t('schedule.editor.copyDay'),
        run() {
          if (window.ScheduleAddMenu && typeof ScheduleAddMenu.openCopyDay === 'function') {
            ScheduleAddMenu.openCopyDay();
          } else if (typeof window.openCopyDayModal === 'function') {
            window.openCopyDayModal();
          }
        },
      },
      {
        id: 'copy-weeks',
        label: t('schedule.editor.copyToWeeks'),
        run() {
          if (typeof window.openCopyWeeksModal === 'function') window.openCopyWeeksModal();
        },
      },
      {
        id: 'copy-child',
        label: t('schedule.editor.copyToChild'),
        run() {
          if (typeof window.openCopyChildModal === 'function') window.openCopyChildModal();
        },
      },
      {
        id: 'save-template',
        label: t('schedule.addMenu.saveAsTemplate.menuLabel'),
        run() {
          if (window.ScheduleAddMenu && typeof ScheduleAddMenu.openSaveAsTemplate === 'function') {
            ScheduleAddMenu.openSaveAsTemplate();
          }
        },
      },
      {
        id: 'delete-day',
        label: t('schedule.editor.deleteDay'),
        danger: true,
        run() {
          if (typeof window.confirmDeleteSchedule === 'function') window.confirmDeleteSchedule();
        },
      },
    ];
  }

  function ensureSheet() {
    let el = sheetEl();
    if (el) return el;
    el = document.createElement('div');
    el.id = 'scheduleDaySheet';
    el.className = 'schedule-day-sheet hidden fixed inset-0 flex items-end justify-center p-4 bg-black/50';
    el.setAttribute('data-overlay', 'modal');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'scheduleDaySheetTitle');
    el.innerHTML = `
      <div class="schedule-menu-surface schedule-day-sheet-panel w-full max-w-md rounded-2xl shadow-xl p-4" id="scheduleDaySheetPanel">
        <div class="flex items-center justify-between gap-3 mb-3">
          <h3 id="scheduleDaySheetTitle" class="text-lg font-heading font-bold text-navy"></h3>
          <button type="button" class="min-h-[44px] min-w-[44px] text-text-soft" onclick="ScheduleDaySheet.close()" aria-label="${t('schedule.addMenu.close')}">✕</button>
        </div>
        <div class="flex flex-col gap-2" id="scheduleDaySheetActions"></div>
      </div>`;
    el.addEventListener('mousedown', (ev) => {
      if (ev.target === el) close();
    });
    document.body.appendChild(el);
    return el;
  }

  function paintActions() {
    const host = document.getElementById('scheduleDaySheetActions');
    if (!host) return;
    host.innerHTML = actionList().map((action) => {
      const danger = action.danger ? ' schedule-sheet-danger' : '';
      return `<button type="button" data-day-action="${action.id}" onclick="ScheduleDaySheet.choose('${action.id}')" class="schedule-day-sheet-action${danger} min-h-[44px] w-full px-4 py-3 rounded-xl border-2 text-left text-sm font-semibold ${action.danger ? 'border-coral text-navy' : 'border-lavender text-navy'}">${action.label}</button>`;
    }).join('');
  }

  function open() {
    const el = ensureSheet();
    const title = document.getElementById('scheduleDaySheetTitle');
    if (title) {
      const day = typeof window.dayName === 'function' ? window.dayName(window.currentDay) : '';
      title.textContent = day || t('schedule.editor.moreOptions');
    }
    paintActions();
    el.classList.remove('hidden');
  }

  function choose(id) {
    const action = actionList().find((item) => item.id === id);
    close();
    if (action) action.run();
  }

  function triggerHtml() {
    const label = t('schedule.editor.moreOptions');
    return `<button type="button" class="schedule-day-more min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border-2 border-lavender font-semibold text-navy" onclick="ScheduleDaySheet.open()" aria-haspopup="dialog" aria-controls="scheduleDaySheet" aria-label="${label}">⋯</button>`;
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const el = sheetEl();
    if (el && !el.classList.contains('hidden')) close();
  });

  if (window.matchMedia) {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      if (typeof window.renderDayTabs === 'function' && document.getElementById('dayTabs')) {
        window.renderDayTabs();
      }
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
  }

  window.ScheduleDaySheet = {
    MOBILE_QUERY,
    isMobile,
    mobileDayChrome,
    open,
    close,
    choose,
    triggerHtml,
  };
})();
