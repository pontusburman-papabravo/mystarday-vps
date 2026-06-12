/**
 * Newsletter e-postspårning — per mottagare och kampanj (Resend webhooks).
 */
const db = require('../src/lib/db');

async function recordSend({
  campaignType,
  campaignId,
  parentId,
  recipientEmail,
  resendEmailId,
}) {
  if (!campaignType || !campaignId || !recipientEmail) return null;

  const result = await db.query(
    `INSERT INTO newsletter_email_send
       (campaign_type, campaign_id, parent_id, recipient_email, resend_email_id, sent_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (resend_email_id) DO NOTHING
     RETURNING id`,
    [campaignType, campaignId, parentId || null, recipientEmail, resendEmailId || null]
  );
  return result.rows[0]?.id || null;
}

async function markDelivered(resendEmailId, occurredAt) {
  if (!resendEmailId) return;
  await db.query(
    `UPDATE newsletter_email_send
     SET delivered_at = COALESCE(delivered_at, $2)
     WHERE resend_email_id = $1`,
    [resendEmailId, occurredAt || new Date()]
  );
}

async function markOpened(resendEmailId, occurredAt) {
  if (!resendEmailId) return;
  await db.query(
    `UPDATE newsletter_email_send
     SET first_opened_at = COALESCE(first_opened_at, $2),
         open_count = open_count + 1
     WHERE resend_email_id = $1`,
    [resendEmailId, occurredAt || new Date()]
  );
}

async function markClicked(resendEmailId, occurredAt, linkUrl) {
  if (!resendEmailId) return;
  await db.query(
    `UPDATE newsletter_email_send
     SET first_clicked_at = COALESCE(first_clicked_at, $2),
         click_count = click_count + 1,
         last_click_url = COALESCE($3, last_click_url)
     WHERE resend_email_id = $1`,
    [resendEmailId, occurredAt || new Date(), linkUrl || null]
  );
}

async function getCampaignStats(campaignType, campaignId) {
  const result = await db.query(
    `SELECT
       COUNT(*)::int AS sent,
       COUNT(*) FILTER (WHERE delivered_at IS NOT NULL)::int AS delivered,
       COUNT(*) FILTER (WHERE first_opened_at IS NOT NULL)::int AS opened_unique,
       COALESCE(SUM(open_count), 0)::int AS opened_total,
       COUNT(*) FILTER (WHERE first_clicked_at IS NOT NULL)::int AS clicked_unique,
       COALESCE(SUM(click_count), 0)::int AS clicked_total
     FROM newsletter_email_send
     WHERE campaign_type = $1 AND campaign_id = $2`,
    [campaignType, campaignId]
  );
  const row = result.rows[0] || {};
  const sent = row.sent || 0;
  const opened = row.opened_unique || 0;
  const clicked = row.clicked_unique || 0;
  return {
    sent,
    delivered: row.delivered || 0,
    opened_unique: opened,
    opened_total: row.opened_total || 0,
    clicked_unique: clicked,
    clicked_total: row.clicked_total || 0,
    open_rate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
    click_rate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
  };
}

async function getCampaignRecipients(campaignType, campaignId) {
  const result = await db.query(
    `SELECT
       nes.id,
       nes.parent_id,
       COALESCE(p.name, '(inget namn)') AS name,
       nes.recipient_email AS email,
       nes.sent_at,
       nes.delivered_at,
       nes.first_opened_at,
       nes.open_count,
       nes.first_clicked_at,
       nes.click_count,
       nes.last_click_url
     FROM newsletter_email_send nes
     LEFT JOIN parent p ON p.id = nes.parent_id
     WHERE nes.campaign_type = $1 AND nes.campaign_id = $2
     ORDER BY nes.sent_at DESC`,
    [campaignType, campaignId]
  );
  return result.rows;
}

module.exports = {
  recordSend,
  markDelivered,
  markOpened,
  markClicked,
  getCampaignStats,
  getCampaignRecipients,
};
