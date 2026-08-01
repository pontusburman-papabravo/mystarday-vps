'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  RC1_QA_FAMILY_NAME,
  RC1_QA_PARENT_EMAIL,
  RC1_QA_CHILD_USERNAME,
} = require('../test/support/rc1-qa-fixture');
const {
  assertExistingRc1QaFixtureContract,
} = require('../scripts/lib/rc1-qa-fixture-contract');

function mockClient(state) {
  return {
    async query(sql, params) {
      const s = String(sql);
      if (s.includes('SELECT id, name FROM family WHERE id')) {
        return { rows: [{ id: params[0], name: state.familyName }] };
      }
      if (s.includes('SELECT id, email FROM parent WHERE family_id')) {
        return { rows: state.parents };
      }
      if (s.includes('SELECT id, username FROM child WHERE family_id')) {
        return { rows: state.children };
      }
      throw new Error(`unexpected query: ${s}`);
    },
  };
}

describe('rc1-qa-fixture-contract pre-write', () => {
  const base = {
    qaEmail: RC1_QA_PARENT_EMAIL,
    parentId: 'parent-1',
    familyId: 'fam-1',
    expectedFamilyId: null,
  };

  it('passes valid existing fixture', async () => {
    const client = mockClient({
      familyName: RC1_QA_FAMILY_NAME,
      parents: [{ id: 'parent-1', email: RC1_QA_PARENT_EMAIL }],
      children: [{ id: 'c1', username: RC1_QA_CHILD_USERNAME }],
    });
    const out = await assertExistingRc1QaFixtureContract(client, base);
    assert.equal(out.contract_ok, true);
  });

  it('fails wrong family name without writes', async () => {
    const client = mockClient({
      familyName: 'Other Family',
      parents: [{ id: 'parent-1', email: RC1_QA_PARENT_EMAIL }],
      children: [],
    });
    await assert.rejects(
      () => assertExistingRc1QaFixtureContract(client, base),
      (err) => err.code === 'RC1_PREPARE_EXISTING_ACCOUNT_NOT_FIXTURE'
    );
  });

  it('fails extra parent', async () => {
    const client = mockClient({
      familyName: RC1_QA_FAMILY_NAME,
      parents: [
        { id: 'parent-1', email: RC1_QA_PARENT_EMAIL },
        { id: 'parent-2', email: 'other@example.com' },
      ],
      children: [],
    });
    await assert.rejects(
      () => assertExistingRc1QaFixtureContract(client, base),
      /exactly one parent/
    );
  });

  it('fails unexpected child username', async () => {
    const client = mockClient({
      familyName: RC1_QA_FAMILY_NAME,
      parents: [{ id: 'parent-1', email: RC1_QA_PARENT_EMAIL }],
      children: [{ id: 'c1', username: 'astrid' }],
    });
    await assert.rejects(
      () => assertExistingRc1QaFixtureContract(client, base),
      /unexpected child/
    );
  });

  it('fails expected family id mismatch', async () => {
    const client = mockClient({
      familyName: RC1_QA_FAMILY_NAME,
      parents: [{ id: 'parent-1', email: RC1_QA_PARENT_EMAIL }],
      children: [],
    });
    await assert.rejects(
      () => assertExistingRc1QaFixtureContract(client, {
        ...base,
        expectedFamilyId: 'other-fam-id',
      }),
      /RC1_QA_FAMILY_ID/
    );
  });
});
