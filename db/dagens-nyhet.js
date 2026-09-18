/**
 * DB queries for dagens_nyhet — admin-published news items.
 * Owns: CRUD on dagens_nyhet table, push_sent_at stamping, status management.
 * Does NOT own: sending push notifications (that's src/lib/push-notifications.js).
 */
const db = require('../src/lib/db');

/**
 * Create a new nyhet.
 * @param {{ title, body, show_landing, send_push, post_to_facebook, created_by, publish_at, unpublish_at, save_as_draft }} data
 * @returns {Promise<Object>} the created row
 */
async function createNyhet({ title, body, show_landing, send_push, post_to_facebook, created_by, publish_at, unpublish_at, save_as_draft }) {
  // Draft: store immediately with status='draft', no publish timestamps
  if (save_as_draft) {
    const result = await db.query(
      `INSERT INTO dagens_nyhet (title, body, show_landing, send_push, post_to_facebook,
          created_by, status, publish_at, unpublish_at, published_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7::timestamptz, $8::timestamptz, NOW(), NOW() + INTERVAL '48 hours')
       RETURNING *`,
      [
        title || '',
        body || '',
        !!show_landing,
        !!send_push,
        !!post_to_facebook,
        created_by || null,
        publish_at ? new Date(publish_at) : null,
        unpublish_at ? new Date(unpublish_at) : null,
      ]
    );
    return result.rows[0];
  }

  // If publish_at is in the future → scheduled, otherwise → published
  const now = new Date();
  const resolvedPublishAt = publish_at ? new Date(publish_at) : null;
  const isScheduled = resolvedPublishAt && resolvedPublishAt > now;

  const status = isScheduled ? 'scheduled' : 'published';
  // published_at: for scheduled, set to publish_at; otherwise NOW()
  const publishedAt = isScheduled ? resolvedPublishAt : now;

  // Compute expires_at in JS to avoid PostgreSQL type-inference ambiguity ($param + INTERVAL)
  const expiresAt = new Date(publishedAt.getTime() + 48 * 60 * 60 * 1000);

  // Cast all timestamps with ::timestamptz so PostgreSQL's parameter-type
  // inference is stable regardless of whether publish_at / unpublish_at are null.
  // Without this, a null $8 (publish_at) causes pg to struggle deducing $10's type.
  const result = await db.query(
    `INSERT INTO dagens_nyhet (title, body, show_landing, send_push, post_to_facebook,
        created_by, status, publish_at, unpublish_at, published_at,
        expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10::timestamptz, $11::timestamptz)
     RETURNING *`,
    [
      title,
      body,
      !!show_landing,
      !!send_push,
      !!post_to_facebook,
      created_by || null,
      status,
      resolvedPublishAt || null,
      unpublish_at ? new Date(unpublish_at) : null,
      publishedAt,
      expiresAt,
    ]
  );
  return result.rows[0];
}

/**
 * Get the most recent active nyhet visible on the landing page.
 * "Active" = published status, not yet expired, show_landing = true.
 * @returns {Promise<Object|null>}
 */
async function getActiveLandingNyhet() {
  const result = await db.query(
    `SELECT id, title, body, published_at, expires_at
     FROM dagens_nyhet
     WHERE status = 'published'
       AND show_landing = true
       AND expires_at > NOW()
       AND (unpublish_at IS NULL OR unpublish_at > NOW())
     ORDER BY published_at DESC
     LIMIT 1`
  );
  return result.rows[0] || null;
}

/**
 * Get recent nyheter for admin history list (all statuses).
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function listNyheter(limit = 50) {
  const result = await db.query(
    `SELECT id, title, body, show_landing, send_push, post_to_facebook,
            facebook_post_id, published_at, expires_at,
            push_sent_at, email_sent_count, email_sent_at, email_failed,
            created_at, status, publish_at, unpublish_at
     FROM dagens_nyhet
     ORDER BY
       CASE status
         WHEN 'published'    THEN 1
         WHEN 'scheduled'    THEN 2
         WHEN 'unpublished'  THEN 3
         WHEN 'draft'        THEN 4
         ELSE 5
       END,
       created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Mark a nyhet as having had its push notification sent.
 * @param {string} id UUID
 */
async function markPushSent(id) {
  await db.query(
    'UPDATE dagens_nyhet SET push_sent_at = NOW() WHERE id = $1',
    [id]
  );
}

