'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('daily-log navigation fix (support: stuck on log page)', () => {
  it('daily-log.html uses NavConfig shell without legacy mobile-nav', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/daily-log.html'), 'utf8');
    assert.match(html, /data-magic-page="daily-log"/);
    assert.match(html, /id="parentBottomNav"/);
    assert.doesNotMatch(html, /mobile-nav\.js/);
  });

  it('nav-config treats daily-log as shell path but not active Hem tab', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/nav-config.js'), 'utf8');
    assert.match(src, /navigateHomeFromDailyLog/);
    assert.match(src, /PARENT_SHELL_PATHS[\s\S]*'\/daily-log'/);
    assert.doesNotMatch(src, /tp === '\/dashboard' && p\.indexOf\('\/daily'\)/);
  });

  it('magic daily-log hero exposes Till Hem back link', () => {
    const hubs = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    const sv = fs.readFileSync(path.join(ROOT, 'config/i18n/today-sv-SE.json'), 'utf8');
    assert.match(hubs, /renderDailyLogHero/);
    assert.match(hubs, /data-daily-log-home/);
    assert.match(sv, /"backToHome": "← Till Hem"/);
  });

  it('bottom nav forces /dashboard when leaving daily-log via Hem', () => {
    const tabs = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    const shell = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    assert.match(tabs, /navigateHomeFromDailyLog/);
    assert.match(shell, /navigateHomeFromDailyLog/);
  });

  it('daily-log does not re-boot on parent-i18n-ready before children load', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/daily-log.js'), 'utf8');
    assert.doesNotMatch(src, /else if \(!children\.length\)/);
    assert.match(src, /ParentMagicPageBoot\.register\('daily-log'/);
    assert.match(src, /_loadLogSeq/);
    assert.match(src, /resolveBootUser/);
    assert.match(src, /retryChildrenIfEmpty/);
    assert.match(src, /AUTH_BOOT_TIMEOUT_MS/);
  });

  it('daily-log dlPt does not shadow window.pt (stack overflow regression)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/daily-log.js'), 'utf8');
    assert.doesNotMatch(src, /function pt\s*\(/);
    assert.match(src, /function dlPt\s*\(/);
    assert.match(src, /window\.pt\(key/);
    assert.doesNotMatch(src, /window\.dlPt/);
  });
});
