/**
 * src/lib/win-back-sender.js
 * Owns: shared "approve a win-back record and send the email" logic + the
 *       win_back_auto_approve feature-flag read.
 * Used by: the scheduler (auto-approve path) and the admin Email-logg route
 *          (manual approve path) so both share one send implementation.
 *
 * Does NOT own: eligibility selection (scheduler) or template editing (admin).
 */

const db = require('./db');
const winBackLog = require('../../db/win-back-email-log');
const { sendWinBackEmail } = require('./email');
const { trackWinBackEmailSent } = require('./analytics-tracker');
const { evaluateCommunicationGate } = require('./journey/communication-gate');
const config = require('./config');

const AUTO_APPROVE_FLAG_KEY = 'win_back_auto_approve';

/**
 * Whether win-back emails should be sent automatically (no manual approval).
 * Default ON when the flag row is missing; fail SAFE (manual) on DB error so a
 * transient failure can never accidentally blast emails.
 * @returns {Promise<boolean>}
 */
async function isAutoApproveEnabled() {
  try {
    const result = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
      [AUTO_APPROVE_FLAG_KEY]
    );
    return result.rows.length > 0 ? !!result.rows[0].enabled : true;
  } catch (err) {
    console.error('[WIN-BACK] Could not read auto-approve flag — defaulting to manual:', err.message);
    return false;
  }
}

/**
 * Approve a pending/failed record and send the win-back email.
 * Marks the record sent/failed and tracks analytics on success.
 * @param {string} id - win_back_email_log row id
 * @returns {Promise<{ok: boolean, status?: string, notFound?: boolean, error?: string}>}
 */
async function approveAndSend(id) {
  const record = await winBackLog.approve(id);
  if (!record) {
    return { ok: false, notFound: true };
  }

  const gate = await evaluateCommunicationGate(record.family_id, {
    channel: 'email',
    intent: 'legacy_win_back',
  });
  if (!gate.allowed) {
    await winBackLog.reject(id);
    return { ok: false, status: 'rejected', error: `Journey Gate: ${gate.reason}` };
  }

  const dashboardUrl = `${config.email.baseUrl}/dashboard?utm_source=winback&utm_medium=email`;
  const result = await sendWinBackEmail({
    to: record.parent_email,
    parentName: record.parent_name,
    childName: record.child_name,
    ctaUrl: dashboardUrl,
  });

  if (result.success) {
    const sent = await winBackLog.markSent(id);
    if (sent?.family_id) {
      trackWinBackEmailSent(sent.family_id, sent.child_name, { win_back_log_id: sent.id });
    }
    return { ok: true, status: 'sent' };
  }

  await winBackLog.markFailed(id, result.error || 'Okänt fel');
  return { ok: false, status: 'failed', error: result.error || 'Okänt fel' };
}

module.exports = {
  AUTO_APPROVE_FLAG_KEY,
  isAutoApproveEnabled,
  approveAndSend,
};