/**
 * Manually unpublish a nyhet (admin action).
 * @param {string} id UUID
 * @returns {Promise<Object|null>} the updated row or null if not found
 */
async function unpublishNyhet(id) {
  const result = await db.query(
    `UPDATE dagens_nyhet
     SET status = 'unpublished', unpublish_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Record the Facebook post ID after a successful cross-post.
 * @param {string} id UUID
 * @param {string} facebookPostId e.g. "1084073184794967_123456789"
 */
async function markFacebookPosted(id, facebookPostId) {
  await db.query(
    'UPDATE dagens_nyhet SET facebook_post_id = $2 WHERE id = $1',
    [id, facebookPostId]
  );
}

/**
 * Record that a newsletter email was sent for this nyhet.
 * @param {string} id UUID
 * @param {number} sentCount number of emails sent successfully
 * @param {number} failedCount number of emails that failed to send
 * @param {boolean} [failedAny=false] set email_failed boolean (for backwards compat)
 */
async function markEmailSent(id, sentCount, failedCount = 0, failedAny = false) {
  await db.query(
    `UPDATE dagens_nyhet
     SET email_sent_count = $2,
         email_failed_count = $3,
         email_failed = $4,
         email_sent_at = NOW()
     WHERE id = $1`,
    [id, sentCount, failedCount, failedAny]
  );
}

/**
 * Find scheduled nyheter whose publish_at has arrived and publish them.
 * Called by the nyhet scheduler every minute.
 * @returns {Promise<Object[]>} rows that were just published
 */
async function publishScheduledNyheter() {
  const result = await db.query(
    `UPDATE dagens_nyhet
     SET status = 'published', published_at = NOW(),
         expires_at = NOW() + INTERVAL '48 hours'
     WHERE status = 'scheduled'
       AND publish_at IS NOT NULL
       AND publish_at <= NOW()
     RETURNING *`
  );
  return result.rows;
}

/**
 * Find published nyheter whose unpublish_at has arrived and unpublish them.
 * Called by the nyhet scheduler every minute.
 * @returns {Promise<Object[]>} rows that were just unpublished
 */
async function unpublishExpiredNyheter() {
  const result = await db.query(
    `UPDATE dagens_nyhet
     SET status = 'unpublished'
     WHERE status = 'published'
       AND unpublish_at IS NOT NULL
       AND unpublish_at <= NOW()
     RETURNING id, title`
  );
  return result.rows;
}

/**
 * Fetch a single nyhet by id.
 * @param {string} id UUID
 * @returns {Promise<Object|null>}
 */
async function getNyhetById(id) {
  const result = await db.query('SELECT * FROM dagens_nyhet WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Update a nyhet's mutable fields. Only supplied keys are changed.
 * @param {string} id UUID
 * @param {Object} fields — allowed keys: title, body, show_landing, send_push,
 *   post_to_facebook, publish_at, unpublish_at, status, published_at, expires_at
 * @returns {Promise<Object|null>} updated row or null if not found
 */
async function updateNyhet(id, fields) {
  const allowed = [
    'title', 'body', 'show_landing', 'send_push', 'post_to_facebook',
    'publish_at', 'unpublish_at', 'status', 'published_at', 'expires_at',
  ];
  const sets = [];
  const vals = [];
  let idx = 1;
  for (const key of allowed) {
    if (key in fields) {
      // Timestamps need explicit cast to avoid pg type-inference issues with nulls
      const cast = ['publish_at', 'unpublish_at', 'published_at', 'expires_at'].includes(key)
        ? '::timestamptz' : '';
      sets.push(`${key} = $${idx}${cast}`);
      vals.push(fields[key]);
      idx++;
    }
  }
  if (sets.length === 0) return getNyhetById(id);
  vals.push(id);
  const result = await db.query(
    `UPDATE dagens_nyhet SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    vals
  );
  return result.rows[0] || null;
}

async function listBoostableFacebookPosts(limit = 20) {
  const result = await db.query(
    `SELECT id, title, body, facebook_post_id, published_at, status
       FROM dagens_nyhet
      WHERE facebook_post_id IS NOT NULL
        AND facebook_post_id <> ''
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = {
  createNyhet,
  getActiveLandingNyhet,
  listNyheter,
  listBoostableFacebookPosts,
  markPushSent,
  markFacebookPosted,
  markEmailSent,
  unpublishNyhet,
  getNyhetById,
  updateNyhet,
  publishScheduledNyheter,
  unpublishExpiredNyheter,
};
