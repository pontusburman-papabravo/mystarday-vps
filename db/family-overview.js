/**
 * Family kontrollcenter aggregation — Fas 3D.
 */
const db = require('../src/lib/db');

async function getFamilyOverview(familyId) {
  const [familyRes, messagesRes, packageRes, subscriptionRes] = await Promise.all([
    db.query(
      `SELECT f.id, f.name, f.created_at, f.archived_at, f.is_lifetime_free, f.subscription_status,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', p.id, 'email', p.email, 'name', p.name, 'verified', p.verified
              )) FILTER (WHERE p.id IS NOT NULL), '[]') AS parents,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', c.id, 'name', c.name, 'emoji', c.emoji
              )) FILTER (WHERE c.id IS NOT NULL), '[]') AS children
       FROM family f
       LEFT JOIN parent p ON p.family_id = f.id
       LEFT JOIN child c ON c.family_id = f.id
       WHERE f.id = $1
       GROUP BY f.id`,
      [familyId]
    ),
    db.query(
      `SELECT id, name, email, message_type, status, created_at, answered_at
       FROM contact_message WHERE family_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [familyId]
    ),
    db.query(
      `SELECT pi.id, pi.component, pi.source, pi.lead_status, pi.created_at
       FROM package_interest pi WHERE pi.family_id = $1 ORDER BY pi.created_at DESC`,
      [familyId]
    ),
    db.query(
      `SELECT tier, trial_expires_at, components
       FROM family_subscriptions WHERE family_id = $1`,
      [familyId]
    ),
  ]);

  if (!familyRes.rows[0]) return null;

  return {
    family: familyRes.rows[0],
    messages: messagesRes.rows,
    packageInterests: packageRes.rows,
    subscription: subscriptionRes.rows[0] || null,
  };
}

module.exports = { getFamilyOverview };
