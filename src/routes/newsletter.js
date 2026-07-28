// Newsletter subscription management.
// User-facing: toggle opt-in/opt-out.
// Admin-facing: subscriber list, CSV export, standalone newsletter compose + send.
// Does NOT own: dagens_nyhet records or push notification logic.

const express = require('express');
const db = require('../lib/db');
const { requireParent, requireAdmin } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const { sendStandaloneNewsletter } = require('../lib/newsletter-mailer');
const { sendNewsletterSubscriptionConfirmation } = require('../lib/email');
const { getFamilyPreferredLocale } = require('../lib/family-locale');
const { unsubscribeByToken } = require('../lib/newsletter-unsubscribe');
const { renderUnsubscribePage, renderUnsubscribeErrorPage } = require('../lib/newsletter-unsubscribe-pages');
const { PARENT_HAS_EMAIL, IS_ACTIVE_SUBSCRIBER } = require('../lib/newsletter-subscribe');
const {
  getCampaignStats,
  getCampaignRecipients,
} = require('../../db/newsletter-email-tracking');

const router = express.Router();

// ─── GET /api/newsletter/subscription ────────────────────
// Returns the current user's newsletter subscription status.
router.get('/subscription', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT subscribed, subscribed_at, unsubscribed_at FROM email_subscriptions WHERE parent_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      const parentResult = await db.query(
        `SELECT newsletter_subscribed, email
         FROM parent WHERE id = $1`,
        [req.user.id]
      );
      const parent = parentResult.rows[0];
      const hasEmail = parent?.email && String(parent.email).trim() !== '';
      const subscribed = hasEmail && parent.newsletter_subscribed !== false;
      return res.json({
        subscribed,
        opted_in: subscribed,
        subscribed_at: null,
        unsubscribed_at: null,
      });
    }

    const row = result.rows[0];
    const subscribed = row.subscribed !== false;
    res.json({
      subscribed,
      opted_in: subscribed,
      subscribed_at: row.subscribed_at,
      unsubscribed_at: row.unsubscribed_at,
    });
  } catch (err) {
    console.error('[NEWSLETTER] Get subscription error:', err);
    res.status(500).json({ error: 'Kunde inte hämta prenumerationsstatus' });
  }
});

// ─── PUT /api/newsletter/subscription ─────────────────────
// Toggle the user's newsletter subscription.
// Body: { subscribed: boolean }
router.put('/subscription', requireParent, async (req, res) => {
  try {
    const { subscribed } = req.body;
    if (typeof subscribed !== 'boolean') {
      return res.status(400).json({ error: 'subscribed krävs (boolean)' });
    }

    // Get the parent's email from the parent table
    const parentResult = await db.query(
      'SELECT email FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }
    const email = parentResult.rows[0].email;

    // Upsert: insert or update the subscription record
    if (subscribed) {
      // Opt-in: insert (if not exists) or update to subscribed=true
      await db.query(`
        INSERT INTO email_subscriptions (parent_id, email, subscribed, subscribed_at, updated_at)
        VALUES ($1, $2, true, NOW(), NOW())
        ON CONFLICT (parent_id) DO UPDATE SET
          subscribed = true,
          unsubscribed_at = NULL,
          updated_at = NOW()
      `, [req.user.id, email]);

      const parentName = await db.query(
        'SELECT COALESCE(name, \'\') AS name FROM parent WHERE id = $1',
        [req.user.id]
      );
      const locale = await getFamilyPreferredLocale(req.user.familyId);
      sendNewsletterSubscriptionConfirmation(email, parentName.rows[0]?.name || '', locale)
        .catch(function (err) {
          console.error('[NEWSLETTER] Subscription confirmation email failed:', err.message);
        });
    } else {
      // Opt-out: update to subscribed=false and record unsubscribed_at
      await db.query(`
        INSERT INTO email_subscriptions (parent_id, email, subscribed, subscribed_at, unsubscribed_at, updated_at)
        VALUES ($1, $2, false, NOW(), NOW(), NOW())
        ON CONFLICT (parent_id) DO UPDATE SET
          subscribed = false,
          unsubscribed_at = NOW(),
          updated_at = NOW()
      `, [req.user.id, email]);
    }

    // Analytics: track newsletter unsubscribe event
    if (!subscribed) {
      require('../lib/analytics-tracker').trackNewsletterUnsubscribed(req.user.familyId);
    }

    res.json({
      subscribed: subscribed,
      opted_in:   subscribed,
      message: subscribed
        ? 'Du prenumererar nu på nyhetsbrevet!'
        : 'Du har avslutat prenumerationen.',
    });
  } catch (err) {
    console.error('[NEWSLETTER] Toggle subscription error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera prenumerationen' });
  }
});

