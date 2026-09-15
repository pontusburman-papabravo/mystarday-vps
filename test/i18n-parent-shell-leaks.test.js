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

describe('Parent shell i18n leaks (Prompt 6)', () => {
  loadLocales();

  it('family.js has no hardcoded Sparat/toast Swedish', () => {
    const src = read('public/js/family.js');
    assert.doesNotMatch(src, /showToast\('Sparat/);
    assert.doesNotMatch(src, /showToast\('Barnkopplingar/);
    assert.doesNotMatch(src, /showToast\('Roll uppdaterad/);
    assert.doesNotMatch(src, /showToast\('Borttaget'/);
    assert.doesNotMatch(src, /vill lösa in/);
    assert.doesNotMatch(src, /Målbytebegäran/);
  });

  it('family.html wires give-star and drawer rewards copy', () => {
    const html = read('public/family.html');
    assert.match(html, /data-i18n="family\.drawer\.giveStarBtn"/);
    assert.match(html, /data-i18n="family\.giveStars\.title"/);
    assert.match(html, /data-i18n="nav\.darkMode"/);
  });

  it('mobile-nav.js uses nav.* for legacy dark mode labels', () => {
    const src = read('public/js/mobile-nav.js');
    assert.match(src, /nav\.mobile\.darkModeTitle/);
    assert.match(src, /nav\.darkMode/);
    assert.doesNotMatch(src, /Mörkt läge/);
    assert.doesNotMatch(src, /Öppna meny/);
  });

  it('library activity modal has activityModal keys', () => {
    const html = read('public/library.html');
    assert.match(html, /data-i18n="library\.activityModal\.nameLabel"/);
    assert.match(html, /data-i18n="library\.activityModal\.feedbackBoth"/);
    assert.doesNotMatch(t('en-GB', 'library.activityModal.nameLabel'), /[åäöÅÄÖ]/);
  });

  it('en-GB family toast keys are English', () => {
    assert.equal(t('en-GB', 'family.toasts.saved'), 'Saved! ✓');
    assert.equal(t('en-GB', 'family.drawer.giveStarBtn'), '⭐ Give a star');
    assert.doesNotMatch(t('en-GB', 'family.invites.sentTo', { email: 'a@b.com' }), /[åäöÅÄÖ]/);
  });
});
