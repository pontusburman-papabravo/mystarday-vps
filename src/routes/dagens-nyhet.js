/**
 * Dagens nyhet routes — admin news publishing + public landing-page feed.
 * Owns: creating nyheter (with optional scheduling), listing history,
 *       unpublishing nyheter, serving active landing-page nyhet,
 *       and serving the in-app banner for logged-in parents.
 * Does NOT own: push subscription management (routes/push.js),
 *               notification sending utility (lib/push-notifications.js),
 *               scheduled auto-publish/unpublish (lib/nyhet-scheduler.js),
 *               Facebook Graph API calls (lib/facebook.js).
 *
 * POST   /api/dagens-nyhet                  (admin) — publish, schedule, or draft a new nyhet
 * GET    /api/dagens-nyhet                  (admin) — list history (all statuses)
 * PATCH  /api/dagens-nyhet/:id              (admin) — edit/promote a nyhet (draft→published etc.)
 * DELETE /api/dagens-nyhet/:id              (admin) — unpublish a nyhet immediately
 * GET    /api/dagens-nyhet/active           (public) — active landing-page nyhet
 * GET    /api/dagens-nyhet/banner           (parent) — active in-app banner
 * POST   /api/dagens-nyhet/facebook-setup   (admin) — exchange user token → long-lived page token
 * GET    /api/dagens-nyhet/facebook-status  (admin) — check if Facebook integration is configured
 */
const express = require('express');
const { PARENT_HAS_EMAIL, IS_ACTIVE_SUBSCRIBER } = require('../lib/newsletter-subscribe');
const {
  getCampaignStats,
  getCampaignRecipients,
} = require('../../db/newsletter-email-tracking');
const db = require('../lib/db');
const { requireAdmin, requireParent } = require('../middleware/auth');
const { hasAccess } = require('../../db/features');
const { requireFeature } = require('../middleware/feature-gate');
const {
  createNyhet,
  getActiveLandingNyhet,
  listNyheter,
  markPushSent,
  markFacebookPosted,
  markEmailSent,
  unpublishNyhet,
  getNyhetById,
  updateNyhet,
} = require('../../db/dagens-nyhet');
const { sendNewsletterForNyhet, sendNewsletterToRecipients } = require('../lib/newsletter-mailer');
const { sendPushBroadcast } = require('../lib/push-notifications');
const { isFacebookConfigured, getFacebookPageToken, postNyhetToFacebook } = require('../lib/facebook');

const router = express.Router();

