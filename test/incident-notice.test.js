'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('incident notice config and routes exist', () => {
  const cfg = require('../config/incident-notice');
  assert.equal(cfg.landingBannerEnabled, true);
  assert.equal(cfg.infoPagePath, '/viktig-information');

  const route = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
  assert.match(route, /router\.get\('\/viktig-information'/);
  assert.match(route, /viktig-information\.html/);

  const landing = fs.readFileSync(path.join(ROOT, 'src/routes/landing.js'), 'utf8');
  assert.match(landing, /injectIncidentNotice/);
  assert.match(landing, /incident-notice/);

  const html = fs.readFileSync(path.join(ROOT, 'public/viktig-information.html'), 'utf8');
  assert.match(html, /30 juli till 1 augusti 2026/);
  assert.match(html, /__SUPPORT_EMAIL__/);
  assert.match(route, /injectSupportEmail/);
  assert.match(route, /injectBrandPlaceholders/);
  assert.match(html, /merparten av familjernas uppgifter/);
  assert.doesNotMatch(html, /all data är säker/i);
  assert.doesNotMatch(html, /allt är återställt/i);

  const index = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(index, /incidentNoticeMount/);
});
