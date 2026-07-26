'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { MIRROR_ENTRIES, svToEn, enToSv, buildLangRoutesMap } = require('../config/en-public-mirror');
const { translatePublicPath } = require('../config/en-slug-words');
const { SEO_INDEXABLE_PATHS } = require('../src/lib/seo-pages');

const ROOT = path.join(__dirname, '..');

test('MIRROR_ENTRIES covers resurser hub and core SEO articles', () => {
  const svPaths = MIRROR_ENTRIES.map((e) => e.sv);
  for (const p of [
    '/resurser',
    '/resurser/morgon',
    '/resurser/bildkort/morgon',
    '/resurser/pdf/morgonschema',
    '/morgonrutin-barn',
    '/pedagoger-och-terapeuter',
    '/skattkammaren',
  ]) {
    assert.ok(svPaths.includes(p), `missing mirror for ${p}`);
  }
});

test('svToEn maps resurser paths to /en/resources', () => {
  assert.equal(svToEn('/resurser'), '/en/resources');
  assert.equal(svToEn('/resurser/morgon'), '/en/resources/morning');
  assert.equal(svToEn('/resurser/bildkort/morgon'), '/en/resources/picture-cards/morning');
  assert.equal(svToEn('/morgonrutin-barn'), '/en/morning-routine-children');
});

test('enToSv reverses mirror paths', () => {
  assert.equal(enToSv('/en/resources'), '/resurser');
  assert.equal(enToSv('/en/resources/morning'), '/resurser/morgon');
  assert.equal(enToSv('/en/morning-routine-children'), '/morgonrutin-barn');
});

test('buildLangRoutesMap is bidirectional', () => {
  const map = buildLangRoutesMap();
  for (const entry of MIRROR_ENTRIES) {
    assert.equal(map[entry.sv], entry.en, entry.sv);
    assert.equal(map[entry.en], entry.sv, entry.en);
  }
});

test('English mirror HTML files exist for all entries', () => {
  const missing = [];
  for (const entry of MIRROR_ENTRIES) {
    const filePath = path.join(ROOT, 'public', entry.fileEn);
    if (!fs.existsSync(filePath)) missing.push(entry.fileEn);
  }
  assert.equal(missing.length, 0, `Missing EN files: ${missing.slice(0, 5).join(', ')}`);
});

test('English mirror pages use lang=en and English paths', () => {
  const sample = MIRROR_ENTRIES.find((e) => e.sv === '/resurser/morgon');
  assert.ok(sample);
  const html = fs.readFileSync(path.join(ROOT, 'public', sample.fileEn), 'utf8');
  assert.match(html, /lang="en"/);
  assert.match(html, /href="\/en\/resources"/);
  assert.doesNotMatch(html, /\/css\/en\/resources-print\.css/);
});

test('SEO indexable paths include English resource mirrors', () => {
  assert.ok(SEO_INDEXABLE_PATHS.has('/en/resources'));
  assert.ok(SEO_INDEXABLE_PATHS.has('/en/resources/morning'));
  assert.ok(SEO_INDEXABLE_PATHS.has('/en/morning-routine-children'));
  assert.ok(SEO_INDEXABLE_PATHS.has('/en/educators-and-therapists'));
});

test('translatePublicPath handles PDF paths', () => {
  assert.equal(
    translatePublicPath('/resurser/pdf/morgonschema'),
    '/en/resources/pdf/morning-schedule'
  );
});

test('public-lang-routes.js is generated', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public/js/public-lang-routes.js'), 'utf8');
  assert.match(js, /PUBLIC_LANG_ROUTES/);
  assert.match(js, /"\/resurser\/morgon": "\/en\/resources\/morning"/);
});
