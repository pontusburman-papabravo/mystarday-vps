'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');
const SWEDISH_RE = /[åäöÅÄÖ]/;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

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

function loadHelpFragment(locale) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'config/i18n', `help-${locale}.json`), 'utf8'));
}

describe('help-bubble i18n', () => {
  loadLocales();

  it('help-bubble.js loads FAQ from locale bundles, not inline Swedish', () => {
    const src = read('public/js/help-bubble.js');
    assert.match(src, /function ht\(key, params\)/);
    assert.match(src, /getPageContent\(pageKey\)/);
    assert.match(src, /help\.pages\./);
    assert.match(src, /child\.helpBubble/);
    assert.match(src, /locale-changed/);
    assert.match(src, /parent-i18n-ready/);
    assert.match(src, /child-i18n-ready/);
    assert.doesNotMatch(src, /const PAGE_CONTENT/);
    assert.doesNotMatch(src, /title: '❓ Hjälp/);
    assert.doesNotMatch(src, /aria-label="Öppna hjälp"/);
  });

  it('help sv-SE and en-GB fragments share key structure', () => {
    const sv = loadHelpFragment('sv-SE');
    const en = loadHelpFragment('en-GB');
    const svKeys = flattenStrings(sv).map((x) => x.key).sort();
    const enKeys = flattenStrings(en).map((x) => x.key).sort();
    assert.deepEqual(enKeys, svKeys);
  });

  it('help en-GB has no obvious Swedish leaks', () => {
    const en = loadHelpFragment('en-GB');
    const hits = flattenStrings(en).filter((x) => SWEDISH_RE.test(x.value));
    assert.equal(hits.length, 0, hits.slice(0, 5).map((x) => x.key).join(', '));
  });

  it('merged bundles expose help.pages and child.helpBubble', () => {
    assert.match(t('en-GB', 'help.chrome.openAria'), /open help/i);
    assert.match(t('sv-SE', 'help.chrome.openAria'), /Öppna hjälp/);
    assert.match(t('en-GB', 'help.pages.dashboard.title'), /Help/i);
    assert.match(t('sv-SE', 'help.pages.dashboard.title'), /Översikt/);
    assert.equal(
      t('en-GB', 'child.helpBubble.tabs.0.label'),
      '📋 Activities'
    );
    assert.equal(
      t('sv-SE', 'child.helpBubble.tabs.0.label'),
      '📋 Aktiviteter'
    );
  });

  it('parent help covers 11 pages with FAQs', () => {
    const sv = loadHelpFragment('sv-SE');
    const pageIds = Object.keys(sv.pages);
    assert.equal(pageIds.length, 11);
    let tabs = 0;
    let faqs = 0;
    for (const page of pageIds) {
      tabs += sv.pages[page].tabs.length;
      for (const tab of sv.pages[page].tabs) faqs += tab.faqs.length;
    }
    assert.equal(tabs, 24);
    assert.equal(faqs, 78);
  });
});
