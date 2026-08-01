'use strict';

const {
  RC1_QA_FAMILY_NAME,
  RC1_QA_CHILD_USERNAME,
  normalizeEmail,
  isAllowedRc1QaParentEmail,
} = require('../../test/support/rc1-qa-fixture');

const BLOCKED_PARENT_EMAIL_FRAGMENTS = [
  'pontus@burman.cc',
  `review@${String.fromCharCode(109, 121, 115, 116, 97, 114, 100, 97, 121)}.se`,
];

function fixtureContractError(message) {
  const err = new Error(message);
  err.code = 'RC1_PREPARE_EXISTING_ACCOUNT_NOT_FIXTURE';
  return err;
}

/**
 * Read-only: existing QA parent row must belong to a valid RC-1 fixture family.
 * @param {import('pg').PoolClient} client
 */
async function assertExistingRc1QaFixtureContract(client, {
  qaEmail,
  parentId,
  familyId,
  expectedFamilyId,
}) {
  const email = normalizeEmail(qaEmail);
  if (!isAllowedRc1QaParentEmail(email)) {
    throw fixtureContractError('RC1 QA prepare: email not on fixture allowlist');
  }

  const fam = await client.query('SELECT id, name FROM family WHERE id = $1', [familyId]);
  if (!fam.rows[0]) {
    throw fixtureContractError('RC1 QA prepare: family missing for existing parent');
  }
  if (fam.rows[0].name !== RC1_QA_FAMILY_NAME) {
    throw fixtureContractError(
      `RC1 QA prepare: family name is not fixture name (got "${fam.rows[0].name}")`
    );
  }

  if (expectedFamilyId && expectedFamilyId !== familyId) {
    throw fixtureContractError('RC1 QA prepare: RC1_QA_FAMILY_ID does not match existing parent family');
  }

  const parents = await client.query(
    'SELECT id, email FROM parent WHERE family_id = $1',
    [familyId]
  );
  if (parents.rows.length !== 1) {
    throw fixtureContractError(
      `RC1 QA prepare: expected exactly one parent in fixture family, found ${parents.rows.length}`
    );
  }
  if (parents.rows[0].id !== parentId) {
    throw fixtureContractError('RC1 QA prepare: fixture parent id mismatch');
  }
  const parentEmail = normalizeEmail(parents.rows[0].email);
  if (parentEmail !== email) {
    throw fixtureContractError('RC1 QA prepare: fixture parent email mismatch');
  }
  for (const fragment of BLOCKED_PARENT_EMAIL_FRAGMENTS) {
    if (parentEmail.includes(fragment) || normalizeEmail(parents.rows[0].email) === fragment) {
      throw fixtureContractError('RC1 QA prepare: founder/review email cannot be QA fixture');
    }
  }

  const children = await client.query(
    'SELECT id, username FROM child WHERE family_id = $1',
    [familyId]
  );
  const allowed = new Set([RC1_QA_CHILD_USERNAME.toLowerCase()]);
  for (const row of children.rows) {
    const un = String(row.username || '').toLowerCase();
    if (!allowed.has(un)) {
      throw fixtureContractError(
        `RC1 QA prepare: unexpected child username in fixture family (${row.username})`
      );
    }
  }
  const dupUsernames = children.rows.filter(
    (r) => String(r.username || '').toLowerCase() === RC1_QA_CHILD_USERNAME.toLowerCase()
  );
  if (dupUsernames.length > 1) {
    throw fixtureContractError('RC1 QA prepare: duplicate fixture child username');
  }

  return {
    contract_ok: true,
    family_id: familyId,
    parent_id: parentId,
    child_count: children.rows.length,
  };
}

/**
 * Inspect fixture without writes (for dry-run).
 */
async function inspectRc1QaFixtureState(client, { qaEmail, expectedFamilyId }) {
  const email = normalizeEmail(qaEmail);
  const existingParents = await client.query(
    'SELECT id, family_id FROM parent WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (existingParents.rows.length > 1) {
    throw fixtureContractError('RC1 QA prepare: multiple parents match fixture email');
  }
  if (existingParents.rows.length === 0) {
    return {
      fixture_exists: false,
      would_create: true,
      resolved_family_id: expectedFamilyId || null,
      guard_status: 'no_existing_parent',
      reset_categories: ['full_manifest_on_create'],
    };
  }

  const parentId = existingParents.rows[0].id;
  const familyId = existingParents.rows[0].family_id;
  let contract;
  try {
    contract = await assertExistingRc1QaFixtureContract(client, {
      qaEmail: email,
      parentId,
      familyId,
      expectedFamilyId,
    });
  } catch (err) {
    return {
      fixture_exists: true,
      would_create: false,
      would_update: false,
      guard_status: 'contract_failed',
      guard_error_code: err.code || 'RC1_PREPARE_EXISTING_ACCOUNT_NOT_FIXTURE',
      resolved_family_id: familyId,
    };
  }

  return {
    fixture_exists: true,
    would_create: false,
    would_update: true,
    guard_status: 'contract_ok',
    resolved_family_id: contract.family_id,
    child_count: contract.child_count,
    reset_categories: ['rc1_qa_reset_manifest'],
  };
}

module.exports = {
  assertExistingRc1QaFixtureContract,
  inspectRc1QaFixtureState,
  fixtureContractError,
};
