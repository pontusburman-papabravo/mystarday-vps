'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('referral v0', () => {
  it('db/referral.js exports qualifyReferralForFamily', () => {
    const src = read('db/referral.js');
    assert.match(src, /async function qualifyReferralForFamily/);
    assert.match(src, /qualifyReferralForFamily/);
  });

  it('activation-p0 qualifies referral when P0 first achieved', () => {
    const src = read('src/lib/activation-p0.js');
    assert.match(src, /qualifyReferralForFamily/);
    assert.match(src, /referral_qualified/);
  });

  it('GET /api/account/referral route exists', () => {
    const src = read('src/routes/account/lifecycle.js');
    assert.match(src, /router\.get\('\/referral'/);
    assert.match(src, /getOrCreateReferralCode/);
  });

  it('dashboard-cta uses personal referral link when available', () => {
    const src = read('public/js/dashboard-cta.js');
    assert.match(src, /loadReferralShare/);
    assert.match(src, /\/api\/account\/referral/);
    assert.match(src, /referral_link_shared/);
    assert.match(src, /registerUrl/);
  });

  it('admin analytics loads referrals table', () => {
    const src = read('public/admin/admin-analytics.js');
    assert.match(src, /loadReferralsAdmin/);
    assert.match(src, /\/api\/admin\/referrals/);
  });
});
