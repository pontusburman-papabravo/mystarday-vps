'use strict';

const db = require('../src/lib/db');

/**
 * First-touch upsert: insert if missing; never overwrite existing non-null fields
 * with empties. New non-null fields may fill gaps on an existing row.
 */
async function upsertFirstTouch(familyId, fields) {
  const result = await db.query(
    `INSERT INTO family_acquisition_attribution (
       family_id, source, medium, campaign, content, term,
       referral_code, landing_locale, platform, first_touch_at, registered_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, now())
     )
     ON CONFLICT (family_id) DO UPDATE SET
       source = COALESCE(family_acquisition_attribution.source, EXCLUDED.source),
       medium = COALESCE(family_acquisition_attribution.medium, EXCLUDED.medium),
       campaign = COALESCE(family_acquisition_attribution.campaign, EXCLUDED.campaign),
       content = COALESCE(family_acquisition_attribution.content, EXCLUDED.content),
       term = COALESCE(family_acquisition_attribution.term, EXCLUDED.term),
       referral_code = COALESCE(family_acquisition_attribution.referral_code, EXCLUDED.referral_code),
       landing_locale = COALESCE(family_acquisition_attribution.landing_locale, EXCLUDED.landing_locale),
       platform = COALESCE(family_acquisition_attribution.platform, EXCLUDED.platform),
       first_touch_at = COALESCE(family_acquisition_attribution.first_touch_at, EXCLUDED.first_touch_at),
       updated_at = now()
     RETURNING family_id, source, medium, campaign, content, term,
               referral_code, landing_locale, platform, first_touch_at, registered_at`,
    [
      familyId,
      fields.source || null,
      fields.medium || null,
      fields.campaign || null,
      fields.content || null,
      fields.term || null,
      fields.referral_code || null,
      fields.landing_locale || null,
      fields.platform || null,
      fields.first_touch_at || null,
      fields.registered_at || null,
    ]
  );
  return result.rows[0] || null;
}

async function getByFamilyId(familyId) {
  const result = await db.query(
    `SELECT family_id, source, medium, campaign, content, term,
            referral_code, landing_locale, platform, first_touch_at, registered_at,
            created_at, updated_at
     FROM family_acquisition_attribution
     WHERE family_id = $1`,
    [familyId]
  );
  return result.rows[0] || null;
}

module.exports = {
  upsertFirstTouch,
  getByFamilyId,
};
