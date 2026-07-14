const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('F2b dashboard-cta.js', () => {
  it('CTA logic lives in its own file as an IIFE', () => {
    const src = read('public/js/dashboard-cta.js');
    assert.match(src, /^\(function \(\) \{/m);
    assert.match(src, /function showMedforalderCtaIfEligible\(/);
    assert.match(src, /function openDelaAppenShare\(/);
    assert.match(src, /ParentShareFlow/);
    assert.match(src, /const MEDFORALDER_CTA_KEY =/);
    assert.match(src, /const DELA_APPEN_KEY =/);
  });

  it('exposes entry points on window', () => {
    const src = read('public/js/dashboard-cta.js');
    for (const fn of [
      'showMedforalderCtaIfEligible', 'dismissMedforalderCtaBanner', 'openMedforalderCtaInvite',
      'closeMedforalderCtaModal', 'submitMedforalderCtaInvite', 'showDelaAppenCtaIfEligible',
      'dismissDelaAppenCtaBanner', 'openDelaAppenShare', 'initDelaAppenCta',
    ]) {
      assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `window.${fn} not exposed`);
    }
  });

  it('dashboard.js no longer defines the CTA functions/constants', () => {
    const src = read('public/js/dashboard.js');
    assert.doesNotMatch(src, /const MEDFORALDER_CTA_KEY =/);
    assert.doesNotMatch(src, /const DELA_APPEN_KEY =/);
    assert.doesNotMatch(src, /function showMedforalderCtaIfEligible\(/);
    assert.doesNotMatch(src, /function sendShareNotify\(/);
  });

  it('dashboard.js still invokes the CTAs during init (guarded)', () => {
    const src = read('public/js/dashboard.js');
    assert.match(src, /showMedforalderCtaIfEligible\(\)/);
    assert.match(src, /initDelaAppenCta\(\)/);
  });

  it('dashboard.html loads dashboard-cta after dashboard.js', () => {
    const html = read('public/dashboard.html');
    const dashIdx = html.indexOf('/js/dashboard.js');
    const ctaIdx = html.indexOf('/js/dashboard-cta.js');
    assert.ok(ctaIdx !== -1, 'dashboard-cta.js script tag missing');
    assert.ok(dashIdx < ctaIdx, 'dashboard-cta must load after dashboard.js');
  });
});
