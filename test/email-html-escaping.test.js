'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const XSS = '<img src=x onerror=alert(1)>';
const SPECIAL = '<>&"\'';
const EMAIL_SRC = fs.readFileSync(path.join(__dirname, '../src/lib/email.js'), 'utf8');

describe('email HTML escaping', () => {
  it('escapeHtml encodes <, >, &, ", \'', () => {
    const { escapeHtml } = require('../src/lib/escape-html');
    assert.equal(escapeHtml(SPECIAL), '&lt;&gt;&amp;&quot;&#39;');
    assert.equal(escapeHtml(XSS), '&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapeUserDisplay trims and escapes', () => {
    const { escapeUserDisplay } = require('../src/lib/email-html');
    assert.equal(escapeUserDisplay(`  ${XSS}  `), '&lt;img src=x onerror=alert(1)&gt;');
    assert.equal(escapeUserDisplay(''), null);
    assert.equal(escapeUserDisplay(null), null);
  });

  test('email.js uses shared email-html helpers', () => {
    assert.match(EMAIL_SRC, /require\('\.\/email-html'\)/);
    assert.match(EMAIL_SRC, /escapeUserDisplay/);
    assert.match(EMAIL_SRC, /escapeFirstName/);
  });

  test('sendInviteEmail escapes user-controlled names', () => {
    const block = extractFunction(EMAIL_SRC, 'sendInviteEmail');
    assert.match(block, /escapeUserDisplay\(inviteeName\)/);
    assert.match(block, /escapeUserDisplay\(inviterName\)/);
    assert.match(block, /escapeUserDisplay\(familyName\)/);
  });

  test('sendPinWarningEmail escapes childName', () => {
    const block = extractFunction(EMAIL_SRC, 'sendPinWarningEmail');
    assert.match(block, /escapeUserDisplay\(childName\)/);
  });

  test('sendRewardRedemptionEmail escapes redemption fields', () => {
    const block = extractFunction(EMAIL_SRC, 'sendRewardRedemptionEmail');
    assert.match(block, /escapeUserDisplay\(childName\)/);
    assert.match(block, /escapeUserDisplay\(rewardName\)/);
    assert.match(block, /escapeFirstName\(parentName\)/);
  });

  test('sendWinBackEmail escapes parent and child names', () => {
    const block = extractFunction(EMAIL_SRC, 'sendWinBackEmail');
    assert.match(block, /escapeFirstName\(parentName\)/);
    assert.match(block, /escapeUserDisplay\(childName\)/);
  });

  test('account deletion emails escape firstName and trusted link fragments stay raw HTML', () => {
    const requested = extractFunction(EMAIL_SRC, 'sendAccountDeletionRequestedEmail');
    assert.match(requested, /escapeUserDisplay\(firstName\)/);
    assert.match(requested, /brandLink = `<a href="/);

    const deleted = extractFunction(EMAIL_SRC, 'sendAccountDeletedEmail');
    assert.match(deleted, /escapeUserDisplay\(firstName\)/);
    assert.match(deleted, /returnLink = `<a href="/);
  });
});

function extractFunction(src, name) {
  const start = src.indexOf(`async function ${name}`);
  assert.ok(start >= 0, `missing ${name}`);
  const next = src.indexOf('\nasync function ', start + 1);
  return next >= 0 ? src.slice(start, next) : src.slice(start);
}
