'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('meny v2.4 — B2 schema hybrid', () => {
  it('child-profile schema tab loads week summary', () => {
    const profile = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    const setup = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    assert.match(profile, /profileSchemaBody/);
    assert.match(setup, /schemaSummaryHtml/);
    assert.match(setup, /Veckodagsöversikt/);
    assert.match(setup, /\/api\/children\/.*\/schedules/);
  });
});

describe('meny v2.4 — H18 deprecate embedded schema editor on hem', () => {
  it('dashboard child cards link to schedule instead of openCreateActivityModal', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    assert.match(src, /Skapa aktivitet i schema/);
    assert.match(src, /\/schedule\?child=/);
    const cardSection = src.slice(src.indexOf('function renderDashboardCards'), src.indexOf('function renderDashboardCards') + 8000);
    assert.doesNotMatch(cardSection, /openCreateActivityModal\(''\)/);
  });
});

describe('meny v2.4 — billing injected globally', () => {
  it('platform-html injects billing-ui before avatar menu', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /billing-ui\.js/);
    assert.match(src, /parent-avatar-menu\.js/);
  });
});
