const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('calendar magic contrast (schemaöversikt)', () => {
  it('calendar.html has magic shell mounts and hide-header title', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/calendar.html'), 'utf8');
    assert.match(html, /id="parentMagicPageMount"/);
    assert.match(html, /parent-magic-hide-header/);
    assert.match(html, /id="parentBottomNav"/);
  });

  it('day-col light cards keep dark text in magic dark theme', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'public/calendar.html'), 'utf8');
    assert.match(css, /parent-magic-page-calendar/);
    assert.match(css, /\.day-col \.day-name/);
    assert.match(css, /\.day-col \.day-star-progress/);
    assert.match(css, /native-tab-bar \.tab-item\.active/);
    const gridFn = html.slice(html.indexOf('function renderGrid'), html.indexOf('function renderGrid') + 3500);
    assert.match(gridFn, /day-star-progress/);
    assert.match(gridFn, /day-name/);
    assert.doesNotMatch(gridFn, /dark:text/);
  });

  it('week nav readable on dark magic shell outside day cards', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /parent-magic-page-calendar:not\(\.parent-theme-light\) #weekLabel/);
    assert.match(css, /parent-magic-page-calendar:not\(\.parent-theme-light\) \.nav-btn/);
  });
});
