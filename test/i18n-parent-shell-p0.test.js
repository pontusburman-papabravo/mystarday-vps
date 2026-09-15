'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Parent shell P0 i18n (#1208 remainder)', () => {
  loadLocales();

  it('dashboard.js has no hardcoded add-child/share Swedish', () => {
    const src = read('public/js/dashboard.js');
    assert.doesNotMatch(src, /showToast\('Dela/);
    assert.doesNotMatch(src, /textContent = 'Välj en emoji'/);
    assert.doesNotMatch(src, /textContent = 'Lägg till'/);
    assert.match(src, /hpt\('schedule\.errors\.pickEmoji'\)/);
    assert.match(src, /hpt\('home\.shareSchedule\./);
  });

  it('dashboard-sse.js wires PIN warning only (push prompt owned by #1205)', () => {
    const src = read('public/js/dashboard-sse.js');
    const mainSrc = execSync('git show origin/main:public/js/dashboard-sse.js', {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const pushMarker = '// ── Passiv push-prompt';

    assert.match(src, /home\.pinWarning\.title/);
    assert.doesNotMatch(src, /försöker logga in/);
    // Push prompt uses home.pushPrompt on main (#1205) — #1208 must not change that block.
    assert.equal(src.slice(src.indexOf(pushMarker)), mainSrc.slice(mainSrc.indexOf(pushMarker)));
  });

  it('sw-register.js wires update banner via pt', () => {
    const src = read('public/js/sw-register.js');
    assert.match(src, /home\.swUpdate\.ready/);
    assert.doesNotMatch(src, /En ny version av appen är redo/);
  });

  it('calendar-page.js uses nav dark/light mode keys', () => {
    const src = read('public/js/calendar-page.js');
    assert.match(src, /nav\.lightMode/);
    assert.match(src, /nav\.darkMode/);
    assert.doesNotMatch(src, /Mörkt läge/);
  });

  it('legacy sidebars use nav.darkMode data-i18n', () => {
    for (const file of [
      'public/library.html',
      'public/dashboard.html',
      'public/activities.html',
      'public/settings.html',
      'public/skattkammaren-parent.html',
      'public/family-week.html',
      'public/notifications.html',
      'public/assign-schedule.html',
      'public/calendar.html',
      'public/family.html',
    ]) {
      const html = read(file);
      assert.match(html, /data-i18n="nav\.darkMode"/, `${file} missing nav.darkMode`);
      assert.doesNotMatch(html, /<span>🌙<\/span> Mörkt läge/, `${file} still has hardcoded dark mode`);
    }
  });

  it('family drawer schema/tips copy wired (#1206 keeps rewards/give-star)', () => {
    const html = read('public/family.html');
    assert.match(html, /data-i18n="family\.drawer\.tabSchema"/);
    assert.match(html, /data-i18n="family\.tips\.summary"/);
    assert.match(html, /data-i18n="family\.drawer\.schemaIntro"/);
    assert.match(html, /data-i18n="family\.drawer\.giveStarBtn"/);
  });

  it('family.js uses translated child-added toast', () => {
    const src = read('public/js/family.js');
    assert.match(src, /family\.toasts\.childAdded/);
    assert.doesNotMatch(src, /tillagd!/);
  });

  it('settings inline handlers use settings.toast keys for non-push saves', () => {
    const html = read('public/settings.html');
    assert.match(html, /spt\('settings\.toast\.saved'\)/);
    assert.match(html, /spt\('settings\.toast\.savedCheck'\)/);
    assert.doesNotMatch(html, /msg\.textContent = data\.message \|\| 'Sparat!'/);
  });

  it('home keys include remainder only (pushPrompt owned by #1205 on main)', () => {
    const en = JSON.parse(read('config/i18n/home-en-GB.json'));
    assert.ok(en.pinWarning);
    assert.ok(en.shareSchedule);
    assert.ok(en.swUpdate);
    assert.ok(en.pushPrompt);
  });

  it('en-GB P0 keys are English', () => {
    assert.equal(t('en-GB', 'home.swUpdate.ready'), '✨ A new version of the app is ready!');
    assert.equal(t('en-GB', 'nav.lightMode'), 'Light mode');
    assert.equal(t('en-GB', 'settings.toast.savedCheck'), '✅ Saved!');
    assert.doesNotMatch(t('en-GB', 'home.pinWarning.title', { name: 'Alex' }), /[åäöÅÄÖ]/);
  });
});
