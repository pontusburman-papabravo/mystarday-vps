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

  it('GET /api/account/referral route exists and is eligibility-gated', () => {
    const src = read('src/routes/account/lifecycle.js');
    assert.match(src, /router\.get\('\/referral'/);
    assert.match(src, /getOrCreateReferralCode/);
    assert.match(src, /evaluateReferralEligibility/);
    assert.doesNotMatch(src, /Referral ej tillgängligt/);
  });

  it('referral-share.js defaults to clean register URL; personal URL is opt-in via API', () => {
    const src = read('public/js/referral-share.js');
    assert.match(src, /REGISTER_URL/);
    assert.match(src, /window\.ReferralShare/);
    assert.match(src, /\/register/);
    assert.match(src, /\/api\/account\/referral/);
    assert.match(src, /personalUrl/);
    // Hardcoded ?ref= must not appear — personal refs come from eligibility API
    assert.doesNotMatch(src, /REGISTER_URL \+ '\?ref=/);
  });

  it('parent share flow keeps generic dela-appen; personal referral is separate CTA', () => {
    const parent = read('public/js/parent-share-flow.js');
    const landing = read('public/js/landing-share.js');
    const referral = read('public/js/referral-share.js');
    assert.doesNotMatch(parent, /loadReferral/);
    assert.doesNotMatch(parent, /Din kod:/);
    assert.match(parent, /buildPayload\(/);
    assert.match(landing, /REGISTER_URL/);
    assert.match(referral, /message: text/);
    assert.match(referral, /text: text/);
    assert.match(read('public/js/growth-referral-cta.js'), /GrowthReferralCta/);
  });

  it('native share uses full text with URL (no separate url field)', () => {
    const parent = read('public/js/parent-share-flow.js');
    const landing = read('public/js/landing-share.js');
    assert.match(parent, /text: payload\.text \|\| payload\.message/);
    assert.doesNotMatch(parent, /url: payload\.url,/);
    assert.match(landing, /text: payload\.text \|\| payload\.message/);
  });

  it('mobile-nav uses ParentShareFlow instead of hardcoded share URL', () => {
    const src = read('public/js/mobile-nav.js');
    assert.match(src, /ParentShareFlow/);
    assert.doesNotMatch(src, /var SHARE_URL = 'https:\/\/[REDACTED]\.se'/);
  });

  it('dashboard-cta opens ParentShareFlow without referral code UI', () => {
    const src = read('public/js/dashboard-cta.js');
    assert.match(src, /ParentShareFlow/);
    assert.match(src, /openDelaAppenShare/);
    assert.doesNotMatch(src, /loadReferralShare/);
    assert.doesNotMatch(src, /Din kod:/);
  });

  it('admin analytics loads referrals table', () => {
    const src = read('public/admin/admin-analytics.js');
    assert.match(src, /loadReferralsAdmin/);
    assert.match(src, /\/api\/admin\/referrals/);
  });
});
