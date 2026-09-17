'use strict';

/**
 * För dig outcome follow-up email HTML.
 * CTA is always /dashboard (canonical Hem). No tracking-platform copy.
 */

const { escapeHtml } = require('./escape-html');
const config = require('./config');

const DEFAULT_SUBJECT_TEMPLATE = 'Hur går det med {{goal_title}}?';
const MULTI_SUBJECT = 'Hur har det gått?';
const CTA_PATH = '/dashboard?for_dig_feedback=1';
const UNATTEND_FOOTER = 'Vill du inte få fler uppföljningsmejl om För dig? Avregistrera här.';
const ASK_LEAD = 'Nu är vi nyfikna:';
const ASK_EMPHASIS = 'hur har det gått?';

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

function buildSubject({ goalTitle, itemCount = 1, subjectTemplate } = {}) {
  if (Number(itemCount) > 1) return MULTI_SUBJECT;
  return interpolate(subjectTemplate || DEFAULT_SUBJECT_TEMPLATE, {
    goal_title: goalTitle || 'the goal',
  });
}

function wrapEmail({ subject, bodyInner, ctaUrl, unsubscribeUrl }) {
  const safeSubject = escapeHtml(subject);
  const href = escapeHtml(ctaUrl || dashboardCtaUrl());
  const safeBrand = escapeHtml(brandName());
  const footer = unsubscribeUrl
    ? `<tr>
            <td style="padding:0 40px 32px 40px;color:#6b7280;font-size:13px;line-height:1.6;">
              <p style="margin:0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline;">${escapeHtml(UNATTEND_FOOTER)}</a>
              </p>
            </td>
          </tr>`
    : '';

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
              ${bodyInner}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 40px 40px;">
              <a href="${href}" style="display:inline-block;background:#F5A623;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                ${escapeHtml(ctaLabel())}
              </a>
            </td>
          </tr>
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildSingleBodyHtml({ parentName, childName, goalTitle }) {
  const safeParent = escapeHtml(parentName || 'du');
  const safeChild = escapeHtml(childName || 'ditt barn');
  const safeGoal = escapeHtml(goalTitle || 'the goal');
  const safeBrand = escapeHtml(brandName());
  return `
              <p style="margin:0 0 16px 0;">Hej ${safeParent}!</p>
              <p style="margin:0 0 16px 0;">För ett tag sedan aktiverade du <strong>${safeGoal}</strong> för ${safeChild} i För dig.</p>
              <p style="margin:0 0 16px 0;">${escapeHtml(ASK_LEAD)} <strong>${escapeHtml(ASK_EMPHASIS)}</strong></p>
              <p style="margin:0 0 16px 0;">Öppna ${safeBrand} och svara på den korta frågan. Det tar mindre än en minut, och du kan lägga till en kommentar om du vill.</p>
              <p style="margin:0 0 16px 0;">Ditt svar påverkar inte ditt konto eller dina inställningar. Det hjälper oss att förstå vad som fungerar för familjer — och vad vi kan göra bättre.</p>
              <p style="margin:24px 0 0 0;">Tack för att du hjälper oss utveckla ${safeBrand}!</p>
              <p style="margin:8px 0 0 0;">/${escapeHtml(brandName())}-teamet</p>`;
}

function buildMultiBodyHtml({ parentName }) {
  const safeParent = escapeHtml(parentName || 'du');
  const safeBrand = escapeHtml(brandName());
  return `
              <p style="margin:0 0 16px 0;">Hej ${safeParent}!</p>
              <p style="margin:0 0 16px 0;">För ett tag sedan aktiverade du några saker i För dig.</p>
              <p style="margin:0 0 16px 0;">${escapeHtml(ASK_LEAD)} <strong>${escapeHtml(ASK_EMPHASIS)}</strong></p>
              <p style="margin:0 0 16px 0;">Öppna ${safeBrand} och svara på de korta frågorna. Det tar bara någon minut.</p>
              <p style="margin:0 0 16px 0;">Ditt svar påverkar inte ditt konto eller dina inställningar. Det hjälper oss att förstå vad som fungerar för familjer — och vad vi kan göra bättre.</p>
              <p style="margin:24px 0 0 0;">Tack för att du hjälper oss utveckla ${safeBrand}!</p>
              <p style="margin:8px 0 0 0;">/${escapeHtml(brandName())}-teamet</p>`;
}

function buildOutcomeFollowupEmailHtml({
  parentName,
  childName,
  goalTitle,
  items,
  subject,
  ctaUrl,
  unsubscribeUrl,
} = {}) {
  const itemList = Array.isArray(items) && items.length ? items : [{
    childName,
    goalTitle,
  }];
  const itemCount = itemList.length;
  const first = itemList[0] || {};
  const resolvedSubject = subject || buildSubject({
    goalTitle: first.goalTitle || goalTitle,
    itemCount,
  });
  const bodyInner = itemCount > 1
    ? buildMultiBodyHtml({ parentName })
    : buildSingleBodyHtml({
      parentName,
      childName: first.childName || childName,
      goalTitle: first.goalTitle || goalTitle,
    });
  return wrapEmail({
    subject: resolvedSubject,
    bodyInner,
    ctaUrl,
    unsubscribeUrl,
  });
}

module.exports = {
  DEFAULT_SUBJECT_TEMPLATE,
  MULTI_SUBJECT,
  CTA_PATH,
  UNATTEND_FOOTER,
  ASK_LEAD,
  ASK_EMPHASIS,
  brandName,
  ctaLabel,
  dashboardCtaUrl,
  buildSubject,
  buildOutcomeFollowupEmailHtml,
};
