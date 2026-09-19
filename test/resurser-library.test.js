'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  PDF_ASSETS,
  CATEGORIES,
  BILDKORT_PAGES,
  PDF_LANDINGS,
  HUB,
  pdfPublicPath,
  englishFilenameFor,
  generatedEnHtmlFiles,
  generatedSvHtmlFiles,
} = require('../config/resurser-catalog');
const { loadResurserI18n } = require('../src/lib/resurser-i18n');
const { generateResurserPdf, labelsForKeys } = require('../src/lib/resurser-pdf');
const { listenApp } = require('./helpers/http');

const ROOT = path.join(__dirname, '..');
const SV_PDF_DIR = path.join(ROOT, 'public/resurser/pdf');
const EN_PDF_DIR = path.join(ROOT, 'public/en/resources/pdf');

function pdfVisibleText(buf) {
  const latin = buf.toString('latin1');
  const chunks = [];
  for (const match of latin.matchAll(/<([0-9A-Fa-f]+)>/g)) {
    if (match[1].length % 2) continue;
    const raw = Buffer.from(match[1], 'hex').toString('latin1');
    if (raw.includes('\u0000')) continue;
    chunks.push(raw);
  }
  return chunks.join('');
}

function pdfPageCount(buf) {
  const match = buf.toString('latin1').match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/);
  return match ? Number(match[1]) : null;
}

function ensureJwt() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }
}

describe('resurser catalog i18n', () => {
  it('maps Swedish PDF filenames to English filenames', () => {
    assert.equal(englishFilenameFor('morgonschema.pdf'), 'morning-schedule.pdf');
    assert.equal(englishFilenameFor('morgonschema-exempel.pdf'), 'morning-schedule-example.pdf');
    assert.equal(englishFilenameFor('bildkort-morgon.pdf'), 'picture-cards-morning.pdf');
  });

  it('has matching sv-SE and en-GB copy for every PDF asset', () => {
    const sv = loadResurserI18n('sv-SE');
    const en = loadResurserI18n('en-GB');
    for (const asset of PDF_ASSETS) {
      assert.ok(sv.pdf[asset.id], `missing sv pdf copy ${asset.id}`);
      assert.ok(en.pdf[asset.id], `missing en pdf copy ${asset.id}`);
      assert.ok(sv.pdf[asset.id].title);
      assert.ok(en.pdf[asset.id].title);
    }
    for (const cat of CATEGORIES) {
      assert.ok(sv.categories[cat.id]);
      assert.ok(en.categories[cat.id]);
    }
  });

  it('labelsForKeys uses the requested locale', () => {
    assert.equal(labelsForKeys(['wake_up'], 'sv-SE')[0].label, 'Vakna');
    assert.equal(labelsForKeys(['wake_up'], 'en-GB')[0].label, 'Wake up');
  });
});

