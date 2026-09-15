'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadLocales, t } = require('../src/lib/i18n');

const FRAGMENTS_DIR = path.join(__dirname, '../config/i18n');
const SWEDISH_RE = /[åäöÅÄÖ]/;

function flattenStrings(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenStrings(v, key));
    } else if (typeof v === 'string') {
      out.push({ key, value: v });
    }
  }
  return out;
}

function loadFragment(locale) {
  return JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, `reports-${locale}.json`), 'utf8'));
}

describe('reports locale fragments', () => {
  it('reports sv-SE and en-GB have identical key structure', () => {
    const svKeys = flattenStrings(loadFragment('sv-SE')).map((x) => x.key).sort();
    const enKeys = flattenStrings(loadFragment('en-GB')).map((x) => x.key).sort();
    assert.deepEqual(enKeys, svKeys);
  });

  it('reports en-GB has no empty values', () => {
    const empty = flattenStrings(loadFragment('en-GB')).filter((x) => !x.value.trim());
    assert.equal(empty.length, 0, empty.map((x) => x.key).join(', '));
  });

  it('reports en-GB avoids obvious Swedish (åäö)', () => {
    const swedishHits = flattenStrings(loadFragment('en-GB')).filter((x) => SWEDISH_RE.test(x.value));
    assert.equal(swedishHits.length, 0, swedishHits.slice(0, 5).map((x) => `${x.key}: ${x.value}`).join('\n'));
  });

  it('merged bundles expose reports.* via getLocale', () => {
    loadLocales();
    assert.equal(t('en-GB', 'reports.shell.title'), '📊 Reports');
    assert.equal(t('en-GB', 'reports.actions.save'), 'Save');
    assert.equal(t('en-GB', 'reports.observations.restore'), 'Restore');
    assert.equal(t('sv-SE', 'reports.actions.save'), 'Spara');
  });
});

describe('reports runtime localization hooks', () => {
  it('reports.html has i18n bootstrap and shell keys', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/reports.html'), 'utf8');
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /data-i18n-title="reports\.pageTitle"/);
    assert.match(html, /parent-app-i18n\.js/);
    assert.match(html, /data-i18n="reports\.shell\.title"/);
    assert.match(html, /data-i18n="reports\.noteModal\.save"/);
  });

  it('reports.js uses rpt() and avoids hardcoded Swedish toasts', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/reports.js'), 'utf8');
    assert.match(js, /function rpt\(/);
    assert.match(js, /initParentAppI18n/);
    assert.match(js, /parent-i18n-ready/);
    assert.match(js, /reports\.observations\.restore/);
    assert.match(js, /reports\.actions\.save/);
    assert.doesNotMatch(js, /showToast\('[^']*[åäöÅÄÖ]/);
    assert.doesNotMatch(js, /textContent = 'Spara/);
    assert.doesNotMatch(js, /textContent = 'Återställ/);
  });

  it('src/lib/i18n.js merges reports domain', () => {
    const i18n = fs.readFileSync(path.join(__dirname, '../src/lib/i18n.js'), 'utf8');
    assert.match(i18n, /'reports'/);
  });
});