// ─── POST /api/dagens-nyhet ──────────────────────────────
// Admin publishes (or schedules) a new nyhet.
// Fields: title, body, show_landing, send_push, post_to_facebook, publish_at (ISO datetime), unpublish_at (ISO datetime)
// dagens_nyhet_draft feature gates: creating drafts (save_as_draft=true)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, body, show_landing, send_push, post_to_facebook, publish_at, unpublish_at, save_as_draft } = req.body;

    // Gate: dagens_nyhet_draft — saving as draft requires feature access
    if (save_as_draft && req.user?.familyId) {
      const allowed = await hasAccess(req.user.familyId, 'dagens_nyhet_draft');
      if (!allowed) {
        return res.status(403).json({ error: 'Utkast-funktionen är inte tillgänglig för er familj' });
      }
    }

    // Drafts allow empty title/body; published/scheduled require them
    if (!save_as_draft) {
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Titel krävs' });
      }
      if (!body || typeof body !== 'string' || body.trim().length === 0) {
        return res.status(400).json({ error: 'Brödtext krävs' });
      }
    }
    if (body && typeof body === 'string' && body.trim().length > 280) {
      return res.status(400).json({ error: 'Brödtext får vara max 280 tecken' });
    }
    if (title && typeof title === 'string' && title.trim().length > 200) {
      return res.status(400).json({ error: 'Titel får vara max 200 tecken' });
    }

    // Validate optional datetime strings
    const parsedPublishAt = publish_at ? new Date(publish_at) : null;
    const parsedUnpublishAt = unpublish_at ? new Date(unpublish_at) : null;

    if (publish_at) {
      console.log(`[DAGENS-NYHET] publish_at received: "${publish_at}" → parsed: ${parsedPublishAt?.toISOString()}`);
    }

    if (parsedPublishAt && isNaN(parsedPublishAt.getTime())) {
      return res.status(400).json({ error: 'Ogiltigt datum för publicering' });
    }
    if (parsedUnpublishAt && isNaN(parsedUnpublishAt.getTime())) {
      return res.status(400).json({ error: 'Ogiltigt datum för avpublicering' });
    }
    if (parsedPublishAt && parsedUnpublishAt && parsedUnpublishAt <= parsedPublishAt) {
      return res.status(400).json({ error: 'Avpubliceringstid måste vara efter publiceringstid' });
    }

    const nyhet = await createNyhet({
      title: (title || '').trim(),
      body: (body || '').trim(),
      show_landing: !!show_landing,
      send_push: !!send_push,
      post_to_facebook: !!post_to_facebook,
      created_by: req.user?.id || null,
      publish_at: parsedPublishAt,
      unpublish_at: parsedUnpublishAt,
      save_as_draft: !!save_as_draft,
    });

    // Draft — skip all side effects (push, email, Facebook)
    if (save_as_draft) {
      return res.status(201).json({ nyhet, message: 'Utkast sparat' });
    }

    // If push was requested AND published immediately (not scheduled), broadcast now
    let pushResult = { sent: 0, cleaned: 0, recipients: 0 };
    if (send_push && nyhet.status === 'published') {
      const pushBroadcastResult = await sendPushBroadcast({
        title: '📢 Nytt från Stjärndag',
        body: nyhet.body,
        url: '/',
      });
      pushResult = {
        sent: pushBroadcastResult.sent,
        cleaned: pushBroadcastResult.cleaned,
        recipients: pushBroadcastResult.sent,
      };
      await markPushSent(nyhet.id);
    }

    // If published immediately (not scheduled), send newsletter email to subscribers
    // Del 2: email is now sent MANUALLY via POST /api/dagens-nyhet/:id/send-newsletter
    // (recipient selection modal in admin UI). Remove automatic send.
    const emailResult = { sent: 0, failed: 0, skipped: true };

    // If Facebook cross-post was requested AND published immediately (not scheduled), post now
    let facebookResult = { posted: false, postId: null, warning: null };
    if (post_to_facebook && nyhet.status === 'published') {
      if (!isFacebookConfigured()) {
        facebookResult.warning = 'Facebook-integration ej konfigurerad (saknar FACEBOOK_PAGE_ACCESS_TOKEN)';
      } else {
        try {
          const postId = await postNyhetToFacebook({ title: nyhet.title, body: nyhet.body });
          await markFacebookPosted(nyhet.id, postId);
          facebookResult = { posted: true, postId };
        } catch (fbErr) {
          console.error('[DAGENS-NYHET] Facebook post error:', fbErr.message);
          facebookResult.warning = `Kunde inte posta till Facebook: ${fbErr.message}`;
        }
      }
    }

    res.status(201).json({
      nyhet,
      push: pushResult,
      facebook: facebookResult,
      message: buildMessage(nyhet, pushResult, facebookResult),
    });
  } catch (err) {
    console.error('[DAGENS-NYHET] Create error:', err);
    res.status(500).json({ error: 'Kunde inte publicera nyheten' });
  }
});

// ─── GET /api/dagens-nyhet ────────────────────────────────
// Admin history list (all statuses, sorted: published → scheduled → unpublished)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const nyheter = await listNyheter(50);
    res.json(nyheter);
  } catch (err) {
    console.error('[DAGENS-NYHET] List error:', err);
    res.status(500).json({ error: 'Kunde inte hämta nyheter' });
  }
});