// ─── ADMIN: GET /api/newsletter/subscribers ──────────────
// Returns all newsletter subscribers (active and unsubscribed).
// Query params: ?status=active|inactive|all (default: active)
// Query params: ?sort=subscribed_at|name (default: subscribed_at)
router.get('/subscribers', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'active';
    const sort   = req.query.sort    || 'subscribed_at';
    const limit  = Math.min(parseInt(req.query.limit) || 200, 1000);

    let statusClause = '';
    if (status === 'active')   statusClause = `AND ${IS_ACTIVE_SUBSCRIBER}`;
    if (status === 'inactive') statusClause = 'AND es.subscribed = false';

    const orderCol = sort === 'name' ? 'p.name ASC' : 'es.subscribed_at DESC NULLS LAST';

    const result = await db.query(`
      SELECT
        es.id,
        p.id AS parent_id,
        COALESCE(p.name, '(inget namn)') AS name,
        COALESCE(NULLIF(TRIM(es.email), ''), p.email) AS email,
        ${IS_ACTIVE_SUBSCRIBER} AS subscribed,
        es.subscribed_at,
        es.unsubscribed_at,
        es.updated_at
      FROM parent p
      LEFT JOIN email_subscriptions es ON es.parent_id = p.id
      WHERE ${PARENT_HAS_EMAIL}
      ${statusClause}
      ORDER BY ${orderCol}
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (err) {
    console.error('[NEWSLETTER] Get subscribers error:', err);
    res.status(500).json({ error: 'Kunde inte hämta prenumeranter' });
  }
});

// ─── ADMIN: GET /api/newsletter/subscribers/count ────────
// Returns subscriber counts by status.
router.get('/subscribers/count', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE ${IS_ACTIVE_SUBSCRIBER}) AS active,
        COUNT(*) FILTER (WHERE es.subscribed = false) AS inactive,
        COUNT(*) AS total
      FROM parent p
      LEFT JOIN email_subscriptions es ON es.parent_id = p.id
      WHERE ${PARENT_HAS_EMAIL}
    `);

    res.json({
      active:   parseInt(result.rows[0].active),
      inactive: parseInt(result.rows[0].inactive),
      total:    parseInt(result.rows[0].total),
    });
  } catch (err) {
    console.error('[NEWSLETTER] Get subscriber count error:', err);
    res.status(500).json({ error: 'Kunde inte hämta antal prenumeranter' });
  }
});

