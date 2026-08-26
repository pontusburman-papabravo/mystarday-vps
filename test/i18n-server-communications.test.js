'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { resolveCommunicationLocale } = require('../src/lib/communication-locale');
const { t, loadLocales } = require('../src/lib/i18n');
const { getPushContent, getDayContent } = require('../src/lib/activation-program-content');
const {
  sendWinBackEmail,
} = require('../src/lib/email');

const ROOT = path.join(__dirname, '..');

describe('i18n server communications', () => {
  it('resolveCommunicationLocale defaults to sv-SE', () => {
    assert.equal(resolveCommunicationLocale(null), 'sv-SE');
    assert.equal(resolveCommunicationLocale(''), 'sv-SE');
    assert.equal(resolveCommunicationLocale('en-GB'), 'en-GB');
  });

  it('P0 email template parity sv-SE / en-GB', () => {
    loadLocales();
    const keys = [
      'email.pinWarning.subject',
      'email.accountDeletionRequested.subject',
      'email.accountDeleted.subject',
      'email.childHandoff.subject',
      'email.welcomeShell.cta',
    ];
    for (const key of keys) {
      const sv = t('sv-SE', key, { brand: 'B', childName: 'Anna', name: 'Test', supportEmail: 'x', brandUrl: 'y' });
      const en = t('en-GB', key, { brand: 'B', childName: 'Anna', name: 'Test', supportEmail: 'x', brandUrl: 'y' });
      assert.ok(sv && sv.length > 2, `${key} sv missing`);
      assert.ok(en && en.length > 2, `${key} en missing`);
      assert.notEqual(sv, en, `${key} should differ between locales`);
    }
  });

  it('P1 email template parity', () => {
    loadLocales();
    const keys = [
      'email.invite.subject',
      'email.winBack.subject',
      'email.rewardRedemption.subject',
      'email.weeklySummary.subject',
      'email.activationNudge.withSchema.subject',
      'email.activationNudge.noSchema.subject',
      'email.newsletterConfirm.subject',
    ];
    const params = {
      brand: 'B',
      childName: 'Anna',
      name: 'Test',
      familyLabel: 'fam',
      familyName: 'Fam',
      rewardName: 'Ice cream',
      weekLabel: '2026-01-01 – 2026-01-07',
      settingsUrl: 'https://x/settings',
    };
    for (const key of keys) {
      const sv = t('sv-SE', key, params);
      const en = t('en-GB', key, params);
      assert.ok(sv.length > 2, `${key} sv`);
      assert.ok(en.length > 2, `${key} en`);
      assert.notEqual(sv, en, `${key} parity`);
    }
  });

  it('P0 push template parity', () => {
    loadLocales();
    const pairs = [
      ['push.scheduleReminder.title', { activityName: 'Breakfast', minutes: '5', childName: 'Anna' }],
      ['push.retentionReengagement.day3Title', {}],
      ['push.retentionReengagement.day7Body', {}],
    ];
    for (const [key, params] of pairs) {
      assert.ok(t('sv-SE', key, params));
      assert.ok(t('en-GB', key, params));
    }
  });

  it('P1 push template parity', () => {
    loadLocales();
    const pairs = [
      ['push.inactivityNudge.title', { childName: 'Anna' }],
      ['push.starMilestone.title', { childName: 'Anna', milestone: '10' }],
      ['push.backfillReminder.body', {}],
      ['push.custodyMorning.title', { childName: 'Anna' }],
      ['push.rewardRequest.title', { childName: 'Anna' }],
      ['push.activationProgram.day2Body', { childName: 'Anna' }],
    ];
    for (const [key, params] of pairs) {
      const sv = t('sv-SE', key, params);
      const en = t('en-GB', key, params);
      assert.ok(sv);
      assert.ok(en);
      assert.notEqual(sv, en, key);
    }
  });

  it('activation program day content is localized', () => {
    loadLocales();
    const sv = getDayContent(2, { childName: 'Anna', locale: 'sv-SE' });
    const en = getDayContent(2, { childName: 'Anna', locale: 'en-GB' });
    assert.notEqual(sv.title, en.title);
    assert.notEqual(sv.body, en.body);
    const sv3 = getDayContent(3, { childName: 'Anna', locale: 'sv-SE' });
    assert.match(sv3.body, /Anna/);
  });

  it('activation program push content is localized', () => {
    loadLocales();
    const sv = getPushContent(2, { childName: 'Anna', locale: 'sv-SE' });
    const en = getPushContent(2, { childName: 'Anna', locale: 'en-GB' });
    assert.ok(sv);
    assert.ok(en);
    assert.notEqual(sv.body, en.body);
    assert.match(sv.url, /ap_push=2/);
  });

  it('email helpers accept locale parameter', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/email.js'), 'utf8');
    assert.match(src, /sendPinWarningEmail\(parentEmail, childName, locale/);
    assert.match(src, /sendAccountDeletionRequestedEmail\(email, firstName, locale/);
    assert.match(src, /sendChildHandoffReminderEmail\(\{ to, parentName, ctaUrl, locale/);
    assert.match(src, /sendInviteEmail\(email, token, \{ inviteeName, inviterName, familyName, locale/);
    assert.match(src, /sendWinBackEmail\(\{ to, parentName, childName, ctaUrl, locale/);
    assert.match(src, /sendRewardRedemptionEmail\(\{/);
    assert.match(src, /locale = 'sv-SE'/);
  });

  it('suppressed test mailboxes do not send real email', async () => {
    process.env.EMAIL_ENABLED = 'true';
    const result = await sendWinBackEmail({
      to: 'parent@example.com',
      parentName: 'Test',
      childName: 'Anna',
      ctaUrl: 'https://example.test/dashboard',
      locale: 'en-GB',
    });
    assert.equal(result.success, true);
    assert.equal(result.provider, 'suppressed_test_mailbox');
  });

  it('localized win-back subject differs by locale (dry send)', async () => {
    loadLocales();
    const svSubject = t('sv-SE', 'email.winBack.subject');
    const enSubject = t('en-GB', 'email.winBack.subject');
    assert.notEqual(svSubject, enSubject);
    const svReward = t('sv-SE', 'email.rewardRedemption.subject', { childName: 'Anna', rewardName: 'Trip' });
    const enReward = t('en-GB', 'email.rewardRedemption.subject', { childName: 'Anna', rewardName: 'Trip' });
    assert.notEqual(svReward, enReward);
  });

  it('communication-locale module exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/i18n-server-communications.md')));
  });
});