describe('resurser generated PDFs', () => {
  it('ships every declared PDF in both locales', () => {
    for (const asset of PDF_ASSETS) {
      const sv = path.join(SV_PDF_DIR, asset.fileSv);
      const en = path.join(EN_PDF_DIR, asset.fileEn);
      assert.ok(fs.existsSync(sv), `missing ${asset.fileSv}`);
      assert.ok(fs.existsSync(en), `missing ${asset.fileEn}`);
      const svBuf = fs.readFileSync(sv);
      const enBuf = fs.readFileSync(en);
      assert.match(svBuf.toString('latin1').slice(0, 5), /%PDF-/);
      assert.match(enBuf.toString('latin1').slice(0, 5), /%PDF-/);
      assert.ok(svBuf.length > 800, `${asset.fileSv} too small`);
      assert.ok(enBuf.length > 800, `${asset.fileEn} too small`);
      const svPages = pdfPageCount(svBuf);
      const enPages = pdfPageCount(enBuf);
      if (asset.type !== 'bildkort' || (asset.keys || []).length <= 8) {
        assert.equal(svPages, 1, `${asset.fileSv} pages=${svPages}`);
        assert.equal(enPages, 1, `${asset.fileEn} pages=${enPages}`);
      }
    }
  });

  it('does not embed emoji in generated PDFs', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const asset of PDF_ASSETS) {
      const sv = pdfVisibleText(fs.readFileSync(path.join(SV_PDF_DIR, asset.fileSv)));
      const en = pdfVisibleText(fs.readFileSync(path.join(EN_PDF_DIR, asset.fileEn)));
      assert.equal(emoji.test(sv), false, `emoji in ${asset.fileSv}`);
      assert.equal(emoji.test(en), false, `emoji in ${asset.fileEn}`);
    }
  });

  it('keeps Swedish markers out of English PDFs', () => {
    for (const asset of PDF_ASSETS) {
      const en = pdfVisibleText(fs.readFileSync(path.join(EN_PDF_DIR, asset.fileEn)));
      const sv = pdfVisibleText(fs.readFileSync(path.join(SV_PDF_DIR, asset.fileSv)));
      assert.match(en, /My Starda|free resource library|official TEA/, asset.fileEn);
      assert.doesNotMatch(en, /Sida 1/, asset.fileEn);
      assert.doesNotMatch(en, /Gratis resursbibliotek/, asset.fileEn);
      assert.doesNotMatch(en, /Klä på sig/, asset.fileEn);
      assert.match(sv, /Sida 1|Gratis resursbibliotek/, asset.fileSv);
    }
  });

  it('does not use arrows that Helvetica cannot draw', () => {
    const forbidden = /[→←↔⇒⇐★☆]/;
    for (const locale of ['sv-SE', 'en-GB']) {
      const t = loadResurserI18n(locale);
      assert.equal(forbidden.test(t.ui.rewardGoalLine), false, locale);
      assert.equal(forbidden.test(t.ui.footerPdf), false, locale);
    }
    const enReward = pdfVisibleText(fs.readFileSync(path.join(EN_PDF_DIR, 'reward-chart.pdf')));
    const svReward = pdfVisibleText(fs.readFileSync(path.join(SV_PDF_DIR, 'beloningsschema.pdf')));
    assert.match(enReward, /Reward:/);
    assert.match(svReward, /Belöning:/);
    assert.doesNotMatch(enReward, /!'/);
    assert.doesNotMatch(svReward, /!'/);
  });
});

describe('resurser core HTML IA', () => {
  it('morning category links blank, example and cards PDFs directly', () => {
    const sv = fs.readFileSync(path.join(ROOT, 'public/resurser/morgon.html'), 'utf8');
    const en = fs.readFileSync(path.join(ROOT, 'public/en/resources/morning.html'), 'utf8');
    assert.match(sv, /href="\/resurser\/pdf\/morgonschema\.pdf"/);
    assert.match(sv, /href="\/resurser\/pdf\/morgonschema-exempel\.pdf"/);
    assert.match(sv, /href="\/resurser\/pdf\/bildkort-morgon\.pdf"/);
    assert.match(sv, /Se bildkorten på skärmen/);
    assert.doesNotMatch(sv, /Direktlänk/);
    assert.doesNotMatch(sv, /Direct link/);
    assert.match(en, /href="\/en\/resources\/pdf\/morning-schedule\.pdf"/);
    assert.match(en, /href="\/en\/resources\/pdf\/morning-schedule-example\.pdf"/);
    assert.match(en, /href="\/en\/resources\/pdf\/picture-cards-morning\.pdf"/);
    assert.match(en, /View the picture cards on screen/);
    assert.doesNotMatch(en, /Direct link/);
    assert.doesNotMatch(en, /Morgonschema/);
    assert.doesNotMatch(en, /Ladda ner/);
  });

  it('generated HTML files exist for both locales', () => {
    for (const file of generatedSvHtmlFiles()) {
      assert.ok(fs.existsSync(path.join(ROOT, 'public', file)), file);
    }
    for (const file of generatedEnHtmlFiles()) {
      assert.ok(fs.existsSync(path.join(ROOT, 'public', file)), file);
    }
  });

  it('morning picture cards use the same pictograms as the child app', () => {
    const sv = fs.readFileSync(path.join(ROOT, 'public/resurser/bildkort-morgon.html'), 'utf8');
    const en = fs.readFileSync(path.join(ROOT, 'public/en/resources/picture-cards/morning.html'), 'utf8');
    assert.match(sv, /\/images\/child\/pictograms\/simple\/wake-up@2x\.webp/);
    assert.match(en, /\/images\/child\/pictograms\/simple\/wake-up@2x\.webp/);
    assert.doesNotMatch(sv, /min-stjarndag-design-kit\/icons\/svg\/light\/vakna/);
    assert.doesNotMatch(en, /min-stjarndag-design-kit\/icons\/svg\/light\/vakna/);
  });

  it('core English pages have hreflang and no leftover Swedish UI', () => {
    const en = fs.readFileSync(path.join(ROOT, 'public/en/resources/morning.html'), 'utf8');
    assert.match(en, /hreflang="sv"/);
    assert.match(en, /hreflang="en"/);
    assert.match(en, /rel="canonical" href="__SITE_URL__\/en\/resources\/morning"/);
    assert.doesNotMatch(en, /Resursbibliotek/);
  });

  it('core Swedish pages have matching hreflang', () => {
    const sv = fs.readFileSync(path.join(ROOT, 'public/resurser/morgon.html'), 'utf8');
    assert.match(sv, /hreflang="sv"/);
    assert.match(sv, /hreflang="en"/);
    assert.match(sv, /rel="canonical" href="(?:__SITE_URL__|https:\/\/[^"]+)\/resurser\/morgon"/);
  });
});

