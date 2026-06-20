'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('Fas 3 — migrations', () => {
  test('contact_message inbox migration adds status + family_id', () => {
    const mig = fs.readFileSync(
      path.join(ROOT, 'migrations/1807800000000_contact_message_inbox_model.js'),
      'utf8'
    );
    assert.match(mig, /ADD COLUMN IF NOT EXISTS status/);
    assert.match(mig, /family_id UUID/);
    assert.match(mig, /answered_at/);
  });

  test('lead pipeline migration adds lead_status to growth tables', () => {
    const mig = fs.readFileSync(
      path.join(ROOT, 'migrations/1807900000000_lead_pipeline_fields.js'),
      'utf8'
    );
    assert.match(mig, /package_interest/);
    assert.match(mig, /professional_interest/);
    assert.match(mig, /waitlist/);
    assert.match(mig, /lead_status/);
  });
});

describe('Fas 3 — routes mounted', () => {
  test('admin.js mounts fas3 routers', () => {
    const adminJs = fs.readFileSync(path.join(ROOT, 'src/routes/admin.js'), 'utf8');
    assert.match(adminJs, /contact-messages/);
    assert.match(adminJs, /growth-pipeline/);
    assert.match(adminJs, /family-overview/);
    assert.match(adminJs, /admin-search/);
  });
});

describe('Fas 3 — frontend assets', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/admin/index.html'), 'utf8');

  test('index.html has pipeline section, palette, family hub', () => {
    assert.match(html, /id="growthPipelineSection"/);
    assert.match(html, /id="adminCommandPalette"/);
    assert.match(html, /id="familyHubModal"/);
    assert.match(html, /messagesInboxTabs/);
    assert.match(html, /admin-messages-inbox\.js/);
    assert.match(html, /admin-command-palette\.js/);
  });

  test('admin-nav has tillvaxt-pipeline route', () => {
    const nav = fs.readFileSync(path.join(ROOT, 'public/admin/admin-nav.js'), 'utf8');
    assert.match(nav, /tillvaxt-pipeline/);
    assert.match(nav, /growthPipeline/);
  });
});

describe('Fas 3 — contact-messages db', () => {
  const cm = require('../db/contact-messages');

  test('needsFollowUpSql targets open statuses', () => {
    assert.match(cm.needsFollowUpSql(), /new/);
    assert.match(cm.needsFollowUpSql(), /in_progress/);
  });

  test('MESSAGE_STATUSES includes answered and archived', () => {
    assert.ok(cm.MESSAGE_STATUSES.includes('answered'));
    assert.ok(cm.MESSAGE_STATUSES.includes('archived'));
  });
});

describe('Fas 3 — growth-leads db', () => {
  const leads = require('../db/growth-leads');
  test('LEAD_STATUSES match spec slugs', () => {
    assert.deepEqual(leads.LEAD_STATUSES, [
      'ny', 'kontaktad', 'kvalificerad', 'konverterad', 'avslutad',
    ]);
  });
});
