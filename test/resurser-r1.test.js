'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { R1_INDEXABLE_PATHS, MORNING_KEYS, EVENING_KEYS } = require('../config/resurser-r1');
const { labelsForKeys, generateResurserPdf } = require('../src/lib/resurser-pdf');

const ROOT = path.join(__dirname, '..');
const PDF_DIR = path.join(ROOT, 'public/resurser/pdf');

const EXPECTED_PDFS = [
  'morgonschema.pdf',
  'morgonschema-exempel.pdf',
  'kvallsschema.pdf',
  'kvallsschema-exempel.pdf',
  'bildkort-morgon.pdf',
  'bildkort-kvall.pdf',
];

describe('resurser R1 — PDF assets', () => {
  it('ships six downloadable PDFs', () => {
    for (const file of EXPECTED_PDFS) {
      const full = path.join(PDF_DIR, file);
      assert.ok(fs.existsSync(full), `missing ${file}`);
      assert.ok(fs.statSync(full).size > 500, `${file} too small`);
    }
  });

  it('ships single-page PDFs (no blank overflow pages from footer placement)', () => {
    // Regression: footer text drawn too close to the A4 bottom margin makes
    // PDFKit silently insert extra near-blank pages instead of clipping.
    for (const file of EXPECTED_PDFS) {
      const bytes = fs.readFileSync(path.join(PDF_DIR, file));
      const match = /\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/.exec(bytes.toString('latin1'));
      assert.ok(match, `${file}: could not read /Pages /Count`);
      assert.equal(match[1], '1', `${file} should render as a single page, got ${match[1]}`);
    }
  });

  it('generateResurserPdf writes valid schedule PDF bytes', async () => {
    const { Writable } = require('stream');
    const chunks = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    const done = new Promise((resolve) => sink.on('finish', resolve));
    generateResurserPdf(sink, {
      type: 'schedule',
      keys: MORNING_KEYS.slice(0, 3),
      title: 'Test',
      subtitle: 'Test',
      emptyBoxes: true,
    });
    await done;
    const buf = Buffer.concat(chunks);
    assert.match(buf.toString('latin1'), /^%PDF-/);
  });

  it('generateResurserPdf paginates a long bildkort set without throwing', async () => {
    // Regression: overflow row math previously always evaluated to 0,
    // which would stack every card on the same spot on page 2+.
    const { Writable } = require('stream');
    const chunks = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    const done = new Promise((resolve) => sink.on('finish', resolve));
    const manyKeys = Array.from({ length: 14 }, (_, i) => `test_step_${i}`);
    generateResurserPdf(sink, { type: 'bildkort', keys: manyKeys, title: 'Test bildkort' });
    await done;
    const buf = Buffer.concat(chunks).toString('latin1');
    assert.match(buf, /^%PDF-/);
    const match = /\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/.exec(buf);
    assert.ok(match, 'could not read /Pages /Count');
    assert.ok(Number(match[1]) > 1, `expected pagination for 14 cards, got ${match[1]} page(s)`);
  });

  it('labelsForKeys resolves pictogram labels', () => {
    const labels = labelsForKeys(['wake_up', 'sleep']);
    assert.equal(labels[0].label, 'Vakna');
    assert.equal(labels[1].label, 'Sova');
  });
});

describe('resurser R1 — page registry', () => {
  it('indexes six R1 HTML paths', () => {
    assert.equal(R1_INDEXABLE_PATHS.length, 6);
    assert.ok(R1_INDEXABLE_PATHS.includes('/resurser/morgon'));
    assert.ok(R1_INDEXABLE_PATHS.includes('/resurser/pdf/morgonschema'));
  });

  it('morning and evening key sets meet R1 minimums', () => {
    assert.ok(MORNING_KEYS.length >= 8);
    assert.ok(EVENING_KEYS.length >= 6);
  });

  it('HTML landing files exist for each indexable path', () => {
    const files = [
      'public/resurser/morgon.html',
      'public/resurser/kvall.html',
      'public/resurser/bildkort-morgon.html',
      'public/resurser/bildkort-kvall.html',
      'public/resurser/pdf-morgonschema.html',
      'public/resurser/pdf-kvallsschema.html',
    ];
    for (const file of files) {
      assert.ok(fs.existsSync(path.join(ROOT, file)), file);
    }
  });
});
