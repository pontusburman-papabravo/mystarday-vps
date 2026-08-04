#!/usr/bin/env node
/**
 * Enable aktivitetstimer for founder QA family (Astrid) — idempotent.
 *
 * - Turns on child.activity_timers_enabled for children in the family
 * - Sets duration_seconds on routine activities where timer makes sense (only if NULL)
 *
 * Usage (prod via VPS, DATABASE_URL set):
 *   node scripts/enable-activity-timers-founder-family.js
 *   node scripts/enable-activity-timers-founder-family.js founder@example.com
 *
 * Email defaults to FOUNDER_QA_EMAIL or pontus@burman.cc (v2 allowlist).
 */
'use strict';

const db = require('../src/lib/db');

/** name ILIKE pattern → seconds (library presets) */
const ROUTINE_TIMER_PRESETS = [
  { pattern: '%tandborst%', seconds: 120 },
  { pattern: '%tänder%', seconds: 120 },
  { pattern: '%tvätt%händer%', seconds: 60 },
  { pattern: '%handtvätt%', seconds: 60 },
  { pattern: '%dusch%', seconds: 300 },
  { pattern: '%bad%', seconds: 600 },
  { pattern: '%frukost%', seconds: 600 },
  { pattern: '%lunch%', seconds: 900 },
  { pattern: '%middag%', seconds: 900 },
  { pattern: '%kvällsmat%', seconds: 600 },
  { pattern: '%mellanmål%', seconds: 300 },
  { pattern: '%påkläd%', seconds: 180 },
  { pattern: '%kläd%', seconds: 180 },
  { pattern: '%skor%', seconds: 120 },
  { pattern: '%kamma%', seconds: 120 },
  { pattern: '%hår%', seconds: 120 },
  { pattern: '%borsta%hår%', seconds: 180 },
  { pattern: '%toalett%', seconds: 180 },
  { pattern: '%natt%', seconds: 300 },
  { pattern: '%lägg%sig%', seconds: 300 },
  { pattern: '%pyjamas%', seconds: 180 },
  { pattern: '%städa%rum%', seconds: 300 },
  { pattern: '%plocka%ihop%', seconds: 180 },
];

async function main() {
  const email = (
    process.argv[2]
    || process.env.FOUNDER_QA_EMAIL
    || 'pontus@burman.cc'
  ).trim().toLowerCase();

  const fam = await db.query(
    `SELECT f.id AS family_id, f.name AS family_name
     FROM parent p
     JOIN family f ON f.id = p.family_id
     WHERE LOWER(p.email) = $1
     LIMIT 1`,
    [email]
  );

  if (!fam.rows[0]) {
    console.error(`Ingen förälder hittades med e-post "${email}".`);
    process.exit(1);
  }

  const { family_id: familyId, family_name: familyName } = fam.rows[0];
  console.log(`Familj: ${familyName || '(namnlös)'}  [${familyId}]  (${email})\n`);

  const children = await db.query(
    `UPDATE child
     SET activity_timers_enabled = true
     WHERE family_id = $1
       AND (activity_timers_enabled IS DISTINCT FROM true)
     RETURNING id, name`,
    [familyId]
  );

  const allKids = await db.query(
    `SELECT id, name, activity_timers_enabled FROM child WHERE family_id = $1 ORDER BY name`,
    [familyId]
  );

  if (children.rowCount > 0) {
    for (const row of children.rows) {
      console.log(`✓ Aktivitetstimer PÅ för barn: ${row.name} (${row.id})`);
    }
  } else {
    console.log('– activity_timers_enabled var redan på för alla barn:');
    for (const row of allKids.rows) {
      console.log(`  · ${row.name}`);
    }
  }

  let totalUpdated = 0;
  for (const preset of ROUTINE_TIMER_PRESETS) {
    const res = await db.query(
      `UPDATE activity_template
       SET duration_seconds = $3
       WHERE family_id = $1
         AND duration_seconds IS NULL
         AND name ILIKE $2
       RETURNING id, name`,
      [familyId, preset.pattern, preset.seconds]
    );
    for (const row of res.rows) {
      totalUpdated += 1;
      const mins = preset.seconds >= 60
        ? Math.floor(preset.seconds / 60) + ' min'
        : preset.seconds + ' s';
      console.log(`✓ Timer ${mins}: ${row.name}`);
    }
  }

  if (totalUpdated === 0) {
    console.log('\n– Inga nya aktiviteter fick duration_seconds (redan satta eller inga namn matchade).');
  } else {
    console.log(`\n✓ Satte timer på ${totalUpdated} aktivitet(er).`);
  }

  const subStepPresets = [
    { activityPattern: '%tandborst%', stepPattern: '%', seconds: 120 },
    { activityPattern: '%tänder%', stepPattern: '%', seconds: 120 },
    { activityPattern: '%pyjamas%', stepPattern: '%', seconds: 60 },
    { activityPattern: '%middag%', stepPattern: '%', seconds: 120 },
  ];
  let subUpdated = 0;
  for (const preset of subStepPresets) {
    const res = await db.query(
      `UPDATE activity_sub_step s
       SET duration_seconds = $4
       FROM activity_template t
       WHERE t.id = s.activity_template_id
         AND t.family_id = $1
         AND t.name ILIKE $2
         AND s.name ILIKE $3
         AND (s.duration_seconds IS NULL OR s.duration_seconds < 5)
       RETURNING s.id, s.name, t.name AS activity_name`,
      [familyId, preset.activityPattern, preset.stepPattern, preset.seconds]
    );
    for (const row of res.rows) {
      subUpdated += 1;
      console.log(`✓ Delsteg-timer ${preset.seconds}s: ${row.activity_name} → ${row.name}`);
    }
  }
  if (subUpdated > 0) {
    console.log(`\n✓ Satte timer på ${subUpdated} delsteg.`);
  } else {
    console.log('\n– Inga delsteg fick duration_seconds (redan satta eller inga matchade).');
  }

  console.log('\nKlart. Barn med activity_timers_enabled + duration_seconds ≥ 5 visar timglas.');
  console.log('v2-helskärm kräver fortfarande ACTIVITY_TIMER_V2_ALLOWLIST (founder-e-post).');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fel:', err.message);
    process.exit(1);
  });