// ─── DELETE /api/dagens-nyhet/:id ────────────────────────
// Admin unpublishes a nyhet immediately.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({ error: 'Ogiltigt id' });
    }
    const nyhet = await unpublishNyhet(id);
    if (!nyhet) {
      return res.status(404).json({ error: 'Nyhet hittades inte' });
    }
    res.json({ nyhet, message: 'Nyheten är avpublicerad' });
  } catch (err) {
    console.error('[DAGENS-NYHET] Unpublish error:', err);
    res.status(500).json({ error: 'Kunde inte avpublicera nyheten' });
  }
});

// ─── PATCH /api/dagens-nyhet/:id ──────────────────────────
// Admin edits a nyhet and/or promotes it from draft → scheduled/published.
// Allowed transitions: draft→scheduled, draft→published, scheduled→published,
//   scheduled→draft, draft→draft (edit only). Blocked: published→draft.
// dagens_nyhet_draft feature gates: editing existing drafts.
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({ error: 'Ogiltigt id' });
    }

    const existing = await getNyhetById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Nyhet hittades inte' });
    }

    // Gate: dagens_nyhet_draft — editing/viewing existing drafts requires feature
    if (existing.status === 'draft' && req.user?.familyId) {
      const allowed = await hasAccess(req.user.familyId, 'dagens_nyhet_draft');
      if (!allowed) {
        return res.status(403).json({ error: 'Utkast-funktionen är inte tillgänglig för er familj' });
      }
    }

    const { title, body, show_landing, send_push, post_to_facebook, publish_at, unpublish_at, status } = req.body;

    // Validate status transition
    const VALID_TRANSITIONS = {
      draft:     ['draft', 'scheduled', 'published'],
      scheduled: ['draft', 'scheduled', 'published'],
    };
    const newStatus = status || existing.status;
    const allowed = VALID_TRANSITIONS[existing.status];
    if (status && (!allowed || !allowed.includes(status))) {
      return res.status(400).json({ error: `Kan inte ändra status från '${existing.status}' till '${status}'` });
    }

    // Published/scheduled nyheter need title+body
    if (newStatus !== 'draft') {
      const finalTitle = title !== undefined ? title : existing.title;
      const finalBody = body !== undefined ? body : existing.body;
      if (!finalTitle || !finalTitle.trim()) {
        return res.status(400).json({ error: 'Titel krävs för publicering' });
      }
      if (!finalBody || !finalBody.trim()) {
        return res.status(400).json({ error: 'Brödtext krävs för publicering' });
      }
    }

    // Length checks
    if (title && title.trim().length > 200) {
      return res.status(400).json({ error: 'Titel får vara max 200 tecken' });
    }
    if (body && body.trim().length > 280) {
      return res.status(400).json({ error: 'Brödtext får vara max 280 tecken' });
    }

    // Scheduled requires publish_at
    const resolvedPublishAt = publish_at !== undefined ? (publish_at ? new Date(publish_at) : null) : (existing.publish_at || null);
    if (newStatus === 'scheduled' && !resolvedPublishAt) {
      return res.status(400).json({ error: 'publish_at krävs för schemaläggning' });
    }

    // Build update payload
    const updates = {};
    if (title !== undefined) updates.title = (title || '').trim();
    if (body !== undefined) updates.body = (body || '').trim();
    if (show_landing !== undefined) updates.show_landing = !!show_landing;
    if (send_push !== undefined) updates.send_push = !!send_push;
    if (post_to_facebook !== undefined) updates.post_to_facebook = !!post_to_facebook;
    // Validate publish_at — mirrors POST handler validation pattern (lines 71-76)
    if (publish_at !== undefined && publish_at !== null) {
      const d = new Date(publish_at);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Ogiltigt datum för publicering' });
      }
      updates.publish_at = d;
    } else if (publish_at === null) {
      updates.publish_at = null;
    }
    // Validate unpublish_at
    if (unpublish_at !== undefined && unpublish_at !== null) {
      const d = new Date(unpublish_at);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Ogiltigt datum för avpublicering' });
      }
      // Use already-parsed publish_at from updates, or existing value
      const effectivePublishAt = updates.publish_at !== undefined
        ? updates.publish_at
        : (existing.publish_at ? new Date(existing.publish_at) : null);
      if (effectivePublishAt && d <= effectivePublishAt) {
        return res.status(400).json({ error: 'Avpubliceringsdatum måste vara efter publiceringsdatum' });
      }
      updates.unpublish_at = d;
    } else if (unpublish_at === null) {
      updates.unpublish_at = null;
    }

    // Status + timestamp logic
    if (status) {
      updates.status = status;
      if (status === 'published') {
        const now = new Date();
        updates.published_at = now;
        updates.expires_at = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      } else if (status === 'scheduled' && resolvedPublishAt) {
        // published_at is set to null here; nyhet-scheduler sets published_at = NOW()
        // when the scheduled time actually arrives (publishScheduledNyheter, lib/nyhet-scheduler.js:181).
        updates.published_at = null;
        updates.expires_at = new Date(resolvedPublishAt.getTime() + 48 * 60 * 60 * 1000);
      }
    }

    const nyhet = await updateNyhet(id, updates);

    // Side effects only when promoting to 'published'
    let pushResult = { sent: 0, cleaned: 0, recipients: 0 };
    let facebookResult = { posted: false, postId: null, warning: null };

    if (status === 'published') {
      // Push notification
      if (nyhet.send_push) {
        const pushBroadcastResult = await sendPushBroadcast({
          title: '📢 Nytt från Stjärndag',
          body: nyhet.body,
          url: '/',
        });
        pushResult = {
          sent: pushBroadcastResult.sent,
          cleaned: pushBroadcastResult.cleaned,
          recipients: pushBroadcastResult.sent,
        };
        await markPushSent(nyhet.id);
      }

      // Facebook cross-post
      if (nyhet.post_to_facebook) {
        if (!isFacebookConfigured()) {
          facebookResult.warning = 'Facebook-integration ej konfigurerad';
        } else {
          try {
            const postId = await postNyhetToFacebook({ title: nyhet.title, body: nyhet.body });
            await markFacebookPosted(nyhet.id, postId);
            facebookResult = { posted: true, postId };
          } catch (fbErr) {
            console.error('[DAGENS-NYHET] Facebook post error:', fbErr.message);
            facebookResult.warning = `Kunde inte posta till Facebook: ${fbErr.message}`;
          }
        }
      }
    }

    res.json({
      nyhet,
      push: pushResult,
      facebook: facebookResult,
      message: status === 'published'
        ? buildMessage(nyhet, pushResult, facebookResult)
        : (status === 'scheduled' ? 'Nyhet schemalagd' : 'Utkast uppdaterat'),
    });
  } catch (err) {
    console.error('[DAGENS-NYHET] PATCH error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera nyheten' });
  }
});

