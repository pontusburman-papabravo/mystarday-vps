/**
 * Resend webhook event log — diagnostics only (not source of truth for stats).
 */
const db = require('../src/lib/db');

async function logEvent(eventType, emailId) {
  if (!eventType) return;
  try {
    await db.query(
      `INSERT INTO resend_webhook_event (event_type, email_id)
       VALUES ($1, $2)`,
      [eventType, emailId || null]
    );
  } catch (err) {
    // Table may not exist before migration — never block webhook processing.
    console.warn('[RESEND-WEBHOOK] logEvent failed:', err.message);
  }
}

async function getRecentEventCounts(days = 30) {
  try {
    const result = await db.query(
      `SELECT event_type, COUNT(*)::int AS count
       FROM resend_webhook_event
       WHERE received_at > NOW() - ($1::text || ' days')::interval
       GROUP BY event_type`,
      [String(days)]
    );
    const counts = {
      'email.delivered': 0,
      'email.opened': 0,
      'email.clicked': 0,
    };
    for (const row of result.rows) {
      counts[row.event_type] = row.count;
    }
    return counts;
  } catch {
    return {
      'email.delivered': 0,
      'email.opened': 0,
      'email.clicked': 0,
    };
  }
}

module.exports = { logEvent, getRecentEventCounts };
