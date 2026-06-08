/**
 * Professional report PDF generator (backend fallback).
 * Owns: PDFKit document creation, layout, and streaming for the formal 2-page PDF.
 * Does NOT own: auth, data fetching, playful PDF export.
 *
 * WHY bufferPages: PDFKit 0.15 requires bufferPages:true to call switchToPage().
 * WHY manual centering: align:'center' + width in footer causes extra blank pages
 * near the page bottom; widthOfString avoids the issue.
 */

const MONTHS_SV = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];

const NAVY  = '#1C2340';
const AMBER = '#F5A623';
const GRAY  = '#5A6378';
const LGRAY = '#E8E4DC';
const WHITE = '#FFFFFF';
const RED   = '#EF4444';
const GREEN = '#22C55E';

const pad = (n) => String(n < 10 ? '0' + n : n);
const fmtDate = (str) => {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.getDate() + ' ' + MONTHS_SV[d.getMonth()];
};
const sectionLabel = (sec) => {
  const map = { morgon: 'Morgon', fm: 'Morgon', dag: 'Dag', em: 'Dag', kvall: 'Kväll', evening: 'Kväll', natt: 'Natt', other: 'Övrigt' };
  return map[sec?.toLowerCase()] || (sec ? sec.charAt(0).toUpperCase() + sec.slice(1) : 'Övrigt');
};

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

function fmtWeek(dates) {
  if (!dates || dates.length === 0) return 'v.?';
  const sorted = [...dates].sort();
  const startD = new Date(sorted[0] + 'T00:00:00');
  const endD   = new Date(sorted[sorted.length - 1] + 'T00:00:00');
  return startD.getDate() + ' ' + MONTHS_SV[startD.getMonth()] + '–' + endD.getDate() + ' ' + MONTHS_SV[endD.getMonth()];
}

/**
 * Generate a formal 2-page PDF and stream it to `stream`.
 * @param {import('stream').Writable} stream - typically Express res
 * @param {{ link, fields, blocks, dateFrom, dateTo }} opts
 */
