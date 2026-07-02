'use strict';

/**
 * Static printable PDFs for resursbibliotek (morgon/kväll v1).
 * Emoji-free labels — reliable in PDFKit without custom fonts.
 */

const { getPictogram } = require('../../config/pictogram-library');

const NAVY = '#1C2340';
const AMBER = '#F5A623';
const GRAY = '#5A6378';
const BORDER = '#E8E4DC';

function labelsForKeys(keys) {
  return keys.map((key, index) => {
    const pic = getPictogram(key);
    return {
      step: index + 1,
      label: pic ? pic.label : key,
    };
  });
}

function writeFooter(doc, pageNum) {
  doc.fontSize(8).fillColor(GRAY)
    .text('Min Stjärndag — gratis resursbibliotek · mystarday.se/resurser', 40, 800, {
      width: 515,
      align: 'center',
    });
  if (pageNum) {
    doc.text(`Sida ${pageNum}`, 40, 800, { width: 515, align: 'right' });
  }
}

function drawSchedulePdf(doc, { title, subtitle, steps, emptyBoxes }) {
  doc.font('Helvetica-Bold').fontSize(20).fillColor(NAVY).text(title, 40, 48);
  doc.font('Helvetica').fontSize(11).fillColor(GRAY).text(subtitle, 40, 78, { width: 515 });

  let y = 110;
  const boxSize = 22;
  steps.forEach((step) => {
    if (y > 740) {
      doc.addPage();
      y = 60;
    }
    doc.rect(40, y, boxSize, boxSize).strokeColor(BORDER).lineWidth(1).stroke();
    if (!emptyBoxes) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
        .text(String(step.step), 40, y + 6, { width: boxSize, align: 'center' });
    }
    doc.font('Helvetica').fontSize(13).fillColor(NAVY)
      .text(step.label, 72, y + 4, { width: 460 });
    y += 36;
  });

  doc.fontSize(9).fillColor(GRAY)
    .text('TEACCH-inspirerat material på papper — inte samma sak som appens levande schema.', 40, y + 12, { width: 515 });
  writeFooter(doc, 1);
}

function drawBildkortPdf(doc, { title, steps }) {
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(title, 40, 40);
  doc.font('Helvetica').fontSize(10).fillColor(GRAY)
    .text('Klipp ut korten · laminera gärna · använd på tavla eller kylskåp', 40, 66, { width: 515 });

  const cols = 2;
  const cardW = 240;
  const cardH = 100;
  const gapX = 15;
  const gapY = 14;
  let x0 = 40;
  let y0 = 96;

  steps.forEach((step, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = x0 + col * (cardW + gapX);
    const y = y0 + row * (cardH + gapY);
    if (y + cardH > 760) {
      doc.addPage();
      y0 = 60;
      const row2 = Math.floor(index / cols);
      const y2 = y0 + (row2 - Math.floor(index / cols)) * (cardH + gapY);
      drawCard(doc, x, y2, cardW, cardH, step);
      return;
    }
    drawCard(doc, x, y, cardW, cardH, step);
  });

  writeFooter(doc, 1);
}

function drawCard(doc, x, y, w, h, step) {
  doc.roundedRect(x, y, w, h, 8).fillAndStroke('#FDFAF4', BORDER);
  doc.font('Helvetica-Bold').fontSize(28).fillColor(AMBER)
    .text(String(step.step), x, y + 14, { width: w, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(14).fillColor(NAVY)
    .text(step.label, x + 10, y + 58, { width: w - 20, align: 'center' });
}

function generateResurserPdf(stream, { type, keys, title, subtitle, emptyBoxes }) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: title, Author: 'Min Stjärndag' } });
  doc.pipe(stream);
  const steps = labelsForKeys(keys);

  if (type === 'schedule') {
    drawSchedulePdf(doc, { title, subtitle, steps, emptyBoxes: !!emptyBoxes });
  } else if (type === 'bildkort') {
    drawBildkortPdf(doc, { title, steps });
  } else {
    throw new Error(`Unknown resurser PDF type: ${type}`);
  }

  doc.end();
}

module.exports = {
  labelsForKeys,
  generateResurserPdf,
};
