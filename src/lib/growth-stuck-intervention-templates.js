'use strict';

/**
 * Stuck-family manual intervention email templates (V1).
 * Founder tone for schema_without_child_access — highest-leverage cohort.
 */

const config = require('./config');
const { escapeFirstName, escapeHtml } = require('./email-html');

const BODY_VERSION = 'v1';

const SCHEMA_CHILD_ACCESS_BODY_VERSION = 'v2';

const INTERVENTION_KEYS = Object.freeze({
  onboarding_incomplete: 'onboarding_incomplete',
  schema_without_child_access: 'schema_without_child_access',
  started_but_stalled: 'started_but_stalled',
});

function productName() {
  return config.email?.fromName || 'appen';
}

function appBaseUrl() {
  return String(process.env.APP_URL || config.email?.baseUrl || '').replace(/\/$/, '');
}

function onboardingUrl() {
  const base = appBaseUrl();
  return base ? `${base}/onboarding` : '/onboarding';
}

function childLoginUrl() {
  const base = appBaseUrl();
  return base ? `${base}/child-login` : '/child-login';
}

function dashboardUrl() {
  const base = appBaseUrl();
  return base ? `${base}/dashboard` : '/dashboard';
}

function founderFromHeader() {
  return `Pontus Burman <${config.email.from}>`;
}

function greetingName(parentName) {
  const first = escapeFirstName(parentName);
  return first || 'där';
}

function wrapFounderHtml(bodyHtml) {
  const product = escapeHtml(productName());
  return `
    <div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:540px;margin:0 auto;color:#1B2340;line-height:1.65;">
      ${bodyHtml}
      <p>Vänliga hälsningar,<br><br>
      <strong>Pontus Burman</strong><br>
      Grundare, ${product}</p>
    </div>`;
}

function founderPrimaryCta(ctaUrl, ctaLabel) {
  const safeUrl = escapeHtml(ctaUrl);
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${safeUrl}"
         style="display:inline-block;background:#F5A623;color:white;padding:14px 36px;
                border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
        ${escapeHtml(ctaLabel)}
      </a>
    </div>`;
}

function webFallbackParagraph(path, linkText) {
  const base = appBaseUrl();
  const url = base ? `${base}${path}` : path;
  return `<p style="font-size:13px;color:#5A6178;margin-top:8px;">
    Ingen app installerad?
    <a href="${escapeHtml(url)}" style="color:#5A6178;text-decoration:underline;">${escapeHtml(linkText)}</a>.
  </p>`;
}

function wrapProductHtml(bodyHtml, ctaUrl, ctaLabel) {
  const safeUrl = escapeHtml(ctaUrl);
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1B2340;">
      ${bodyHtml}
      <div style="text-align:center;margin:28px 0;">
        <a href="${safeUrl}"
           style="display:inline-block;background:#F5A623;color:white;padding:14px 36px;
                  border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
          ${escapeHtml(ctaLabel)}
        </a>
      </div>
    </div>`;
}

