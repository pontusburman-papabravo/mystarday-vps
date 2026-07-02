'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  R2_INDEXABLE_PATHS,
  R2_PDF_FILES,
  EMOTION_KEYS,
  TRANSITION_KEYS,
  TEACCH_KEYS,
  SCHOOL_KEYS,
  HYGIENE_KEYS,
} = require('../config/resurser-r2');
const { generateResurserPdf } = require('../src/lib/resurser-pdf');

const ROOT = path.join(__dirname, '..');
const PDF_DIR = path.join(ROOT, 'public/resurser/pdf');

function pdfPageCount(filename) {
  const buf = fs.readFileSync(path.join(PDF_DIR, filename));
  const match = buf.toString('latin1').match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/);
  return match ? Number(match[1]) : null;
}

describe('resurser R2 — PDF assets', () => {
  it('ships fourteen R2 downloadable PDFs', () => {
    assert.equal(R2_PDF_FILES.length, 14);
    for (const file of R2_PDF_FILES) {
      const full = path.join(PDF_DIR, file);
      assert.ok(fs.existsSync(full), `missing ${file}`);
      assert.ok(fs.statSync(full).size > 500, `${file} too small`);
    }
  });

  it('every R2 PDF is exactly one page (footer regression)', () => {
    for (const file of R2_PDF_FILES) {
      const count = pdfPageCount(file);
      assert.equal(count, 1, `${file} has ${count} pages, expected 1`);
    }
  });

  it('generateResurserPdf writes valid beloning PDF bytes', async () => {
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
      type: 'beloning',
      title: 'Test belöning',
      subtitle: 'Test',
    });
    await done;
    const buf = Buffer.concat(chunks);
    assert.match(buf.toString('latin1'), /^%PDF-/);
  });

  it('generateResurserPdf writes valid veckoschema PDF bytes', async () => {
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
      type: 'veckoschema',
      title: 'Test vecka',
      subtitle: 'Test',
    });
    await done;
    const buf = Buffer.concat(chunks);
    assert.match(buf.toString('latin1'), /^%PDF-/);
  });
});

describe('resurser R2 — page registry', () => {
  it('indexes seventeen R2 HTML paths', () => {
    assert.equal(R2_INDEXABLE_PATHS.length, 17);
    assert.ok(R2_INDEXABLE_PATHS.includes('/resurser/kanslor'));
    assert.ok(R2_INDEXABLE_PATHS.includes('/resurser/bildkort/overgangar'));
    assert.ok(R2_INDEXABLE_PATHS.includes('/resurser/pdf/beloningsschema'));
    assert.ok(R2_INDEXABLE_PATHS.includes('/resurser/pdf/veckoschema'));
  });

  it('key sets meet R2 minimums', () => {
    assert.equal(EMOTION_KEYS.length, 8);
    assert.ok(TRANSITION_KEYS.length >= 6);
    assert.equal(TEACCH_KEYS.length, 7);
    assert.ok(SCHOOL_KEYS.length >= 6);
    assert.ok(HYGIENE_KEYS.length >= 6);
  });

  it('HTML landing files exist for each indexable path', () => {
    const files = [
      'public/resurser/kanslor.html',
      'public/resurser/overgangar.html',
      'public/resurser/teacch-inspirerat.html',
      'public/resurser/skola.html',
      'public/resurser/hygien.html',
      'public/resurser/bildkort-kanslor.html',
      'public/resurser/bildkort-overgangar.html',
      'public/resurser/bildkort-teacch-inspirerat.html',
      'public/resurser/bildkort-skola.html',
      'public/resurser/bildkort-hygien.html',
      'public/resurser/pdf-kanslor.html',
      'public/resurser/pdf-overgangar.html',
      'public/resurser/pdf-teacch-inspirerat.html',
      'public/resurser/pdf-skola.html',
      'public/resurser/pdf-hygien.html',
      'public/resurser/pdf-beloningsschema.html',
      'public/resurser/pdf-veckoschema.html',
    ];
    for (const file of files) {
      assert.ok(fs.existsSync(path.join(ROOT, file)), file);
    }
  });
});

describe('resurser library — total PDF count', () => {
  it('ships at least twenty PDFs across R1 and R2', () => {
    const allPdfs = fs.readdirSync(PDF_DIR).filter((f) => f.endsWith('.pdf'));
    assert.ok(allPdfs.length >= 20, `only ${allPdfs.length} PDFs, need >= 20`);
  });
});
