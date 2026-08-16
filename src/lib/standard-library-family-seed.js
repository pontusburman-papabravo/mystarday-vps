'use strict';

const {
  copyStandardActivityToFamily,
  familyHasCanonicalActivity,
  mapCanonicalCopyErrorToHttp,
  NON_INTERACTIVE_AFTER_SCHOOL_VARIANT,
} = require('./canonical-library-runtime');
const { shouldCopySevenQuestions } = require('./standard-library-copy');

/**
 * Seed family starter activities from canonical default_activity_template rows (sv-SE DB path).
 * Preserves category assignment without name-based identity.
 *
 * @param {import('pg').PoolClient} client
 * @param {string} familyId
 * @param {object} categoryMap — template_group key → category id
 * @param {string} locale
 */
async function seedFamilyStarterActivitiesFromCanonicalDb(client, familyId, categoryMap, locale = 'sv-SE') {
  const { resolveTimeGroup, resolveTimeOffset } = require('./default-content');

  const grpResult = await client.query(
    `SELECT id, canonical_id, category_name,
            COALESCE(template_group, schema_type, 'forskola') AS grp,
            sort_order
     FROM default_activity_template
     WHERE canonical_id IS NOT NULL
     ORDER BY grp, sort_order ASC`
  );

  let copied = 0;
  for (const row of grpResult.rows) {
    const catId = categoryMap[row.grp] || categoryMap.forskola;
    if (!catId) continue;

    const already = await familyHasCanonicalActivity(client, familyId, row.canonical_id);
    if (already) continue;

    const activityVariants = row.canonical_id === 'after_school'
      ? { after_school: NON_INTERACTIVE_AFTER_SCHOOL_VARIANT }
      : null;

    const { templateId } = await copyStandardActivityToFamily(client, {
      familyId,
      defaultActivityId: row.id,
      canonicalActivityId: row.canonical_id,
      locale,
      variants: activityVariants,
      sortOrder: row.sort_order ?? 0,
      externalTransaction: true,
    });

    const timeGroup = resolveTimeGroup(row.category_name || 'Morgon');
    const combinedSort = resolveTimeOffset(row.category_name || 'Morgon') + (row.sort_order ?? 0);

    await client.query(
      `UPDATE activity_template
       SET category_id = $1, schema_type = $2, time_group = $3, sort_order = $4
       WHERE id = $5 AND family_id = $6`,
      [catId, row.grp, timeGroup, combinedSort, templateId, familyId]
    );
    copied += 1;
  }

  return copied;
}

module.exports = {
  copyStandardActivityToFamily,
  familyHasCanonicalActivity,
  mapCanonicalCopyErrorToHttp,
  seedFamilyStarterActivitiesFromCanonicalDb,
  shouldCopySevenQuestions,
};