const TEMPLATES = Object.freeze({
  [INTERVENTION_KEYS.onboarding_incomplete]: {
    bodyVersion: BODY_VERSION,
    fromFounder: true,
    build({ parentName }) {
      const name = greetingName(parentName);
      const url = escapeHtml(onboardingUrl());
      const product = escapeHtml(productName());
      const subject = `Behöver ni hjälp att komma igång med ${productName()}?`;
      const html = wrapFounderHtml(`
        <p>Hej ${name},</p>
        <p>Jag heter Pontus och är den som byggt ${product}.</p>
        <p>Jag såg att ni registrerade er för några dagar sedan men kanske inte hunnit klart onboarding än. Vardagen med barn går fort — det förstår jag.</p>
        <p>Om ni fortfarande vill prova finns allt kvar på ert konto. Ni kan fortsätta precis där ni slutade:</p>
        <p style="margin:24px 0;">
          <a href="${url}" style="color:#F5A623;font-weight:700;text-decoration:none;">👉 ${url}</a>
        </p>
        <p>Om något var otydligt eller strulade får ni gärna svara direkt på det här mejlet — det kommer till mig.</p>
      `);
      return { subject, html, from: founderFromHeader(), ctaUrl: onboardingUrl() };
    },
  },
  [INTERVENTION_KEYS.schema_without_child_access]: {
    bodyVersion: SCHEMA_CHILD_ACCESS_BODY_VERSION,
    fromFounder: true,
    build({ parentName }) {
      const name = greetingName(parentName);
      const product = escapeHtml(productName());
      const openAppLabel = `Öppna ${productName()}`;
      const childLogin = childLoginUrl();
      const subject = 'Nästa steg tar bara någon minut — så kommer barnet igång';
      const html = wrapFounderHtml(`
        <p>Hej ${name},</p>
        <p>Jag heter Pontus och är den som byggt ${product}.</p>
        <p>Jag såg att ni redan satt upp ett schema — bra jobbat! Det som ofta återstår är att <strong>låta barnet testa appen</strong> och logga in med sitt PIN.</p>
        <p>Öppna ${product} på barnets enhet och välj <strong>Barnets inloggning</strong>. Det tar oftast bara ett par minuter tillsammans — barnet ser sitt schema och kan samla den första stjärnan när en aktivitet är klar.</p>
        ${founderPrimaryCta(childLogin, openAppLabel)}
        ${webFallbackParagraph('/child-login', 'Öppna barnets inloggning i webbläsaren')}
        <p>Behöver ni hitta PIN-koden eller QR-koden igen? Öppna ${product} på din telefon och gå till <strong>Hem</strong> i föräldravyn.</p>
        <p>Om något strular — till exempel PIN eller inloggning — svara gärna på det här mejlet så hjälper jag.</p>
      `);
      return {
        subject,
        html,
        from: founderFromHeader(),
        ctaUrl: childLogin,
        ctaLabel: openAppLabel,
      };
    },
  },
  [INTERVENTION_KEYS.started_but_stalled]: {
    bodyVersion: BODY_VERSION,
    fromFounder: true,
    build({ parentName }) {
      const name = greetingName(parentName);
      const url = escapeHtml(dashboardUrl());
      const product = escapeHtml(productName());
      const subject = `Hej ${escapeFirstName(parentName) || 'där'} — behöver ni hjälp att komma vidare?`;
      const html = wrapFounderHtml(`
        <p>Hej ${name},</p>
        <p>Jag heter Pontus och är den som byggt ${product}.</p>
        <p>Jag såg att ni kommit en bit men kanske fastnat längs vägen. Det händer ofta i en hektisk vardag — inget konstigt med det.</p>
        <p>Om ni vill fortsätta finns allt kvar på ert konto:</p>
        <p style="margin:24px 0;">
          <a href="${url}" style="color:#F5A623;font-weight:700;text-decoration:none;">👉 ${url}</a>
        </p>
        <p>Om något inte fungerade som ni förväntade er, eller om barnet inte ville använda appen, skulle jag verkligen uppskatta om ni berättade det. Ett par rader räcker.</p>
      `);
      return { subject, html, from: founderFromHeader(), ctaUrl: dashboardUrl() };
    },
  },
});

function interventionKeyForCohort(cohort) {
  switch (cohort) {
    case 'onboarding_incomplete':
      return INTERVENTION_KEYS.onboarding_incomplete;
    case 'schema_no_child_login':
      return INTERVENTION_KEYS.schema_without_child_access;
    case 'login_no_completion':
    case 'completion_no_return':
      return INTERVENTION_KEYS.started_but_stalled;
    default:
      return null;
  }
}

function buildInterventionEmail(interventionKey, context) {
  const template = TEMPLATES[interventionKey];
  if (!template) return null;
  const built = template.build(context);
  return {
    ...built,
    interventionKey,
    bodyVersion: template.bodyVersion,
    fromFounder: template.fromFounder,
  };
}

module.exports = {
  BODY_VERSION,
  INTERVENTION_KEYS,
  TEMPLATES,
  interventionKeyForCohort,
  buildInterventionEmail,
  founderFromHeader,
};
