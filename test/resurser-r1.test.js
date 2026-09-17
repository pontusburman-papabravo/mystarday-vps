'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { R1_INDEXABLE_PATHS, MORNING_KEYS, EVENING_KEYS } = require('../config/resurser-r1');
const { labelsForKeys, generateResurserPdf } = require('../src/lib/resurser-pdf');
const { listenApp } = require('./helpers/http');

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

describe('English resource PDF downloads', () => {
  function collectEnPdfHrefs() {
    const hrefs = new Set();
    function walk(dir) {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!name.endsWith('.html')) continue;
        const html = fs.readFileSync(full, 'utf8');
        for (const match of html.matchAll(/href="(\/en\/resources\/pdf\/[a-z0-9-]+\.pdf)"/g)) {
          hrefs.add(match[1]);
        }
      }
    }
    walk(path.join(ROOT, 'public/en'));
    return [...hrefs];
  }

  it('English HTML PDF hrefs map to locale-specific files', () => {
    const hrefs = collectEnPdfHrefs();
    assert.ok(hrefs.includes('/en/resources/pdf/morning-schedule.pdf')
      || hrefs.includes('/en/resources/pdf/morgonschema.pdf'));
    for (const href of hrefs) {
      const filename = href.slice('/en/resources/pdf/'.length);
      const enFull = path.join(ROOT, 'public/en/resources/pdf', filename);
      const svFull = path.join(PDF_DIR, filename);
      const mapped = require('../config/resurser-catalog').englishFilenameFor(filename);
      const mappedFull = mapped ? path.join(ROOT, 'public/en/resources/pdf', mapped) : null;
      assert.ok(
        fs.existsSync(enFull) || fs.existsSync(svFull) || (mappedFull && fs.existsSync(mappedFull)),
        `missing binary for ${href}`,
      );
    }
  });

  it('GET /en/resources/pdf/*.pdf serves English PDFs, including Swedish aliases', async () => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const morning = await fetch(`${http.baseUrl}/en/resources/morning`);
      assert.equal(morning.status, 200);

      const landing = await fetch(`${http.baseUrl}/en/resources/pdf/morning-schedule`);
      assert.equal(landing.status, 200);
      assert.match(landing.headers.get('content-type') || '', /html/i);

      const en = await fetch(`${http.baseUrl}/en/resources/pdf/morning-schedule.pdf`);
      const alias = await fetch(`${http.baseUrl}/en/resources/pdf/morgonschema.pdf`);
      const sv = await fetch(`${http.baseUrl}/resurser/pdf/morgonschema.pdf`);
      assert.equal(en.status, 200);
      assert.equal(alias.status, 200);
      assert.equal(sv.status, 200);
      assert.match(en.headers.get('content-type') || '', /pdf/i);
      const enBuf = Buffer.from(await en.arrayBuffer());
      const aliasBuf = Buffer.from(await alias.arrayBuffer());
      const svBuf = Buffer.from(await sv.arrayBuffer());
      assert.match(enBuf.toString('latin1').slice(0, 5), /%PDF-/);
      assert.equal(enBuf.equals(aliasBuf), true);
      assert.equal(enBuf.equals(svBuf), false);

      const missing = await fetch(`${http.baseUrl}/en/resources/pdf/does-not-exist.pdf`, {
        redirect: 'manual',
      });
      assert.equal(missing.status, 404);
    } finally {
      await http.close();
    }
  });
});
