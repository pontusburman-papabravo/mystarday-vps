#!/usr/bin/env node
/**
 * Generate/sync today's daily_log from weekly_schedule for a family (post-import).
 *
 * Usage:
 *   npm run sync:daily-logs -- --family-id 5fa79406-...
 *   npm run sync:daily-logs -- --family-id ... --date 2026-06-04
 */

const { Pool } = require('pg');
const { getOrGenerateDailyLog, getLocalDateStr } = require('../src/lib/daily-log-generator');

function parseArgs(argv) {
  const opts = { familyId: null, date: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--date' && argv[i + 1]) opts.date = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Sync daily_log from weekly_schedule for each child in a family.

Options:
  --family-id <uuid>   Required
  --date YYYY-MM-DD    Target date (default: each child's local today)
`);
      process.exit(0);
    }
  }
  if (!opts.familyId) {
    console.error('ERROR: --family-id is required');
    process.exit(1);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    const { rows: children } = await pool.query(
      'SELECT id, name, timezone FROM child WHERE family_id = $1 ORDER BY sort_order, created_at',
      [opts.familyId]
    );
    if (!children.length) {
      console.error('Inga barn hittades för familjen');
      process.exit(1);
    }

    console.log(`Synkar daily_log för ${children.length} barn ...\n`);

    for (const child of children) {
      const tz = child.timezone || 'Europe/Stockholm';
      const dateStr = opts.date || getLocalDateStr(new Date(), tz);
      try {
        const { items, generated } = await getOrGenerateDailyLog(child.id, dateStr);
        console.log(
          `  ${child.name}: ${dateStr} → ${items.length} aktivitet(er)${generated ? ' (genererad)' : ''}`
        );
      } catch (err) {
        console.log(`  ${child.name}: FEL — ${err.message}`);
      }
    }

    console.log('\nKlart. Ladda om dashboard.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
