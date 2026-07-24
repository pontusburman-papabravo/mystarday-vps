'use strict';

/**
 * Family locale context + English beta offer (P-i18n-Language-Launch-Foundation).
 * Mounted at /api/family after requireParent.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireNotPedagogOnly } = require('../../middleware/authz');
const { validate } = require('../../middleware/validate');
const { EnglishBetaOfferSchema } = require('../../lib/schemas');
const { validateLocale } = require('../../lib/locale');
const {
  OFFER_STATES,
  SELECTION_SOURCES,
  buildLocaleContextRow,
  remindLaterTimestamp,
  shouldShowEnglishBetaOffer,
} = require('../../lib/locale-selection');
const { isEnglishAppEnabled } = require('../../lib/i18n-flags');
const { enableEnglishAppForFamily } = require('../../lib/i18n-enable-english');
const { isEnglishLanguageOfferEnabled } = require('../../lib/locale-offer-flag');

const router = express.Router();

const LOCALE_SELECT = `
  SELECT id,
         COALESCE(preferred_locale, 'sv-SE') AS preferred_locale,
         locale_selected_at,
         locale_selection_source,
         previous_locale,
         english_beta_offer_state,
         english_beta_offer_remind_at,
         created_at
  FROM family
  WHERE id = $1
`;

async function fetchFamilyLocaleRow(familyId, client = db) {
  const result = await client.query(LOCALE_SELECT, [familyId]);
  return result.rows[0] || null;
}

// ─── GET /api/family/locale-context ───────────────────────
router.get('/locale-context', requireNotPedagogOnly, async (req, res) => {
  try {
    const row = await fetchFamilyLocaleRow(req.user.familyId);
    if (!row) return res.status(404).json({ error: 'FAMILY_NOT_FOUND' });

    const englishApp = await isEnglishAppEnabled(req.user.familyId);
    const offerEnabled = await isEnglishLanguageOfferEnabled();
    const context = buildLocaleContextRow(row);
    if (!offerEnabled) {
      context.show_english_beta_offer = false;
    }
    res.json({
      ...context,
      english_app_enabled: englishApp,
      supported_locales: ['sv-SE', 'en-GB'],
    });
  } catch (err) {
    console.error('[FAMILY] locale-context error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/family/english-beta-offer ────────────────
router.post('/english-beta-offer', requireNotPedagogOnly, validate(EnglishBetaOfferSchema), async (req, res) => {
  const client = await db.getClient();
  try {
    const { action } = req.body;
    await client.query('BEGIN');

    const row = await fetchFamilyLocaleRow(req.user.familyId, client);
    if (!row) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'FAMILY_NOT_FOUND' });
    }

    const offerEnabled = await isEnglishLanguageOfferEnabled();
    if (!offerEnabled && action !== 'decline') {
      await client.query('ROLLBACK');
      const current = buildLocaleContextRow(row);
      current.show_english_beta_offer = false;
      return res.json({
        ...current,
        english_app_enabled: await isEnglishAppEnabled(req.user.familyId),
        message: 'OFFER_DISABLED',
      });
    }

    if (!shouldShowEnglishBetaOffer(row) && action !== 'decline') {
      const current = buildLocaleContextRow(row);
      await client.query('COMMIT');
      return res.json({
        ...current,
        english_app_enabled: await isEnglishAppEnabled(req.user.familyId),
        message: 'OFFER_NOT_APPLICABLE',
      });
    }

    const now = new Date();
    let nextLocale = validateLocale(row.preferred_locale);
    let offerState = row.english_beta_offer_state;
    let selectionSource = row.locale_selection_source;

    if (action === 'accept_english') {
      nextLocale = 'en-GB';
      offerState = OFFER_STATES.ACCEPTED_ENGLISH;
      selectionSource = SELECTION_SOURCES.EXISTING_USER_OFFER;
      await enableEnglishAppForFamily(req.user.familyId, { client });
      await client.query(
        `UPDATE family
         SET preferred_locale = $1,
             previous_locale = $2,
             locale_selected_at = $3,
             locale_selection_source = $4,
             english_beta_offer_state = $5,
             english_beta_offer_remind_at = NULL
         WHERE id = $6`,
        [
          nextLocale,
          row.preferred_locale,
          now,
          selectionSource,
          offerState,
          req.user.familyId,
        ]
      );
    } else if (action === 'decline') {
      offerState = OFFER_STATES.DECLINED_ENGLISH;
      await client.query(
        `UPDATE family
         SET english_beta_offer_state = $1,
             english_beta_offer_remind_at = NULL
         WHERE id = $2`,
        [offerState, req.user.familyId]
      );
    } else if (action === 'remind_later') {
      const remindAt = remindLaterTimestamp(now);
      offerState = OFFER_STATES.REMIND_LATER;
      await client.query(
        `UPDATE family
         SET english_beta_offer_state = $1,
             english_beta_offer_remind_at = $2
         WHERE id = $3`,
        [offerState, remindAt, req.user.familyId]
      );
    }

    await client.query('COMMIT');

    const updated = await fetchFamilyLocaleRow(req.user.familyId);
    const context = buildLocaleContextRow(updated);
    res.json({
      ...context,
      preferred_locale: nextLocale,
      english_app_enabled: await isEnglishAppEnabled(req.user.familyId),
      action,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] english-beta-offer error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

module.exports = router;
