/**
 * One-click opt-out for notification emails (weekly summary, reward redemption).
 * Token lives on notification_preference — no login required (RFC 8058).
 */
const db = require('./db');

const TOKEN_RE = /^[0-9a-f-]{36}$/i;
const ALLOWED_CHANNELS = new Set(['weekly_summary', 'reward_redemption', 'all_email']);

/**
 * @param {string} token
 * @param {'weekly_summary'|'reward_redemption'|'all_email'} channel
 */
async function optOutByToken(token, channel) {
  if (!token || !TOKEN_RE.test(token)) {
    return { ok: false, reason: 'invalid_token' };
  }
  if (!ALLOWED_CHANNELS.has(channel)) {
    return { ok: false, reason: 'invalid_channel' };
  }

  const prefColumn = channel === 'weekly_summary'
    ? 'weekly_summary'
    : channel === 'reward_redemption'
      ? 'reward_redemption'
      : 'email_enabled';

  const existing = await db.query(
    `SELECT parent_id, weekly_summary, reward_redemption, email_enabled
     FROM notification_preference
     WHERE email_opt_out_token = $1`,
    [token]
  );

  if (existing.rows.length === 0) {
    return { ok: false, reason: 'unknown_token' };
  }

  const pref = existing.rows[0];
  const alreadyOff = channel === 'weekly_summary'
    ? !pref.weekly_summary
    : channel === 'reward_redemption'
      ? !pref.reward_redemption
      : !pref.email_enabled;

  if (alreadyOff) {
    return { ok: true, alreadyOptedOut: true };
  }

  let updateSql;
  if (channel === 'weekly_summary') {
    updateSql = `weekly_summary = false`;
  } else if (channel === 'reward_redemption') {
    updateSql = `reward_redemption = false`;
  } else {
    updateSql = `email_enabled = false, weekly_summary = false, reward_redemption = false`;
  }

  const result = await db.query(
    `UPDATE notification_preference
     SET ${updateSql}
     WHERE email_opt_out_token = $1
       AND ${prefColumn} = true
     RETURNING parent_id`,
    [token]
  );

  if (result.rows.length === 0) {
    return { ok: true, alreadyOptedOut: true };
  }

  return { ok: true, parentId: result.rows[0].parent_id };
}

function buildOptOutUrl(token, channel) {
  const config = require('./config');
  const base = config.email.baseUrl.replace(/\/$/, '');
  return `${base}/api/account/notifications/opt-out?token=${encodeURIComponent(token)}&channel=${encodeURIComponent(channel)}`;
}

module.exports = {
  optOutByToken,
  buildOptOutUrl,
  ALLOWED_CHANNELS,
};
