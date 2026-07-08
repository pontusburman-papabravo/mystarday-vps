import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROD_REVIEW,
  LOCAL_SMOKE,
  PROTECTED_PARENT_EMAILS,
  isEphemeralTestEmail,
  isProtectedParentEmail,
  assertEmailsSafeToDelete,
  resolveSmokeCredentials,
} from '../scripts/lib/qa-test-accounts.mjs';

describe('qa-test-accounts', () => {
  it('protects prod review and local smoke emails', () => {
    assert.equal(isEphemeralTestEmail(PROD_REVIEW.parentEmail), false);
    assert.equal(isProtectedParentEmail(PROD_REVIEW.parentEmail), true);
    assert.equal(isEphemeralTestEmail(LOCAL_SMOKE.parentEmail), false);
    assert.equal(isProtectedParentEmail('Pontus@burman.cc'), true);
  });

  it('blocks any review@ local-part on any domain', () => {
    assert.equal(isProtectedParentEmail(PROD_REVIEW.parentEmail), true);
    assert.equal(isProtectedParentEmail('Review@Example.com'), true);
    assert.equal(isProtectedParentEmail('review@other.test'), true);
    assert.equal(isEphemeralTestEmail('review@other.test'), false);
  });

  it('assertEmailsSafeToDelete throws for review account', () => {
    assert.throws(
      () => assertEmailsSafeToDelete([PROD_REVIEW.parentEmail]),
      /BLOCKED.*protected/
    );
  });

  it('flags ephemeral QA patterns', () => {
    assert.equal(isEphemeralTestEmail('act1-e2e-123@example.com'), true);
    assert.equal(isEphemeralTestEmail('feat1-qa-123@example.com'), true);
    assert.equal(isEphemeralTestEmail('platform-qa-test@example.com'), true);
    assert.equal(isEphemeralTestEmail(PROD_REVIEW.parentEmail), false);
  });

  it('defaults local smoke credentials on localhost', () => {
    const creds = resolveSmokeCredentials({ BASE: 'http://127.0.0.1:3000' });
    assert.equal(creds.parentEmail, LOCAL_SMOKE.parentEmail);
    assert.equal(creds.childName, 'Astrid');
    assert.equal(creds.childPin, '4829');
    assert.equal(creds.children.length, 2);
  });

  it('requires explicit creds on prod base', () => {
    const creds = resolveSmokeCredentials({ BASE: PROD_REVIEW.baseUrl });
    assert.equal(creds.parentEmail, '');
    assert.equal(creds.childName, PROD_REVIEW.childName);
    assert.equal(creds.childPin, PROD_REVIEW.childPin);
  });

  it('lists protected emails', () => {
    assert.ok(PROTECTED_PARENT_EMAILS.includes(PROD_REVIEW.parentEmail));
    assert.ok(PROTECTED_PARENT_EMAILS.includes(LOCAL_SMOKE.parentEmail));
  });
});
