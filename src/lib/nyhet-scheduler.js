/**
 * src/lib/nyhet-scheduler.js
 * Owns: polling every 60s to auto-publish and auto-unpublish dagens_nyhet rows.
 * Does NOT own: push sending (push-notifications.js), creating nyheter (routes/dagens-nyhet.js),
 *               Facebook API calls (facebook.js).
 *
 * On each tick:
 *   1. publishScheduledNyheter() — any 'scheduled' row where publish_at <= NOW() → 'published'
 *      If the row has send_push=true, broadcast push now.
 *      If the row has post_to_facebook=true, post to Facebook page.
 *   2. unpublishExpiredNyheter() — any 'published' row where unpublish_at <= NOW() → 'unpublished'
 */

const { publishScheduledNyheter, unpublishExpiredNyheter, markPushSent, markFacebookPosted } = require('../../db/dagens-nyhet');
const { sendPushNotification, sendPushBroadcast } = require('./push-notifications');
const { isFacebookConfigured, postNyhetToFacebook } = require('./facebook');
const db = require('./db');
const { NYHET_SCHEDULER_LOCK_ID } = require('./scheduler-constants');

const POLL_INTERVAL_MS = 60 * 1000; // 1 minute

let _timer = null;

/**
 * Acquire advisory lock on a dedicated connection (see midnight-scheduler.js).
 */
async function tick() {
  const client = await db.getClient();
  let lockAcquired = false;
  try {
    try {
      const { rows } = await client.query(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [NYHET_SCHEDULER_LOCK_ID]
      );
      lockAcquired = rows[0].acquired;
    } catch (err) {
      console.error('[NYHET-SCHEDULER] Advisory lock error:', err.message);
      return;
    }

    if (!lockAcquired) {
      console.log('[NYHET-SCHEDULER] Skipping — another instance holds the lock');
      return;
    }

    // 1. Publish any scheduled nyheter whose time has come
    let justPublished = [];
  try {
    justPublished = await publishScheduledNyheter();
    if (justPublished.length > 0) {
      console.log(`[NYHET-SCHEDULER] Published ${justPublished.length} scheduled nyhet(er)`);
    }
  } catch (err) {
    console.error('[NYHET-SCHEDULER] publishScheduledNyheter error:', err.message);
  }

  // For each freshly published nyhet with send_push=true, send push now
  for (const nyhet of justPublished) {
    if (!nyhet.send_push) continue;
    try {
      const pushResult = await sendPushBroadcast({
        title: '📢 Nytt från Stjärndag',
        body: nyhet.body,
        url: '/',
      });
      await markPushSent(nyhet.id);
      console.log(`[NYHET-SCHEDULER] Push sent for nyhet ${nyhet.id}: ${pushResult.sent} devices`);
    } catch (err) {
      console.error(`[NYHET-SCHEDULER] Push error for nyhet ${nyhet.id}:`, err.message);
    }

    // Newsletter email is now sent MANUALLY via POST /api/dagens-nyhet/:id/send-newsletter
    // (admin selects recipients via modal). Remove automatic send on scheduled publish.

    // Post to Facebook if toggle was on
    if (nyhet.post_to_facebook) {
      if (!isFacebookConfigured()) {
        console.warn(`[NYHET-SCHEDULER] Facebook not configured, skipping Facebook post for nyhet ${nyhet.id}`);
      } else {
        try {
          const postId = await postNyhetToFacebook({ title: nyhet.title, body: nyhet.body });
          await markFacebookPosted(nyhet.id, postId);
          console.log(`[NYHET-SCHEDULER] Posted nyhet ${nyhet.id} to Facebook: ${postId}`);
        } catch (fbErr) {
          // Best-effort — nyhet is already published regardless
          console.error(`[NYHET-SCHEDULER] Facebook post error for nyhet ${nyhet.id}:`, fbErr.message);
        }
      }
    }
  }

  // 2. Unpublish any published nyheter whose unpublish_at has passed
  try {
    const unpublished = await unpublishExpiredNyheter();
    if (unpublished.length > 0) {
      console.log(`[NYHET-SCHEDULER] Auto-unpublished ${unpublished.length} nyhet(er)`);
    }
  } catch (err) {
    console.error('[NYHET-SCHEDULER] unpublishExpiredNyheter error:', err.message);
  }
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [NYHET_SCHEDULER_LOCK_ID]).catch(() => {});
    }
    client.release();
  }
}

/**
 * Start the nyhet scheduler. Call once at server startup.
 */
function startNyhetScheduler() {
  // Run immediately on start to catch anything missed during downtime
  tick().catch((err) => console.error('[NYHET-SCHEDULER] Initial tick error:', err.message));

  _timer = setInterval(() => {
    tick().catch((err) => console.error('[NYHET-SCHEDULER] Tick error:', err.message));
  }, POLL_INTERVAL_MS);

  if (_timer.unref) _timer.unref();
  console.log('[NYHET-SCHEDULER] Scheduler started (poll every 60s)');
}

/**
 * Stop the scheduler (for graceful shutdown / tests).
 */
function stopNyhetScheduler() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = { startNyhetScheduler, stopNyhetScheduler };
