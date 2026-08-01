'use strict';

/** RC-1 automated QA fixture identity — test/CI only (not app runtime). */

const RC1_QA_FAMILY_NAME = 'RC-1 QA Fixture (automation)';
const RC1_QA_EMAIL_DOMAIN = `qa-automation.${String.fromCharCode(109, 121, 115, 116, 97, 114, 100, 97, 121)}.se`;
const RC1_QA_PARENT_EMAIL = `rc1-qa-parent@${RC1_QA_EMAIL_DOMAIN}`;
const RC1_QA_CHILD_DISPLAY_NAME = 'RC1 Child';
const RC1_QA_CHILD_USERNAME = 'rc1qachild';

const RC1_QA_EMAIL_ALLOWLIST = new Set([
  RC1_QA_PARENT_EMAIL.toLowerCase(),
]);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isAllowedRc1QaParentEmail(email) {
  return RC1_QA_EMAIL_ALLOWLIST.has(normalizeEmail(email));
}

function isRc1QaEmailDomain(email) {
  const domain = normalizeEmail(email).split('@')[1];
  return domain === RC1_QA_EMAIL_DOMAIN;
}

function assertRc1QaFixtureEmail(email) {
  if (!isAllowedRc1QaParentEmail(email)) {
    const err = new Error(
      'RC1 QA prepare refused: parent email is not an allowlisted RC-1 QA fixture address'
    );
    err.code = 'RC1_QA_EMAIL_NOT_ALLOWLISTED';
    throw err;
  }
}

module.exports = {
  RC1_QA_FAMILY_NAME,
  RC1_QA_PARENT_EMAIL,
  RC1_QA_EMAIL_DOMAIN,
  RC1_QA_CHILD_DISPLAY_NAME,
  RC1_QA_CHILD_USERNAME,
  isAllowedRc1QaParentEmail,
  isRc1QaEmailDomain,
  assertRc1QaFixtureEmail,
  normalizeEmail,
};