// ─── GET /api/dagens-nyhet/active ─────────────────────────
// Public: returns the current active landing-page nyhet (no auth required).
// Used by index.html to show/hide the banner.
// Gate 2C: return 204 if dagens_nyhet feature is OFF.
router.get('/active', async (req, res) => {
  try {
    // Gate: dagens_nyhet feature must be available (globally or per-family)
    const allowed = await hasAccess(null, 'dagens_nyhet');
    if (!allowed) return res.status(204).send();

    const nyhet = await getActiveLandingNyhet();
    // 204 = nothing to show; banner should be hidden
    if (!nyhet) return res.status(204).send();
    res.json(nyhet);
  } catch (err) {
    console.error('[DAGENS-NYHET] Active error:', err);
    res.status(500).json({ error: 'Kunde inte hämta nyhet' });
  }
});

// ─── GET /api/dagens-nyhet/banner ─────────────────────────
// Authenticated parent: returns the most recent published non-expired nyhet
// that this parent has NOT yet dismissed.
// Gate 2C: return 204 if dagens_nyhet feature is OFF for this family.
router.get('/banner', requireParent, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const allowed = await hasAccess(familyId, 'dagens_nyhet');
    if (!allowed) return res.status(204).send();

    const parentId = req.user.id;
    // dismissed_by_parent_ids is JSONB (not a native uuid[]), so use @>
    // containment to check if the parent's UUID string is in the array.
    const result = await db.query(
      `SELECT id, title, body, published_at
       FROM dagens_nyhet
       WHERE status = 'published'
         AND expires_at > NOW()
         AND (unpublish_at IS NULL OR unpublish_at > NOW())
         AND NOT (COALESCE(dismissed_by_parent_ids, '[]'::jsonb) @> to_jsonb($1::text))
       ORDER BY published_at DESC
       LIMIT 1`,
      [parentId]
    );
    if (!result.rows[0]) return res.status(204).send();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[DAGENS-NYHET] Banner error:', err);
    res.status(500).json({ error: 'Kunde inte hämta banner' });
  }
});

