'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('legacy parent pages — inline script sanity', () => {
  it('activities page is a redirect to the library activity surface', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(routes, /app\.get\('\/activities'/);
    assert.match(routes, /\/library' \+ \(qs \? '\?' \+ qs : ''\) \+ '#activities'/);
    assert.equal(fs.existsSync(path.join(ROOT, 'public/activities.html')), false);
  });

  it('calendar page gates session via Auth.requireAuth in calendar-page.js', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/calendar-page.js'), 'utf8');
    assert.match(js, /Auth\.requireAuth\s*\(/);
    const html = fs.readFileSync(path.join(ROOT, 'public/calendar.html'), 'utf8');
    assert.match(html, /calendar-page\.js/);
  });
});
