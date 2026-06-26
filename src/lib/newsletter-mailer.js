/**
 * src/lib/newsletter-mailer.js
 * Owns: Sending newsletter emails via Resend when a nyhet is published
 *       or admin sends a standalone newsletter.
 *       HTML template rendering, batch sending, unsubscribe token handling.
 * Does NOT own: subscription management (routes/newsletter.js),
 *               push notifications (push-notifications.js),
 *               or any DB writes on dagens_nyhet (that's db/dagens-nyhet.js).
 *
 * All email is sent via Resend (RESEND_API_KEY).
 * Batches of 50 with 1s delay to respect Resend rate limits.
 */

const { sendEmail } = require('./email');
const db = require('./db');
const { recordSend } = require('../../db/newsletter-email-tracking');
const {
  PARENT_HAS_EMAIL,
  IS_ACTIVE_SUBSCRIBER,
  ensureSubscriberRecords,
} = require('./newsletter-subscribe');

const APP_URL = process.env.APP_URL || 'https://mystarday.se';

// Batch size and inter-batch delay (ms) — Polsia proxy handles rate limiting
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

async function sendTrackedNewsletterEmail({ to, subject, html, campaignType, campaignId, parentId, unsubscribeUrl }) {
  const tags = [
    { name: 'campaign_type', value: campaignType },
    { name: 'campaign_id', value: String(campaignId) },
  ];
  if (parentId) {
    tags.push({ name: 'parent_id', value: String(parentId) });
  }

  const result = await sendEmail({ to, subject, html, tags, unsubscribeUrl });
  if (!result.success) {
    throw new Error(result.error || 'Email send failed');
  }

  if (result.emailId) {
    await recordSend({
      campaignType,
      campaignId,
      parentId: parentId || null,
      recipientEmail: to,
      resendEmailId: result.emailId,
    }).catch((err) => {
      console.error('[NEWSLETTER-MAILER] recordSend failed:', err.message);
    });
  }

  return result;
}

/**
 * Send newsletter email to all active subscribers for a published nyhet.
 *
 * @param {{ id: string, title: string, body: string }} nyhet
 * @returns {Promise<{ sent: number, failed: number }>}
 */
async function sendNewsletterForNyhet(nyhet) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[NEWSLETTER-MAILER] RESEND_API_KEY not set — skipping email send');
    return { sent: 0, failed: 0 };
  }

  await ensureSubscriberRecords(db);

  const result = await db.query(`
    SELECT COALESCE(NULLIF(TRIM(es.email), ''), p.email) AS email,
           es.unsubscribe_token, p.id AS parent_id
    FROM parent p
    LEFT JOIN email_subscriptions es ON es.parent_id = p.id
    WHERE ${PARENT_HAS_EMAIL}
      AND ${IS_ACTIVE_SUBSCRIBER}
      AND es.unsubscribe_token IS NOT NULL
  `);

  if (result.rows.length === 0) {
    console.log('[NEWSLETTER-MAILER] No active subscribers — nothing to send');
    return { sent: 0, failed: 0 };
  }

  console.log(`[NEWSLETTER-MAILER] Sending nyhet "${nyhet.title}" to ${result.rows.length} subscribers`);

  let totalSent = 0;
  let totalFailed = 0;

  // Send in batches
  const subscribers = result.rows;
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    for (const sub of batch) {
      const unsubscribeUrl = `${APP_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`;
      const html = buildEmailHtml({ nyhet, unsubscribeUrl });

      try {
        await sendTrackedNewsletterEmail({
          to: sub.email,
          subject: nyhet.title,
          html,
          campaignType: 'dagens_nyhet',
          campaignId: nyhet.id,
          parentId: sub.parent_id,
          unsubscribeUrl,
        });
        totalSent++;
      } catch (err) {
        totalFailed++;
        console.error(`[NEWSLETTER-MAILER] Failed to send to ${sub.email}:`, err.message);
      }
    }

    // Pause between batches (not on the last batch)
    if (i + BATCH_SIZE < subscribers.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`[NEWSLETTER-MAILER] Done: ${totalSent} sent, ${totalFailed} failed`);
  return { sent: totalSent, failed: totalFailed };
}

/**
 * Build the responsive HTML email for a nyhet.
 */
