'use strict';

/**
 * Static printable PDFs for the resource library.
 * Locale copy from config/resurser-i18n/*.json. Icons from the design-kit SVGs.
 * No emoji glyphs — PDFKit Helvetica cannot render them.
 */

const { getPictogram } = require('../../config/pictogram-library');
const { loadResurserI18n, pictogramLabel } = require('./resurser-i18n');
const { getIconPng, preloadResurserIcons } = require('./resurser-icons');

const NAVY = '#1C2340';
const GRAY = '#5A6378';
const BORDER = '#D9D4CA';
const CARD_BG = '#FDFAF4';

const BELONING_STAR_ROWS = 5;
const BELONING_STAR_COLS = 10;

/**
 * A4 page is 841.89pt tall with a 40pt margin (bottom boundary ≈ 801.89pt).
 * Footer must sit clear of that boundary — PDFKit silently inserts a blank
 * page instead of clipping text that would overflow the bottom margin.
 */
const FOOTER_Y = 780;
const CONTENT_BOTTOM = 752;

function labelsForKeys(keys, locale) {
  const loc = locale || 'sv-SE';
  return (keys || []).map((key, index) => ({
    step: index + 1,
    key,
    label: pictogramLabel(key, loc),
  }));
}

/** Helvetica (WinAnsi) cannot draw arrows/stars — they become garbage glyphs. */
const PDFKIT_UNSAFE = /[→←↔⇒⇐★☆✓✔✕✖]/g;

function pdfSafeText(value) {
  return String(value || '').replace(PDFKIT_UNSAFE, (ch) => (
    (ch === '→' || ch === '←' || ch === '↔' || ch === '⇒' || ch === '⇐') ? '-' : ''
  ));
}

function sanitizePdfCopy(value) {
  if (typeof value === 'string') return pdfSafeText(value);
  if (Array.isArray(value)) return value.map(sanitizePdfCopy);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) out[key] = sanitizePdfCopy(nested);
    return out;
  }
  return value;
}

function strings(locale) {
  return sanitizePdfCopy(loadResurserI18n(locale || 'sv-SE'));
}

function writeFooter(doc, pageNum, t) {
  doc.font('Helvetica').fontSize(8).fillColor(GRAY)
    .text(t.ui.footerPdf, 40, FOOTER_Y, {
      width: 400,
      align: 'left',
      lineBreak: false,
    });
  if (pageNum) {
    doc.text(`${t.ui.pageLabel} ${pageNum}`, 40, FOOTER_Y, {
      width: 515,
      align: 'right',
      lineBreak: false,
    });
  }
}

function drawIcon(doc, key, x, y, size) {
  const png = getIconPng(key);
  if (!png) return false;
  doc.image(png, x, y, { width: size, height: size });
  return true;
}

function drawSchedulePdf(doc, { title, subtitle, steps, emptyBoxes, t }) {
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(title, 40, 40, {
    width: 515,
    lineBreak: false,
  });
  doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(subtitle, 40, 64, {
    width: 515,
    height: 28,
  });

  let y = 100;
  const rowH = steps.length > 8 ? 38 : 42;
  const iconSize = 28;
  const boxSize = 18;

  steps.forEach((step) => {
    if (y + rowH > CONTENT_BOTTOM) {
      doc.addPage();
      y = 48;
    }
    const drew = drawIcon(doc, step.key, 40, y + 2, iconSize);
    const textX = drew ? 76 : 72;
    doc.rect(textX, y + 6, boxSize, boxSize).strokeColor(BORDER).lineWidth(1).stroke();
    if (!emptyBoxes) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
        .text(String(step.step), textX, y + 10, { width: boxSize, align: 'center' });
    }
    doc.font('Helvetica').fontSize(12).fillColor(NAVY)
      .text(step.label, textX + boxSize + 10, y + 8, { width: 400, height: 24 });
    y += rowH;
  });

  const noteY = Math.min(y + 10, CONTENT_BOTTOM - 28);
  doc.fontSize(8).fillColor(GRAY)
    .text(t.ui.teacchDisclaimer, 40, noteY, { width: 515, height: 28 });
  writeFooter(doc, 1, t);
}

function drawBildkortPdf(doc, { title, steps, t }) {
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(title, 40, 36, {
    width: 515,
    lineBreak: false,
  });
  doc.font('Helvetica').fontSize(10).fillColor(GRAY)
    .text(t.ui.bildkortIntro, 40, 60, { width: 515, height: 24 });

  const cols = 2;
  const cardW = 248;
  const cardH = 118;
  const gapX = 19;
  const gapY = 12;
  const x0 = 40;
  let y0 = 92;
  let pageStartIndex = 0;

  steps.forEach((step, index) => {
    const col = index % cols;
    const row = Math.floor((index - pageStartIndex) / cols);
    let x = x0 + col * (cardW + gapX);
    let y = y0 + row * (cardH + gapY);
    if (y + cardH > CONTENT_BOTTOM) {
      doc.addPage();
      pageStartIndex = index;
      y0 = 48;
      x = x0 + (index % cols) * (cardW + gapX);
      y = y0;
      drawCard(doc, x, y, cardW, cardH, step);
      return;
    }
    drawCard(doc, x, y, cardW, cardH, step);
  });

  writeFooter(doc, 1, t);
}

