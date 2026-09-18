/**
 * db/meta-ad-campaigns.js
 * Owns: CRUD and status transitions for approval-gated Meta Ads.
 * Does NOT own: Graph API calls (src/lib/meta-ads/publisher.js).
 */

const db = require('../src/lib/db');

const PUBLIC_COLUMNS = `
  id, slug, name, status, objective, destination_url,
  daily_budget_ore, lifetime_budget_ore, countries, age_min, age_max,
  primary_text, headline, description, call_to_action, image_url,
  hypothesis, primary_metric, notes, created_source,
  created_by, submitted_by, submitted_at, approved_by, approved_at,
  rejected_by, rejected_at, reject_reason, paused_by, paused_at,
  meta_campaign_id, meta_adset_id, meta_creative_id, meta_ad_id, meta_image_hash,
  last_error, last_insights, last_insights_at, created_at, updated_at
`;

async function insertCampaign(brief, { actorId, actorSource }) {
  const result = await db.query(
    `INSERT INTO meta_ad_campaign (
       slug, name, objective, destination_url, daily_budget_ore, lifetime_budget_ore,
       countries, age_min, age_max, primary_text, headline, description,
       call_to_action, image_url, hypothesis, primary_metric, notes,
       created_by, created_source, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11, $12,
       $13, $14, $15, $16, $17,
       $18, $19, 'draft'
     ) RETURNING ${PUBLIC_COLUMNS}`,
    [
      brief.slug,
      brief.name,
      brief.objective,
      brief.destination_url,
      brief.daily_budget_ore,
      brief.lifetime_budget_ore,
      brief.countries,
      brief.age_min,
      brief.age_max,
      brief.primary_text,
      brief.headline,
      brief.description,
      brief.call_to_action,
      brief.image_url,
      brief.hypothesis,
      brief.primary_metric,
      brief.notes,
      actorId || null,
      actorSource || brief.created_source || 'admin',
    ]
  );
  const row = result.rows[0];
  await logAction(row.id, 'created', actorId, actorSource || row.created_source, { slug: row.slug });
  return row;
}

async function updateDraft(id, brief) {
  const result = await db.query(
    `UPDATE meta_ad_campaign SET
       slug = $2, name = $3, objective = $4, destination_url = $5,
       daily_budget_ore = $6, lifetime_budget_ore = $7, countries = $8,
       age_min = $9, age_max = $10, primary_text = $11, headline = $12,
       description = $13, call_to_action = $14, image_url = $15,
       hypothesis = $16, primary_metric = $17, notes = $18,
       last_error = NULL, updated_at = NOW()
     WHERE id = $1 AND status IN ('draft', 'rejected')
     RETURNING ${PUBLIC_COLUMNS}`,
    [
      id,
      brief.slug,
      brief.name,
      brief.objective,
      brief.destination_url,
      brief.daily_budget_ore,
      brief.lifetime_budget_ore,
      brief.countries,
      brief.age_min,
      brief.age_max,
      brief.primary_text,
      brief.headline,
      brief.description,
      brief.call_to_action,
      brief.image_url,
      brief.hypothesis,
      brief.primary_metric,
      brief.notes,
    ]
  );
  return result.rows[0] || null;
}

async function getById(id) {
  const result = await db.query(
    `SELECT ${PUBLIC_COLUMNS} FROM meta_ad_campaign WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function listCampaigns({ status, limit = 80 } = {}) {
  const params = [];
  let sql = `SELECT ${PUBLIC_COLUMNS} FROM meta_ad_campaign`;
  if (status) {
    params.push(status);
    sql += ` WHERE status = $1`;
  }
  params.push(limit);
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
  const result = await db.query(sql, params);
  return result.rows;
}

async function getSummary() {
  const result = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
      COUNT(*) FILTER (WHERE status = 'pending_approval')::int AS pending_approval,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
      COUNT(*) FILTER (WHERE status = 'publishing')::int AS publishing,
      COUNT(*) FILTER (WHERE status = 'live')::int AS live,
      COUNT(*) FILTER (WHERE status = 'paused')::int AS paused,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COUNT(*)::int AS total
    FROM meta_ad_campaign
  `);
  return result.rows[0];
}

async function submitForApproval(id, actorId) {
  const result = await db.query(
    `UPDATE meta_ad_campaign
        SET status = 'pending_approval',
            submitted_by = $2,
            submitted_at = NOW(),
            reject_reason = NULL,
            last_error = NULL,
            updated_at = NOW()
      WHERE id = $1 AND status IN ('draft', 'rejected')
      RETURNING ${PUBLIC_COLUMNS}`,
    [id, actorId || null]
  );
  const row = result.rows[0];
  if (row) await logAction(id, 'submitted', actorId, 'admin');
  return row || null;
}