function buildEmailHtml({ nyhet, unsubscribeUrl }) {
  // Convert simple line breaks to <p> tags for readable body rendering
  const bodyHtml = nyhet.body
    .split(/\n\n+/)
    .map(p => `<p style="margin:0 0 16px 0;line-height:1.6;">${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(nyhet.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#F5A623;background-image:linear-gradient(135deg,#F5A623 0%,#e8952a 100%);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.9;">Min Stjärndag</h1>
              <h2 style="margin:12px 0 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">${escapeHtml(nyhet.title)}</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px 40px;color:#374151;font-size:16px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px 40px;">
              <a href="${escapeHtml(APP_URL)}" style="display:inline-block;background:#F5A623;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                Öppna Min Stjärndag ⭐
              </a>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="border-top:1px solid #e5e7eb;"></td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;color:#9ca3af;font-size:13px;line-height:1.6;">
              <p style="margin:0 0 8px 0;">Du får detta mail för att du prenumererar på nyheter från Min Stjärndag.</p>
              <p style="margin:0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline;">Avprenumerera</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send newsletter email to a specific list of recipients for a published nyhet.
 * Used when admin manually selects recipients before sending.
 *
 * @param {{ id: string, title: string, body: string }} nyhet
 * @param {string[]} recipientIds parent_id UUIDs to send to
 * @returns {Promise<{ sent: number, failed: number }>}
 */
async function sendNewsletterToRecipients(nyhet, recipientIds) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[NEWSLETTER-MAILER] RESEND_API_KEY not set — skipping email send');
    return { sent: 0, failed: 0 };
  }

  if (!recipientIds || recipientIds.length === 0) {
    console.log('[NEWSLETTER-MAILER] No recipients specified — skipping');
    return { sent: 0, failed: 0 };
  }

  // Fetch only the specified subscribers with their unsubscribe tokens
  const placeholders = recipientIds.map((_, i) => `$${i + 1}`).join(',');
  await ensureSubscriberRecords(db);

  const result = await db.query(
    `SELECT COALESCE(NULLIF(TRIM(es.email), ''), p.email) AS email,
            es.unsubscribe_token, p.id AS parent_id
     FROM parent p
     LEFT JOIN email_subscriptions es ON es.parent_id = p.id
     WHERE ${PARENT_HAS_EMAIL}
       AND ${IS_ACTIVE_SUBSCRIBER}
       AND es.unsubscribe_token IS NOT NULL
       AND p.id IN (${placeholders})`,
    recipientIds
  );

  if (result.rows.length === 0) {
    console.log('[NEWSLETTER-MAILER] No matching active subscribers for selected recipients');
    return { sent: 0, failed: 0 };
  }

  console.log(`[NEWSLETTER-MAILER] Sending nyhet "${nyhet.title}" to ${result.rows.length} selected recipients`);

  let totalSent = 0;
  let totalFailed = 0;

  // Send in batches
  const subscribers = result.rows;
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    for (const sub of batch) {
      const unsubscribeUrl = `${APP_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`;
      const html = buildEmailHtml({ nyhet, unsubscribeUrl });

      try {
        await sendTrackedNewsletterEmail({
          to: sub.email,
          subject: nyhet.title,
          html,
          campaignType: 'dagens_nyhet',
          campaignId: nyhet.id,
          parentId: sub.parent_id,
          unsubscribeUrl,
        });
        totalSent++;
      } catch (err) {
        totalFailed++;
        console.error(`[NEWSLETTER-MAILER] Failed to send to ${sub.email}:`, err.message);
      }
    }

    if (i + BATCH_SIZE < subscribers.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`[NEWSLETTER-MAILER] Done (recipients): ${totalSent} sent, ${totalFailed} failed`);
  return { sent: totalSent, failed: totalFailed };
}

/**
 * Send a standalone newsletter to specific recipients.
 * Uses the newsletters table record (subject, body).
 * Supports long-form body with paragraph/bold formatting.
 * Substitutes {{foralderns_namn}}, {{barnets_namn}}, UNSUBSCRIBE_URL in the body.
 *
 * @param {{ id: string, subject: string, body: string }} newsletter
 * @param {string[]} recipientIds parent_id UUIDs to send to
 * @returns {Promise<{ sent: number, failed: number }>}
 */
async function sendStandaloneNewsletter(newsletter, recipientIds) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[NEWSLETTER-MAILER] RESEND_API_KEY not set — skipping standalone newsletter');
    return { sent: 0, failed: 0, apiError: 'RESEND_API_KEY saknas' };
  }

  if (!recipientIds || recipientIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const placeholders = recipientIds.map((_, i) => `$${i + 1}`).join(',');
  await ensureSubscriberRecords(db);

  const result = await db.query(
    `SELECT COALESCE(NULLIF(TRIM(es.email), ''), p.email) AS email,
            es.unsubscribe_token, p.id AS parent_id
     FROM parent p
     LEFT JOIN email_subscriptions es ON es.parent_id = p.id
     WHERE ${PARENT_HAS_EMAIL}
       AND ${IS_ACTIVE_SUBSCRIBER}
       AND es.unsubscribe_token IS NOT NULL
       AND p.id IN (${placeholders})`,
    recipientIds
  );

  if (result.rows.length === 0) {
    console.log('[NEWSLETTER-MAILER] No matching active subscribers for standalone newsletter');
    return { sent: 0, failed: 0 };
  }

  // Batch-fetch parent names + first child's name for variable substitution
  const parentIds = [...new Set(result.rows.map(r => r.parent_id))];
  const parentPlaceholders = parentIds.map((_, i) => `$${i + 1}`).join(',');
  const parentData = await db.query(
    `SELECT p.id, COALESCE(p.name, 'Förälder') AS foralderns_namn,
            (SELECT ch.name FROM child ch
             JOIN parent_child pc ON pc.child_id = ch.id AND pc.revoked_at IS NULL
             WHERE pc.parent_id = p.id
             ORDER BY (pc.role = 'primary') DESC, pc.connected_at ASC NULLS LAST
             LIMIT 1) AS barnets_namn
     FROM parent p
     WHERE p.id IN (${parentPlaceholders})`,
    parentIds
  );

  const parentMap = new Map(parentData.rows.map(r => [r.id, r]));
  const subscriberData = result.rows.map(sub => ({
    ...sub,
    foralderns_namn: parentMap.get(sub.parent_id)?.foralderns_namn || 'Förälder',
    barnets_namn:   parentMap.get(sub.parent_id)?.barnets_namn || '',
  }));

  console.log(`[NEWSLETTER-MAILER] Sending standalone newsletter "${newsletter.subject}" to ${subscriberData.length} recipients`);

  let totalSent = 0;
  let totalFailed = 0;
  let apiError = null;

  for (let i = 0; i < subscriberData.length; i += BATCH_SIZE) {
    const batch = subscriberData.slice(i, i + BATCH_SIZE);

    for (const sub of batch) {
      const unsubscribeUrl = `${APP_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`;
      const html = buildStandaloneEmailHtml({ newsletter, unsubscribeUrl, foralderns_namn: sub.foralderns_namn, barnets_namn: sub.barnets_namn });

      try {
        await sendTrackedNewsletterEmail({
          to: sub.email,
          subject: newsletter.subject,
          html,
          campaignType: 'standalone',
          campaignId: newsletter.id,
          parentId: sub.parent_id,
          unsubscribeUrl,
        });
        totalSent++;
      } catch (err) {
        totalFailed++;
        console.error(`[NEWSLETTER-MAILER] Failed to send to ${sub.email}:`, err.message);
        if (!apiError) apiError = err.message;
      }
    }

    if (i + BATCH_SIZE < subscriberData.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`[NEWSLETTER-MAILER] Standalone done: ${totalSent} sent, ${totalFailed} failed`);
  return { sent: totalSent, failed: totalFailed, apiError };
}

/**
 * Build HTML email for a standalone newsletter.
 * Supports longer body text with bold (**text**) and paragraphs.
 * Substitutes {{foralderns_namn}}, {{barnets_namn}}, UNSUBSCRIBE_URL in the body.
 */
function buildStandaloneEmailHtml({ newsletter, unsubscribeUrl, foralderns_namn = 'Förälder', barnets_namn = '' }) {
  const bodyHtml = formatNewsletterBody(substituteVariables(newsletter.body, { foralderns_namn, barnets_namn, UNSUBSCRIBE_URL: unsubscribeUrl }));

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(newsletter.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#F5A623;background-image:linear-gradient(135deg,#F5A623 0%,#e8952a 100%);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.9;">Min Stjärndag &mdash; Nyhetsbrev</h1>
              <h2 style="margin:12px 0 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">${escapeHtml(newsletter.subject)}</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px 40px;color:#374151;font-size:16px;line-height:1.7;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px 40px;">
              <a href="${escapeHtml(APP_URL)}" style="display:inline-block;background:#F5A623;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                Öppna Min Stjärndag ⭐
              </a>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="border-top:1px solid #e5e7eb;"></td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;color:#9ca3af;font-size:13px;line-height:1.6;">
              <p style="margin:0 0 8px 0;">Du får detta mail för att du prenumererar på nyheter från Min Stjärndag.</p>
              <p style="margin:0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline;">Avprenumerera</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Replace template variables in newsletter body.
 * Handles {{foralderns_namn}}, {{barnets_namn}}, UNSUBSCRIBE_URL.
 */
function substituteVariables(text, { foralderns_namn, barnets_namn, UNSUBSCRIBE_URL }) {
  if (!text) return '';
  return text
    .replace(/{{foralderns_namn}}/g, foralderns_namn || 'Förälder')
    .replace(/{{barnets_namn}}/g,    barnets_namn     || '')
    .replace(/UNSUBSCRIBE_URL/g,    UNSUBSCRIBE_URL  || '');
}

/**
 * Format newsletter body text for email HTML.
 * - Double newlines → paragraph breaks
 * - Single newlines within a paragraph → <br>
 * - **bold text** → <strong>
 */
function formatNewsletterBody(text) {
  if (!text) return '';
  return text
    .split(/\n\n+/)
    .map(paragraph => {
      const escaped = escapeHtml(paragraph.trim());
      // Convert **text** to <strong>text</strong>
      const withBold = escaped.replace(/\u002a\u002a([^*]+)\u002a\u002a/g, '<strong>$1</strong>');
      // Convert single newlines to <br>
      const withBreaks = withBold.replace(/\n/g, '<br>');
      return `<p style="margin:0 0 20px 0;line-height:1.7;">${withBreaks}</p>`;
    })
    .join('');
}

module.exports = { sendNewsletterForNyhet, sendNewsletterToRecipients, sendStandaloneNewsletter };