// ─── PUT /api/dagens-nyhet/:id/dismiss ─────────────────────
// Authenticated parent: marks this nyhet as dismissed so the banner won't reappear.
router.put('/:id/dismiss', requireParent, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({ error: 'Ogiltigt id' });
    }
    const parentId = req.user.id;
    const result = await db.query(
      `UPDATE dagens_nyhet
       SET dismissed_by_parent_ids = COALESCE(dismissed_by_parent_ids, '[]'::jsonb) || to_jsonb($2::text)
       WHERE id = $1
         AND NOT (COALESCE(dismissed_by_parent_ids, '[]'::jsonb) @> to_jsonb($2::text))
       RETURNING id`,
      [id, parentId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Nyheten hittades inte' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[DAGENS-NYHET] Dismiss error:', err);
    res.status(500).json({ error: 'Kunde inte avfärda nyheten' });
  }
});

// ─── POST /api/dagens-nyhet/facebook-setup ────────────────
// Admin: exchange a short-lived user token for a long-lived page token.
// Requires FACEBOOK_APP_ID and FACEBOOK_APP_SECRET env vars already set.
// Body: { user_token: string }
router.post('/facebook-setup', requireAdmin, async (req, res) => {
  try {
    const { user_token } = req.body;
    if (!user_token || typeof user_token !== 'string' || user_token.trim().length < 20) {
      return res.status(400).json({ error: 'user_token krävs' });
    }

    const result = await getFacebookPageToken(user_token.trim());

    // Return the token so the admin can copy it and set the env var.
    // We do NOT auto-update env vars here — they must be set via the dashboard
    // (FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID).
    res.json({
      pageId: result.pageId,
      pageName: result.pageName,
      longLivedToken: result.longLivedToken,
      instructions: [
        `Sätt FACEBOOK_PAGE_ACCESS_TOKEN = ${result.longLivedToken}`,
        `Sätt FACEBOOK_PAGE_ID = ${result.pageId}`,
        'Token är long-lived (~60 dagar). Förnya vid behov.',
      ],
    });
  } catch (err) {
    console.error('[DAGENS-NYHET] Facebook setup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/dagens-nyhet/facebook-status ────────────────
// Admin: check if Facebook integration is configured.
router.get('/facebook-status', requireAdmin, async (req, res) => {
  res.json({
    configured: isFacebookConfigured(),
    pageId: process.env.FACEBOOK_PAGE_ID || null,
    graphApiVersion: 'v25.0',
  });
});

// ─── Helpers ──────────────────────────────────────────────

function buildMessage(nyhet, pushResult, facebookResult = {}) {
  const parts = [];
  if (nyhet.status === 'scheduled') {
    const scheduledAt = new Date(nyhet.publish_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
    parts.push(`Schemalagd publicering ${scheduledAt}`);
  } else {
    if (nyhet.show_landing) parts.push('Visas på landningssidan');
    if (nyhet.send_push && pushResult.sent > 0) {
      parts.push(`Push skickat till ${pushResult.sent} enhet${pushResult.sent !== 1 ? 'er' : ''} (${pushResult.recipients} föräldrar)`);
    } else if (nyhet.send_push) {
      parts.push('Push begärd men inga prenumeranter hittades');
    }
    if (facebookResult.posted) {
      parts.push('Postad till Facebook ✓');
    } else if (facebookResult.warning) {
      parts.push(`⚠️ Facebook: ${facebookResult.warning}`);
    }
  }
  return parts.length ? parts.join(' · ') : 'Nyhet sparad';
}

// ─── POST /api/dagens-nyhet/:id/send-newsletter ─────────────
// Admin sends newsletter to selected recipients for a specific nyhet.
// Body: { recipientIds: string[] } (array of parent_id UUIDs)
// Returns: { sent, failed, email_sent_count, email_sent_at, email_failed }
// Gate 2D: nyhetsbrev feature must be available
router.post('/:id/send-newsletter', requireAdmin, requireFeature('nyhetsbrev'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({ error: 'Ogiltigt id' });
    }

    const { recipientIds } = req.body;
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ error: 'Inga mottagare valda' });
    }

    // Validate all recipient IDs are UUIDs
    const validIds = recipientIds.filter(id => /^[0-9a-f-]{36}$/i.test(id));
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'Inga giltiga mottagar-ID:hittades' });
    }

    // Fetch the nyhet
    const nyhetResult = await db.query(
      `SELECT id, title, body, status FROM dagens_nyhet WHERE id = $1`,
      [id]
    );
    if (nyhetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nyhet hittades inte' });
    }
    const nyhet = nyhetResult.rows[0];

    // Block newsletter sends for draft, scheduled, or unpublished nyheter
    if (nyhet.status !== 'published') {
      return res.status(400).json({
        error: 'Nyhetsbrev kan bara skickas för publicerade nyheter',
      });
    }

    // Send to selected recipients only
    const result = await sendNewsletterToRecipients(nyhet, validIds);

    // Record results on the nyhet
    // Pass result.failed (count) so email_failed_count reflects partial failures accurately.
    // The boolean email_failed is set to (result.failed > 0) for compatibility.
    await markEmailSent(nyhet.id, result.sent, result.failed, result.failed > 0);

    res.json({
      sent: result.sent,
      failed: result.failed,
      email_sent_count: result.sent,
      email_sent_at: result.sent > 0 ? new Date().toISOString() : null,
      email_failed: result.failed > 0,
      message: result.sent > 0
        ? `Nyhetsbrev skickat till ${result.sent} mottagare`
        : 'Inga e-postmeddelanden skickades (inga aktiva prenumeranter bland de valda)',
    });
  } catch (err) {
    console.error('[DAGENS-NYHET] Send newsletter error:', err);
    res.status(500).json({ error: 'Kunde inte skicka nyhetsbrevet' });
  }
});

