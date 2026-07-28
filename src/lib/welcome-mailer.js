/**
 * Welcome email — sent to new parents immediately after successful registration.
 * Template is admin-editable via /api/admin/welcome-email (welcome_email_template table).
 * Supports **bold** markup, newlines, and {{foralderns_namn}} / {{barnets_namn}} variable substitution.
 * Delivered via Resend (src/lib/email.js).
 */

const { sendEmail } = require('./email');
const db = require('./db');
const config = require('./config');
const { t } = require('./i18n');
const { resolveCommunicationLocale } = require('./communication-locale');

const APP_URL = process.env.APP_URL || 'https://mystarday.se';

/**
 * Send the welcome email to a new parent.
 *
 * @param {string} parentEmail  — recipient email
 * @param {string} parentId     — parent UUID (for unsubscribe token lookup)
 * @param {object} vars         — { foralderns_namn: string, barnets_namn?: string }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendWelcomeEmail(parentEmail, parentId, { foralderns_namn, barnets_namn, locale } = {}) {
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

    const lang = resolveCommunicationLocale(locale);
    const genericParent = t(lang, 'email.common.genericParent');

    subject = subject.replace(/{{foralderns_namn}}/g, foralderns_namn || genericParent);
    body = body.replace(/{{foralderns_namn}}/g, foralderns_namn || genericParent);

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
      resolved_barnets_namn = childResult.rows[0]?.name || t(lang, 'email.common.genericChild');
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

    const html = buildEmailHtml({
      subject,
      bodyHtml,
      unsubscribeUrl,
      locale: resolveCommunicationLocale(locale),
    });

    const result = await sendEmail({ to: parentEmail, subject, html, unsubscribeUrl: unsubscribeUrl.includes('unsubscribe') ? unsubscribeUrl : undefined });
    if (!result.success) {
      throw new Error(result.error || 'Email send failed');
    }
    console.log(`[WELCOME-MAILER] Welcome email sent to parent ${parentId}`);
    return { success: true };

  } catch (err) {
    console.error('[WELCOME-MAILER] Failed to send welcome email to parent', parentId, ':', err.message);
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

function buildEmailHtml({ subject, bodyHtml, unsubscribeUrl, locale = 'sv-SE' }) {
  const brand = config.email.fromName || 'Stjärndag';
  const lang = resolveCommunicationLocale(locale);
  return `<!DOCTYPE html>
<html lang="${lang === 'en-GB' ? 'en-GB' : 'sv-SE'}">
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
          <tr>
            <td style="background-color:#F5A623;background-image:linear-gradient(135deg,#F5A623 0%,#e8952a 100%);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.9;">${escapeHtml(brand)}</h1>
              <h2 style="margin:12px 0 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">${escapeHtml(t(lang, 'email.welcomeShell.headerTitle'))}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px 40px;color:#374151;font-size:16px;line-height:1.7;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 40px 40px;">
              <a href="${escapeHtml(APP_URL)}/dashboard" style="display:inline-block;background:#F5A623;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                ${escapeHtml(t(lang, 'email.welcomeShell.cta', { brand }))}
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5e7eb;"></td>
          </tr>
          <tr>
            <td style="padding:24px 40px;color:#9ca3af;font-size:13px;line-height:1.6;">
              <p style="margin:0 0 8px 0;">${escapeHtml(t(lang, 'email.welcomeShell.footerIntro', { brand }))}</p>
              <p style="margin:0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline;">${escapeHtml(t(lang, 'email.welcomeShell.unsubscribe'))}</a>
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
async function sendTrialWelcomeEmail(parentEmail, parentId, { foralderns_namn, locale } = {}) {
  try {
    const lang = resolveCommunicationLocale(locale);
    const brand = config.email.fromName || 'Stjärndag';
    const greeting = foralderns_namn || t(lang, 'email.common.greeting');
    const upgradeUrl = `${APP_URL}/upgrade`;

    const subject = t(lang, 'email.trialWelcome.subject', { brand });
    const html = buildTrialEmailHtml({ greeting, upgradeUrl, subject, locale: lang, brand });

    const result = await sendEmail({ to: parentEmail, subject, html });
    if (!result.success) throw new Error(result.error || 'Email send failed');
    console.log(`[WELCOME-MAILER] Trial welcome email sent to parent ${parentId}`);
    return { success: true };
  } catch (err) {
    console.error('[WELCOME-MAILER] Failed to send trial welcome email to parent', parentId, ':', err.message);
    return { success: false, error: err.message };
  }
}

function buildTrialEmailHtml({ greeting, upgradeUrl, subject, locale = 'sv-SE', brand }) {
  const lang = resolveCommunicationLocale(locale);
  const resolvedBrand = brand || config.email.fromName || 'Stjärndag';
  return `<!DOCTYPE html>
<html lang="${lang === 'en-GB' ? 'en-GB' : 'sv-SE'}">
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
          <tr>
            <td style="background-color:#F5A623;background-image:linear-gradient(135deg,#F5A623 0%,#e8952a 100%);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.9;">${escapeHtml(t(lang, 'email.trialWelcome.headerBrand', { brand: resolvedBrand }))}</h1>
              <h2 style="margin:12px 0 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">${escapeHtml(t(lang, 'email.trialWelcome.headerTitle'))}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px 40px;color:#374151;font-size:16px;line-height:1.7;">
              <p style="margin:0 0 20px 0;">${escapeHtml(greeting)},</p>
              <p style="margin:0 0 24px 0;">${t(lang, 'email.trialWelcome.intro', { brand: resolvedBrand })}</p>
              <p style="margin:0 0 32px 0;">${escapeHtml(t(lang, 'email.trialWelcome.howTitle'))}</p>
              <ul style="margin:0 0 32px 0;padding:0 0 0 20px;line-height:2;">
                <li>${escapeHtml(t(lang, 'email.trialWelcome.how1'))}</li>
                <li>${escapeHtml(t(lang, 'email.trialWelcome.how2'))}</li>
                <li>${escapeHtml(t(lang, 'email.trialWelcome.how3'))}</li>
              </ul>
              <p style="margin:0 0 32px 0;">${t(lang, 'email.trialWelcome.pricing')}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 40px 40px;text-align:center;">
              <a href="${escapeHtml(upgradeUrl)}" style="display:inline-block;background:#F5A623;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
                ${escapeHtml(t(lang, 'email.trialWelcome.cta'))}
              </a>
              <p style="margin:16px 0 0 0;color:#9ca3af;font-size:13px;">${escapeHtml(t(lang, 'email.trialWelcome.ctaHint'))}</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5e7eb;"></td>
          </tr>
          <tr>
            <td style="padding:24px 40px;color:#9ca3af;font-size:13px;line-height:1.6;">
              <p style="margin:0 0 8px 0;">${escapeHtml(t(lang, 'email.trialWelcome.footerIntro', { brand: resolvedBrand }))}</p>
              <p style="margin:0;">
                <a href="${escapeHtml(APP_URL)}/dashboard" style="color:#9ca3af;text-decoration:underline;">${escapeHtml(t(lang, 'email.trialWelcome.openApp'))}</a>
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