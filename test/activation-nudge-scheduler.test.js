'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('activation nudge scheduler (PR 5)', () => {
  it('uses notification_preference email_enabled', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/activation-nudge-scheduler.js'),
      'utf8'
    );
    assert.match(src, /notification_preference/);
    assert.match(src, /email_enabled/);
    assert.doesNotMatch(src, /newsletter_subscribed/);
  });

  it('CTA points to Hem dashboard (slim signup)', () => {
    const { resolveNudgeCtaUrl } = require('../src/lib/activation-nudge-scheduler');
    const prev = process.env.APP_URL;
    process.env.APP_URL = 'https://example.test';
    try {
      const url = resolveNudgeCtaUrl();
      assert.equal(url, 'https://example.test/dashboard');
    } finally {
      if (prev === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = prev;
    }
  });

  it('enable migration turns activation_nudge_v1 ON', () => {
    const mig = fs.readFileSync(
      path.join(ROOT, 'migrations/1809320000000_enable_activation_nudge_v1.js'),
      'utf8'
    );
    assert.match(mig, /activation_nudge_v1/);
    assert.match(mig, /enabled = EXCLUDED.enabled|enabled = true/);
  });

  it('nudge email copy is slim-aware', () => {
    const email = fs.readFileSync(path.join(ROOT, 'src/lib/email.js'), 'utf8');
    assert.match(email, /Öppna Hem/);
    assert.match(email, /testa rutinen/i);
  });
});
