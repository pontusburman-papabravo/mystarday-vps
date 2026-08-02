#!/usr/bin/env node
/**
 * Founder outreach to families stuck in onboarding (2–14d, ej klar).
 *
 *   node scripts/list-stuck-onboarding-families.js
 *   node scripts/send-stuck-onboarding-founder-email.js --dry-run
 *   node scripts/send-stuck-onboarding-founder-email.js --send
 *
 * Requires prod env (RESEND_API_KEY, DATABASE_URL). From: Pontus Burman + EMAIL_FROM.
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const db = require('../src/lib/db');
const { sendEmail } = require('../src/lib/email');
const { escapeFirstName, escapeHtml } = require('../src/lib/email-html');
const { familyIsInternalQaSql } = require('../config/internal-qa-families');
const config = require('../src/lib/config');
const { LEGACY_GENERIC_PARENT_ROLE_SQL } = require('../src/lib/family-role-legacy');

const CAMPAIGN_TAG = 'stuck_onboarding_founder';

function fromHeader() {
  return `Pontus Burman <${config.email.from}>`;
}

function productName() {
  return config.email.fromName || 'appen';
}

function subjectLine() {
  return `Hur gick det med ${productName()}?`;
}

function onboardingUrl() {
  const base = String(process.env.APP_URL || config.email?.baseUrl || '').replace(/\/$/, '');
  return base ? `${base}/onboarding` : '/onboarding';
}

function greetingName(parentName) {
  const first = escapeFirstName(parentName);
  return first || 'där';
}

function buildPlainText(parentName) {
  const name = String(parentName || '').trim().split(/\s+/)[0] || 'där';
  const url = onboardingUrl();
  const product = productName();
  const lines = [
    `Hej ${name},`,
    '',
    `Jag heter Pontus och är den som byggt ${product}.`,
    '',
    'Jag ville bara höra hur det gick. Jag såg att ni registrerade er för några dagar sedan, men jag vet också att vardagen lätt kommer emellan när man har barn.',
    '',
    `Om det var något som inte fungerade, var otydligt eller gjorde att ni gav upp, skulle jag verkligen uppskatta om ni berättade det. Jag försöker göra ${product} så enkel och hjälpsam som möjligt, och all feedback hjälper mig att förbättra appen.`,
    '',
    'Om ni fortfarande vill prova finns allt kvar på ert konto. Ni kan fortsätta precis där ni slutade.',
    '',
    `👉 ${url}`,
    '',
    'Har ni istället kommit fram till att appen inte passar er får ni också gärna berätta varför. Ett par rader räcker och hjälper mig att göra den bättre för nästa familj.',
    '',
    'Ni svarar bara direkt på det här mejlet så kommer det till mig.',
    '',
    `Tack för att ni gav ${product} en chans.`,
    '',
    'Vänliga hälsningar,',
    '',
    'Pontus Burman',
    `Grundare, ${product}`,
  ];
  return lines.join('\n');
}

function buildHtml(parentName) {
  const name = greetingName(parentName);
  const safeUrl = escapeHtml(onboardingUrl());
  const product = escapeHtml(productName());
  return `
    <div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:540px;margin:0 auto;color:#1B2340;line-height:1.65;">
      <p>Hej ${name},</p>
      <p>Jag heter Pontus och är den som byggt ${product}.</p>
      <p>Jag ville bara höra hur det gick. Jag såg att ni registrerade er för några dagar sedan, men jag vet också att vardagen lätt kommer emellan när man har barn.</p>
      <p>Om det var något som inte fungerade, var otydligt eller gjorde att ni gav upp, skulle jag verkligen uppskatta om ni berättade det. Jag försöker göra ${product} så enkel och hjälpsam som möjligt, och all feedback hjälper mig att förbättra appen.</p>
      <p>Om ni fortfarande vill prova finns allt kvar på ert konto. Ni kan fortsätta precis där ni slutade.</p>
      <p style="margin:24px 0;">
        <a href="${safeUrl}" style="color:#F5A623;font-weight:700;text-decoration:none;">👉 ${safeUrl}</a>
      </p>
      <p>Har ni istället kommit fram till att appen inte passar er får ni också gärna berätta varför. Ett par rader räcker och hjälper mig att göra den bättre för nästa familj.</p>
      <p>Ni svarar bara direkt på det här mejlet så kommer det till mig.</p>
      <p>Tack för att ni gav ${product} en chans.</p>
      <p>Vänliga hälsningar,<br><br>
      <strong>Pontus Burman</strong><br>
      Grundare, ${product}</p>
    </div>`;
}

async function fetchRecipients() {
  const qaExpr = familyIsInternalQaSql('f');
  const sql = `
    SELECT DISTINCT ON (f.id)
      f.id AS family_id,
      f.name AS family_name,
      p.email,
      p.name AS parent_name
    FROM family f
    JOIN parent p ON p.family_id = f.id AND ${LEGACY_GENERIC_PARENT_ROLE_SQL}
    WHERE f.archived_at IS NULL
      AND f.created_at >= NOW() - INTERVAL '14 days'
      AND f.created_at <= NOW() - INTERVAL '48 hours'
      AND (${qaExpr}) = false
      AND p.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM parent p2
        WHERE p2.family_id = f.id AND p2.onboarding_completed = true
      )
    ORDER BY f.id, p.created_at ASC NULLS LAST`;

  const { rows } = await db.query(sql);
  return rows;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const send = process.argv.includes('--send');
  if (!dryRun && !send) {
    console.error('Usage: --dry-run | --send');
    process.exit(1);
  }

  const recipients = await fetchRecipients();
  console.log(`Mottagare (kundfamiljer): ${recipients.length}`);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of recipients) {
    const label = `${row.family_name} <${row.email}>`;
    if (dryRun) {
      console.log(`[dry-run] ${label}`);
      continue;
    }

    const result = await sendEmail({
      from: fromHeader(),
      to: row.email,
      subject: subjectLine(),
      body: buildPlainText(row.parent_name),
      html: buildHtml(row.parent_name),
      tags: [{ name: 'campaign', value: CAMPAIGN_TAG }],
    });

    if (result.provider === 'suppressed_test_mailbox') {
      console.log(`[skip] ${label} (test mailbox)`);
      skipped += 1;
    } else if (result.success) {
      console.log(`[sent] ${label}`);
      sent += 1;
    } else {
      console.error(`[fail] ${label}: ${result.error || 'unknown'}`);
      failed += 1;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  if (send) {
    console.log(`\nKlart: sent=${sent} failed=${failed} skipped=${skipped}`);
  }

  await db.pool.end();
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
