'use strict';

/**
 * Immediate internal email when a family submits "Rapportera problem" from system help.
 * One email per contact_message.id — fail-open for the user-facing support-request.
 */

const config = require('./config');
const db = require('./db');
const { sendEmail } = require('./email');
const { sanitizeReportContext } = require('./growth-system-help');

const NOTIFY_SENT_KEY = 'support_internal_notify_sent_at';
const ADMIN_INBOX_PATH = '/admin#meddelanden';

const FORBIDDEN_BODY_PATTERNS = [
  /access_token/i,
  /csrf_token/i,
  /\bpassword\b/i,
  /\bpin\b/i,
  /authorization/i,
  /cookie/i,
];

function notifyRecipient() {
  const raw = process.env.GROWTH_SYSTEM_HELP_REPORT_EMAIL;
  return (raw && raw.trim()) || config.email.from;
}

function adminInboxUrl() {
  const base = String(config.email.baseUrl || '').replace(/\/$/, '');
  return `${base}${ADMIN_INBOX_PATH}`;
}

function buildSupportReportEmailSubject(blockingStep) {
  const brand = config.email.fromName || 'App';
  if (blockingStep) {
    return `[${brand}] Problemrapport: ${String(blockingStep).slice(0, 64)}`;
  }
  return `[${brand}] Ny problemrapport från systemhjälpen`;
}

function formatField(label, value) {
  const text = value == null || value === '' ? '—' : String(value);
  return `${label}: ${text}`;
}

/**
 * @param {object} input
 * @param {number} input.contactMessageId
 * @param {string} input.familyId
 * @param {string} [input.familyName]
 * @param {string} [input.parentName]
 * @param {string} [input.parentEmail]
 * @param {{ blocking_step?: string, help_type?: string }} input.row
 * @param {object} input.context
 */
function buildSupportReportEmailBody(input) {
  const context = sanitizeReportContext(input.context || {});
  const lines = [
    'Ny problemrapport från systemhjälpen',
    '',
    'Familj:',
    input.familyName || '—',
    input.familyId,
    '',
    'Förälder:',
    input.parentName || '—',
    input.parentEmail || '—',
    '',
    'Problem:',
    formatField('Blocking step', input.row?.blocking_step || context.blocking_step),
    formatField('Hjälptyp', input.row?.help_type || context.help_type),
    '',
    'Var:',
    formatField('Surface', context.surface),
    formatField('Route', context.route),
    '',
    'Tekniskt:',
    formatField('Locale', context.locale),
    formatField('Platform', context.platform),
    formatField('User agent', context.user_agent),
    formatField('Tid', context.timestamp || new Date().toISOString()),
    '',
    formatField('Contact message ID', input.contactMessageId),
    '',
    'Rapporten finns sparad i admin/DB.',
    '',
    'Öppna inkorgen:',
    adminInboxUrl(),
  ];
  return lines.join('\n');
}

function assertBodySafe(body) {
  for (const pattern of FORBIDDEN_BODY_PATTERNS) {
    if (pattern.test(body)) {
      throw new Error(`support notify body failed secret scan: ${pattern}`);
    }
  }
}

async function claimNotifySlot(contactMessageId) {
  const { rows } = await db.query(
    `UPDATE contact_message
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object($2::text, $3::text)
     WHERE id = $1
       AND NOT (COALESCE(metadata, '{}'::jsonb) ? $2::text)
     RETURNING id`,
    [contactMessageId, NOTIFY_SENT_KEY, new Date().toISOString()]
  );
  return rows[0]?.id || null;
}

async function releaseNotifySlot(contactMessageId) {
  await db.query(
    `UPDATE contact_message
     SET metadata = COALESCE(metadata, '{}'::jsonb) - $2::text
     WHERE id = $1`,
    [contactMessageId, NOTIFY_SENT_KEY]
  );
}

async function loadFamilyName(familyId) {
  const { rows } = await db.query(
    'SELECT name FROM family WHERE id = $1 LIMIT 1',
    [familyId]
  );
  return rows[0]?.name || null;
}

/**
 * Send internal ops email for a saved contact_message. Idempotent per contactMessageId.
 * @returns {Promise<{ sent: boolean, skipped?: string, error?: string }>}
 */
async function notifySupportReportSaved(input) {
  const contactMessageId = input?.contactMessageId;
  if (!contactMessageId) {
    return { sent: false, skipped: 'missing_contact_message_id' };
  }

  const claimed = await claimNotifySlot(contactMessageId);
  if (!claimed) {
    return { sent: false, skipped: 'dedupe' };
  }

  const familyName = input.familyName || await loadFamilyName(input.familyId);
  const subject = buildSupportReportEmailSubject(
    input.row?.blocking_step || input.context?.blocking_step
  );
  const body = buildSupportReportEmailBody({
    ...input,
    familyName,
  });
  assertBodySafe(body);

  try {
    await sendEmail({
      to: notifyRecipient(),
      subject,
      body,
      tags: [{ name: 'category', value: 'growth_system_help_support_report' }],
    });
    return { sent: true };
  } catch (err) {
    await releaseNotifySlot(contactMessageId).catch(() => {});
    console.error('[GROWTH-SYSTEM-HELP] support notify email failed:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = {
  NOTIFY_SENT_KEY,
  ADMIN_INBOX_PATH,
  adminInboxUrl,
  notifyRecipient,
  buildSupportReportEmailSubject,
  buildSupportReportEmailBody,
  assertBodySafe,
  notifySupportReportSaved,
  claimNotifySlot,
  releaseNotifySlot,
};
