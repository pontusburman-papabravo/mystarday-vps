/**
 * Shared schedule constants and rendering helpers for dashboard.js + schedule.js.
 * Exposed as window.ScheduleCore; key symbols also on window for HTML onclick + schedule-views.js.
 */
(function () {
  const DAYS = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  const DAYS_SHORT = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const SECTIONS = [
    { key: 'morgon', label: 'Morgon', emoji: '🌅', color: 'bg-yellow-50 border-yellow-200' },
    { key: 'dag', label: 'Dag', emoji: '☀️', color: 'bg-sky border-blue-200' },
    { key: 'kvall', label: 'Kväll', emoji: '🌆', color: 'bg-orange-50 border-orange-200' },
    { key: 'natt', label: 'Natt', emoji: '🌙', color: 'bg-indigo-50 border-indigo-200' },
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

  function getDayDateLabel() {
    const weekStart = getWeekStart(weekOffset);
    for (let i = 0; i < 7; i++) {
      const dow = i < 6 ? i + 1 : 0;
      if (dow === currentDay) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      }
    }
    return '';
  }

  function buildSectionCardsHtml(scheduleItems, renderItemFn) {
    return SECTIONS.map(sec => {
      const items = scheduleItems.filter(i => i.section === sec.key).sort((a, b) => a.sort_order - b.sort_order);
      const tl = sectionTimeLabel(sec.key);
      return `<div class="section-card border-2 ${sec.color} rounded-2xl p-4 mb-4" data-section="${sec.key}">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2"><span class="text-xl">${sec.emoji}</span>
          <div><h4 class="font-heading font-bold text-navy">${sec.label}</h4>${tl ? `<p class="text-xs text-text-soft">${tl}</p>` : ''}</div>
        </div>
        <button onclick="openAddModal('${sec.key}')" class="action-btn px-3 py-2 bg-white hover:bg-lavender rounded-xl text-sm font-semibold transition-colors border border-lavender">+ Aktivitet</button>
      </div>
      <div class="space-y-2 items-list" id="items-${sec.key}">
        ${items.length === 0 ? '<p class="text-sm text-text-soft text-center py-3">Inga aktiviteter</p>' : items.map(i => renderItemFn(i)).join('')}
      </div>
    </div>`;
    }).join('');
  }

  window.ScheduleCore = {
    DAYS,
    DAYS_SHORT,
    SECTIONS,
    updateBirthdayHidden,
    fmtTime,
    sectionTimeLabel,
    getDayDateLabel,
    buildSectionCardsHtml,
  };

  // HTML onclick handlers (dashboard.html, schedule.html)
  window.updateBirthdayHidden = updateBirthdayHidden;
})();
