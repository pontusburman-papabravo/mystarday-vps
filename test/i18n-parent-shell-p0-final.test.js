'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Parent shell P0 final cleanup', () => {
  loadLocales();

  it('family drawer settings tab wires i18n keys', () => {
    const html = read('public/family.html');
    assert.match(html, /data-i18n="family\.childProfile\.setup\.toggles\.nnl\.label"/);
    assert.match(html, /data-i18n="family\.drawer\.settings\.nnl\.tooltip"/);
    assert.match(html, /data-i18n="family\.drawer\.settings\.rewardsShortcutTitle"/);
    assert.match(html, /data-i18n="family\.drawer\.settings\.hideClock\.tooltip"/);
  });

  it('assign-schedule save flow uses schedule.assign keys', () => {
    const html = read('public/assign-schedule.html');
    assert.match(html, /apt\('schedule\.assign\.saved'\)/);
    assert.match(html, /apt\('schedule\.assign\.saving'\)/);
    assert.doesNotMatch(html, /btn\.textContent = '✓ Sparat!'/);
  });

  it('en-GB keys are English', () => {
    assert.equal(t('en-GB', 'schedule.assign.saved'), '✓ Saved!');
    assert.equal(t('en-GB', 'family.drawer.settings.shortcutsHeading'), 'Shortcuts');
    assert.doesNotMatch(t('en-GB', 'family.drawer.settings.nnl.tooltip'), /[åäöÅÄÖ]/);
  });
});
