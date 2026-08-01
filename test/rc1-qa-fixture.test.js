'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  RC1_QA_PARENT_EMAIL,
  isAllowedRc1QaParentEmail,
  assertRc1QaFixtureEmail,
} = require('../test/support/rc1-qa-fixture');

describe('rc1-qa-fixture allowlist', () => {
  it('allows canonical QA parent email', () => {
    assert.equal(isAllowedRc1QaParentEmail(RC1_QA_PARENT_EMAIL), true);
  });

  it('rejects founder and review emails', () => {
    assert.equal(isAllowedRc1QaParentEmail('pontus@burman.cc'), false);
    assert.equal(isAllowedRc1QaParentEmail('review@example.com'), false);
  });

  it('assertRc1QaFixtureEmail throws for disallowed', () => {
    assert.throws(() => assertRc1QaFixtureEmail('other@example.com'), /allowlisted/);
  });
});
