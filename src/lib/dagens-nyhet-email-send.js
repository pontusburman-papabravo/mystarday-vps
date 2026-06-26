/**
 * Background e-postutskick för dagens_nyhet — undviker HTTP-timeout vid stora listor.
 * Owns: in-memory job state + async send via newsletter-mailer.
 * Does NOT own: HTTP routes (routes/dagens-nyhet.js) or admin UI.
 */
const { sendNewsletterToRecipients } = require('./newsletter-mailer');
const { markEmailSent } = require('../../db/dagens-nyhet');
const db = require('./db');

const JOB_TTL_MS = 15 * 60 * 1000;
const jobs = new Map();

async function countTrackedSends(nyhetId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS c
     FROM newsletter_email_send
     WHERE campaign_type = 'dagens_nyhet' AND campaign_id = $1`,
    [nyhetId]
  );
  return result.rows[0]?.c || 0;
}

/**
 * Start async newsletter send. Returns immediately; work continues in background.
 * @returns {Promise<{ started?: boolean, alreadyRunning?: boolean, job: object }>}
 */
async function startNyhetEmailSend(nyhet, recipientIds) {
  const nyhetId = nyhet.id;
  const existing = jobs.get(nyhetId);
  if (existing?.status === 'sending') {
    return { alreadyRunning: true, job: existing };
  }

  const baselineTracked = await countTrackedSends(nyhetId);
  const job = {
    status: 'sending',
    expected: recipientIds.length,
    sent: 0,
    failed: 0,
    baselineTracked,
    startedAt: Date.now(),
    error: null,
  };
  jobs.set(nyhetId, job);

  setImmediate(async () => {
    try {
      const result = await sendNewsletterToRecipients(nyhet, recipientIds);
      job.sent = result.sent;
      job.failed = result.failed;
      job.status = result.failed > 0 && result.sent === 0 ? 'failed' : 'done';
      await markEmailSent(nyhetId, result.sent, result.failed, result.failed > 0);
      jobs.set(nyhetId, { ...job });
      console.log(
        '[DAGENS-NYHET-EMAIL] Done %s: sent=%d failed=%d',
        nyhetId,
        result.sent,
        result.failed
      );
    } catch (err) {
      job.status = 'failed';
      job.error = err.message || 'Okänt fel';
      jobs.set(nyhetId, { ...job });
      console.error('[DAGENS-NYHET-EMAIL] Background send failed:', err);
    }
    const cleanupTimer = setTimeout(() => jobs.delete(nyhetId), JOB_TTL_MS);
    if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
  });

  return { started: true, job };
}

/**
 * Poll-friendly status for admin UI.
 */
async function getNyhetEmailSendStatus(nyhetId) {
  const job = jobs.get(nyhetId);
  const trackedTotal = await countTrackedSends(nyhetId);

  if (job) {
    const progress = Math.min(job.expected, Math.max(0, trackedTotal - job.baselineTracked));
    const isDone = job.status === 'done' || job.status === 'failed';
    return {
      status: job.status,
      expected: job.expected,
      progress: isDone ? job.sent : progress,
      sent: isDone ? job.sent : progress,
      failed: job.failed || 0,
      error: job.error || null,
      started_at: new Date(job.startedAt).toISOString(),
    };
  }

  const row = await db.query(
    `SELECT email_sent_at, email_sent_count, email_failed_count, email_failed
     FROM dagens_nyhet WHERE id = $1`,
    [nyhetId]
  );
  if (row.rows.length === 0) {
    return { status: 'not_found' };
  }

  const n = row.rows[0];
  if (n.email_sent_at) {
    return {
      status: 'done',
      expected: n.email_sent_count || 0,
      progress: n.email_sent_count || 0,
      sent: n.email_sent_count || 0,
      failed: n.email_failed_count || 0,
      completed_at: n.email_sent_at,
    };
  }

  return { status: 'idle', expected: 0, progress: 0, sent: 0, failed: 0 };
}

function resetJobsForTest() {
  jobs.clear();
}

module.exports = {
  startNyhetEmailSend,
  getNyhetEmailSendStatus,
  resetJobsForTest,
};
