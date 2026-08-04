#!/usr/bin/env node
/**
 * Idempotent: QA timer-test activities for founder child (Astrid) — today only.
 *
 * Creates/updates activity_template rows with distinct durations and appends them
 * to today's daily_log (incomplete) so the child sees timers immediately.
 *
 * Usage:
 *   node scripts/seed-founder-timer-qa-today.js
 *   node scripts/seed-founder-timer-qa-today.js --child-name Astrid
 */
'use strict';

const db = require('../src/lib/db');
const { getOrGenerateDailyLog, getLocalDateStr } = require('../src/lib/daily-log-generator');

const QA_PREFIX = '⏳ QA Timer ';
const QA_ACTIVITIES = [
  { label: '30 s', seconds: 30, section: 'dag', icon: '⏱️' },
  { label: '1 min', seconds: 60, section: 'dag', icon: '⏱️' },
  { label: '2 min', seconds: 120, section: 'dag', icon: '⏱️' },
  { label: '3 min', seconds: 180, section: 'dag', icon: '⏱️' },
  { label: '5 min', seconds: 300, section: 'dag', icon: '⏱️' },
];

function parseArgs() {
  let childName = 'Astrid';
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--child-name' && process.argv[i + 1]) {
      childName = process.argv[++i];
    }
  }
  return { childName };
}

async function main() {
  const { childName } = parseArgs();
  const email = (process.env.FOUNDER_QA_EMAIL || 'pontus@burman.cc').trim().toLowerCase();

  const fam = await db.query(
    `SELECT f.id AS family_id FROM parent p
     JOIN family f ON f.id = p.family_id
     WHERE LOWER(p.email) = $1 LIMIT 1`,
    [email]
  );
  if (!fam.rows[0]) {
    console.error('Ingen founder-familj för', email);
    process.exit(1);
  }
  const familyId = fam.rows[0].family_id;

  const childRes = await db.query(
    `SELECT id, name, timezone, activity_timers_enabled FROM child
     WHERE family_id = $1 AND name ILIKE $2 LIMIT 1`,
    [familyId, childName]
  );
  if (!childRes.rows[0]) {
    console.error(`Barn "${childName}" hittades inte i familjen.`);
    process.exit(1);
  }
  const child = childRes.rows[0];
  if (child.activity_timers_enabled !== true) {
    await db.query('UPDATE child SET activity_timers_enabled = true WHERE id = $1', [child.id]);
    console.log('✓ activity_timers_enabled på för', child.name);
  }

  const tz = child.timezone || 'Europe/Stockholm';
  const dateStr = getLocalDateStr(new Date(), tz);
  const { log, items } = await getOrGenerateDailyLog(child.id, dateStr);
  const logId = log.id;

  let added = 0;
  let updated = 0;

  for (const qa of QA_ACTIVITIES) {
    const fullName = QA_PREFIX + qa.label;
    let tpl = await db.query(
      `SELECT id, duration_seconds FROM activity_template
       WHERE family_id = $1 AND name = $2 LIMIT 1`,
      [familyId, fullName]
    );

    if (!tpl.rows[0]) {
      const ins = await db.query(
        `INSERT INTO activity_template (
           family_id, name, icon, star_value, time_group, sort_order, duration_seconds, source
         ) VALUES ($1, $2, $3, 1, 'morgon', 9999, $4, 'user')
         RETURNING id`,
        [familyId, fullName, qa.icon, qa.seconds]
      );
      tpl = { rows: [{ id: ins.rows[0].id, duration_seconds: qa.seconds }] };
      console.log('✓ Skapade aktivitet:', fullName, qa.seconds + 's');
    } else if (tpl.rows[0].duration_seconds !== qa.seconds) {
      await db.query(
        'UPDATE activity_template SET duration_seconds = $2 WHERE id = $1',
        [tpl.rows[0].id, qa.seconds]
      );
      updated += 1;
    }

    const templateId = tpl.rows[0].id;
    const onLog = items.find((i) => i.activity_template_id === templateId);

    if (!onLog) {
      const maxSort = await db.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
         FROM daily_log_item WHERE daily_log_id = $1 AND section = $2`,
        [logId, qa.section]
      );
      const ins = await db.query(
        `INSERT INTO daily_log_item (
           daily_log_id, activity_template_id, name, icon, star_value, sort_order, section, completed
         ) VALUES ($1, $2, $3, $4, 1, $5, $6, false)
         RETURNING id`,
        [logId, templateId, fullName, qa.icon, maxSort.rows[0].next_order, qa.section]
      );
      if (ins.rowCount > 0) {
        added += 1;
        console.log('✓ Idag', dateStr, '—', fullName, `(${qa.section}, ${qa.seconds}s)`);
      }
    } else if (!onLog.completed) {
      console.log('– Redan på dagens schema:', fullName);
    }
  }

  console.log(`\nKlart för ${child.name} ${dateStr}. Nya rader: ${added}, duration uppdaterade: ${updated}.`);
  console.log('Ladda om barnvy (ev. hård refresh / stäng PWA).');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
