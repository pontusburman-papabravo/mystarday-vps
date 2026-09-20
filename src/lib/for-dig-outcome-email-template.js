'use strict';

/**
 * För dig outcome follow-up email HTML.
 * Primary CTA is one 1-click question (four scores). GET never writes.
 */

const { escapeHtml } = require('./escape-html');
const config = require('./config');
const { buildAnswerUrl } = require('./for-dig-followup-answer-token');

const DEFAULT_SUBJECT_TEMPLATE = 'Hur går det med {{goal_title}}?';
const MULTI_SUBJECT = 'Hur har det gått?';
const CTA_PATH = '/dashboard?for_dig_feedback=1';
const UNATTEND_FOOTER = 'Vill du inte få fler uppföljningsmejl om För dig? Avregistrera här.';
const ASK_LEAD = 'Hur har det gått med';
const ASK_EMPHASIS = '?';
const CTA_LABEL = 'Svara här';
const MORE_ITEMS_NOTE = 'Har du fler mål visar vi nästa efteråt — en fråga i taget.';
const TRUST_LINE = 'Svaret ändrar inte schemat. Det hjälper oss förstå vad som fungerar.';
const GOAL_FALLBACK = 'målet';

const OUTCOME_CHOICES = [
  { score: 4, emoji: '😊', label: 'Stor förbättring' },
  { score: 3, emoji: '🙂', label: 'Lite bättre' },
  { score: 2, emoji: '😐', label: 'Ingen skillnad' },
  { score: 1, emoji: '🙁', label: 'Fungerar inte' },
];

function brandName() {
  return config.email.fromName;
}

function ctaLabel() {
  return CTA_LABEL;
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
    goal_title: goalTitle || GOAL_FALLBACK,
  });
}

function scoreButtonRow({ href, emoji, label }) {
  return `<tr>
            <td style="padding:0 0 10px 0;">
              <a href="${escapeHtml(href)}" style="display:block;background:#ffffff;color:#1B2340;text-decoration:none;padding:14px 18px;border-radius:10px;border:2px solid #F5A623;font-weight:600;font-size:16px;text-align:center;">
                ${escapeHtml(emoji)} ${escapeHtml(label)}
              </a>
            </td>
          </tr>`;
}

function wrapEmail({ subject, bodyInner, ctaUrl, unsubscribeUrl, scoreButtonsHtml }) {
  const safeSubject = escapeHtml(subject);
  const href = escapeHtml(ctaUrl || dashboardCtaUrl());
  const footer = unsubscribeUrl
    ? `<tr>
            <td style="padding:0 40px 32px 40px;color:#6b7280;font-size:13px;line-height:1.6;">
              <p style="margin:0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline;">${escapeHtml(UNATTEND_FOOTER)}</a>
              </p>
            </td>
          </tr>`
    : '';

  const actions = scoreButtonsHtml
    ? `<tr>
            <td style="padding:0 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${scoreButtonsHtml}
              </table>
            </td>
          </tr>`
    : `<tr>
            <td style="padding:0 40px 40px 40px;">
              <a href="${href}" style="display:inline-block;background:#F5A623;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                ${escapeHtml(ctaLabel())}
              </a>
            </td>
          </tr>`;

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
              <h1 style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.9;">${escapeHtml(brandName())}</h1>
              <h2 style="margin:12px 0 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">${safeSubject}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 24px 40px;color:#374151;font-size:16px;line-height:1.7;">
              ${bodyInner}
            </td>
          </tr>
          ${actions}
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildBodyHtml({ parentName, childName, goalTitle, itemCount = 1 }) {
  const safeParent = escapeHtml(parentName || 'du');
  const safeChild = escapeHtml(childName || 'ditt barn');
  const safeGoal = escapeHtml(goalTitle || GOAL_FALLBACK);
  const more = Number(itemCount) > 1
    ? `<p style="margin:0 0 16px 0;">${escapeHtml(MORE_ITEMS_NOTE)}</p>`
    : '';
  return `
              <p style="margin:0 0 16px 0;">Hej ${safeParent}!</p>
              <p style="margin:0 0 16px 0;">${escapeHtml(ASK_LEAD)} <strong>${safeGoal}</strong> för ${safeChild}${escapeHtml(ASK_EMPHASIS)}</p>
              <p style="margin:0 0 16px 0;">Tryck på det som stämmer — det tar några sekunder.</p>
              ${more}
              <p style="margin:0 0 0 0;">${escapeHtml(TRUST_LINE)}</p>`;
}

function buildScoreButtonsHtml({ recipientId, baseUrl }) {
  if (!recipientId) return '';
  return OUTCOME_CHOICES.map((choice) => scoreButtonRow({
    href: buildAnswerUrl(recipientId, { baseUrl, score: choice.score }),
    emoji: choice.emoji,
    label: choice.label,
  })).join('');
}

function buildOutcomeFollowupEmailHtml({
  parentName,
  childName,
  goalTitle,
  items,
  subject,
  ctaUrl,
  unsubscribeUrl,
  recipientId,
  baseUrl,
} = {}) {
  const itemList = Array.isArray(items) && items.length ? items : [{
    childName,
    goalTitle,
  }];
  const first = itemList[0] || {};
  const resolvedGoal = first.goalTitle || first.goal_title || goalTitle;
  const resolvedChild = first.childName || first.child_name || childName;
  const resolvedSubject = subject || buildSubject({
    goalTitle: resolvedGoal,
  });
  const scoreButtonsHtml = buildScoreButtonsHtml({ recipientId, baseUrl });
  const fallbackCta = ctaUrl
    || (recipientId ? buildAnswerUrl(recipientId, { baseUrl }) : dashboardCtaUrl(baseUrl));
  return wrapEmail({
    subject: resolvedSubject,
    bodyInner: buildBodyHtml({
      parentName,
      childName: resolvedChild,
      goalTitle: resolvedGoal,
      itemCount: itemList.length,
    }),
    ctaUrl: fallbackCta,
    unsubscribeUrl,
    scoreButtonsHtml,
  });
}

module.exports = {
  DEFAULT_SUBJECT_TEMPLATE,
  MULTI_SUBJECT,
  CTA_PATH,
  CTA_LABEL,
  UNATTEND_FOOTER,
  ASK_LEAD,
  ASK_EMPHASIS,
  MORE_ITEMS_NOTE,
  TRUST_LINE,
  GOAL_FALLBACK,
  OUTCOME_CHOICES,
  brandName,
  ctaLabel,
  dashboardCtaUrl,
  buildSubject,
  buildOutcomeFollowupEmailHtml,
};
