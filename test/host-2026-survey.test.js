'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'public/kampanj-host-2026.html'), 'utf8');
const legal = fs.readFileSync(path.join(ROOT, 'public/kampanj-host-2026-utlottning.html'), 'utf8');
const tyck = fs.readFileSync(path.join(ROOT, 'public/tyck.html'), 'utf8');
const privacy = fs.readFileSync(path.join(ROOT, 'public/privacy.html'), 'utf8');
const landingJs = fs.readFileSync(path.join(ROOT, 'src/routes/landing.js'), 'utf8');
const publicSurveys = fs.readFileSync(path.join(ROOT, 'src/routes/surveys/public.js'), 'utf8');
const methodDoc = fs.readFileSync(path.join(ROOT, 'docs/research/host-2026-survey-method.md'), 'utf8');
const paymentSettingsSrc = fs.readFileSync(path.join(ROOT, 'src/lib/payment-settings.js'), 'utf8');
const seed = require('../config/host-2026-survey');
const { isAllowlistedPublicSurveySlug } = require('../src/lib/survey-public-access');

const HEALTH = [
  /Har barnet NPF/i,
  /Har barnet autism/i,
  /Har barnet ADHD/i,
  /under utredning/i,
  /personnummer/i,
];

const FORBIDDEN_CLAIMS = [
  /minskar ångest/i,
  /minskar konflikter/i,
  /behandlar NPF/i,
  /garanterar mindre tjat/i,
  /VINN 500/i,
  /countdown/i,
  /59 kr/i,
];

test('host-2026 survey copy has seven required questions and no health data', () => {
  const required = seed.HOST_2026_SURVEY.questions.filter((q) => q.is_required !== false);
  assert.equal(required.length, 7);
  assert.equal(seed.HOST_2026_SURVEY.questions.filter((q) => q.is_required === false).length, 1);
  assert.ok(seed.HOST_2026_SURVEY.questions.some((q) => q.max_selections === 3));
  const q5 = seed.HOST_2026_SURVEY.questions.find((q) => q.question_text.includes('struktur i vardagen'));
  assert.equal(q5.max_selections, undefined);
  const blob = JSON.stringify(seed.HOST_2026_SURVEY);
  for (const re of HEALTH) assert.doesNotMatch(blob, re);
  assert.match(blob, /NPF-anpassning/);
  assert.doesNotMatch(blob, /59 kr/);
});

test('allowlist is only host-2026', () => {
  assert.equal(isAllowlistedPublicSurveySlug('host-2026'), true);
  assert.equal(isAllowlistedPublicSurveySlug('aktiva-anvandare'), false);
});

test('campaign page leads with download, survey sits later, no dark patterns', () => {
  assert.match(html, /<h1>Mindre tjat\. Mer koll på dagen\.<\/h1>/);
  assert.match(html, /Premium ingår om du registrerar dig senast 30 september\./);
  assert.match(html, /Svara på enkäten/);
  assert.match(html, /\/tyck\/host-2026/);
  assert.match(html, /\/kampanj\/host-2026\/utlottning/);
  const firstStore = html.indexOf('data-track="app_store_click"');
  const survey = html.indexOf('kampanj-survey');
  const secondStore = html.lastIndexOf('data-track="app_store_click"');
  assert.ok(firstStore > -1 && survey > firstStore, 'survey must come after first store CTA');
  assert.ok(secondStore > survey, 'store CTAs must repeat after survey');
  assert.doesNotMatch(html, /landing-login-choice/);
  assert.doesNotMatch(html, /survey-popup/);
  for (const re of FORBIDDEN_CLAIMS) assert.doesNotMatch(html, re);
});

test('lottery terms and privacy describe separated contact data', () => {
  assert.match(landingJs, /kampanj-host-2026-utlottning\.html/);
  assert.match(legal, /Papa Bravo AB/);
  assert.match(legal, /18 år/);
  assert.match(legal, /Inget köp|inget köp/i);
  assert.match(legal, /Zalando är inte sponsor eller administratör/);
  assert.match(legal, /31 oktober 2026/);
  assert.match(privacy, /utlottning/);
  assert.match(privacy, /nyhetsbrev/);
  assert.match(privacy, /31 oktober 2026/);
  const landingCss = fs.readFileSync(path.join(ROOT, 'public/css/landing.css'), 'utf8');
  assert.match(landingCss, /body\.kampanj-host-2026 \{/);
});

test('tyck UI collects contest email after submit and caps checkbox choices', () => {
  assert.match(tyck, /contest_collect_after_submit/);
  assert.match(tyck, /submitLottery/);
  assert.match(tyck, /Var med i utlottningen/);
  assert.match(tyck, /Du kan välja högst/);
  assert.match(tyck, /Valfritt/);
  assert.match(publicSurveys, /createSeparatedContestEntry/);
  assert.match(publicSurveys, /respondent_email: emailForResponse/);
});

test('method doc states directional research and no price decisions', () => {
  assert.match(methodDoc, /directional product research/);
  assert.match(methodDoc, /självselekterade/);
  assert.match(methodDoc, /Prisbeslut/);
  assert.match(methodDoc, /en sekund/);
  assert.doesNotMatch(methodDoc, /en timme före/);
});

test('host-2026 seed does not reuse one bound param for closes_at and contest_closes_at', () => {
  const migration = fs.readFileSync(
    path.join(ROOT, 'migrations/1810470000000_host_2026_survey.js'),
    'utf8'
  );
  assert.match(migration, /closes_at = \$5::timestamptz/);
  assert.match(migration, /contest_closes_at = \$11::timestamptz/);
  assert.match(migration, /\$5::timestamptz/);
  assert.match(migration, /\$11::timestamptz/);
  assert.doesNotMatch(migration, /contest_closes_at = \$5(?!::)/);
  assert.doesNotMatch(migration, /VALUES \(\s*\$1,\$2,\$3,\$4,'active',\$5,/);
});

test('lottery close is one second before Premium cutoff, not one hour', () => {
  assert.equal(seed.HOST_2026_CLOSES_AT, '2026-09-30T21:59:59.000Z');
  assert.match(paymentSettingsSrc, /DEFAULT_PAYMENT_START_AT = '2026-10-01T00:00:00\+02:00'/);
  const lotteryClose = Date.parse(seed.HOST_2026_CLOSES_AT);
  const premiumCutoff = Date.parse('2026-10-01T00:00:00+02:00');
  assert.equal(premiumCutoff - lotteryClose, 1000);
  assert.equal(new Date(premiumCutoff).toISOString(), '2026-09-30T22:00:00.000Z');
  assert.doesNotMatch(methodDoc, /en timme före/);
});
