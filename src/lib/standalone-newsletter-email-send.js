/**
 * Background e-postutskick för fristående nyhetsbrev — undviker HTTP-timeout vid stora listor.
 * Owns: in-memory job state + async send via newsletter-mailer.
 * Does NOT own: HTTP routes (routes/newsletter.js) or admin UI.
 */
const { sendStandaloneNewsletter } = require('./newsletter-mailer');
const db = require('./db');

const JOB_TTL_MS = 15 * 60 * 1000;
const jobs = new Map();

async function countTrackedSends(newsletterId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS c
     FROM newsletter_email_send
     WHERE campaign_type = 'standalone' AND campaign_id = $1`,
    [newsletterId]
  );
  return result.rows[0]?.c || 0;
}

/**
 * Start async standalone newsletter send. Returns immediately; work continues in background.
 * @returns {Promise<{ started?: boolean, alreadyRunning?: boolean, job: object }>}
 */
async function startStandaloneNewsletterSend(newsletter, recipientIds) {
  const newsletterId = newsletter.id;
  const existing = jobs.get(newsletterId);
  if (existing?.status === 'sending') {
    return { alreadyRunning: true, job: existing };
  }

  const baselineTracked = await countTrackedSends(newsletterId);
  const job = {
    status: 'sending',
    expected: recipientIds.length,
    sent: 0,
    failed: 0,
    baselineTracked,
    startedAt: Date.now(),
    error: null,
  };
  jobs.set(newsletterId, job);

  setImmediate(async () => {
    try {
      const result = await sendStandaloneNewsletter(newsletter, recipientIds);
      job.sent = result.sent;
      job.failed = result.failed;
      job.status = result.failed > 0 && result.sent === 0 ? 'failed' : 'done';
      if (result.apiError && job.status === 'failed') {
        job.error = result.apiError;
      }

      await db.query(
        `UPDATE newsletters
         SET status       = $1,
             sent_at      = NOW(),
             sent_count   = $2,
             failed_count = $3
         WHERE id = $4`,
        [job.status === 'failed' ? 'failed' : 'sent', result.sent, result.failed, newsletterId]
      );

      jobs.set(newsletterId, { ...job });
      console.log(
        '[STANDALONE-NEWSLETTER-EMAIL] Done %s: sent=%d failed=%d',
        newsletterId,
        result.sent,
        result.failed
      );
    } catch (err) {
      job.status = 'failed';
      job.error = err.message || 'Okänt fel';
      jobs.set(newsletterId, { ...job });
      console.error('[STANDALONE-NEWSLETTER-EMAIL] Background send failed:', err);
    }
    const cleanupTimer = setTimeout(() => jobs.delete(newsletterId), JOB_TTL_MS);
    if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
  });

  return { started: true, job };
}

/**
 * Poll-friendly status for admin UI.
 */
async function getStandaloneNewsletterSendStatus(newsletterId) {
  const job = jobs.get(newsletterId);
  const trackedTotal = await countTrackedSends(newsletterId);

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
    `SELECT status, sent_at, sent_count, failed_count FROM newsletters WHERE id = $1`,
    [newsletterId]
  );
  if (row.rows.length === 0) {
    return { status: 'not_found' };
  }

  const nl = row.rows[0];
  if (nl.sent_at) {
    return {
      status: nl.status === 'failed' ? 'failed' : 'done',
      expected: nl.sent_count || 0,
      progress: nl.sent_count || 0,
      sent: nl.sent_count || 0,
      failed: nl.failed_count || 0,
      completed_at: nl.sent_at,
    };
  }

  return { status: 'idle', expected: 0, progress: 0, sent: 0, failed: 0 };
}

function resetJobsForTest() {
  jobs.clear();
}

module.exports = {
  startStandaloneNewsletterSend,
  getStandaloneNewsletterSendStatus,
  resetJobsForTest,
};
