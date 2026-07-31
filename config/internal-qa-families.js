'use strict';

/**
 * Internal QA / automation families — exclude from product activation KPIs.
 * Documented seeds: scripts/seed-smoke-family.mjs, scripts/seed-english-demo-family.mjs.
 */

const FAMILY_NAME_EXACT = ['English Demo (QA)'];
const FAMILY_NAME_PREFIXES = ['Smoke Parents'];
const PARENT_NAME_PREFIXES = ['Smoke Parents'];
const PARENT_EMAIL_SUFFIX = '@test.stjarndag.local';

/**
 * SQL boolean expression: true when the family row is internal QA/automation.
 * @param {string} familyAlias SQL alias for `family` (default `f`)
 */
function familyIsInternalQaSql(familyAlias = 'f') {
  const f = familyAlias;
  const parts = [];
  for (const name of FAMILY_NAME_EXACT) {
    parts.push(`${f}.name = '${name.replace(/'/g, "''")}'`);
  }
  for (const prefix of FAMILY_NAME_PREFIXES) {
    const escaped = prefix.replace(/'/g, "''");
    parts.push(`${f}.name ILIKE '${escaped}%'`);
  }
  const parentConds = PARENT_NAME_PREFIXES.map((prefix) => {
    const escaped = prefix.replace(/'/g, "''");
    return `p_int.name ILIKE '${escaped}%'`;
  });
  parentConds.push(`LOWER(p_int.email) LIKE '%${PARENT_EMAIL_SUFFIX.replace(/'/g, "''")}'`);
  parts.push(
    `EXISTS (SELECT 1 FROM parent p_int WHERE p_int.family_id = ${f}.id AND (${parentConds.join(' OR ')}))`
  );
  return parts.join(' OR ');
}

/** SQL fragment for WHERE: exclude internal QA families. */
function excludeInternalQaWhere(familyAlias = 'f') {
  return `NOT (${familyIsInternalQaSql(familyAlias)})`;
}

module.exports = {
  FAMILY_NAME_EXACT,
  FAMILY_NAME_PREFIXES,
  PARENT_NAME_PREFIXES,
  PARENT_EMAIL_SUFFIX,
  familyIsInternalQaSql,
  excludeInternalQaWhere,
};
