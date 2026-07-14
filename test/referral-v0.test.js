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
    assert.doesNotMatch(src, /Referral ej tillgängligt/);
  });

  it('referral-share.js is shared module for share flows', () => {
    const src = read('public/js/referral-share.js');
    assert.match(src, /registerUrl/);
    assert.match(src, /window\.ReferralShare/);
    assert.match(src, /message:/);
  });

  it('native share uses message without embedded URL to avoid duplicate links', () => {
    const referral = read('public/js/referral-share.js');
    const parent = read('public/js/parent-share-flow.js');
    const landing = read('public/js/landing-share.js');
    assert.match(referral, /referralMessage/);
    assert.match(referral, /message: message/);
    assert.match(referral, /text: message \+ ' ' \+ ref\.registerUrl/);
    assert.match(parent, /payload\.message/);
    assert.match(landing, /payload\.message/);
  });

  it('mobile-nav uses ParentShareFlow instead of hardcoded share URL', () => {
    const src = read('public/js/mobile-nav.js');
    assert.match(src, /ParentShareFlow/);
    assert.doesNotMatch(src, /var SHARE_URL = 'https:\/\/[REDACTED]\.se'/);
  });

  it('dashboard-cta uses ReferralShare for personal links', () => {
    const src = read('public/js/dashboard-cta.js');
    assert.match(src, /ReferralShare/);
    assert.match(src, /getSharePayload/);
  });

  it('admin analytics loads referrals table', () => {
    const src = read('public/admin/admin-analytics.js');
    assert.match(src, /loadReferralsAdmin/);
    assert.match(src, /\/api\/admin\/referrals/);
  });
});
