'use strict';

/**
 * För dig outcome follow-up email HTML.
 * CTA is always /dashboard (canonical Hem). No tracking-platform copy.
 */

const { escapeHtml } = require('./escape-html');
const config = require('./config');

const DEFAULT_SUBJECT_TEMPLATE = 'Hur går det med {{goal_title}}?';
const CTA_PATH = '/dashboard';
const OPENING_LINE = 'För ett tag sedan aktiverade du';

function brandName() {
  return config.email.fromName;
}

function ctaLabel() {
  return `Öppna ${brandName()}`;
}

function dashboardCtaUrl(baseUrl = config.email.baseUrl) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  return `${root}${CTA_PATH}`;
}

function interpolate(template, vars) {
  return String(template || DEFAULT_SUBJECT_TEMPLATE).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return vars[key] != null ? String(vars[key]) : '';
  });
}

function buildSubject({ goalTitle, subjectTemplate } = {}) {
  return interpolate(subjectTemplate || DEFAULT_SUBJECT_TEMPLATE, {
    goal_title: goalTitle || 'målet',
  });
}

function buildOutcomeFollowupEmailHtml({
  parentName,
  childName,
  goalTitle,
  subject,
  ctaUrl,
} = {}) {
  const safeParent = escapeHtml(parentName || 'du');
  const safeChild = escapeHtml(childName || 'ditt barn');
  const safeGoal = escapeHtml(goalTitle || 'målet');
  const safeSubject = escapeHtml(subject || buildSubject({ goalTitle }));
  const href = escapeHtml(ctaUrl || dashboardCtaUrl());
  const safeBrand = escapeHtml(brandName());

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#F5A623;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.9;">${safeBrand}</h1>
              <h2 style="margin:12px 0 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">${safeSubject}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px 40px;color:#374151;font-size:16px;line-height:1.7;">
              <p style="margin:0 0 16px 0;">Hej ${safeParent},</p>
              <p style="margin:0 0 16px 0;">${OPENING_LINE} <strong>${safeGoal}</strong> för ${safeChild}. Hur går det?</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 40px 40px;">
              <a href="${href}" style="display:inline-block;background:#F5A623;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                ${escapeHtml(ctaLabel())}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  DEFAULT_SUBJECT_TEMPLATE,
  CTA_PATH,
  OPENING_LINE,
  brandName,
  ctaLabel,
  dashboardCtaUrl,
  buildSubject,
  buildOutcomeFollowupEmailHtml,
};
