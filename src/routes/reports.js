/**
 * Reports API — authenticated parent endpoints.
 * Owns: professional_share_link CRUD for authenticated parents.
 * Does NOT own: public report viewer (src/routes/public.js), DB queries (db/professional-share-link.js).
 *
 * Routes:
 *   GET    /api/reports              — list family's share links
 *   POST   /api/reports              — create a new share link
 *   PATCH  /api/reports/:id          — update parent_summary/fields OR renew (extend expiry)
 *   PATCH  /api/reports/:id/revoke   — archive (soft-delete, sets revoked_at)
 *   DELETE /api/reports/:id          — permanently delete
 *   GET    /api/reports/active-count — count non-expired, non-revoked links
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const { requireComponent } = require('../middleware/require-component');
const shareLink = require('../../db/professional-share-link');

const router = express.Router();
router.use(requireParent);
router.use(requireComponent('reporting'));
router.use(requireFeature('klinisk_rapportering'));

// Fire analytics event on report creation (fire-and-forget, never blocks response)
function trackReportCreated(parentId, familyId, childId, anonymous, fields) {
  // analytics-tracker doesn't export trackEvent; use db/analytics.track directly
  const analytics = require('../../db/analytics');
  analytics.track(familyId, 'report_created', {
    child_id: childId,
    anonymous: !!anonymous,
    field_count: Array.isArray(fields) ? fields.length : 0,
    has_activities: Array.isArray(fields) && fields.includes('activities'),
    has_emotions: Array.isArray(fields) && fields.includes('emotions'),
    has_pedagog_notes: Array.isArray(fields) && fields.includes('pedagog_notes'),
  }).catch(() => {});
}

// ─── GET /api/reports ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const links = await shareLink.listForFamily(req.user.familyId);
    res.json({ links });
  } catch (err) {
    console.error('[REPORTS] List reports error:', err.message, err.stack);
    res.status(500).json({ error: 'Internt serverfel' });
  }
});

// ─── GET /api/reports/active-count ───────────────────────────
// Must be before /:id to avoid route collision
router.get('/active-count', async (req, res) => {
  try {
    const count = await shareLink.countActive(req.user.familyId);
    res.json({ count });
  } catch (err) {
    console.error('[REPORTS] Active count error:', err.message, err.stack);
    res.status(500).json({ error: 'Internt serverfel' });
  }
});

// ─── POST /api/reports ────────────────────────────────────────
router.post('/', async (req, res) => {
  // Hard timeout: kill the response if Neon takes >20s to respond.
  // The 15s frontend AbortSignal is our user-facing limit; this server-side
  // timeout prevents indefinite hangs that leak DB connections.
  req.setTimeout(20000, () => {
    console.error('[REPORTS] POST /api/reports — req.setTimeout fired. parentId=%s', req.user?.id);
  });

  try {
    const { child_id, label, parent_summary, date_from, date_to, fields, pin, anonymous } = req.body;

    if (!child_id || typeof child_id !== 'string') {
      return res.status(400).json({ error: 'child_id krävs' });
    }
    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return res.status(400).json({ error: 'label krävs' });
    }
    if (!date_from || !date_to) {
      return res.status(400).json({ error: 'date_from och date_to krävs' });
    }
    const dateFromParsed = new Date(date_from);
    const dateToParsed   = new Date(date_to);
    if (isNaN(dateFromParsed) || isNaN(dateToParsed)) {
      return res.status(400).json({ error: 'Ogiltigt datumformat (YYYY-MM-DD)' });
    }
    if (dateToParsed < dateFromParsed) {
      return res.status(400).json({ error: 'date_to måste vara efter date_from' });
    }
    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'fields krävs (array med minst ett värde)' });
    }

    // CreateLink uses a transaction + FK validation — no separate childBelongsToFamily call
    // (saves one DB round-trip, critical on Neon cold-start)
    const link = await shareLink.createLink({
      familyId:      req.user.familyId,
      childId:       child_id,
      label:         label.trim().substring(0, 100),
      parentSummary: parent_summary || null,
      dateFrom:      date_from,
      dateTo:        date_to,
      fields,
      pin:           pin || null,
      createdBy:     req.user.id,
      anonymous:     !!anonymous,
    });

    res.status(201).json({
      public_id:  link.public_id,
      share_url:  `/r/${link.public_id}`,
      expires_at: link.expires_at,
    });

    // Fire-and-forget analytics AFTER response — never blocks/crashes the 201
    trackReportCreated(req.user.id, req.user.familyId, child_id, anonymous, fields);
  } catch (err) {
    const msg = err instanceof Error ? err.message : (err && typeof err.message === 'string' ? err.message : String(err));
    const pgCode = err && err.code;
    if (err && typeof err.statusCode === 'number' && err.statusCode === 400) {
      return res.status(400).json({ error: msg });
    }
    // PostgreSQL error codes
    if (pgCode === '23503') {
      return res.status(400).json({ error: 'Ogiltigt barn' });
    }
    if (pgCode === '23505') {
      return res.status(409).json({ error: 'En rapport med dessa uppgifter finns redan' });
    }
    if (pgCode === '42P01') {
      console.error('[REPORTS] Create report error — missing table:', msg, err instanceof Error ? err.stack : '');
      return res.status(503).json({ error: 'Databasen behöver uppdateras' });
    }
    console.error('[REPORTS] Create report error:', msg, pgCode ? `pgCode=${pgCode}` : '', err instanceof Error ? err.stack : '');
    res.status(500).json({ error: 'Internt serverfel' });
  }
});

// ─── PATCH /api/reports/:id ───────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { parent_summary, fields, renew } = req.body;

    // Handle renew: extend expiry by 7 days from now
    if (renew === true) {
      const renewed = await shareLink.renewLink(id, req.user.familyId);
      if (!renewed) {
        return res.status(404).json({ error: 'Rapport hittades inte eller är återkallad' });
      }
      return res.json({ ok: true, expires_at: renewed.expires_at });
    }

    // Handle content update
    if (!parent_summary && !fields) {
      return res.status(400).json({ error: 'parent_summary, fields eller renew krävs' });
    }
    if (fields && !Array.isArray(fields)) {
      return res.status(400).json({ error: 'fields måste vara en array' });
    }

    const updated = await shareLink.updateLink(id, req.user.familyId, {
      parentSummary: parent_summary ?? undefined,
      fields:        fields ?? undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Rapport hittades inte' });
    }

    res.json({ ok: true });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[REPORTS] Update report error:', err.message, err.stack);
    res.status(500).json({ error: 'Internt serverfel' });
  }
});

// ─── DELETE /api/reports/:id ──────────────────────────────────
// Permanent delete — removes row from database entirely
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await shareLink.deleteLink(req.params.id, req.user.familyId);
    if (!deleted) {
      return res.status(404).json({ error: 'Rapport hittades inte eller redan återkallad' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[REPORTS] Delete report error:', err.message, err.stack);
    res.status(500).json({ error: 'Internt serverfel' });
  }
});

// ─── PATCH /api/reports/:id/revoke ───────────────────────────
// Archive — sets revoked_at (soft delete, link moves to archive view)
router.patch('/:id/revoke', async (req, res) => {
  try {
    const revoked = await shareLink.revokeLink(req.params.id, req.user.familyId);
    if (!revoked) {
      return res.status(404).json({ error: 'Rapport hittades inte eller redan återkallad' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[REPORTS] Revoke report error:', err.message, err.stack);
    res.status(500).json({ error: 'Internt serverfel' });
  }
});

module.exports = router;
