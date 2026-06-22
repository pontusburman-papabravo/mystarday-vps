'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('meny v2.5 — KX4 star feedback', () => {
  it('child-star-feedback overlay module exists', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-star-feedback.js'), 'utf8');
    assert.match(src, /child-star-feedback-overlay/);
    assert.match(src, /onStarGranted/);
  });

  it('child-star-feedback escapes reason text', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-star-feedback.js'), 'utf8');
    assert.match(src, /escHtml/);
  });

  it('SSE STAR_GRANTED triggers ChildStarFeedback', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-sse.js'), 'utf8');
    assert.match(src, /ChildStarFeedback\.onStarGranted/);
  });

  it('child-dashboard loads star feedback script', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /child-star-feedback\.js/);
    assert.match(html, /\.child-star-feedback-overlay/);
  });
});

describe('meny v2.5 — TEACCH exit without child-package-nav reload hack', () => {
  it('ChildSevenQuestions has exitNu', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-seven-questions.js'), 'utf8');
    assert.match(src, /exitNu/);
    assert.match(src, /ChildSevenQuestions\.exitNu/);
    assert.doesNotMatch(src, /ChildPackageNav\.setNavHidden\(false\);location\.reload/);
  });
});

describe('meny v2.5 — SW bump', () => {
  it('service worker v280', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(src, /stjarndag-v28\d/);
  });
});
