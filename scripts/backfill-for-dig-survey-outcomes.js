#!/usr/bin/env node
'use strict';

/**
 * Backfill for_dig_goal_feedback outcomes from submitted /tyck/utfall-* responses.
 *
 * Usage:
 *   node scripts/backfill-for-dig-survey-outcomes.js
 *   node scripts/backfill-for-dig-survey-outcomes.js --ref=pontus
 *   node scripts/backfill-for-dig-survey-outcomes.js --response-id=<uuid> --ref=pontus
 */

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();
const db = require('../src/lib/db');
const { syncSurveyResponseToForDigOutcomes } = require('../src/lib/for-dig-survey-outcome-runner');

function parseArgs(argv) {
  const opts = { ref: null, responseId: null };
  for (const arg of argv) {
    if (arg.startsWith('--ref=')) opts.ref = arg.slice(6);
    else if (arg.startsWith('--response-id=')) opts.responseId = arg.slice(14);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  let rows;
  if (opts.responseId) {
    rows = [{ id: opts.responseId }];
  } else {
    const result = await db.query(
      `SELECT sr.id, s.slug, sr.submitted_at, sr.campaign_ref
       FROM survey_responses sr
       JOIN surveys s ON s.id = sr.survey_id
       WHERE sr.status = 'submitted'
         AND (s.slug LIKE 'utfall-%' OR s.target_tag = 'För dig uppföljning')
       ORDER BY sr.submitted_at ASC`
    );
    rows = result.rows;
  }

  if (rows.length === 0) {
    console.log('Inga enkätsvar att synka.');
    return;
  }

  for (const row of rows) {
    const syncResult = await syncSurveyResponseToForDigOutcomes({
      responseId: row.id,
      campaignRef: opts.ref || row.campaign_ref || null,
    });
    console.log(row.id, syncResult);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
