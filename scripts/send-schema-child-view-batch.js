#!/usr/bin/env node
/**
 * Founder batch — parent-ran routine, no child login, no prior handoff copy.
 * Does not turn on growth_stuck_cohorts_v1. No scheduler.
 *
 *   node scripts/send-schema-child-view-batch.js
 *   node scripts/send-schema-child-view-batch.js --execute
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const db = require('../src/lib/db');
const { excludeInternalQaWhere } = require('../config/internal-qa-families');
const { sendStuckIntervention, evaluateStuckIntervention } = require('../src/lib/growth-stuck-intervention');

const QA = excludeInternalQaWhere('f');
const EXECUTE = process.argv.includes('--execute');
const BLOCKED_EMAIL_SUFFIXES = [
  '@peng.se',
  '@test.stjarndag.local',
  '@example.com',
  '@example.org',
  '@example.net',
  '@test.com',
];

function isBlockedEmail(email) {
  const normalized = String(email || '').toLowerCase().trim();
  return BLOCKED_EMAIL_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

async function listEligibleFamilies() {
  const { rows } = await db.query(
    `WITH eligible AS (
       SELECT
         f.id AS family_id,
         f.created_at,
         s.first_completion_at
       FROM family f
       JOIN family_activation_state s ON s.family_id = f.id
       JOIN parent p ON p.family_id = f.id
       WHERE f.archived_at IS NULL
         AND f.created_at >= NOW() - INTERVAL '14 days'
         AND f.created_at <= NOW() - INTERVAL '48 hours'
         AND ${QA}
         AND s.schema_saved_at IS NOT NULL
         AND s.child_access_completed_at IS NULL
         AND s.first_completion_at IS NOT NULL
         AND s.child_handoff_reminder_sent_at IS NULL
       GROUP BY f.id, f.created_at, s.first_completion_at
       HAVING BOOL_OR(p.onboarding_completed)
     )
     SELECT family_id, created_at, first_completion_at
     FROM eligible
     ORDER BY created_at ASC, family_id ASC`
  );
  return rows;
}

async function main() {
  const families = await listEligibleFamilies();
  const results = [];

  for (const family of families) {
    const evaluated = await evaluateStuckIntervention(family.family_id, { skipGate: true });
    const recipient = evaluated.recipientEmail || null;
    if (recipient && isBlockedEmail(recipient)) {
      results.push({
        familyId: family.family_id,
        ok: false,
        skipped: 'blocked_test_email',
        email: recipient,
      });
      continue;
    }
    if (!EXECUTE) {
      results.push({
        familyId: family.family_id,
        ok: evaluated.eligible,
        dryRun: true,
        email: recipient,
        subject: evaluated.emailPreview?.subject || null,
        blockers: evaluated.blockers || [],
      });
      continue;
    }
    const result = await sendStuckIntervention(family.family_id, null, { skipGate: true });
    if (!result.ok) {
      results.push({
        familyId: family.family_id,
        ok: false,
        email: recipient,
        blockers: result.blockers || [],
      });
      continue;
    }
    results.push({
      familyId: family.family_id,
      ok: true,
      email: recipient,
      interventionId: result.interventionId,
      sentAt: result.sentAt,
      subject: result.subject,
    });
  }

  const sent = results.filter((r) => r.ok && !r.dryRun).length;
  const skipped = results.filter((r) => !r.ok || r.skipped).length;
  console.log(JSON.stringify({
    execute: EXECUTE,
    considered: families.length,
    sent,
    skipped,
    results,
  }, null, 2));

  await db.pool.end();
  if (EXECUTE && sent === 0) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