function generateReportPdf(stream, { link, fields, blocks, dateFrom, dateTo }) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({
    bufferPages: true,
    margin: 40,
    size: 'A4',
    info: {
      Title: link.label || 'Rapport',
      Author: 'Min Stjärndag',
      Creator: 'Min Stjärndag',
    },
  });

  doc.on('error', (err) => {
    console.error('[REPORT-PDF] doc.error:', err);
    if (!stream.destroyed) stream.destroy();
  });
  doc.pipe(stream);

  const PAGE_W = doc.page.width - 80;
  const now = new Date();

  // ── Helpers ─────────────────────────────────────────
  function pill(title, y) {
    doc.fillColor(NAVY).fontSize(10).font('Helvetica-Bold')
       .text(title, 40, y, { lineBreak: false });
    doc.rect(40, y + 12, PAGE_W, 1).fill(NAVY);
  }

  function needPage(minH) {
    if (doc.y + minH > doc.page.height - 50) {
      doc.addPage();
      return true;
    }
    return false;
  }

  // ══════════════════════════════════════════════════════
  // PAGE 1 — Översikt
  // ══════════════════════════════════════════════════════
  doc.rect(0, 0, doc.page.width, 42).fill(NAVY);
  doc.fillColor(WHITE).fontSize(14).font('Helvetica-Bold')
     .text('Min Stjärndag', 40, 10, { lineBreak: false });
  const childLabelHeader = link.anonymous
    ? link.label || 'Rapport'
    : (link.child_name ? link.child_name : (link.label || 'Rapport'));
  doc.fillColor('#C9D0D8').fontSize(9).font('Helvetica')
     .text(childLabelHeader + ' · ' + fmtDate(dateFrom) + '–' + fmtDate(dateTo) + ' · Genererad ' + now.getDate() + ' ' + MONTHS_SV[now.getMonth()] + ' ' + now.getFullYear(), 40, 27, { lineBreak: false });

  doc.y = 52;

  // Disclaimer
  let disclaimerText = 'OBS: Sammanställning vald av vårdnadshavare. Ersätter inte journalföring.';
  if (link.anonymous) disclaimerText += ' Barnets namn och identifiering har anonymiserats.';
  doc.fillColor(GRAY).fontSize(7).font('Helvetica')
     .text(disclaimerText, 40, doc.y, { width: PAGE_W });
  doc.y += 14;

  // Parent summary
  if (link.parent_summary && link.parent_summary.trim()) {
    pill('Sammanfattning från vårdnadshavare', doc.y);
    doc.y += 20;
    const summaryText = link.parent_summary.trim();
    const truncated = summaryText.length > 200 ? summaryText.slice(0, 197) + '...' : summaryText;
    doc.fillColor(NAVY).fontSize(10).font('Helvetica-Oblique')
       .text('"' + truncated + '"', 58, doc.y, { width: PAGE_W - 16 });
    doc.y += 18;
  }

  // Two-column layout
  needPage(200);
  const colW = PAGE_W / 2 - 8;
  const col1X = 40;
  const col2X = 40 + colW + 16;

  // LEFT: Section completion
  pill('Genomförande per dagdel', doc.y);
  let y1 = doc.y + 20;
  const sectionOrder = ['Morgon', 'Dag', 'Kväll', 'Natt'];
  const sections = (blocks.section_summary || [])
    .map((s) => ({ label: sectionLabel(s.section), pct: s.completion_pct || 0 }))
    .sort((a, b) => {
      const ai = sectionOrder.indexOf(a.label);
      const bi = sectionOrder.indexOf(b.label);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  if (sections.length === 0) {
    doc.fillColor(GRAY).fontSize(9).font('Helvetica-Oblique')
       .text('Ingen data för perioden', col1X, y1);
    y1 += 14;
  } else {
    const barMaxW = 100;
    const barH = 8;
    const rowH = 18;
    sections.forEach((s) => {
      const barColor = s.pct >= 80 ? GREEN : s.pct >= 50 ? AMBER : RED;
      doc.fillColor(GRAY).fontSize(9).font('Helvetica')
         .text(s.label, col1X, y1, { lineBreak: false });
      doc.rect(col1X + 60, y1 + 1, barMaxW, barH).fill(LGRAY);
      const fillW = Math.round(barMaxW * s.pct / 100);
      doc.rect(col1X + 60, y1 + 1, fillW, barH).fill(barColor);
      doc.fillColor(NAVY).fontSize(8).font('Helvetica-Bold')
         .text(s.pct + '%', col1X + 60 + barMaxW + 4, y1, { lineBreak: false });
      y1 += rowH;
    });
  }

  // RIGHT: Stars + Rewards
  pill('Stjärnor & Belöningar', doc.y);
  let y2 = doc.y + 20;

  if (fields.includes('stars') && blocks.stars && blocks.stars.total != null) {
    doc.fillColor(AMBER).fontSize(38).font('Helvetica-Bold')
       .text(String(blocks.stars.total), col2X, y2);
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
       .text('intjänade stjärnor', col2X, y2 + 32);
    y2 += 50;
  } else {
    doc.fillColor(GRAY).fontSize(9).font('Helvetica-Oblique')
       .text('Stjärnor: ingen data', col2X, y2);
    y2 += 14;
  }

  if (fields.includes('rewards') && blocks.rewards && blocks.rewards.counts && blocks.rewards.counts.length > 0) {
    const statusLabel = (s) => s === 'approved' ? 'Godkända' : s === 'pending' ? 'Väntande' : s === 'denied' ? 'Avslagna' : s;
    const counts = blocks.rewards.counts.map((r) => String(r.count) + ' ' + statusLabel(r.status)).join(' · ');
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
       .text(counts, col2X, y2);
    y2 += 14;
  }

  doc.y = Math.max(y1, y2) + 16;

  // Weekly bar chart
  needPage(110);
  pill('Genomförande över tid', doc.y);
  doc.y += 20;

  const completion = blocks.completion || [];
  const weekMap = {};
  completion.forEach((r) => {
    if (r.total === 0) return;
    const d = new Date(r.date + 'T00:00:00');
    const iso = getISOWeek(d);
    const wk = iso.week;
    const yr = iso.year;
    const key = yr + '-v' + pad(wk);
    if (!weekMap[key]) weekMap[key] = { done: 0, total: 0, dates: [] };
    weekMap[key].done += r.completed;
    weekMap[key].total += r.total;
    weekMap[key].dates.push(r.date);
  });

  const weekEntries = Object.entries(weekMap).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 5);
  if (weekEntries.length === 0) {
    doc.fillColor(GRAY).fontSize(9).font('Helvetica-Oblique')
       .text('Ingen data för perioden', 40, doc.y);
    doc.y += 16;
  } else {
    const chartX = 40;
    const chartY = doc.y;
    const chartW = PAGE_W;
    const chartH = 70;
    const chartPad = 30;

    [0, 50, 100].forEach((pct) => {
      const yLine = chartY + chartH - Math.round(chartH * pct / 100);
      doc.strokeColor('#CCCCCC').lineWidth(0.5)
         .moveTo(chartX + chartPad, yLine)
         .lineTo(chartX + chartPad + chartW - chartPad, yLine)
         .stroke();
      doc.fillColor('#888888').fontSize(7).font('Helvetica')
         .text(pct + '%', chartX, yLine - 4, { lineBreak: false });
    });

    const n = weekEntries.length;
    const usableW = chartW - chartPad;
    const barSlotW = usableW / n;
    const barW = Math.round(barSlotW * 0.55);
    const barGap = barSlotW * 0.45;
    const maxBarH = chartH - 10;

    weekEntries.forEach(([, data], i) => {
      const pct = Math.round((data.done / data.total) * 100);
      const barH = Math.round(maxBarH * pct / 100);
      const x0 = chartX + chartPad + i * barSlotW;
      const barTop = chartY + chartH - barH;

      doc.rect(x0 + Math.round(barGap / 2), barTop, barW, barH).fill(AMBER);

      const pctStr = pct + '%';
      doc.fontSize(7).font('Helvetica').fillColor(GRAY);
      const pctW = doc.widthOfString(pctStr);
      doc.text(pctStr, x0 + Math.round(barGap / 2) + Math.round(barW / 2) - pctW / 2, barTop - 5, { lineBreak: false });

      const weekLabel = fmtWeek(data.dates);
      doc.fontSize(7).font('Helvetica').fillColor('#888888');
      const weekLabelW = doc.widthOfString(weekLabel);
      doc.text(weekLabel, x0 + (barSlotW - weekLabelW) / 2, chartY + chartH + 3, { lineBreak: false });
    });

    doc.y = chartY + chartH + 22;
  }

  // ══════════════════════════════════════════════════════
  // PAGE 2 — Trend + Detaljer
  // ══════════════════════════════════════════════════════
  doc.addPage();
  doc.y = 40;

  pill('Genomförande – Periodöversikt', doc.y);
  doc.y += 20;

  let avgPct = 0, bestDay = null, worstDay = null, bestPct = -1, worstPct = 101;
  let daysWithData = 0;

  if (completion.length > 0) {
    const withData = completion.filter((r) => r.total > 0);
    if (withData.length > 0) {
      daysWithData = withData.length;
      const sum = withData.reduce((acc, r) => acc + (r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0), 0);
      avgPct = Math.round(sum / withData.length);
      withData.forEach((r) => {
        const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
        if (pct >= bestPct) { bestPct = pct; bestDay = r.date; }
        if (pct <= worstPct) { worstPct = pct; worstDay = r.date; }
      });
    }
  }

  const statW = PAGE_W / 4 - 4;
  const statRow = doc.y;
  if (completion.length > 0 && daysWithData > 0) {
    const stats = [
      { label: 'Genomsnitt', value: avgPct + '%' },
      { label: 'Bästa dagen', value: fmtDate(bestDay) + ' (' + bestPct + '%)' },
      { label: 'Sämsta dagen', value: fmtDate(worstDay) + ' (' + worstPct + '%)' },
      { label: 'Dagar m. data', value: String(daysWithData) },
    ];
    stats.forEach((s, i) => {
      const sx = 40 + i * (statW + 4);
      doc.rect(sx, statRow, statW, 38).fill('#F8F6F1');
      doc.fillColor(GRAY).fontSize(8).font('Helvetica')
         .text(s.label, sx + 4, statRow + 4, { lineBreak: false });
      doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold')
         .text(s.value, sx + 4, statRow + 16, { lineBreak: false });
    });
    doc.y = statRow + 44;
  } else {
    doc.fillColor(GRAY).fontSize(9).font('Helvetica-Oblique')
       .text('Ingen data för perioden', 40, doc.y);
    doc.y += 20;
  }

  // Weekly rollup table
  needPage(40);
  doc.y += 6;
  pill('Veckovis sammanfattning', doc.y);
  doc.y += 20;

  if (weekEntries.length === 0) {
    doc.fillColor(GRAY).fontSize(9).font('Helvetica-Oblique')
       .text('Ingen data för perioden', 40, doc.y);
    doc.y += 16;
  } else {
    const tCol = [40, 175, 245, 305];
    doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold')
       .text('Period', tCol[0], doc.y, { lineBreak: false })
       .text('Utförda', tCol[1], doc.y, { lineBreak: false })
       .text('Totalt', tCol[2], doc.y, { lineBreak: false })
       .text('%', tCol[3], doc.y, { lineBreak: false });
    doc.y += 4;
    doc.rect(40, doc.y, PAGE_W, 1).fill(LGRAY);
    doc.y += 6;

    weekEntries.forEach(([, data]) => {
      needPage(14);
      const pct = Math.round((data.done / data.total) * 100);
      doc.fillColor(NAVY).fontSize(8).font('Helvetica')
         .text(fmtWeek(data.dates), tCol[0], doc.y, { lineBreak: false })
         .text(String(data.done), tCol[1], doc.y, { lineBreak: false })
         .text(String(data.total), tCol[2], doc.y, { lineBreak: false })
         .text(pct + '%', tCol[3], doc.y, { lineBreak: false });
      doc.y += 12;
    });
  }

  // Top 5 activities
  needPage(50);
  doc.y += 8;
  pill('Topp 5 aktiviteter (genomförda)', doc.y);
  doc.y += 20;

  const activityCounts = {};
  if (blocks.activities) {
    Object.values(blocks.activities).forEach((items) => {
      items.forEach((item) => {
        const name = item.activity_name || '(okänd)';
        if (!activityCounts[name]) activityCounts[name] = { done: 0, total: 0 };
        if (item.completed) activityCounts[name].done++;
        activityCounts[name].total++;
      });
    });
  }

  const top5 = Object.entries(activityCounts)
    .map(([name, c]) => ({ name, done: c.done, total: c.total }))
    .sort((a, b) => b.done - a.done)
    .slice(0, 5);

  if (top5.length === 0) {
    doc.fillColor(GRAY).fontSize(9).font('Helvetica-Oblique')
       .text('Ingen data för perioden', 50, doc.y);
    doc.y += 16;
  } else {
    top5.forEach((a, i) => {
      needPage(14);
      doc.fillColor(NAVY).fontSize(9).font('Helvetica-Bold')
         .text((i + 1) + '.', 40, doc.y, { lineBreak: false });
      doc.fillColor(NAVY).font('Helvetica').fontSize(9)
         .text(' ' + a.name, 55, doc.y, { lineBreak: false });
      doc.fillColor(GRAY).fontSize(9)
         .text(a.done + ' ggr', 310, doc.y);
      doc.y += 13;
    });
  }

  // Notes
  needPage(40);
  doc.y += 8;
  const noteLines = [];
  if (blocks.activities) {
    Object.entries(blocks.activities).forEach(([date, items]) => {
      items.forEach((item) => {
        const parts = [];
        if (item.parent_note) parts.push('(' + item.parent_note + ')');
        if (item.child_note)  parts.push('Barnet: ' + item.child_note);
        if (parts.length > 0) {
          const combined = parts.join(' ');
          const truncated = combined.length > 80 ? combined.slice(0, 77) + '...' : combined;
          noteLines.push({ date, text: truncated });
        }
      });
    });
  }

  if (noteLines.length > 0) {
    pill('Anteckningar', doc.y);
    doc.y += 20;
    noteLines.slice(0, 5).forEach((n) => {
      needPage(20);
      doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold')
         .text(n.date ? fmtDate(n.date) + ' —' : '—', 40, doc.y, { lineBreak: false });
      doc.fillColor(NAVY).fontSize(9).font('Helvetica')
         .text(n.text, 90, doc.y, { width: PAGE_W - 50 });
      doc.y += 18;
    });
  }

  // Pedagog notes
  const pedagogNotes = blocks.pedagog_notes || [];
  if (pedagogNotes.length > 0) {
    needPage(40);
    doc.y += 8;
    pill('Pedagoganteckningar', doc.y);
    doc.y += 20;

    const mealsLabelMap = { good: 'Åt bra', little: 'Åt lite', none: 'Åt ej', not_served: 'Serverades ej' };
    const sleepLabelMap  = { easy: 'Sn-snabbt', slow: 'Varvade ner', difficult: 'Svårt' };

    pedagogNotes.slice(0, 5).forEach((n) => {
      needPage(30);
      const pedagName = n.pedagog_name ? ' (' + n.pedagog_name + ')' : '';
      doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold')
         .text(fmtDate(String(n.date)) + pedagName, 40, doc.y, { lineBreak: false });
      doc.y += 12;

      if (n.mood) {
        doc.fillColor(NAVY).fontSize(9).font('Helvetica')
           .text('Humör: (' + n.mood + '/5)', 55, doc.y);
        doc.y += 11;
      }

      if (n.sleep_hours != null || n.sleep_quality) {
        const sleepParts = [];
        if (n.sleep_hours != null) {
          const hrs = parseFloat(n.sleep_hours);
          sleepParts.push(hrs === 0 ? 'Ingen vila' : hrs === 0.5 ? '30 min' : hrs < 2 ? hrs + 'h' : '2+h');
        }
        if (n.sleep_quality && sleepLabelMap[n.sleep_quality]) {
          sleepParts.push(sleepLabelMap[n.sleep_quality]);
        }
        if (sleepParts.length > 0) {
          doc.fillColor(NAVY).fontSize(9).font('Helvetica')
             .text('Sömn: ' + sleepParts.join(' · '), 55, doc.y);
          doc.y += 11;
        }
      }

      if (n.meals_structured && typeof n.meals_structured === 'object') {
        const mealParts = [];
        const mealKeys = { frukost: 'Fru', lunch: 'Lunch', mellanmal: 'Mellanmål' };
        Object.keys(mealKeys).forEach(function(k) {
          const val = n.meals_structured[k];
          if (val && mealsLabelMap[val]) mealParts.push(mealKeys[k] + ': ' + mealsLabelMap[val]);
        });
        if (mealParts.length > 0) {
          doc.fillColor(NAVY).fontSize(9).font('Helvetica')
             .text('Måltider: ' + mealParts.join(' · '), 55, doc.y);
          doc.y += 11;
        }
      } else if (n.meals) {
        const m = n.meals.length > 50 ? n.meals.slice(0, 47) + '...' : n.meals;
        doc.fillColor(NAVY).fontSize(9).font('Helvetica')
           .text('Måltider: ' + m, 55, doc.y);
        doc.y += 11;
      }

      if (n.behavior) {
        const b = n.behavior.length > 60 ? n.behavior.slice(0, 57) + '...' : n.behavior;
        doc.fillColor(NAVY).fontSize(9).font('Helvetica')
           .text('Beteende: ' + b, 55, doc.y);
        doc.y += 11;
      }

      doc.y += 6;
    });
  }

  // ══════════════════════════════════════════════════════
  // FOOTER — stamp on every page BEFORE doc.end()
  // ══════════════════════════════════════════════════════
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    const footerText = 'Min Stjärndag · mystarday.se · Sid. ' + (i + 1) + '/' + totalPages;
    doc.fontSize(8).font('Helvetica').fillColor(GRAY);
    const footerW = doc.widthOfString(footerText);
    const footerX = (doc.page.width - footerW) / 2;
    doc.text(footerText, footerX, doc.page.height - 40, { lineBreak: false });
  }

  doc.end();
}

module.exports = { generateReportPdf };
