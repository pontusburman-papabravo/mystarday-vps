/**
 * Newsletter opt-out helpers — token unsubscribe + auto-unsub on bounce/complaint.
 */
const db = require('./db');

const TOKEN_RE = /^[0-9a-f-]{36}$/i;

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

  if (resendEmailId) {
    const sendRow = await db.query(
      `SELECT parent_id, recipient_email
       FROM newsletter_email_send
       WHERE resend_email_id = $1
       LIMIT 1`,
      [resendEmailId]
    );
    if (sendRow.rows.length > 0) {
      parentId = sendRow.rows[0].parent_id;
      email = email || sendRow.rows[0].recipient_email;
    }
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
};
