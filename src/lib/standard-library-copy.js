/**
 * Copy default_activity_template row into family activity_template.
 * Includes seven_questions when family has teacch and source row has data.
 */
const familySubscriptions = require('../../db/family-subscriptions');

function normalizeSevenQuestions(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const keys = Object.keys(raw);
  if (!keys.length) return null;
  return raw;
}

async function shouldCopySevenQuestions(familyId, act) {
  const sq = normalizeSevenQuestions(act.seven_questions);
  if (!sq) return null;
  const hasTeacch = await familySubscriptions.hasComponent(familyId, 'teacch');
  return hasTeacch ? sq : null;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} familyId
 * @param {object} act — default_activity_template row
 * @param {number} sortOrder
 * @returns {Promise<string>} new activity_template id
 */
async function insertFamilyActivityFromDefault(client, familyId, act, sortOrder) {
  const sevenQuestions = await shouldCopySevenQuestions(familyId, act);
  const cols = ['family_id', 'name', 'icon', 'star_value', 'is_favorite', 'sort_order'];
  const vals = [familyId, act.name, act.icon, act.star_value, false, sortOrder];
  if (sevenQuestions) {
    cols.push('seven_questions');
    vals.push(JSON.stringify(sevenQuestions));
  }
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
  const newTemplate = await client.query(
    `INSERT INTO activity_template (${cols.join(', ')})
     VALUES (${placeholders}) RETURNING id`,
    vals
  );
  const newId = newTemplate.rows[0].id;

  const subSteps = act.sub_steps || [];
  if (Array.isArray(subSteps) && subSteps.length > 0) {
    for (let i = 0; i < subSteps.length; i++) {
      await client.query(
        `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [newId, subSteps[i].name, subSteps[i].icon || null, i]
      );
    }
  }
  return newId;
}

module.exports = {
  shouldCopySevenQuestions,
  insertFamilyActivityFromDefault,
};
