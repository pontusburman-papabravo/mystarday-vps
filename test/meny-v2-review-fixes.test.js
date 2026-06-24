'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('meny v2 review fixes — HIGH', () => {
  it('child-today-coach listens on ActivityCompleted bus event', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-today-coach.js'), 'utf8');
    assert.match(src, /ChildEventBus\.on\('ActivityCompleted'/);
    assert.doesNotMatch(src, /activity:complete/);
  });

  it('child-worlds labelForWorld escapes child name', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /escHtml\(raw\)/);
  });
});

describe('meny v2 review fixes — MED', () => {
  it('readiness incomplete_days uses SQL count not +1', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/family/core.js'), 'utf8');
    assert.match(src, /incompleteMap\[row\.child_id\] = parseInt\(row\.incomplete_days/);
    assert.doesNotMatch(src, /incompleteMap\[row\.child_id\] = .*\+ 1/);
  });

  it('home-readiness filters warnings via filterItems', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/home-readiness.js'), 'utf8');
    assert.match(src, /function filterItems/);
    assert.match(src, /items = filterItems\(items\)/);
    assert.match(src, /priority <= 1/);
  });

  it('child-profile-setup validates avatar URL protocol', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    assert.match(src, /function safeAvatarUrl/);
    assert.match(src, /safeAvatarUrl\(child\.avatar_url\)/);
  });

  it('pending-approvals uses data attrs not inline onclick', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/pending-approvals.js'), 'utf8');
    assert.match(src, /data-pending-action/);
    assert.match(src, /bindRowActions/);
    assert.doesNotMatch(src, /onclick=/);
  });

  it('dom-utils exposes global escHtml alias', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/dom-utils.js'), 'utf8');
    assert.match(src, /root\.escHtml = escapeHtml/);
  });
});

describe('meny v2 review fixes — LOW', () => {
  it('child-profile refreshes after manual stars and binds pending actions', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    assert.match(src, /PendingApprovals\.bindRowActions/);
    assert.match(src, /await loadData\(\);\s*\n\s*render\(\)/);
    assert.match(src, /\.catch\(function/);
  });

  it('index.js hoists billing-ui require once', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    const matches = src.match(/require\('\.\.\/lib\/billing-ui'\)/g) || [];
    assert.equal(matches.length, 1);
  });

  it('home-bump-time preserves undo snapshot across render', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/home-bump-time.js'), 'utf8');
    assert.match(src, /snapshots\[c\.today_log_id\]/);
  });

  it('child-worlds-nav guards duplicate init', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    assert.match(src, /_initialized/);
    assert.match(src, /renderBottomNav\(\)/);
  });

  it('child-dashboard uses renderBottomNav not init in chrome', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    assert.match(src, /ChildWorldsNav\.renderBottomNav/);
    assert.doesNotMatch(src, /ChildWorldsNav\.init/);
  });
});

describe('meny v2 review fixes — SW bump', () => {
  it('service worker v293', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(src, /stjarndag-v(?:29[3-9]|[3-9]\d\d|\d{4,})/);
  });
});
