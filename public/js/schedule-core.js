/**
 * Shared schedule constants and rendering helpers for dashboard.js + schedule.js.
 * Exposed as window.ScheduleCore; key symbols also on window for HTML onclick + schedule-views.js.
 */
(function () {
  const DAYS_FALLBACK = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  const DAYS_SHORT_FALLBACK = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const SECTION_LABEL_FALLBACK = { morgon: 'Morgon', dag: 'Dag', kvall: 'Kväll', natt: 'Natt' };

  function localizedString(key, params) {
    if (window.ScheduleI18n) return ScheduleI18n.t(key, params);
    if (typeof window.pt === 'function') return window.pt(key, params);
    return key;
  }

  function localizedOr(key, fallback) {
    const val = localizedString(key);
    return val === key ? fallback : val;
  }

  function dayName(index) {
    return localizedOr(`schedule.days.${index}`, DAYS_FALLBACK[index]);
  }

  function dayShort(index) {
    return localizedOr(`schedule.daysShort.${index}`, DAYS_SHORT_FALLBACK[index]);
  }

  function sectionName(key) {
    return localizedOr(`schedule.sections.${key}`, SECTION_LABEL_FALLBACK[key] || key);
  }

  // Locale-aware index access: DAYS[3] returns the current-locale day name.
  // Proxy keeps every existing `DAYS[d]` call site working after locale switch.
  function localizedDayArray(lookupFn) {
    return new Proxy([], {
      get(target, prop) {
        const i = Number(prop);
        if (Number.isInteger(i) && i >= 0 && i <= 6) return lookupFn(i);
        return target[prop];
      },
    });
  }
  const DAYS = localizedDayArray(dayName);
  const DAYS_SHORT = localizedDayArray(dayShort);

  const SECTIONS = [
    { key: 'morgon', emoji: '🌅', color: 'bg-yellow-50 border-yellow-200', get label() { return sectionName(this.key); } },
    { key: 'dag', emoji: '☀️', color: 'bg-sky border-blue-200', get label() { return sectionName(this.key); } },
    { key: 'kvall', emoji: '🌆', color: 'bg-orange-50 border-orange-200', get label() { return sectionName(this.key); } },
    { key: 'natt', emoji: '🌙', color: 'bg-indigo-50 border-indigo-200', get label() { return sectionName(this.key); } },
  ];

  // initBirthdayPicker and updateBirthdayDays are in /js/birthday-picker.js
  function updateBirthdayHidden(prefix) {
    const y = document.getElementById(prefix + 'Year').value;
    const m = document.getElementById(prefix + 'Month').value;
    const d = document.getElementById(prefix + 'Day').value;
    document.getElementById(prefix).value = (y && m && d) ? `${y}-${m}-${d}` : '';
  }

  function fmtTime(t) { return t ? t.substring(0, 5) : ''; }

  function sectionTimeLabel(key) {
    const m = sectionTimes;
    if (!m) return '';
    const map = {
      morgon: `${fmtTime(m.morning_start)}–${fmtTime(m.morning_end)}`,
      dag: `${fmtTime(m.day_start)}–${fmtTime(m.day_end)}`,
      kvall: `${fmtTime(m.evening_start)}–${fmtTime(m.evening_end)}`,
      natt: `${fmtTime(m.night_start)}–${fmtTime(m.night_end)}`,
    };
    return map[key] || '';
  }

  function intlLang() {
    if (window.I18n && typeof I18n.getCurrentLang === 'function') return I18n.getCurrentLang();
    return 'sv-SE';
  }

  function getDayDateLabel() {
    const weekStart = getWeekStart(weekOffset);
    for (let i = 0; i < 7; i++) {
      const dow = i < 6 ? i + 1 : 0;
      if (dow === currentDay) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d.toLocaleDateString(intlLang(), { day: 'numeric', month: 'short' });
      }
    }
    return '';
  }

  /**
   * Map DOM/schedule reorder snapshot → daily_log_item IDs (today-only save).
   * Honors engångsaktiviteter by daily_log_item id; weekly rows still match by template.
   */
  function buildOrderedDailyIdsFromReorder(newOrder, scheduleItems, logItems) {
    const orderedDailyIds = [];
    const logById = new Map(logItems.map((li) => [String(li.id), li]));

    SECTIONS.forEach((sec) => {
      const sectionOrder = newOrder
        .filter((o) => o.section === sec.key)
        .sort((a, b) => a.sort_order - b.sort_order);

      for (const entry of sectionOrder) {
        const schedItem = scheduleItems.find((i) => String(i.id) === String(entry.id));
        if (!schedItem) continue;

        if (schedItem.is_once_task) {
          const logItem = logById.get(String(entry.id));
          if (logItem && logItem.section === sec.key && !orderedDailyIds.includes(logItem.id)) {
            orderedDailyIds.push(logItem.id);
          }
          continue;
        }

        const templateId = schedItem.activity_template_id;
        if (!templateId) continue;

        const match = logItems.find(
          (li) =>
            li.activity_template_id == templateId &&
            li.section === sec.key &&
            !orderedDailyIds.includes(li.id)
        );
        if (match) orderedDailyIds.push(match.id);
      }

      logItems
        .filter((li) => li.section === sec.key && !orderedDailyIds.includes(li.id))
        .forEach((li) => orderedDailyIds.push(li.id));
    });

    return orderedDailyIds;
  }

  function pendingReorderIncludesOnceTask(newOrder, scheduleItems) {
    return newOrder.some(({ id }) => {
      const item = scheduleItems.find((i) => String(i.id) === String(id));
      return item && item.is_once_task;
    });
  }

  function buildSectionCardsHtml(scheduleItems, renderItemFn) {
    return SECTIONS.map(sec => {
      const items = scheduleItems.filter(i => i.section === sec.key).sort((a, b) => a.sort_order - b.sort_order);
      const tl = sectionTimeLabel(sec.key);
      return `<div class="section-card border-2 ${sec.color} rounded-2xl p-4 mb-4" data-section="${sec.key}">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2"><span class="text-xl">${sec.emoji}</span>
          <div><h4 class="font-heading font-bold text-navy">${sectionName(sec.key)}</h4>${tl ? `<p class="text-xs text-text-soft">${tl}</p>` : ''}</div>
        </div>
        <button onclick="openAddModal('${sec.key}')" class="action-btn px-3 py-2 bg-white hover:bg-lavender rounded-xl text-sm font-semibold transition-colors border border-lavender">+ ${localizedString('schedule.addActivity')}</button>
      </div>
      <div class="space-y-2 items-list" id="items-${sec.key}">
        ${items.length === 0 ? `<p class="text-sm text-text-soft text-center py-3">${localizedString('schedule.emptySection')}</p>` : items.map(i => renderItemFn(i)).join('')}
      </div>
    </div>`;
    }).join('');
  }

  window.ScheduleCore = {
    DAYS,
    DAYS_SHORT,
    dayName,
    dayShort,
    sectionName,
    label: localizedString,
    SECTIONS,
    updateBirthdayHidden,
    fmtTime,
    sectionTimeLabel,
    getDayDateLabel,
    buildSectionCardsHtml,
    buildOrderedDailyIdsFromReorder,
    pendingReorderIncludesOnceTask,
  };

  // HTML onclick handlers (dashboard.html, schedule.html)
  window.updateBirthdayHidden = updateBirthdayHidden;
})();
