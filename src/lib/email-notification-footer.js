/**
 * Shared footer for parent notification emails (weekly summary, win-back, rewards).
 * Web-first copy with settings deep link + optional one-click opt-out.
 */
const config = require('./config');
const { t } = require('./i18n');
const { validateLocale } = require('./locale');

function buildNotificationEmailFooterHtml({
  locale = 'sv-SE',
  optOutUrl,
  optOutLabel,
  settingsHash = 'aviseringar',
} = {}) {
  const lang = validateLocale(locale);
  const base = config.email.baseUrl.replace(/\/$/, '');
  const settingsUrl = `${base}/settings#${settingsHash}`;
  const resolvedOptOutLabel = optOutLabel || t(lang, 'email.notificationFooter.optOutDefault');
  const optOutLink = optOutUrl
    ? `<a href="${optOutUrl}" style="color:#5A6178;text-decoration:underline;">${resolvedOptOutLabel}</a>`
    : '';

  const parts = [
    `<a href="${settingsUrl}" style="color:#5A6178;text-decoration:underline;">${t(lang, 'email.notificationFooter.settingsLink')}</a>`,
    optOutLink,
  ].filter(Boolean);

  return `
    <p style="margin-top:24px;font-size:13px;color:#9ca3af;line-height:1.6;text-align:center;">
      ${parts.join(' · ')}
    </p>`;
}

module.exports = { buildNotificationEmailFooterHtml };
