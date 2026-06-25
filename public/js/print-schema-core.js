/**
 * print-schema-core.js — Shared schedule print layout (1/2 weeks, 1 month on one A4 page).
 */
(function (root) {
  'use strict';

  var DAY_NAMES_FULL = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  var SECTION_LABELS = { morgon: '🌅', dag: '☀️', kvall: '🌆', natt: '🌙' };
  var SECTION_ORDER = ['morgon', 'dag', 'kvall', 'natt'];

  var PERIODS = {
    '1w': { days: 7, weeks: 1, label: '1 vecka' },
    '2w': { days: 14, weeks: 2, label: '2 veckor' },
    '1m': { days: 28, weeks: 4, label: '1 månad' },
  };

  function esc(str) {
    return typeof root.escapeHtml === 'function' ? root.escapeHtml(str) : String(str || '');
  }

  function avatarHtml(child, size) {
    return typeof root.renderChildAvatar === 'function' ? root.renderChildAvatar(child, size) : '';
  }

  function mondayOf(dateInput) {
    var d = dateInput instanceof Date ? new Date(dateInput) : new Date(String(dateInput) + 'T12:00:00');
    var dow = d.getDay();
    var offset = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + offset);
    return d;
  }

  function addDays(date, n) {
    var d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function fmtSvDate(d) {
    return d.toLocaleDateString('sv-SE');
  }

  function fmtRangeLabel(start, end) {
    var opts = { day: 'numeric', month: 'short' };
    var y = { day: 'numeric', month: 'short', year: 'numeric' };
    if (start.getFullYear() === end.getFullYear()) {
      return start.toLocaleDateString('sv-SE', opts) + ' – ' + end.toLocaleDateString('sv-SE', y);
    }
    return start.toLocaleDateString('sv-SE', y) + ' – ' + end.toLocaleDateString('sv-SE', y);
  }

  async function fetchWeeks(childId, weekOffsetStart, numWeeks, myDaysOnly, apiFetch) {
    var weeks = [];
    for (var w = 0; w < numWeeks; w++) {
      var weekOffset = weekOffsetStart + w;
      var qs = 'weekOffset=' + encodeURIComponent(weekOffset);
      if (myDaysOnly) qs += '&myDays=1';
      var res = await apiFetch('/api/children/' + childId + '/calendar-week?' + qs);
      if (!res.ok) throw new Error('calendar-week');
      weeks.push(await res.json());
    }
    return weeks;
  }

  function flattenWeekDays(weeks, myDaysOnly) {
    var days = [];
    for (var i = 0; i < weeks.length; i++) {
      var cal = weeks[i];
      var list = cal.days || [];
      for (var j = 0; j < list.length; j++) {
        var day = list[j];
        var isMy = !day.custody || day.custody.isMyDay !== false;
        if (myDaysOnly && day.custody && day.custody.isMyDay === false) {
          days.push({
            date: day.date,
            dateObj: new Date(day.date + 'T12:00:00'),
            activities: [],
            custody: day.custody,
            skipContent: true,
          });
        } else {
          days.push({
            date: day.date,
            dateObj: new Date(day.date + 'T12:00:00'),
            activities: day.activities || [],
            custody: day.custody || null,
            skipContent: false,
          });
        }
      }
    }
    return days;
  }

  function scaleForPeriod(periodKey, numWeeks) {
    if (periodKey === '1w') return { cell: 7.5, header: 8.5, sec: 6, title: 13, pad: 4 };
    if (periodKey === '2w') return { cell: 6.5, header: 7.5, sec: 5.5, title: 12, pad: 3 };
    return { cell: 5.5, header: 6.5, sec: 5, title: 11, pad: 2 };
  }

  function buildDayCell(day, sc, myDaysOnly) {
    var d = day.dateObj;
    var dayFull = DAY_NAMES_FULL[d.getDay()];
    var dayNum = d.getDate();
    var monthNum = d.getMonth() + 1;
    var borderColor = (day.custody && day.custody.color) || '#1B2340';
    var muted = day.skipContent;
    var headBg = muted ? '#E5E7EB' : borderColor;
    var headColor = muted ? '#6B7280' : '#fff';

    var html = '<div class="day-cell' + (muted ? ' day-muted' : '') + '" style="border-color:' + esc(borderColor) + ';">' +
      '<div class="day-head" style="background:' + headBg + ';color:' + headColor + ';font-size:' + sc.header + 'px;padding:' + sc.pad + 'px ' + (sc.pad + 2) + 'px;">' +
      esc(dayFull) + '<br><span style="font-size:' + (sc.header - 1) + 'px;opacity:0.85;">' + dayNum + '/' + monthNum + '</span></div>' +
      '<div class="day-body" style="padding:' + sc.pad + 'px;font-size:' + sc.cell + 'px;">';

    if (muted) {
      html += '<div style="color:#aaa;font-style:italic;font-size:' + sc.cell + 'px;">–</div>';
    } else if (!day.activities.length) {
      html += '<div style="color:#aaa;font-style:italic;">–</div>';
    } else {
      var grouped = {};
      for (var i = 0; i < day.activities.length; i++) {
        var item = day.activities[i];
        var sec = item.section || 'dag';
        if (!grouped[sec]) grouped[sec] = [];
        grouped[sec].push(item);
      }
      for (var s = 0; s < SECTION_ORDER.length; s++) {
        var key = SECTION_ORDER[s];
        if (!grouped[key]) continue;
        html += '<div class="sec-label" style="font-size:' + sc.sec + 'px;">' + SECTION_LABELS[key] + '</div>';
        for (var k = 0; k < grouped[key].length; k++) {
          var act = grouped[key][k];
          var check = act.completed ? '☑' : '☐';
          var timeStr = act.start_time ? ' <span style="color:#888;">' + esc(act.start_time) + '</span>' : '';
          html += '<div class="act-row" style="font-size:' + sc.cell + 'px;line-height:1.25;">' +
            check + ' ' + (act.icon || '') + ' ' + esc(act.name) + timeStr + '</div>';
        }
      }
    }

    html += '</div></div>';
    return html;
  }

  function buildPrintHtml(opts) {
    var child = opts.child;
    var days = opts.days;
    var periodKey = opts.periodKey || '1w';
    var period = PERIODS[periodKey] || PERIODS['1w'];
    var myDaysOnly = Boolean(opts.myDaysOnly);
    var sc = scaleForPeriod(periodKey, period.weeks);
    var rows = period.weeks;
    var titleSuffix = myDaysOnly ? 'Mina dagar' : 'Schema';
    var rangeStart = days[0] ? days[0].dateObj : new Date();
    var rangeEnd = days[days.length - 1] ? days[days.length - 1].dateObj : rangeStart;

    var cells = '';
    for (var i = 0; i < days.length; i++) {
      cells += buildDayCell(days[i], sc, myDaysOnly);
    }

    var styles = [
      '@page { size: A4 landscape; margin: 5mm; }',
      '* { box-sizing: border-box; }',
      'html, body { margin: 0; padding: 0; height: 100%; font-family: "Plus Jakarta Sans", Arial, sans-serif; color: #1B2340; }',
      '.sheet { display: flex; flex-direction: column; height: 100vh; max-height: 190mm; }',
      '.top { display: flex; align-items: center; gap: 8px; padding-bottom: 4px; margin-bottom: 4px; border-bottom: 2px solid #1B2340; flex-shrink: 0; }',
      '.top h1 { font-family: Outfit, Arial, sans-serif; font-size: ' + sc.title + 'px; margin: 0; }',
      '.top p { margin: 2px 0 0; font-size: ' + (sc.title - 3) + 'px; color: #5A6178; }',
      '.grid { flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); grid-template-rows: repeat(' + rows + ', 1fr); gap: 2px; min-height: 0; }',
      '.day-cell { border: 1px solid #ccc; border-radius: 3px; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }',
      '.day-muted { opacity: 0.55; }',
      '.day-head { font-weight: 700; line-height: 1.15; flex-shrink: 0; }',
      '.day-body { flex: 1; overflow: hidden; min-height: 0; }',
      '.sec-label { color: #888; font-weight: 700; margin: 2px 0 1px; }',
      '.act-row { padding: 1px 0; border-bottom: 1px solid #f0f0f0; word-break: break-word; }',
    ].join('\n');

    var body = '<div class="sheet">' +
      '<div class="top">' +
      '<span style="font-size:1.4em;">' + avatarHtml(child, 28) + '</span>' +
      '<div><h1>' + esc(child.name) + ' — ' + titleSuffix + '</h1>' +
      '<p>' + esc(period.label) + ' · ' + esc(fmtRangeLabel(rangeStart, rangeEnd)) + '</p></div></div>' +
      '<div class="grid">' + cells + '</div></div>';

    return { styles: styles, body: body, title: titleSuffix + ' — ' + (child.name || 'Barn') };
  }

  function openPrintWindow(doc, autoPrint) {
    var win = window.open('', '_blank', 'width=1100,height=700');
    if (!win) return null;
    win.document.write(
      '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8">' +
      '<title>' + esc(doc.title) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">' +
      '<style>' + doc.styles + '</style></head><body>' + doc.body + '</body></html>'
    );
    win.document.close();
    win.focus();
    if (autoPrint !== false) {
      setTimeout(function () { win.print(); }, 600);
    }
    return win;
  }

  async function loadAndBuild(child, options) {
    var apiFetch = options.apiFetch || root.apiFetch;
    var periodKey = options.periodKey || '1w';
    var period = PERIODS[periodKey] || PERIODS['1w'];
    var weekOffset = options.weekOffset || 0;
    var myDaysOnly = Boolean(options.myDaysOnly);

    var weeks = await fetchWeeks(child.id, weekOffset, period.weeks, myDaysOnly, apiFetch);
    var days = flattenWeekDays(weeks, myDaysOnly);

    if (myDaysOnly) {
      var hasAny = days.some(function (d) { return !d.skipContent && d.activities.length > 0; });
      if (!hasAny) throw new Error('no_my_days');
    }

    return buildPrintHtml({
      child: child,
      days: days,
      periodKey: periodKey,
      myDaysOnly: myDaysOnly,
    });
  }

  root.PrintSchemaCore = {
    PERIODS: PERIODS,
    mondayOf: mondayOf,
    addDays: addDays,
    fmtSvDate: fmtSvDate,
    fmtRangeLabel: fmtRangeLabel,
    fetchWeeks: fetchWeeks,
    flattenWeekDays: flattenWeekDays,
    buildPrintHtml: buildPrintHtml,
    openPrintWindow: openPrintWindow,
    loadAndBuild: loadAndBuild,
  };
})(window);
