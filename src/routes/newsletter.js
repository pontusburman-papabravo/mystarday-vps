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
      return res.json({ subscribed: false, opted_in: false, subscribed_at: null, unsubscribed_at: null });
    }

    const row = result.rows[0];
    res.json({
      subscribed:   row.subscribed,
      opted_in:     row.subscribed,
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
      sendNewsletterSubscriptionConfirmation(email, parentName.rows[0]?.name || '')
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

    let whereClause = '';
    if (status === 'active')   whereClause = 'WHERE es.subscribed = true';
    if (status === 'inactive') whereClause = 'WHERE es.subscribed = false';

    const orderCol = sort === 'name' ? 'p.name ASC' : 'es.subscribed_at DESC';

    const result = await db.query(`
      SELECT
        es.id,
        es.parent_id,
        COALESCE(p.name, '(inget namn)') AS name,
        es.email,
        es.subscribed,
        es.subscribed_at,
        es.unsubscribed_at,
        es.updated_at
      FROM email_subscriptions es
      JOIN parent p ON p.id = es.parent_id
      ${whereClause}
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
        COUNT(*) FILTER (WHERE subscribed = true)  AS active,
        COUNT(*) FILTER (WHERE subscribed = false) AS inactive,
        COUNT(*)                                   AS total
      FROM email_subscriptions
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
        es.parent_id,
        COALESCE(p.name, '(inget namn)') AS name,
        es.email
      FROM email_subscriptions es
      JOIN parent p ON p.id = es.parent_id
      WHERE es.subscribed = true
      ORDER BY es.subscribed_at DESC
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
        es.email,
        es.subscribed_at
      FROM email_subscriptions es
      JOIN parent p ON p.id = es.parent_id
      WHERE es.subscribed = true
      ORDER BY es.subscribed_at DESC
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
    return res.status(400).send(`
      <!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Avprenumerera</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:48px;color:#374151;">
        <h1>Ogiltig länk</h1>
        <p>Länken är ogiltig eller har redan använts.</p>
      </body></html>
    `);
  }

  try {
    const result = await db.query(
      `UPDATE email_subscriptions
       SET subscribed = false,
           unsubscribed_at = NOW(),
           updated_at = NOW()
       WHERE unsubscribe_token = $1
         AND subscribed = true
       RETURNING email`,
      [token]
    );

    if (result.rows.length === 0) {
      // Either already unsubscribed or token not found — show neutral message
      return res.send(`
        <!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Avprenumerera</title>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;padding:64px 24px;color:#374151;background:#f9fafb;}</style>
        </head><body>
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:48px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
            <p style="font-size:48px;margin:0 0 16px;">⭐</p>
            <h1 style="margin:0 0 12px;font-size:22px;">Du är redan avprenumererad</h1>
            <p style="color:#6b7280;">Din e-postadress finns inte i nyhetsbrevet.</p>
            <a href="/" style="display:inline-block;margin-top:24px;background:#F5A623;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;">Till Min Stjärndag</a>
          </div>
        </body></html>
      `);
    }

    res.send(`
      <!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Avprenumererad</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;padding:64px 24px;color:#374151;background:#f9fafb;}</style>
      </head><body>
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:48px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
          <p style="font-size:48px;margin:0 0 16px;">✅</p>
          <h1 style="margin:0 0 12px;font-size:22px;">Du är avprenumererad</h1>
          <p style="color:#6b7280;">Du kommer inte längre få nyheter från Min Stjärndag via e-post.</p>
          <a href="/" style="display:inline-block;margin-top:24px;background:#F5A623;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;">Till Min Stjärndag</a>
        </div>
      </body></html>
    `);
  } catch (err) {
    console.error('[NEWSLETTER] Unsubscribe error:', err);
    res.status(500).send(`
      <!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Fel</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:48px;color:#374151;">
        <h1>Något gick fel</h1>
        <p>Försök igen eller kontakta oss på info@mystarday.se.</p>
      </body></html>
    `);
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

module.exports = router;