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
  if (!resendEmailId) return 0;
  const result = await db.query(
    `UPDATE newsletter_email_send
     SET delivered_at = COALESCE(delivered_at, $2)
     WHERE resend_email_id = $1`,
    [resendEmailId, occurredAt || new Date()]
  );
  return result.rowCount || 0;
}

async function markOpened(resendEmailId, occurredAt) {
  if (!resendEmailId) return 0;
  const result = await db.query(
    `UPDATE newsletter_email_send
     SET first_opened_at = COALESCE(first_opened_at, $2),
         open_count = open_count + 1
     WHERE resend_email_id = $1`,
    [resendEmailId, occurredAt || new Date()]
  );
  return result.rowCount || 0;
}

async function markClicked(resendEmailId, occurredAt, linkUrl) {
  if (!resendEmailId) return 0;
  const result = await db.query(
    `UPDATE newsletter_email_send
     SET first_clicked_at = COALESCE(first_clicked_at, $2),
         click_count = click_count + 1,
         last_click_url = COALESCE($3, last_click_url)
     WHERE resend_email_id = $1`,
    [resendEmailId, occurredAt || new Date(), linkUrl || null]
  );
  return result.rowCount || 0;
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
  const delivered = row.delivered || 0;
  const opened = row.opened_unique || 0;
  const clicked = row.clicked_unique || 0;
  const stats = {
    sent,
    delivered,
    opened_unique: opened,
    opened_total: row.opened_total || 0,
    clicked_unique: clicked,
    clicked_total: row.clicked_total || 0,
    open_rate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
    click_rate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
  };
  return attachTrackingDiagnostics(stats);
}

const { getRecentEventCounts } = require('./resend-webhook-events');
const { getDomainTrackingStatus } = require('../src/lib/resend-domain-status');

/**
 * Diagnostics for admin UI — explains why open/click stats may be zero.
 */
async function getTrackingDiagnostics() {
  const webhookConfigured = Boolean(process.env.RESEND_WEBHOOK_SECRET);
  const baseUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  let recentSends = 0;
  let recentDelivered = 0;
  try {
    const recent = await db.query(
      `SELECT
         COUNT(*)::int AS sent,
         COUNT(*) FILTER (WHERE delivered_at IS NOT NULL)::int AS delivered
       FROM newsletter_email_send
       WHERE sent_at > NOW() - INTERVAL '30 days'`
    );
    recentSends = recent.rows[0]?.sent || 0;
    recentDelivered = recent.rows[0]?.delivered || 0;
  } catch {
    // Table may not exist on very old DBs — degrade gracefully.
  }

  const [webhookEvents, domainTracking] = await Promise.all([
    getRecentEventCounts(30),
    getDomainTrackingStatus(),
  ]);

  const webhookReceivingDelivered = webhookEvents['email.delivered'] > 0
    || (recentSends > 0 && recentDelivered > 0);
  const webhookReceivingOpens = webhookEvents['email.opened'] > 0;
  const webhookReceivingClicks = webhookEvents['email.clicked'] > 0;

  return {
    webhook_configured: webhookConfigured,
    webhook_url: baseUrl ? `${baseUrl}/api/resend/webhook` : null,
    recent_sends_30d: recentSends,
    recent_delivered_30d: recentDelivered,
    webhook_receiving_events: webhookReceivingDelivered,
    webhook_events_30d: webhookEvents,
    domain_tracking: domainTracking,
    tracking_likely_disabled: domainTracking.available === true
      && !domainTracking.tracking_active,
  };
}

async function attachTrackingDiagnostics(stats) {
  const tracking = await getTrackingDiagnostics();
  return { ...stats, tracking };
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
  getTrackingDiagnostics,
  attachTrackingDiagnostics,
};
