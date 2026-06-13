/**
 * Newsletter opt-in helpers (email_subscriptions).
 * Default: all parents with email are subscribed unless explicitly opted out.
 */

const PARENT_HAS_EMAIL = `p.email IS NOT NULL AND TRIM(p.email) <> ''`;
const PARENT_ROW_HAS_EMAIL = `email IS NOT NULL AND TRIM(email) <> ''`;
const IS_ACTIVE_SUBSCRIBER = `COALESCE(es.subscribed, true) = true`;

async function createNewsletterSubscription(queryable, parentId, email) {
  const normalized = typeof email === 'string' ? email.trim() : '';
  if (!normalized) return;

  await queryable.query(
    `INSERT INTO email_subscriptions (parent_id, email, subscribed, subscribed_at, unsubscribe_token)
     VALUES ($1, $2, true, NOW(), gen_random_uuid())
     ON CONFLICT (parent_id) DO NOTHING`,
    [parentId, normalized]
  );
}

/**
 * Backfill / re-enable all parents with email. Idempotent.
 * @param {import('pg').PoolClient} client
 */
async function backfillAllParentsNewsletterSubscriptions(client) {
  const inserted = await client.query(`
    INSERT INTO email_subscriptions (parent_id, email, subscribed, subscribed_at, unsubscribe_token)
    SELECT p.id, p.email, true, NOW(), gen_random_uuid()
    FROM parent p
    WHERE ${PARENT_HAS_EMAIL}
      AND NOT EXISTS (
        SELECT 1 FROM email_subscriptions es WHERE es.parent_id = p.id
      )
  `);

  const reenabled = await client.query(`
    UPDATE email_subscriptions es
    SET subscribed = true,
        subscribed_at = COALESCE(es.subscribed_at, NOW()),
        unsubscribed_at = NULL,
        updated_at = NOW(),
        email = p.email
    FROM parent p
    WHERE es.parent_id = p.id
      AND es.subscribed IS NOT TRUE
      AND ${PARENT_HAS_EMAIL}
  `);

  await client.query(`
    UPDATE parent
    SET newsletter_subscribed = true
    WHERE ${PARENT_ROW_HAS_EMAIL}
      AND (newsletter_subscribed IS NULL OR newsletter_subscribed = false)
  `);

  return { inserted: inserted.rowCount, reenabled: reenabled.rowCount };
}

/** Insert missing email_subscriptions rows before send (does not override opt-out). */
async function ensureSubscriberRecords(queryable) {
  await queryable.query(`
    INSERT INTO email_subscriptions (parent_id, email, subscribed, subscribed_at, unsubscribe_token)
    SELECT p.id, p.email, true, NOW(), gen_random_uuid()
    FROM parent p
    WHERE ${PARENT_HAS_EMAIL}
      AND NOT EXISTS (
        SELECT 1 FROM email_subscriptions es WHERE es.parent_id = p.id
      )
  `);
}

module.exports = {
  PARENT_HAS_EMAIL,
  IS_ACTIVE_SUBSCRIBER,
  createNewsletterSubscription,
  ensureSubscriberRecords,
  backfillAllParentsNewsletterSubscriptions,
};