function drawCard(doc, x, y, w, h, step) {
  doc.roundedRect(x, y, w, h, 8).fillAndStroke(CARD_BG, BORDER);
  const drew = drawIcon(doc, step.key, x + (w - 48) / 2, y + 12, 48);
  const labelY = drew ? y + 68 : y + 44;
  if (!drew) {
    doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY)
      .text(String(step.step), x, y + 16, { width: w, align: 'center' });
  }
  doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY)
    .text(step.label, x + 10, labelY, { width: w - 20, align: 'center', height: 36 });
}

function drawBeloningPdf(doc, { title, subtitle, t }) {
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(title, 40, 40, {
    width: 515,
    lineBreak: false,
  });
  doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(subtitle, 40, 64, {
    width: 515,
    height: 28,
  });

  const labelW = 130;
  const starSize = 18;
  const starGap = 6;
  const rowH = 36;
  let y = 104;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
    .text(t.ui.activityCol, 40, y)
    .text(t.ui.starsCol, 40 + labelW + 10, y);
  y += 22;

  for (let row = 0; row < BELONING_STAR_ROWS; row += 1) {
    doc.rect(40, y, labelW, rowH - 6).strokeColor(BORDER).lineWidth(1).stroke();
    for (let col = 0; col < BELONING_STAR_COLS; col += 1) {
      const sx = 40 + labelW + 10 + col * (starSize + starGap);
      doc.circle(sx + starSize / 2, y + 12, starSize / 2 - 1)
        .strokeColor(BORDER).lineWidth(0.8).stroke();
    }
    y += rowH;
  }

  doc.font('Helvetica').fontSize(10).fillColor(GRAY)
    .text(t.ui.rewardGoalLine, 40, y + 12, { width: 515 });
  doc.fontSize(8).fillColor(GRAY)
    .text(t.ui.rewardNote, 40, y + 32, { width: 515 });
  writeFooter(doc, 1, t);
}

function drawVeckoschemaPdf(doc, { title, subtitle, exampleLabels, t }) {
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(title, 40, 40, {
    width: 515,
    lineBreak: false,
  });
  doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(subtitle, 40, 64, {
    width: 515,
    height: 28,
  });

  const days = t.ui.weekdaysShort || t.ui.weekdays;
  const colW = 73;
  const rowH = 36;
  const x0 = 40;
  let y = 104;

  days.forEach((day, col) => {
    const x = x0 + col * colW;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NAVY)
      .text(day, x, y, { width: colW - 6, align: 'center', lineBreak: false });
  });
  y += 18;

  const rows = exampleLabels ? 6 : 5;
  for (let row = 0; row < rows; row += 1) {
    days.forEach((_day, col) => {
      const x = x0 + col * colW;
      doc.rect(x, y, colW - 6, rowH).strokeColor(BORDER).lineWidth(1).stroke();
      if (exampleLabels && exampleLabels[col] && row === 0) {
        doc.font('Helvetica').fontSize(8).fillColor(NAVY)
          .text(exampleLabels[col], x + 2, y + 12, { width: colW - 10, align: 'center' });
      }
    });
    y += rowH + 6;
  }

  doc.fontSize(8).fillColor(GRAY)
    .text(t.ui.weeklyNote, 40, y + 8, { width: 515 });
  writeFooter(doc, 1, t);
}

function generateResurserPdf(stream, opts) {
  const locale = opts.locale || 'sv-SE';
  const t = strings(locale);
  const title = opts.title || '';
  const subtitle = opts.subtitle || '';
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    autoFirstPage: true,
    compress: false,
    info: {
      Title: title,
      Author: 'Resource library',
      CreationDate: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
    },
  });
  doc.pipe(stream);
  const steps = opts.keys ? labelsForKeys(opts.keys, locale) : [];

  if (opts.type === 'schedule') {
    drawSchedulePdf(doc, { title, subtitle, steps, emptyBoxes: !!opts.emptyBoxes, t });
  } else if (opts.type === 'bildkort') {
    drawBildkortPdf(doc, { title, steps, t });
  } else if (opts.type === 'beloning') {
    drawBeloningPdf(doc, { title, subtitle, t });
  } else if (opts.type === 'veckoschema') {
    drawVeckoschemaPdf(doc, {
      title,
      subtitle,
      exampleLabels: opts.exampleLabels || null,
      t,
    });
  } else {
    throw new Error(`Unknown resurser PDF type: ${opts.type}`);
  }

  doc.end();
}

module.exports = {
  labelsForKeys,
  generateResurserPdf,
  preloadResurserIcons,
  pdfSafeText,
  BELONING_STAR_ROWS,
  BELONING_STAR_COLS,
};
