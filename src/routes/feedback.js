'use strict';

const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const { sendEmail } = require('../lib/email');
const { validate } = require('../middleware/validate');
const { FeedbackSchema } = require('../lib/schemas');
const { validateLocale } = require('../lib/locale');
const { isEnglishAppEnabled, isEnglishChildExperienceEnabled } = require('../lib/i18n-flags');

const router = express.Router();

const TYPE_LABELS = {
  bug: 'Buggrapport',
  feedback: 'Feedback',
  language: 'Språk- eller översättningsfel',
};

function sanitizeMetadata(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const safe = {};
  const allowed = [
    'locale', 'route', 'page', 'i18n_key', 'visible_text', 'platform',
    'app_version', 'sw_version', 'build_sha', 'user_agent', 'english_app',
    'english_child_experience', 'timestamp',
  ];
  for (const key of allowed) {
    if (raw[key] != null && typeof raw[key] !== 'object') {
      safe[key] = String(raw[key]).slice(0, 500);
    }
  }
  return safe;
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

    const metadata = {
      ...sanitizeMetadata(clientMetadata),
      locale: familyLocale,
      family_id: req.user.familyId,
      english_app: englishApp ? 'true' : 'false',
      english_child_experience: englishChild ? 'true' : 'false',
      timestamp: new Date().toISOString(),
    };

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

    res.status(201).json({ message: 'Tack för din feedback! Vi läser allt som kommer in.' });
  } catch (err) {
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
