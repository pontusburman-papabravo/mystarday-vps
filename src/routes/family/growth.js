'use strict';

const { sendApiError } = require('../../lib/api-user-error');

/**
 * R4.7 — Growth dismiss snooze + weekly highlight payload.
 */

const express = require('express');
const { requireNotPedagogOnly } = require('../../middleware/authz');
const {
  setSnooze,
  INVITE_SNOOZE_DAYS,
  SHARE_SNOOZE_DAYS,
  isGrowthHomeEnabled,
} = require('../../lib/growth/home-growth-step');
const { buildWeeklyHighlight, formatHighlightCopy } = require('../../lib/growth/weekly-highlight');
const { getChildrenForParent } = require('../../../db/parent-access');
const { resolveFamilyLocale } = require('../../lib/locale');
const db = require('../../lib/db');

const router = express.Router();

router.post('/growth/dismiss', requireNotPedagogOnly, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const parentId = req.user.id;
    const action = String(req.body?.action || '').trim();
    if (!familyId || !parentId) {
      return res.status(401).json({ error: 'AUTH_REQUIRED' });
    }
    if (!(await isGrowthHomeEnabled(familyId))) {
      return sendApiError(res, 404, 'NOT_AVAILABLE');
    }

    if (action === 'snooze_invite_adult') {
      await setSnooze(familyId, 'growth_invite_snoozed', parentId, INVITE_SNOOZE_DAYS);
      return res.json({ ok: true });
    }
    if (action === 'snooze_share_week') {
      await setSnooze(familyId, 'growth_share_week_snoozed', parentId, SHARE_SNOOZE_DAYS);
      return res.json({ ok: true });
    }
    return sendApiError(res, 400, 'INVALID_ACTION');
  } catch (err) {
    console.error('[FAMILY] POST /growth/dismiss error:', err);
    sendApiError(res, 500, 'SAVE_CHOICE_FAILED');
  }
});

router.get('/growth/weekly-highlight', requireNotPedagogOnly, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const parentId = req.user.id;
    if (!familyId || !parentId) {
      return res.status(401).json({ error: 'AUTH_REQUIRED' });
    }
    if (!(await isGrowthHomeEnabled(familyId))) {
      return res.json({ enabled: false });
    }
    const children = await getChildrenForParent(parentId, { allowedRoles: ['primary', 'shared'] });
    const highlight = await buildWeeklyHighlight(familyId, parentId, children);
    if (!highlight) {
      return res.json({ enabled: true, available: false });
    }
    const localeRow = await db.query('SELECT preferred_locale FROM family WHERE id = $1', [familyId]);
    const lang = resolveFamilyLocale(localeRow.rows[0]?.preferred_locale);
    const copy = formatHighlightCopy(lang, highlight);
    res.json({
      enabled: true,
      available: true,
      headline: copy.headline,
      body: copy.body,
      share_text: copy.share_text,
      child_count_bucket: highlight.child_count_bucket,
    });
  } catch (err) {
    console.error('[FAMILY] GET /growth/weekly-highlight error:', err);
    sendApiError(res, 500, 'WEEKLY_HIGHLIGHT_FAILED');
  }
});

module.exports = router;
