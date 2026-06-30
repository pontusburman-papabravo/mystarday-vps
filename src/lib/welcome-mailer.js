/**
 * Welcome email — sent to new parents immediately after successful registration.
 * Template is admin-editable via /api/admin/welcome-email (welcome_email_template table).
 * Supports **bold** markup, newlines, and {{foralderns_namn}} / {{barnets_namn}} variable substitution.
 * Delivered via Resend (src/lib/email.js).
 */

const { sendEmail } = require('./email');
const db = require('./db');

const APP_URL = process.env.APP_URL || 'https://mystarday.se';

/**
 * Send the welcome email to a new parent.
 *
 * @param {string} parentEmail  — recipient email
 * @param {string} parentId     — parent UUID (for unsubscribe token lookup)
 * @param {object} vars         — { foralderns_namn: string, barnets_namn?: string }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendWelcomeEmail(parentEmail, parentId, { foralderns_namn, barnets_namn } = {}) {
  try {
    // Read from welcome_email_template (id=1, is_active=true).
    // NOTE: email_templates table is NOT used for welcome emails — admin edits
    // the template via the "Välkomstmail" section (welcome_email_template table).
    const templateResult = await db.query(
      `SELECT subject, body FROM welcome_email_template WHERE id = 1 AND is_active = true LIMIT 1`
    );

    if (templateResult.rows.length === 0) {
      console.warn('[WELCOME-MAILER] No active welcome email template found — skipping');
      return { success: false, error: 'No active template found' };
    }

    const template = templateResult.rows[0];
    let subject = template.subject;
    let body = template.body;

    subject = subject.replace(/{{foralderns_namn}}/g, foralderns_namn || 'Förälder');
    body = body.replace(/{{foralderns_namn}}/g, foralderns_namn || 'Förälder');

    // Resolve child's name: provided by caller > looked up from DB > fallback
    let resolved_barnets_namn = barnets_namn || null;

    // Look up child's name from the DB (fallback when barnets_namn not provided).
    if (!resolved_barnets_namn) {
      const childResult = await db.query(
        `SELECT c.name
         FROM child c
         JOIN parent_child pc ON pc.child_id = c.id AND pc.revoked_at IS NULL
         WHERE pc.parent_id = $1
         ORDER BY (pc.role = 'primary') DESC, pc.connected_at ASC NULLS LAST
         LIMIT 1`,
        [parentId]
      );
      resolved_barnets_namn = childResult.rows[0]?.name || 'barnet';
    }

    subject = subject.replace(/{{barnets_namn}}/g, resolved_barnets_namn);
    body = body.replace(/{{barnets_namn}}/g, resolved_barnets_namn);

    // Format body to HTML
    const bodyHtml = formatBodyToHtml(body);

    // Build unsubscribe URL
    const unsubResult = await db.query(
      'SELECT unsubscribe_token FROM email_subscriptions WHERE parent_id = $1 LIMIT 1',
      [parentId]
    );
    const unsubscribeUrl = unsubResult.rows.length > 0
      ? `${APP_URL}/api/newsletter/unsubscribe?token=${unsubResult.rows[0].unsubscribe_token}`
      : `${APP_URL}/dashboard`;

    const html = buildEmailHtml({ subject, bodyHtml, unsubscribeUrl });

    const result = await sendEmail({ to: parentEmail, subject, html, unsubscribeUrl: unsubscribeUrl.includes('unsubscribe') ? unsubscribeUrl : undefined });
    if (!result.success) {
      throw new Error(result.error || 'Email send failed');
    }
    console.log(`[WELCOME-MAILER] Welcome email sent to ${parentEmail}`);
    return { success: true };

  } catch (err) {
    console.error('[WELCOME-MAILER] Failed to send welcome email to', parentEmail, ':', err.message);
    return { success: false, error: err.message };
  }
}

function formatBodyToHtml(text) {
  if (!text) return '';
  return text
    .split(/\n\n+/)
    .map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';
      const escaped = escapeHtml(trimmed);
      // Convert **text** to <strong>text</strong>
      const withStrong = escaped
        .replace(/\u002a\u002a([^*]+)\u002a\u002a/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      // Wrap in paragraph
      return `<p style="margin:0 0 20px 0;line-height:1.7;">${withStrong}</p>`;
    })
    .join('');
}

function buildEmailHtml({ subject, bodyHtml, unsubscribeUrl }) {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#F5A623;background-image:linear-gradient(135deg,#F5A623 0%,#e8952a 100%);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.9;">Min Stjärndag</h1>
              <h2 style="margin:12px 0 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">Välkommen! 🌟</h2>
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
              <a href="${escapeHtml(APP_URL)}/dashboard" style="display:inline-block;background:#F5A623;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
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
              <p style="margin:0 0 8px 0;">Du får detta mail för att du nyligen registrerade dig på Min Stjärndag.</p>
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

/**
 * Send the trial-specific welcome email to new parents.
 * Sent immediately after registration alongside the regular welcome email.
 * Covers: 14-day trial, 59 kr/mån pricing, upgrade CTA.
 *
 * @param {string} parentEmail
 * @param {string} parentId
 * @param {object} vars — { foralderns_namn: string }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendTrialWelcomeEmail(parentEmail, parentId, { foralderns_namn } = {}) {
  try {
    const greeting = foralderns_namn || 'Hej';
    const upgradeUrl = `${APP_URL}/upgrade`;

    const subject = 'Välkommen till My Starday – din gratis period har börjat!';
    const html = buildTrialEmailHtml({ greeting, upgradeUrl, subject });

    const result = await sendEmail({ to: parentEmail, subject, html });
    if (!result.success) throw new Error(result.error || 'Email send failed');
    console.log(`[WELCOME-MAILER] Trial welcome email sent to ${parentEmail}`);
    return { success: true };
  } catch (err) {
    console.error('[WELCOME-MAILER] Failed to send trial welcome email to', parentEmail, ':', err.message);
    return { success: false, error: err.message };
  }
}

function buildTrialEmailHtml({ greeting, upgradeUrl, subject }) {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#F5A623;background-image:linear-gradient(135deg,#F5A623 0%,#e8952a 100%);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.9;">Min Stjärndag</h1>
              <h2 style="margin:12px 0 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">Din gratis period har börjat! ⭐</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px 40px;color:#374151;font-size:16px;line-height:1.7;">
              <p style="margin:0 0 20px 0;">${escapeHtml(greeting)},</p>
              <p style="margin:0 0 24px 0;">Välkommen! Du har nu <strong>14 dagar gratis</strong> att prova alla funktioner i Min Stjärndag — inget kreditkort behövs.</p>
              <p style="margin:0 0 32px 0;">Så här fungerar det:</p>
              <ul style="margin:0 0 32px 0;padding:0 0 0 20px;line-height:2;">
                <li>Skapa scheman och aktiviteter för ditt barn</li>
                <li>Låt barnet samla stjärnor varje dag</li>
                <li>Sätt upp belöningar i Skattkammaren</li>
              </ul>
              <p style="margin:0 0 32px 0;">Efter 14 dagar kostar det <strong>59 kr/månad</strong> — du kan uppgradera när som helst.</p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px 40px;text-align:center;">
              <a href="${escapeHtml(upgradeUrl)}" style="display:inline-block;background:#F5A623;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
                Prova Premium ⭐
              </a>
              <p style="margin:16px 0 0 0;color:#9ca3af;font-size:13px;">Ingen bindningstid — avbryt när som helst</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="border-top:1px solid #e5e7eb;"></td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;color:#9ca3af;font-size:13px;line-height:1.6;">
              <p style="margin:0 0 8px 0;">Du får detta mail för att du nyligen registrerade dig på Min Stjärndag.</p>
              <p style="margin:0;">
                <a href="${escapeHtml(APP_URL)}/dashboard" style="color:#9ca3af;text-decoration:underline;">Öppna appen</a>
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

module.exports = { sendWelcomeEmail };