describe('resurser HTTP routes', () => {
  it('serves core routes, locale PDFs, aliases, and 404s', async () => {
    ensureJwt();
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const svPages = [
        HUB.pathSv,
        ...CATEGORIES.map((c) => c.pathSv),
        ...BILDKORT_PAGES.map((p) => p.pathSv),
        ...PDF_LANDINGS.map((p) => p.pathSv),
      ];
      const enPages = [
        HUB.pathEn,
        ...CATEGORIES.map((c) => c.pathEn),
        ...BILDKORT_PAGES.map((p) => p.pathEn),
        ...PDF_LANDINGS.map((p) => p.pathEn),
      ];
      for (const p of [...svPages, ...enPages]) {
        const res = await fetch(`${http.baseUrl}${p}`, { redirect: 'manual' });
        assert.equal(res.status, 200, p);
        assert.match(res.headers.get('content-type') || '', /html/i, p);
      }

      const svPdf = await fetch(`${http.baseUrl}/resurser/pdf/morgonschema.pdf`);
      const enPdf = await fetch(`${http.baseUrl}/en/resources/pdf/morning-schedule.pdf`);
      const enAlias = await fetch(`${http.baseUrl}/en/resources/pdf/morgonschema.pdf`);
      assert.equal(svPdf.status, 200);
      assert.equal(enPdf.status, 200);
      assert.equal(enAlias.status, 200);
      assert.match(svPdf.headers.get('content-type') || '', /pdf/i);
      assert.match(enPdf.headers.get('content-type') || '', /pdf/i);
      assert.equal(svPdf.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.equal(enPdf.headers.get('x-robots-tag'), 'noindex, nofollow');
      const svBuf = Buffer.from(await svPdf.arrayBuffer());
      const enBuf = Buffer.from(await enPdf.arrayBuffer());
      const aliasBuf = Buffer.from(await enAlias.arrayBuffer());
      assert.match(svBuf.toString('latin1').slice(0, 5), /%PDF-/);
      assert.equal(enBuf.equals(aliasBuf), true);
      assert.equal(svBuf.equals(enBuf), false);

      const unknownSv = await fetch(`${http.baseUrl}/resurser/does-not-exist`, { redirect: 'manual' });
      const unknownEn = await fetch(`${http.baseUrl}/en/resources/does-not-exist`, { redirect: 'manual' });
      const unknownPdf = await fetch(`${http.baseUrl}/en/resources/pdf/does-not-exist.pdf`, { redirect: 'manual' });
      assert.equal(unknownSv.status, 404);
      assert.equal(unknownEn.status, 404);
      assert.equal(unknownPdf.status, 404);
      const unknownEnHtml = await unknownEn.text();
      assert.doesNotMatch(unknownEnHtml, /<title>Min /);
    } finally {
      await http.close();
    }
  });
});

describe('generateResurserPdf locale', () => {
  it('writes English footer text for en-GB', async () => {
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
      keys: ['wake_up'],
      title: 'Morning schedule — blank template',
      subtitle: 'Tick the steps',
      emptyBoxes: true,
      locale: 'en-GB',
    });
    await done;
    const buf = Buffer.concat(chunks);
    const vis = pdfVisibleText(buf);
    assert.match(buf.toString('latin1'), /^%PDF-/);
    assert.match(vis, /k the steps|Tick the steps/);
    assert.doesNotMatch(vis, /Gratis resursbibliotek/);
    assert.doesNotMatch(vis, /Vakna/);
  });
});
