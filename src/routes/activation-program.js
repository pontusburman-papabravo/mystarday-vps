/**
 * Parent activation program — parent-facing API (Fas 2: aha / new-completions).
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const parentActivationProgram = require('../../db/parent-activation-program');
const parentSeenCompletion = require('../../db/parent-seen-completion');
const { isActivationProgramEnabled } = require('../lib/activation-program-enroll');
const { shouldShowBanner } = require('../lib/activation-program');
const {
  listUnseenCompletions,
  maybeTrackParentFirstCompletionSeen,
  mapCompletionRow,
  getFamilyTimezone,
} = require('../lib/activation-program-aha');
const analyticsTracker = require('../lib/analytics-tracker');

const router = express.Router();
router.use(requireParent);

function isFeatureActive() {
  return isActivationProgramEnabled();
}

/**
 * GET /api/me/activation-program/new-completions
 * Treatment only (invariant #4, #6). Returns unseen completed items for celebratory modal.
 */
router.get('/new-completions', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.json({ completions: [] });
    }

    const familyId = req.user.familyId;
    const parentId = req.user.id;
    if (!familyId) {
      return res.json({ completions: [] });
    }

    const program = await parentActivationProgram.getBannerProgramByFamily(familyId);
    if (!program || !shouldShowBanner(program)) {
      return res.json({ completions: [] });
    }

    const rows = await listUnseenCompletions(parentId, familyId);
    if (rows.length === 0) {
      return res.json({ completions: [] });
    }

    const timezone = await getFamilyTimezone(familyId);
    const first = rows[0];
    const parentFirstSeenEmitted = await maybeTrackParentFirstCompletionSeen({
      familyId,
      program,
      childId: first.child_id,
      dailyLogItemId: first.daily_log_item_id,
      activityName: first.activity_name,
      completedAt: first.completed_at,
      timezone,
    });

    const now = new Date();
    res.json({
      completions: rows.map((row) => mapCompletionRow(row, now)),
      parent_first_completion_seen_emitted: parentFirstSeenEmitted,
    });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] new-completions error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * POST /api/me/activation-program/aha-dismiss
 * Body: { daily_log_item_id }
 */
router.post('/aha-dismiss', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.status(404).json({ error: 'Inte tillgängligt' });
    }

    const familyId = req.user.familyId;
    const parentId = req.user.id;
    const dailyLogItemId = req.body?.daily_log_item_id;

    if (!familyId || !dailyLogItemId) {
      return res.status(400).json({ error: 'daily_log_item_id krävs' });
    }

    const program = await parentActivationProgram.getBannerProgramByFamily(familyId);
    if (!program || !shouldShowBanner(program)) {
      return res.status(404).json({ error: 'Inte tillgängligt' });
    }

    const access = await parentSeenCompletion.verifyFamilyItemAccess(
      parentId,
      familyId,
      dailyLogItemId
    );
    if (!access) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }

    await parentSeenCompletion.markSeen(parentId, dailyLogItemId);
    analyticsTracker.trackParentAhaMomentDismissed(familyId, {
      daily_log_item_id: String(dailyLogItemId),
      program_id: String(program.id),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] aha-dismiss error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