// ─── GET /api/dagens-nyhet/:id/email-stats ─────────────────
router.get('/:id/email-stats', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({ error: 'Ogiltigt id' });
    }
    const stats = await getCampaignStats('dagens_nyhet', id);
    res.json(stats);
  } catch (err) {
    console.error('[DAGENS-NYHET] Email stats error:', err);
    res.status(500).json({ error: 'Kunde inte hämta e-poststatistik' });
  }
});

// ─── GET /api/dagens-nyhet/:id/email-recipients ────────────
router.get('/:id/email-recipients', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({ error: 'Ogiltigt id' });
    }
    const rows = await getCampaignRecipients('dagens_nyhet', id);
    res.json(rows);
  } catch (err) {
    console.error('[DAGENS-NYHET] Email recipients error:', err);
    res.status(500).json({ error: 'Kunde inte hämta mottagarstatistik' });
  }
});

// ─── GET /api/dagens-nyhet/recipients-count ────────────────
// Returns total active subscriber count (for the send-newsletter modal).
router.get('/recipients-count', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT COUNT(*) AS total
      FROM parent p
      LEFT JOIN email_subscriptions es ON es.parent_id = p.id
      WHERE ${PARENT_HAS_EMAIL}
        AND ${IS_ACTIVE_SUBSCRIBER}
    `);
    res.json({ total: parseInt(result.rows[0].total, 10) });
  } catch (err) {
    console.error('[DAGENS-NYHET] Recipients count error:', err);
    res.status(500).json({ error: 'Kunde inte hämta antal prenumeranter' });
  }
});

module.exports = router;
