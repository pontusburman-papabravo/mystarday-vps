'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { resolveCommunicationLocale } = require('../src/lib/communication-locale');
const { t, loadLocales } = require('../src/lib/i18n');

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

  it('email helpers accept locale parameter', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/email.js'), 'utf8');
    assert.match(src, /sendPinWarningEmail\(parentEmail, childName, locale/);
    assert.match(src, /sendAccountDeletionRequestedEmail\(email, firstName, locale/);
    assert.match(src, /sendChildHandoffReminderEmail\(\{ to, parentName, ctaUrl, locale/);
  });

  it('communication-locale module exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/i18n-server-communications.md')));
  });
});