async function rejectCampaign(id, actorId, reason) {
  const result = await db.query(
    `UPDATE meta_ad_campaign
        SET status = 'rejected',
            rejected_by = $2,
            rejected_at = NOW(),
            reject_reason = $3,
            updated_at = NOW()
      WHERE id = $1 AND status IN ('draft', 'pending_approval', 'failed', 'publishing')
      RETURNING ${PUBLIC_COLUMNS}`,
    [id, actorId || null, reason || null]
  );
  const row = result.rows[0];
  if (row) await logAction(id, 'rejected', actorId, 'admin', { reason: reason || null });
  return row || null;
}

async function claimForPublish(id, actorId) {
  const result = await db.query(
    `UPDATE meta_ad_campaign
        SET status = 'publishing',
            approved_by = COALESCE(approved_by, $2),
            approved_at = COALESCE(approved_at, NOW()),
            last_error = NULL,
            updated_at = NOW()
      WHERE id = $1 AND status IN ('pending_approval', 'failed')
      RETURNING ${PUBLIC_COLUMNS}`,
    [id, actorId || null]
  );
  return result.rows[0] || null;
}

async function markLive(id, metaIds) {
  const result = await db.query(
    `UPDATE meta_ad_campaign
        SET status = 'live',
            meta_campaign_id = $2,
            meta_adset_id = $3,
            meta_creative_id = $4,
            meta_ad_id = $5,
            meta_image_hash = $6,
            last_error = NULL,
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${PUBLIC_COLUMNS}`,
    [
      id,
      metaIds.meta_campaign_id,
      metaIds.meta_adset_id,
      metaIds.meta_creative_id,
      metaIds.meta_ad_id,
      metaIds.meta_image_hash,
    ]
  );
  return result.rows[0] || null;
}

async function markFailed(id, errorMessage, metaIds = {}) {
  const result = await db.query(
    `UPDATE meta_ad_campaign
        SET status = 'failed',
            last_error = $2,
            meta_campaign_id = COALESCE($3, meta_campaign_id),
            meta_adset_id = COALESCE($4, meta_adset_id),
            meta_creative_id = COALESCE($5, meta_creative_id),
            meta_ad_id = COALESCE($6, meta_ad_id),
            meta_image_hash = COALESCE($7, meta_image_hash),
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${PUBLIC_COLUMNS}`,
    [
      id,
      errorMessage,
      metaIds.meta_campaign_id || null,
      metaIds.meta_adset_id || null,
      metaIds.meta_creative_id || null,
      metaIds.meta_ad_id || null,
      metaIds.meta_image_hash || null,
    ]
  );
  return result.rows[0] || null;
}

async function pauseCampaign(id, actorId) {
  const result = await db.query(
    `UPDATE meta_ad_campaign
        SET status = 'paused',
            paused_by = $2,
            paused_at = NOW(),
            updated_at = NOW()
      WHERE id = $1 AND status = 'live'
      RETURNING ${PUBLIC_COLUMNS}`,
    [id, actorId || null]
  );
  const row = result.rows[0];
  if (row) await logAction(id, 'paused', actorId, 'admin');
  return row || null;
}

async function resumeCampaign(id, actorId) {
  const result = await db.query(
    `UPDATE meta_ad_campaign
        SET status = 'live',
            paused_by = NULL,
            paused_at = NULL,
            updated_at = NOW()
      WHERE id = $1 AND status = 'paused'
      RETURNING ${PUBLIC_COLUMNS}`,
    [id]
  );
  const row = result.rows[0];
  if (row) await logAction(id, 'resumed', actorId, 'admin');
  return row || null;
}

async function saveInsights(id, insights) {
  const result = await db.query(
    `UPDATE meta_ad_campaign
        SET last_insights = $2::jsonb,
            last_insights_at = NOW(),
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${PUBLIC_COLUMNS}`,
    [id, JSON.stringify(insights)]
  );
  return result.rows[0] || null;
}

async function listActions(campaignId, limit = 40) {
  const result = await db.query(
    `SELECT id, campaign_id, action, actor_id, actor_source, detail, created_at
       FROM meta_ad_campaign_action
      WHERE campaign_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [campaignId, limit]
  );
  return result.rows;
}

async function logAction(campaignId, action, actorId, actorSource, detail) {
  await db.query(
    `INSERT INTO meta_ad_campaign_action (campaign_id, action, actor_id, actor_source, detail)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [campaignId, action, actorId || null, actorSource || 'admin', detail ? JSON.stringify(detail) : null]
  );
}

module.exports = {
  insertCampaign,
  updateDraft,
  getById,
  listCampaigns,
  getSummary,
  submitForApproval,
  rejectCampaign,
  claimForPublish,
  markLive,
  markFailed,
  pauseCampaign,
  resumeCampaign,
  saveInsights,
  listActions,
  logAction,
};
