/**
 * Newsletter opt-out helpers — token unsubscribe + auto-unsub on bounce/complaint.
 */
const db = require('./db');

const TOKEN_RE = /^[0-9a-f-]{36}$/i;

/** Campaign types whose delivery events must not mutate newsletter preferences. */
const ISOLATED_DELIVERY_CAMPAIGN_TYPES = new Set(['for_dig_outcome_followup']);

async function syncParentNewsletterFlag(parentId) {
  if (!parentId) return;
  await db.query(
    `UPDATE parent SET newsletter_subscribed = false WHERE id = $1`,
    [parentId]
  );
}

/**
 * Unsubscribe by email_subscriptions token (link in email / RFC 8058).
 * @returns {Promise<{ ok: boolean, alreadyUnsubscribed?: boolean, email?: string, parentId?: string, reason?: string }>}
 */
async function unsubscribeByToken(token) {
  if (!token || !TOKEN_RE.test(token)) {
    return { ok: false, reason: 'invalid_token' };
  }

  const result = await db.query(
    `UPDATE email_subscriptions
     SET subscribed = false,
         unsubscribed_at = NOW(),
         updated_at = NOW()
     WHERE unsubscribe_token = $1
       AND subscribed = true
     RETURNING parent_id, email`,
    [token]
  );

  if (result.rows.length === 0) {
    return { ok: true, alreadyUnsubscribed: true };
  }

  const row = result.rows[0];
  await syncParentNewsletterFlag(row.parent_id);
  return { ok: true, email: row.email, parentId: row.parent_id };
}

/**
 * Auto-unsubscribe after bounce or spam complaint.
 * Skips temporary (soft) bounces — only permanent bounces trigger opt-out.
 * Isolated campaigns (För dig follow-up) are tracked but do not mutate newsletter prefs.
 */
async function autoUnsubscribeFromDeliveryEvent({
  resendEmailId,
  recipientEmail,
  reason,
  bounceType,
}) {
  if (bounceType && String(bounceType).toLowerCase() === 'temporary') {
    console.log('[NEWSLETTER-UNSUB] Skipping soft bounce for %s', recipientEmail || resendEmailId);
    return { ok: false, skipped: true, reason: 'soft_bounce' };
  }

  let parentId = null;
  let email = recipientEmail ? String(recipientEmail).trim() : null;
  let campaignType = null;

  if (resendEmailId) {
    const sendRow = await db.query(
      `SELECT parent_id, recipient_email, campaign_type
       FROM newsletter_email_send
       WHERE resend_email_id = $1
       LIMIT 1`,
      [resendEmailId]
    );
    if (sendRow.rows.length > 0) {
      parentId = sendRow.rows[0].parent_id;
      email = email || sendRow.rows[0].recipient_email;
      campaignType = sendRow.rows[0].campaign_type || null;
    }
  }

  if (campaignType && ISOLATED_DELIVERY_CAMPAIGN_TYPES.has(String(campaignType))) {
    console.log(
      '[NEWSLETTER-UNSUB] Skipping newsletter mutation for isolated campaign %s (reason=%s)',
      campaignType,
      reason
    );
    return {
      ok: true,
      skipped: true,
      reason: 'isolated_campaign',
      campaignType,
      email,
      parentId,
    };
  }

  if (!email && !parentId) {
    console.warn('[NEWSLETTER-UNSUB] Could not resolve recipient for %s (%s)', reason, resendEmailId);
    return { ok: false, reason: 'recipient_not_found' };
  }

  const result = await db.query(
    `UPDATE email_subscriptions
     SET subscribed = false,
         unsubscribed_at = NOW(),
         updated_at = NOW()
     WHERE subscribed = true
       AND (
         ($1::uuid IS NOT NULL AND parent_id = $1)
         OR ($2::text IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($2)))
       )
     RETURNING parent_id, email`,
    [parentId, email]
  );

  if (result.rows.length === 0) {
    return { ok: true, alreadyUnsubscribed: true, email, parentId };
  }

  const row = result.rows[0];
  await syncParentNewsletterFlag(row.parent_id || parentId);
  console.log(
    '[NEWSLETTER-UNSUB] Auto-unsubscribed %s (reason=%s, bounceType=%s)',
    row.email || email,
    reason,
    bounceType || 'n/a'
  );
  return { ok: true, email: row.email || email, parentId: row.parent_id || parentId, reason };
}

module.exports = {
  unsubscribeByToken,
  autoUnsubscribeFromDeliveryEvent,
  ISOLATED_DELIVERY_CAMPAIGN_TYPES,
};
