#!/usr/bin/env node
'use strict';

/**
 * Send För dig outcome follow-up emails (§19.6).
 *
 * Default: dry-run (prints only). Pass --send to actually send via Resend.
 * Test only:  node scripts/send-for-dig-followup-emails.js --to=pontus@burman.cc --send
 *
 * Prerequisites: npm run seed-for-dig-followup (or node scripts/seed-for-dig-followup-surveys.js)
 */

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();
const config = require('../src/lib/config');
const { sendEmail } = require('../src/lib/email');
const { buildFollowupEmails, buildEmailBody } = require('../src/lib/for-dig-followup-campaign');

function parseArgs(argv) {
  const opts = { send: false, to: null, key: null };
  for (const arg of argv) {
    if (arg === '--send') opts.send = true;
    else if (arg.startsWith('--to=')) opts.to = arg.slice(5);
    else if (arg.startsWith('--key=')) opts.key = arg.slice(6);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const baseUrl = (config.email.baseUrl || process.env.APP_URL || '').replace(/\/$/, '');
  if (!baseUrl) {
    console.error('APP_URL saknas — kan inte bygga enkätlänkar.');
    process.exit(1);
  }

  let rows = buildFollowupEmails().filter((r) => r.send);
  if (opts.key) rows = rows.filter((r) => r.key === opts.key);
  if (opts.to) rows = rows.filter((r) => r.to === opts.to);

  if (rows.length === 0) {
    console.error('Inga mejl att skicka (kolla --key / --to / send-flaggor).');
    process.exit(1);
  }

  console.log(opts.send ? 'LIVE SEND' : 'DRY RUN (lägg till --send för att skicka)');
  console.log(`Från: ${config.email.fromName} <${config.email.from}>\n`);

  for (const row of rows) {
    const surveyUrl = `${baseUrl}/tyck/${row.surveySlug}`;
    const body = buildEmailBody({
      greeting: row.greeting,
      body: row.body,
      surveyUrl,
    });

    console.log('─'.repeat(60));
    console.log(`Till: ${row.to}`);
    console.log(`Ämne: ${row.subject}`);
    console.log(`Enkät: ${surveyUrl}`);
    console.log('─'.repeat(60));
    console.log(body);
    console.log('');

    if (opts.send) {
      const result = await sendEmail({
        to: row.to,
        subject: row.subject,
        body,
        tags: [{ name: 'campaign', value: 'for_dig_outcome_followup' }],
      });
      console.log(`  → ${result.success ? 'OK' : 'MISSLYCKADES'}: ${result.error || result.provider || 'sent'}\n`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
