/**
 * Shared footer for parent notification emails (weekly summary, win-back, rewards).
 * Web-first copy with settings deep link + optional one-click opt-out.
 */
const config = require('./config');

function buildNotificationEmailFooterHtml({
  optOutUrl,
  optOutLabel = 'Stäng av den här aviseringen',
  settingsHash = 'aviseringar',
} = {}) {
  const base = config.email.baseUrl.replace(/\/$/, '');
  const settingsUrl = `${base}/settings#${settingsHash}`;
  const optOutLink = optOutUrl
    ? `<a href="${optOutUrl}" style="color:#5A6178;text-decoration:underline;">${optOutLabel}</a>`
    : '';

  const parts = [
    `<a href="${settingsUrl}" style="color:#5A6178;text-decoration:underline;">Inställningar → Notiser</a>`,
    optOutLink,
  ].filter(Boolean);

  return `
    <p style="margin-top:24px;font-size:13px;color:#9ca3af;line-height:1.6;text-align:center;">
      ${parts.join(' · ')}
    </p>`;
}

module.exports = { buildNotificationEmailFooterHtml };
