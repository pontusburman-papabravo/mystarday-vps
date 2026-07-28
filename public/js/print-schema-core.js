/**
 * print-schema-core.js — Shared schedule print layout (1/2 weeks, 1 month on one A4 page).
 */
(function (root) {
  'use strict';

  const SECTION_EMOJI = { morgon: '🌅', dag: '☀️', kvall: '🌆', natt: '🌙' };
  const SECTION_ORDER = ['morgon', 'dag', 'kvall', 'natt'];

  const PERIODS_FALLBACK = {
    '1w': { days: 7, weeks: 1, label: '1 vecka' },
    '2w': { days: 14, weeks: 2, label: '2 veckor' },
    '1m': { days: 28, weeks: 4, label: '1 månad' },
  };

  const DAY_NAMES_FALLBACK = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];

  function tKey(key, fallback) {
    if (typeof root.pt !== 'function') return fallback;
    const val = root.pt(key);
    return val && val !== key ? val : fallback;
  }

  function getPeriods() {
    return {
      '1w': { days: 7, weeks: 1, label: tKey('printSchema.period.1w', PERIODS_FALLBACK['1w'].label) },
      '2w': { days: 14, weeks: 2, label: tKey('printSchema.period.2w', PERIODS_FALLBACK['2w'].label) },
      '1m': { days: 28, weeks: 4, label: tKey('printSchema.period.1m', PERIODS_FALLBACK['1m'].label) },
    };
  }

  function stockholmTodayIso() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  function weekdayLong(dateObj) {
    if (root.LocaleDateTime && typeof root.LocaleDateTime.weekdayLong === 'function') {
      return root.LocaleDateTime.weekdayLong(dateObj);
    }
    return DAY_NAMES_FALLBACK[dateObj.getDay()];
  }

  function formatDaySubline(dateObj) {
    if (root.LocaleDateTime && typeof root.LocaleDateTime.formatWithIntl === 'function') {
      return root.LocaleDateTime.formatWithIntl(dateObj, { day: 'numeric', month: 'short' });
    }
    return dateObj.getDate() + '/' + (dateObj.getMonth() + 1);
  }

  function fmtRangeLabel(start, end) {
    if (root.LocaleDateTime && typeof root.LocaleDateTime.formatWithIntl === 'function') {
      const fmt = root.LocaleDateTime.formatWithIntl;
      const opts = { day: 'numeric', month: 'short' };
      const y = { day: 'numeric', month: 'short', year: 'numeric' };
      if (start.getFullYear() === end.getFullYear()) {
        return fmt(start, opts) + ' – ' + fmt(end, y);
      }
      return fmt(start, y) + ' – ' + fmt(end, y);
    }
    const svOpts = { day: 'numeric', month: 'short' };
    const svY = { day: 'numeric', month: 'short', year: 'numeric' };
    if (start.getFullYear() === end.getFullYear()) {
      return start.toLocaleDateString('sv-SE', svOpts) + ' – ' + end.toLocaleDateString('sv-SE', svY);
    }
    return start.toLocaleDateString('sv-SE', svY) + ' – ' + end.toLocaleDateString('sv-SE', svY);
  }

  function fmtSvDate(d) {
    if (root.LocaleDateTime && typeof root.LocaleDateTime.isoDateInLocale === 'function') {
      const iso = d.toISOString().slice(0, 10);
      return root.LocaleDateTime.isoDateInLocale(iso);
    }
    return d.toLocaleDateString('sv-SE');
  }

  function esc(str) {
    return typeof root.escapeHtml === 'function' ? root.escapeHtml(str) : String(str || '');
  }

  function avatarHtml(child, size) {
    return typeof root.renderChildAvatar === 'function' ? root.renderChildAvatar(child, size) : '';
  }

  function mondayOf(dateInput) {
    const d = dateInput instanceof Date ? new Date(dateInput) : new Date(String(dateInput) + 'T12:00:00');
    const dow = d.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + offset);
    return d;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function htmlLang() {
    if (root.I18n && typeof root.I18n.getCurrentLang === 'function') {
      return root.I18n.getCurrentLang() === 'en-GB' ? 'en-GB' : 'sv-SE';
    }
    return 'sv-SE';
  }

  async function fetchWeeks(childId, weekOffsetStart, numWeeks, myDaysOnly, apiFetch) {
    const weeks = [];
    for (let w = 0; w < numWeeks; w++) {
      const weekOffset = weekOffsetStart + w;
      let qs = 'weekOffset=' + encodeURIComponent(weekOffset);
      if (myDaysOnly) qs += '&myDays=1';
      const res = await apiFetch('/api/children/' + childId + '/calendar-week?' + qs);
      if (!res.ok) throw new Error('calendar-week');
      weeks.push(await res.json());
    }
    return weeks;
  }

  function flattenWeekDays(weeks, myDaysOnly) {
    const days = [];
    for (let i = 0; i < weeks.length; i++) {
      const cal = weeks[i];
      const list = cal.days || [];
      for (let j = 0; j < list.length; j++) {
        const day = list[j];
        const isMy = !day.custody || day.custody.isMyDay !== false;
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

  function maxActivitiesInDays(days) {
    let max = 0;
    for (let i = 0; i < days.length; i++) {
      if (days[i].skipContent) continue;
      max = Math.max(max, (days[i].activities || []).length);
    }
    return max;
  }

  function scaleForPeriod(periodKey, maxActs, mode) {
    let base;
    if (periodKey === '1w') base = { cell: 7.5, header: 8.5, sec: 6, title: 13, pad: 4, target: 12 };
    else if (periodKey === '2w') base = { cell: 6.5, header: 7.5, sec: 5.5, title: 12, pad: 3, target: 9 };
    else base = { cell: 5.5, header: 6.5, sec: 5, title: 11, pad: 2, target: 6 };

    if (mode === 'preview') {
      return {
        cell: Math.max(base.cell, 9),
        header: Math.max(base.header, 10),
        sec: Math.max(base.sec, 7),
        title: 14,
        pad: 5,
      };
    }

    let factor = 1;
    if (maxActs > base.target) {
      factor = Math.max(0.52, base.target / maxActs);
    }
    return {
      cell: Math.max(4.5, base.cell * factor),
      header: Math.max(5.5, base.header * factor),
      sec: Math.max(4, base.sec * factor),
      title: base.title,
      pad: Math.max(1, Math.round(base.pad * factor)),
    };
  }

  function buildDayCell(day, sc) {
    const d = day.dateObj;
    const dayFull = weekdayLong(d);
    const daySub = formatDaySubline(d);
    const emptyCell = tKey('printSchema.layout.emptyCell', '–');
    const borderColor = (day.custody && day.custody.color) || '#1B2340';
    const muted = day.skipContent;
    const headBg = muted ? '#E5E7EB' : borderColor;
    const headColor = muted ? '#6B7280' : '#fff';

    let html = '<div class="day-cell' + (muted ? ' day-muted' : '') + '" style="border-color:' + esc(borderColor) + ';">' +
      '<div class="day-head" style="background:' + headBg + ';color:' + headColor + ';font-size:' + sc.header + 'px;padding:' + sc.pad + 'px ' + (sc.pad + 2) + 'px;">' +
      esc(dayFull) + '<br><span style="font-size:' + (sc.header - 1) + 'px;opacity:0.85;">' + esc(daySub) + '</span></div>' +
      '<div class="day-body" style="padding:' + sc.pad + 'px;font-size:' + sc.cell + 'px;">';

    if (muted) {
      html += '<div style="color:#aaa;font-style:italic;font-size:' + sc.cell + 'px;">' + esc(emptyCell) + '</div>';
    } else if (!day.activities.length) {
      html += '<div style="color:#aaa;font-style:italic;">' + esc(emptyCell) + '</div>';
    } else {
      const grouped = {};
      for (let i = 0; i < day.activities.length; i++) {
        const item = day.activities[i];
        const sec = item.section || 'dag';
        if (!grouped[sec]) grouped[sec] = [];
        grouped[sec].push(item);
      }
      for (let s = 0; s < SECTION_ORDER.length; s++) {
        const key = SECTION_ORDER[s];
        if (!grouped[key]) continue;
        html += '<div class="sec-label" style="font-size:' + sc.sec + 'px;">' + SECTION_EMOJI[key] + '</div>';
        for (let k = 0; k < grouped[key].length; k++) {
          const act = grouped[key][k];
          const check = act.completed ? '☑' : '☐';
          const timeStr = act.start_time ? ' <span style="color:#888;">' + esc(act.start_time) + '</span>' : '';
          html += '<div class="act-row" style="font-size:' + sc.cell + 'px;line-height:1.25;">' +
            check + ' ' + (act.icon || '') + ' ' + esc(act.name) + timeStr + '</div>';
        }
      }
    }

    html += '</div></div>';
    return html;
  }

  function buildPrintHtml(opts) {
    const child = opts.child;
    const days = opts.days;
    const periodKey = opts.periodKey || '1w';
    const periods = getPeriods();
    const period = periods[periodKey] || periods['1w'];
    const myDaysOnly = Boolean(opts.myDaysOnly);
    const mode = opts.mode === 'preview' ? 'preview' : 'print';
    const maxActs = maxActivitiesInDays(days);
    const sc = scaleForPeriod(periodKey, maxActs, mode);
    const rows = period.weeks;
    const titleSuffix = myDaysOnly
      ? tKey('printSchema.layout.titleMyDays', 'Mina dagar')
      : tKey('printSchema.layout.titleSchedule', 'Schema');
    const rangeStart = days[0] ? days[0].dateObj : new Date();
    const rangeEnd = days[days.length - 1] ? days[days.length - 1].dateObj : rangeStart;
    const rowSizing = 'auto';

    let cells = '';
    for (let i = 0; i < days.length; i++) {
      cells += buildDayCell(days[i], sc);
    }

    const styles = [
      '@page { size: A4 landscape; margin: 5mm; }',
      '* { box-sizing: border-box; }',
      'html, body { margin: 0; padding: 0; font-family: "Plus Jakarta Sans", Arial, sans-serif; color: #1B2340; }',
      '.sheet { display: flex; flex-direction: column; }',
      '.sheet-preview { height: auto; padding: 4px; }',
      '.sheet-preview .grid { min-width: 640px; }',
      '.sheet-print { height: auto; }',
      '.top { display: flex; align-items: center; gap: 8px; padding-bottom: 4px; margin-bottom: 4px; border-bottom: 2px solid #1B2340; flex-shrink: 0; }',
      '.top h1 { font-family: Outfit, Arial, sans-serif; font-size: ' + sc.title + 'px; margin: 0; }',
      '.top p { margin: 2px 0 0; font-size: ' + (sc.title - 3) + 'px; color: #5A6178; }',
      '.grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-template-rows: repeat(' + rows + ', ' + rowSizing + '); gap: 2px; }',
      '.day-cell { border: 1px solid #ccc; border-radius: 3px; display: flex; flex-direction: column; min-width: 0; }',
      '.day-muted { opacity: 0.55; }',
      '.day-head { font-weight: 700; line-height: 1.15; flex-shrink: 0; }',
      '.day-body { flex: 1; overflow: visible; min-height: 0; }',
      '.sec-label { color: #888; font-weight: 700; margin: 2px 0 1px; }',
      '.act-row { padding: 1px 0; border-bottom: 1px solid #f0f0f0; word-break: break-word; }',
      '@media print {',
      '  .sheet-print { height: auto; max-height: none; page-break-inside: avoid; }',
      '  .day-cell { break-inside: avoid; }',
      '}',
    ].join('\n');

    const body = '<div class="sheet sheet-' + mode + '">' +
      '<div class="top">' +
      '<span style="font-size:1.4em;">' + avatarHtml(child, 28) + '</span>' +
      '<div><h1>' + esc(child.name) + ' — ' + titleSuffix + '</h1>' +
      '<p>' + esc(period.label) + ' · ' + esc(fmtRangeLabel(rangeStart, rangeEnd)) + '</p></div></div>' +
      '<div class="grid">' + cells + '</div></div>';

    const childFallback = tKey('printSchema.layout.childFallback', 'Barn');
    return {
      styles: styles,
      body: body,
      title: titleSuffix + ' — ' + (child.name || childFallback),
      mode: mode,
      myDaysOnly: myDaysOnly,
    };
  }

  function writePrintDocument(win, doc) {
    if (!win || win.closed) return false;
    win.document.open();
    win.document.write(
      '<!DOCTYPE html><html lang="' + htmlLang() + '"><head><meta charset="UTF-8">' +
      '<title>' + esc(doc.title) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">' +
      '<style>' + doc.styles + '</style></head><body>' + doc.body + '</body></html>'
    );
    win.document.close();
    return true;
  }

  function buildLoadingHtml() {
    const lang = htmlLang();
    const title = tKey('printSchema.layout.loadingPrint', 'Förbereder utskrift…');
    return '<!DOCTYPE html><html lang="' + lang + '"><head><meta charset="UTF-8">' +
      '<title>' + esc(title) + '</title>' +
      '<style>body{margin:0;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#1B2340;}</style>' +
      '</head><body><p>' + esc(title) + '</p></body></html>';
  }

  function writeLoadingDocument(win) {
    if (!win || win.closed) return false;
    win.document.open();
    win.document.write(buildLoadingHtml());
    win.document.close();
    return true;
  }

  function safePdfFilename(name) {
    const cleaned = String(name || '').trim().replace(/[^a-zA-Z0-9\u00C0-\u017E _-]/g, '').trim();
    const slug = cleaned.replace(/\s+/g, '-').toLowerCase();
    return slug || tKey('printSchema.filename.fallbackSlug', 'barn');
  }

  function buildPdfFilename(childName, myDaysOnly) {
    const prefix = myDaysOnly
      ? tKey('printSchema.filename.prefixMyDays', 'min-stjarndag-mina-dagar')
      : tKey('printSchema.filename.prefixSchedule', 'min-stjarndag-veckoschema');
    return prefix + '-' + safePdfFilename(childName) + '-' + stockholmTodayIso() + '.pdf';
  }

  async function downloadPdf(doc, opts) {
    opts = opts || {};
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
      throw new Error('pdf_libs_missing');
    }

    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = 'position:fixed;left:-10000px;top:0;width:1123px;padding:8px;background:#fff;z-index:-1;overflow:visible;';
    container.innerHTML = '<style>' + doc.styles + '</style>' + doc.body;
    document.body.appendChild(container);

    const sheet = container.querySelector('.sheet');
    if (!sheet) {
      document.body.removeChild(container);
      throw new Error('no_sheet');
    }

    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (_) {}
    }
    await new Promise(function (r) { setTimeout(r, 400); });

    const canvas = await html2canvas(sheet, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: sheet.scrollWidth,
      height: sheet.scrollHeight,
      logging: false,
    });

    document.body.removeChild(container);

    const pdf = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png', 0.92);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    const imgRatio = canvas.width / canvas.height;
    let renderW;
    let renderH;
    if (imgRatio > maxW / maxH) {
      renderW = maxW;
      renderH = maxW / imgRatio;
    } else {
      renderH = maxH;
      renderW = maxH * imgRatio;
    }
    const offsetX = (pageWidth - renderW) / 2;
    const offsetY = (pageHeight - renderH) / 2;
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderW, renderH);

    const filename = buildPdfFilename(opts.childName || doc.title, Boolean(opts.myDaysOnly || doc.myDaysOnly));
    const blob = pdf.output('blob');

    if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
      try {
        const shareFile = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [shareFile] })) {
          await navigator.share({ files: [shareFile], title: filename });
          return { method: 'share', filename: filename };
        }
      } catch (err) {
        if (err && err.name === 'AbortError') {
          return { method: 'cancelled', filename: filename };
        }
      }
    }

    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      return { method: 'download', filename: filename };
    } catch (_) {
      pdf.save(filename);
      return { method: 'save', filename: filename };
    }
  }

  function createPrintIframe() {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('title', tKey('printSchema.layout.iframeTitle', 'Utskrift'));
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;clip:rect(0,0,0,0);overflow:hidden;';
    iframe.setAttribute('data-print-schema-frame', '1');
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (!win || !writeLoadingDocument(win)) {
      try { iframe.remove(); } catch (_) {}
      return null;
    }
    return iframe;
  }

  function resolvePrintWindow(placeholder) {
    if (!placeholder) return null;
    if (placeholder.type === 'window') return placeholder.target;
    if (placeholder.type === 'iframe' && placeholder.target) {
      return placeholder.target.contentWindow || null;
    }
    return placeholder;
  }

  /** Open print target synchronously (must run inside a user click). Falls back to hidden iframe on mobile/PWA. */
  function openPrintPlaceholder() {
    const win = window.open('about:blank', '_blank', 'width=1100,height=700');
    if (win && writeLoadingDocument(win)) {
      return { type: 'window', target: win };
    }
    const iframe = createPrintIframe();
    if (iframe) return { type: 'iframe', target: iframe };
    return null;
  }

  function closePrintPlaceholder(placeholder) {
    if (!placeholder) return;
    if (placeholder.type === 'window' && placeholder.target) {
      try { placeholder.target.close(); } catch (_) {}
    }
    if (placeholder.type === 'iframe' && placeholder.target) {
      try { placeholder.target.remove(); } catch (_) {}
    }
  }

  function openPrintWindow(doc, autoPrint, placeholder) {
    let active = placeholder;
    let win = resolvePrintWindow(active);
    if (!win) {
      win = window.open('about:blank', '_blank', 'width=1100,height=700');
      if (win) {
        active = { type: 'window', target: win };
      } else {
        const iframe = createPrintIframe();
        if (!iframe) return null;
        active = { type: 'iframe', target: iframe };
        win = iframe.contentWindow;
      }
    }
    if (!win || !writePrintDocument(win, doc)) return null;
    const isIframe = active && active.type === 'iframe';
    try { win.focus(); } catch (_) {}
    if (autoPrint !== false) {
      setTimeout(function () {
        if (isIframe) {
          if (!active.target.parentNode) return;
        } else if (!win || win.closed) {
          return;
        }
        try { win.print(); } catch (_) {}
        if (isIframe) {
          setTimeout(function () {
            try { active.target.remove(); } catch (_) {}
          }, 1500);
        }
      }, 600);
    }
    return active;
  }

  async function loadAndBuild(child, options) {
    const apiFetch = options.apiFetch || root.apiFetch;
    const periodKey = options.periodKey || '1w';
    const period = getPeriods()[periodKey] || getPeriods()['1w'];
    const weekOffset = options.weekOffset || 0;
    const myDaysOnly = Boolean(options.myDaysOnly);

    const weeks = await fetchWeeks(child.id, weekOffset, period.weeks, myDaysOnly, apiFetch);
    const days = flattenWeekDays(weeks, myDaysOnly);

    if (myDaysOnly) {
      const hasAny = days.some(function (d) { return !d.skipContent && d.activities.length > 0; });
      if (!hasAny) throw new Error('no_my_days');
    }

    return buildPrintHtml({
      child: child,
      days: days,
      periodKey: periodKey,
      myDaysOnly: myDaysOnly,
      mode: options.mode,
    });
  }

  root.PrintSchemaCore = {
    getPeriods: getPeriods,
    mondayOf: mondayOf,
    addDays: addDays,
    fmtSvDate: fmtSvDate,
    fmtRangeLabel: fmtRangeLabel,
    buildPdfFilename: buildPdfFilename,
    safePdfFilename: safePdfFilename,
    stockholmTodayIso: stockholmTodayIso,
    fetchWeeks: fetchWeeks,
    flattenWeekDays: flattenWeekDays,
    buildPrintHtml: buildPrintHtml,
    openPrintPlaceholder: openPrintPlaceholder,
    closePrintPlaceholder: closePrintPlaceholder,
    openPrintWindow: openPrintWindow,
    downloadPdf: downloadPdf,
    loadAndBuild: loadAndBuild,
  };
})(window);
