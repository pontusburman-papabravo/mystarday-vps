'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('Parent hubs platform QA — hub boundaries (static)', () => {
  it('Hem does not own pending approvals or skattkammaren CTA', () => {
    const hem = fs.readFileSync(path.join(ROOT, 'public/js/dashboard-home-hub.js'), 'utf8');
    assert.doesNotMatch(hem, /pending-requests/);
    assert.doesNotMatch(hem, /\/skattkammaren/);
    assert.match(hem, /childRowHref/);
    assert.match(hem, /\/daily-log/);
  });

  it('Belöningar links manage to library#rewards not skattkammaren', () => {
    const hub = fs.readFileSync(path.join(ROOT, 'public/js/rewards-hub.js'), 'utf8');
    assert.match(hub, /\/library#rewards/);
    assert.doesNotMatch(hub, /\/skattkammaren/);
    assert.match(hub, /PendingApprovals\.mountHub/);
    assert.match(hub, /\/family\/child\/.*tab=rewards/);
  });

  it('Planering does not embed daily readiness or pending UI', () => {
    const hub = fs.readFileSync(path.join(ROOT, 'public/js/planning-hub.js'), 'utf8');
    assert.doesNotMatch(hub, /pending-requests/);
    assert.doesNotMatch(hub, /homeReadiness/);
    assert.match(hub, /planning\.sections\.planWeek/);
    assert.match(hub, /planning\.sections\.buildContent/);
  });

  it('Familj child cards link to barnprofil — no settings on card', () => {
    const family = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    assert.match(family, /family-child-card/);
    assert.match(family, /\/family\/child\//);
    assert.doesNotMatch(family, /family-child-settings-btn/);
  });

  it('Familj.html has no push/GDPR/prenumeration sections', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family.html'), 'utf8');
    assert.doesNotMatch(html, /parentPinSection/);
    assert.doesNotMatch(html, /deleteAccountModal/);
    assert.doesNotMatch(html, /Ladda ner min data/);
  });

  it('planning-back-nav returns to /planning', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/planning-back-nav.js'), 'utf8');
    assert.match(src, /window\.location\.href = '\/planning'/);
  });

  it('child-profile has back link to Familj', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    assert.match(src, /href="\/family"/);
  });

  it('home-readiness vs pending-approvals use distinct copy domains', () => {
    const readiness = fs.readFileSync(path.join(ROOT, 'public/js/home-readiness.js'), 'utf8');
    const pending = fs.readFileSync(path.join(ROOT, 'public/js/pending-approvals.js'), 'utf8');
    assert.match(readiness, /isExceptionItem|Kräver åtgärd/);
    assert.match(pending, /vill ha "/);
    assert.doesNotMatch(readiness, /pending_redemptions/);
  });
});
