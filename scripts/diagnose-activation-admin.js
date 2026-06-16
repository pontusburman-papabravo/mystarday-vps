#!/usr/bin/env node
/**
 * Diagnose Föräldraaktivering admin API failures on VPS.
 * Usage: cd $VPS_APP_PATH && node scripts/diagnose-activation-admin.js
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
const { getActivationProgramLaunchAt } = require('../src/lib/activation-program-enroll');
loadEnvFile();

const { DateTime } = require('luxon');
const db = require('../src/lib/db');
const {
  buildActivationFunnel,
  buildActivationRetentionReport,
} = require('../src/lib/activation-program-cohort-analytics');

function envStatus(key) {
  const v = process.env[key];
  if (v === undefined) return '(unset)';
  if (v === '') return '(empty string)';
  return `(set, ${v.length} chars)`;
}

async function tableExists(name) {
  const result = await db.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS ok`,
    [name]
  );
  return result.rows[0]?.ok === true;
}

async function main() {
  console.log('=== Activation admin diagnose ===');
  console.log('ACTIVATION_PROGRAM_LAUNCH_AT:', envStatus('ACTIVATION_PROGRAM_LAUNCH_AT'));
  console.log('ACTIVATION_PROGRAM_ENABLED:', envStatus('ACTIVATION_PROGRAM_ENABLED'));

  const launchAt = getActivationProgramLaunchAt();
  const tables = [
    'parent_activation_program',
    'login_event',
    'analytics_events',
    'daily_log_item',
    'daily_log',
    'child',
  ];

  for (const table of tables) {
    const ok = await tableExists(table);
    console.log(`table ${table}:`, ok ? 'OK' : 'MISSING');
  }

  if (launchAt) {
    const cohort = await db.query(
      `SELECT COUNT(*)::int AS n
       FROM parent_activation_program
       WHERE program_type = 'onboarding_7d'
         AND created_at >= $1::timestamptz
         AND cohort_arm IN ('treatment', 'control')`,
      [launchAt]
    );
    console.log('cohort programs (post-launch):', cohort.rows[0]?.n ?? 0);
  }

  const now = DateTime.now();
  try {
    const retention = await buildActivationRetentionReport({ windowDays: 14, launchAt, now });
    console.log('buildActivationRetentionReport: OK', {
      launchAt: retention.launchAt ? 'set' : 'null',
      cohortSize: retention.cohortSize,
    });
  } catch (err) {
    console.error('buildActivationRetentionReport: FAIL', err.message);
    process.exitCode = 1;
  }

  try {
    const funnel = await buildActivationFunnel({ windowDays: 14, launchAt, now });
    console.log('buildActivationFunnel: OK', {
      launchAt: funnel.launchAt ? 'set' : 'null',
      enrolled: funnel.enrolled,
    });
  } catch (err) {
    console.error('buildActivationFunnel: FAIL', err.message);
    process.exitCode = 1;
  }

  await db.pool.end();
}

main().catch((err) => {
  console.error('diagnose failed:', err.message);
  process.exit(1);
});
