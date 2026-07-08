/**
 * CJS bridge for Node scripts that cannot import .mjs directly.
 * Keep in sync with qa-test-accounts.mjs
 */
'use strict';

const REVIEW_DOMAIN = 'my' + 'star' + 'day.se';

const PROD_REVIEW = {
  parentEmail: 'review@' + REVIEW_DOMAIN,
  parentPassword: 'AppReview2026!',
  parentName: 'Review Tester',
  childName: 'Anna',
  childPin: '4455',
  baseUrl: 'https://' + REVIEW_DOMAIN,
};

const LOCAL_SMOKE = {
  parentEmail: 'qa.mobil@test.stjarndag.local',
  parentPassword: 'QaMobilTest2026!Secure',
  parentName: 'QA Mobil',
  baseUrl: 'http://127.0.0.1:3000',
  children: [
    { name: 'Astrid', pin: '4829', emoji: '⭐', birthday: '2016-05-15' },
    { name: 'Erik', pin: '7391', emoji: '🚀', birthday: '2018-03-20' },
  ],
};

const PROTECTED_PARENT_EMAILS = [
  PROD_REVIEW.parentEmail,
  LOCAL_SMOKE.parentEmail,
  'Pontus@burman.cc',
];

const PROTECTED_EMAIL_LOCAL_PARTS = ['review'];

function isProtectedParentEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const lower = email.trim().toLowerCase();
  if (PROTECTED_PARENT_EMAILS.some((p) => lower === p.toLowerCase())) return true;
  const at = lower.indexOf('@');
  if (at <= 0) return false;
  const local = lower.slice(0, at);
  return PROTECTED_EMAIL_LOCAL_PARTS.includes(local);
}

function assertEmailsSafeToDelete(emails, context = 'cleanup') {
  const blocked = (emails || []).filter((e) => isProtectedParentEmail(e));
  if (blocked.length) {
    throw new Error(
      `[${context}] BLOCKED: cannot delete protected account(s): ${blocked.join(', ')}`
    );
  }
}

const EPHEMERAL_EMAIL_PATTERNS = [
  /^act1-(e2e|curl|debug)-.+@example\.com$/i,
  /^feat1-qa-.+@example\.com$/i,
  /^feat1c-browser-.+@example\.com$/i,
  /^helrutin-qa-.+@example\.com$/i,
  /^(platform|family|planning|rewards)-qa-test@example\.com$/i,
];

function isEphemeralTestEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (isProtectedParentEmail(email)) return false;
  const lower = email.toLowerCase();
  return EPHEMERAL_EMAIL_PATTERNS.some((re) => re.test(lower));
}

module.exports = {
  PROD_REVIEW,
  LOCAL_SMOKE,
  PROTECTED_PARENT_EMAILS,
  EPHEMERAL_EMAIL_PATTERNS,
  isProtectedParentEmail,
  assertEmailsSafeToDelete,
  isEphemeralTestEmail,
};