// ─── ADMIN: GET /api/newsletter/recipients ─────────────────
// Returns all active subscribers with parent_id for the send-newsletter modal.
// Fields: parent_id, name, email — optimized for checkbox UI.
router.get('/recipients', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        p.id AS parent_id,
        COALESCE(p.name, '(inget namn)') AS name,
        COALESCE(NULLIF(TRIM(es.email), ''), p.email) AS email
      FROM parent p
      LEFT JOIN email_subscriptions es ON es.parent_id = p.id
      WHERE ${PARENT_HAS_EMAIL}
        AND ${IS_ACTIVE_SUBSCRIBER}
      ORDER BY es.subscribed_at DESC NULLS LAST, p.name ASC
    `);

    console.log(`[NEWSLETTER] /recipients: ${result.rows.length} active subscribers`);
    res.json(result.rows);
  } catch (err) {
    console.error('[NEWSLETTER] Get recipients error:', err);
    res.status(500).json({ error: 'Kunde inte hämta mottagare' });
  }
});

// ─── ADMIN: GET /api/newsletter/subscribers/export ────────
// Exports all ACTIVE subscribers as a UTF-8 CSV with BOM.
// Columns: Namn, E-post, Prenumerationsstart
// Filename: mystarday-prenumeranter-YYYY-MM-DD.csv
router.get('/subscribers/export', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COALESCE(p.name, '(inget namn)') AS name,
        COALESCE(NULLIF(TRIM(es.email), ''), p.email) AS email,
        es.subscribed_at
      FROM parent p
      LEFT JOIN email_subscriptions es ON es.parent_id = p.id
      WHERE ${PARENT_HAS_EMAIL}
        AND ${IS_ACTIVE_SUBSCRIBER}
      ORDER BY es.subscribed_at DESC NULLS LAST, p.name ASC
    `);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `mystarday-prenumeranter-${date}.csv`;

    // Build CSV: Namn,E-post,Prenumerationsstart
    const header = 'Namn,E-post,Prenumerationsstart\n';
    const rows = result.rows.map(r => {
      const name    = '"' + (r.name || '').replace(/"/g, '""') + '"';
      const email   = '"' + (r.email || '').replace(/"/g, '""') + '"';
      const dateStr = r.subscribed_at ? new Date(r.subscribed_at).toISOString().slice(0, 10) : '';
      return `${name},${email},${dateStr}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM for correct åäö rendering in Excel
    res.send('\uFEFF' + header + rows);
  } catch (err) {
    console.error('[NEWSLETTER] Export subscribers error:', err);
    res.status(500).json({ error: 'Kunde inte exportera prenumeranter' });
  }
});

// ─── GET /api/newsletter/unsubscribe ──────────────────────
// One-click unsubscribe via token — no login required.
// Used by the unsubscribe link in newsletter emails.
// On success: renders a simple Swedish confirmation page.
router.get('/unsubscribe', async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string' || !/^[0-9a-f-]{36}$/i.test(token)) {
    return res.status(400).send(renderUnsubscribeErrorPage('Ogiltig länk', 'Länken är ogiltig eller har redan använts.'));
  }

  try {
    const result = await unsubscribeByToken(token);

    if (result.alreadyUnsubscribed) {
      return res.send(renderUnsubscribePage({
        title: 'Avprenumerera',
        heading: 'Du är redan avprenumererad',
        message: 'Din e-postadress finns inte i nyhetsbrevet.',
      }));
    }

    if (!result.ok) {
      return res.status(400).send(renderUnsubscribeErrorPage('Ogiltig länk', 'Länken är ogiltig eller har redan använts.'));
    }

    res.send(renderUnsubscribePage({
      title: 'Avprenumererad',
      heading: 'Du är avprenumererad',
      message: 'Du kommer inte längre få nyheter via e-post.',
    }));
  } catch (err) {
    console.error('[NEWSLETTER] Unsubscribe error:', err);
    res.status(500).send(renderUnsubscribeErrorPage('Fel', 'Försök igen eller kontakta support.'));
  }
});

router.post('/unsubscribe', async (req, res) => {
  const token = req.query.token || req.body?.token;

  if (!token || typeof token !== 'string' || !/^[0-9a-f-]{36}$/i.test(token)) {
    return res.status(400).end();
  }

  try {
    await unsubscribeByToken(token);
    return res.status(200).end();
  } catch (err) {
    console.error('[NEWSLETTER] One-click unsubscribe error:', err);
    return res.status(500).end();
  }
});

// ─── ADMIN: POST /api/newsletter/newsletters ─────────────
// Create a new standalone newsletter (draft). Returns the created record.
// Body: { subject: string, body: string }
router.post('/newsletters', requireAdmin, async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ error: 'subject krävs' });
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'body krävs' });
    }
    if (subject.trim().length > 500) {
      return res.status(400).json({ error: 'subject får vara max 500 tecken' });
    }

    const result = await db.query(
      `INSERT INTO newsletters (subject, body, status, created_by)
       VALUES ($1, $2, 'draft', $3)
       RETURNING *`,
      [subject.trim(), body.trim(), req.user.id]
    );

    res.status(201).json({ newsletter: result.rows[0] });
  } catch (err) {
    console.error('[NEWSLETTER] Create newsletter error:', err);
    res.status(500).json({ error: 'Kunde inte skapa nyhetsbrev' });
  }
});

// ─── ADMIN: GET /api/newsletter/newsletters ───────────────
// Returns the history of standalone newsletters (latest first).
router.get('/newsletters', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        n.*,
        COALESCE(p.name, '(okänd)') AS created_by_name
      FROM newsletters n
      LEFT JOIN parent p ON p.id = n.created_by
      ORDER BY n.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[NEWSLETTER] List newsletters error:', err);
    res.status(500).json({ error: 'Kunde inte hämta nyhetsbrev' });
  }
});

// ─── ADMIN: POST /api/newsletter/newsletters/:id/send ─────
// Send a standalone newsletter to selected recipients.
// Body: { recipientIds: string[] }  (parent_id UUIDs)
// Gate 2D: nyhetsbrev feature must be available
router.post('/newsletters/:id/send', requireAdmin, requireFeature('nyhetsbrev'), async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientIds } = req.body;

    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ error: 'recipientIds (array) krävs' });
    }

    // Fetch the newsletter
    const nlResult = await db.query('SELECT * FROM newsletters WHERE id = $1', [id]);
    if (nlResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nyhetsbrev hittades inte' });
    }
    const newsletter = nlResult.rows[0];

    console.log(`[NEWSLETTER] Send to ${recipientIds.length} recipients: ${JSON.stringify(recipientIds.slice(0,3))}...`);
    // Send via mailer — hard timeout of 60s
    const sendPromise = sendStandaloneNewsletter(newsletter, recipientIds);
    const { sent, failed, apiError } = await Promise.race([
      sendPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: nyhetsbrevet tog för lång tid att skicka')), 60000)),
    ]);
    console.log(`[NEWSLETTER] Send result: sent=${sent}, failed=${failed}${apiError ? `, apiError=${apiError}` : ''}`);

    // Update record with send stats
    await db.query(
      `UPDATE newsletters
       SET status     = $1,
           sent_at    = NOW(),
           sent_count = $2,
           failed_count = $3
       WHERE id = $4`,
      [failed > 0 && sent === 0 ? 'failed' : 'sent', sent, failed, id]
    );

    // Construct meaningful response message
    if (sent === 0 && failed === 0) {
      res.json({ sent, failed, message: 'Inga prenumeranter hittades i urvalet. Kontrollera att mottagarna fortfarande är prenumererade.' });
    } else if (sent === 0 && failed > 0 && apiError) {
      res.json({ sent, failed, message: `E-postleverantören kunde inte nås (fel: ${apiError}). Kontrollera att e-postnyckeln är korrekt inställd.`, error: apiError });
    } else if (sent > 0 && failed > 0) {
      res.json({ sent, failed, message: `Skickat till ${sent} prenumeranter, ${failed} misslyckades.` });
    } else {
      res.json({ sent, failed, message: `Skickat till ${sent} prenumeranter` });
    }
  } catch (err) {
    console.error('[NEWSLETTER] Send newsletter error:', err.message, err.stack);
    const detail = err.message || (typeof err === 'string' ? err : 'Okänt fel');
    res.status(500).json({ error: 'Kunde inte skicka nyhetsbrev', detail });
  }
});

// ─── ADMIN: GET /api/newsletter/newsletters/:id/stats ─────
router.get('/newsletters/:id/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await getCampaignStats('standalone', req.params.id);
    res.json(stats);
  } catch (err) {
    console.error('[NEWSLETTER] Campaign stats error:', err);
    res.status(500).json({ error: 'Kunde inte hämta statistik' });
  }
});

// ─── ADMIN: GET /api/newsletter/newsletters/:id/recipients ─
router.get('/newsletters/:id/recipients-tracking', requireAdmin, async (req, res) => {
  try {
    const rows = await getCampaignRecipients('standalone', req.params.id);
    res.json(rows);
  } catch (err) {
    console.error('[NEWSLETTER] Campaign recipients error:', err);
    res.status(500).json({ error: 'Kunde inte hämta mottagarstatistik' });
  }
});

module.exports = router;