'use strict';

const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const { sendEmail, isTestMailbox } = require('../lib/email');
const { shouldSendSupportReceipt, publicThreadFor, buildReceiptBodies } = require('../lib/support-receipt');
const { validate } = require('../middleware/validate');
const { FeedbackSchema } = require('../lib/schemas');
const { validateLocale } = require('../lib/locale');
const { isEnglishAppEnabled, isEnglishChildExperienceEnabled } = require('../lib/i18n-flags');
const { resolveCommunicationLocale } = require('../lib/communication-locale');
const { t } = require('../lib/i18n');

const router = express.Router();

const TYPE_LABELS = {
  bug: 'Buggrapport',
  feedback: 'Feedback',
  language: 'Språk- eller översättningsfel',
};

function sanitizeMetadata(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const safe = {};
  const allowed = [
    'locale', 'route', 'page', 'i18n_key', 'visible_text', 'suggestion', 'platform',
    'app_version', 'sw_version', 'build_sha', 'user_agent', 'english_app',
    'english_child_experience', 'timestamp',
  ];
  const maxLengths = {
    route: 200,
    page: 200,
    i18n_key: 200,
    visible_text: 500,
    suggestion: 500,
    platform: 64,
    app_version: 64,
    sw_version: 64,
    build_sha: 64,
    user_agent: 500,
    locale: 16,
    english_app: 8,
    english_child_experience: 8,
    timestamp: 64,
  };
  for (const key of allowed) {
    if (raw[key] == null || typeof raw[key] === 'object') continue;
    const max = maxLengths[key] || 500;
    safe[key] = String(raw[key]).slice(0, max);
  }
  return safe;
}

function buildFeedbackMetadata(clientMetadata, familyLocale, englishApp, englishChild, familyId) {
  if (clientMetadata && JSON.stringify(clientMetadata).length > 2048) {
    const err = new Error('METADATA_TOO_LARGE');
    err.code = 'METADATA_TOO_LARGE';
    throw err;
  }
  const sanitized = sanitizeMetadata(clientMetadata);
  const metadata = {
    ...sanitized,
    locale: familyLocale,
    family_id: familyId,
    english_app: englishApp ? 'true' : 'false',
    english_child_experience: englishChild ? 'true' : 'false',
    timestamp: new Date().toISOString(),
  };
  const json = JSON.stringify(metadata);
  if (json.length > 4096) {
    const err = new Error('METADATA_TOO_LARGE');
    err.code = 'METADATA_TOO_LARGE';
    throw err;
  }
  return metadata;
}

// ─── POST /api/feedback ──────────────────────────────────
router.post('/', requireParent, requireFeature('feedback_formular'), validate(FeedbackSchema), async (req, res) => {
  try {
    const { type, title, message, metadata: clientMetadata } = req.body;

    if (!type || !['bug', 'feedback', 'language'].includes(type)) {
      return res.status(400).json({ error: 'Ogiltig typ' });
    }
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ error: 'Titel krävs (minst 3 tecken)' });
    }
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: 'Meddelande krävs (minst 10 tecken)' });
    }

    const parentName = req.user.name || req.user.email || 'Okänd användare';
    const parentEmail = req.user.email || '';

    const familyRow = await db.query(
      `SELECT COALESCE(preferred_locale, 'sv-SE') AS preferred_locale FROM family WHERE id = $1`,
      [req.user.familyId]
    );
    const familyLocale = validateLocale(familyRow.rows[0]?.preferred_locale);
    const englishApp = await isEnglishAppEnabled(req.user.familyId);
    const englishChild = await isEnglishChildExperienceEnabled(req.user.familyId);

    const metadata = buildFeedbackMetadata(
      clientMetadata,
      familyLocale,
      englishApp,
      englishChild,
      req.user.familyId
    );

    const result = await db.query(
      `INSERT INTO contact_message (name, email, message, message_type, family_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id`,
      [
        parentName.trim(),
        parentEmail,
        message.trim(),
        type,
        req.user.familyId,
        JSON.stringify(metadata),
      ]
    );

    const insertedId = result.rows[0].id;
    const typeLabel = TYPE_LABELS[type] || type;
    console.log(`[FEEDBACK] New ${type} from parent ${req.user.id}: ${title.trim()} (${insertedId})`);

    const metaHtml = Object.entries(metadata)
      .map(([k, v]) => `<li><strong>${k}:</strong> ${String(v)}</li>`)
      .join('');

    await sendEmail({
      to: '[REDACTED]',
      subject: `[REDACTED] — ${typeLabel}: ${title.trim()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #1B2340; border-bottom: 2px solid #F5A623; padding-bottom: 8px;">
            [REDACTED] — Nytt ${typeLabel}
          </h2>
          <p><strong>Typ:</strong> <span style="background:${type === 'bug' ? '#FEE2E2' : type === 'language' ? '#DBEAFE' : '#EDE7F6'}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${typeLabel}</span></p>
          <p><strong>Rubrik:</strong> ${title.trim()}</p>
          <p><strong>Från:</strong> ${parentName.trim()} &lt;${parentEmail}&gt;</p>
          <p style="background: #f5f5f5; padding: 12px; border-radius: 8px; border-left: 4px solid #F5A623;">${message.trim()}</p>
          <ul style="color: #5A6178; font-size: 12px; margin-top: 12px; padding-left: 18px;">${metaHtml}</ul>
          <p style="color: #5A6178; font-size: 12px; margin-top: 16px;">
            Meddelande-ID: ${insertedId} · ${new Date().toLocaleString('sv-SE')}
          </p>
        </div>
      `,
    });

    const commLocale = resolveCommunicationLocale(familyLocale);
    const thread = publicThreadFor(insertedId);
    if (shouldSendSupportReceipt(parentEmail) && !isTestMailbox(parentEmail)) {
      try {
        const receipt = buildReceiptBodies({
          recipientName: parentName.trim(),
          followUpUrl: thread.followUpUrl,
          locale: commLocale,
        });
        await sendEmail({
          to: parentEmail,
          subject: receipt.subject,
          body: receipt.text,
          html: receipt.html,
          tags: [{ name: 'category', value: 'support_receipt' }],
        });
      } catch (receiptErr) {
        console.error('[FEEDBACK] Receipt email failed:', receiptErr.message);
      }
    }

    res.status(201).json({
      message: t(commLocale, 'api.feedbackAck'),
      threadUrl: thread.threadUrl,
    });
  } catch (err) {
    if (err.code === 'METADATA_TOO_LARGE') {
      return res.status(400).json({ error: 'Metadata för stor' });
    }
    console.error('[FEEDBACK] Error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

router.get('/', requireParent, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Förbjuden' });
  }
  try {
    const result = await db.query(`
      SELECT id, name, email, message, created_at, is_read, message_type, metadata
      FROM contact_message
      WHERE message_type IN ('bug', 'feedback', 'language')
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json({ feedback: result.rows });
  } catch (err) {
    console.error('[FEEDBACK] List error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

module.exports = router;
module.exports.sanitizeMetadata = sanitizeMetadata;
module.exports.buildFeedbackMetadata = buildFeedbackMetadata;
