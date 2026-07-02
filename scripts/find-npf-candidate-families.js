#!/usr/bin/env node
/**
 * EPIC 3.3 / decision D9 — read-only candidate list for manual teacch grant.
 *
 * D9 (docs/bildstod-app-plan.md §12): no fake-door CTA. Instead, `teacch`
 * is granted directly to 3–5 known families with NPF needs via the admin
 * panel (Familjer → Extra stöd → bevilja), to collect verbal feedback
 * before any purchase UI is built.
 *
 * This script only SELECTs — it makes no writes. It surfaces families
 * whose existing usage already signals professional/NPF-related support,
 * ranked so a human can pick 3–5 real candidates. It does not — and
 * cannot — decide who those families are; that's a product/business call.
 *
 * Usage (against production, via VPS SSH):
 *   node scripts/find-npf-candidate-families.js
 *
 * Signals used (all already in prod schema, no new instrumentation):
 *   - active pedagog (educator/therapist) link  → parent_child.role='pedagog'
 *   - pedagog_notes volume                       → real professional engagement
 *   - activities using seven_questions (de sju frågorna, TEACCH) → already opted into this workflow
 *   - recent daily_log_item activity             → still an active family
 *   - active today, in the family's own timezone → family.timezone (not UTC)
 *   - already has teacch                          → excluded (no point re-granting)
 */
'use strict';

const db = require('../src/lib/db');

const CANDIDATE_LIMIT = 15;
const RECENT_DAYS = 30;
const TOP_PICK_LIMIT = 5;

async function main() {
  const { rows } = await db.query(
    `
    WITH pedagog_links AS (
      SELECT DISTINCT c.family_id, c.id AS child_id
      FROM parent_child pc
      JOIN child c ON c.id = pc.child_id
      WHERE pc.role = 'pedagog'
        AND pc.revoked_at IS NULL
    ),
    pedagog_note_counts AS (
      SELECT c.family_id, COUNT(*) AS note_count, MAX(pn.date) AS last_note_date
      FROM pedagog_notes pn
      JOIN child c ON c.id = pn.child_id
      GROUP BY c.family_id
    ),
    seven_questions_usage AS (
      SELECT family_id, COUNT(*) AS seven_questions_activity_count
      FROM activity_template
      WHERE seven_questions IS NOT NULL
        AND seven_questions != '{}'::jsonb
        AND seven_questions != 'null'::jsonb
      GROUP BY family_id
    ),
    recent_activity AS (
      SELECT c.family_id, MAX(dli.completed_date) AS last_completed_date
      FROM daily_log_item dli
      JOIN daily_log dl ON dl.id = dli.daily_log_id
      JOIN child c ON c.id = dl.child_id
      GROUP BY c.family_id
    ),
    already_teacch AS (
      SELECT fs.family_id
      FROM family_subscriptions fs, jsonb_array_elements(fs.components) AS elem
      WHERE elem->>'component' = 'teacch'
        AND COALESCE(elem->>'state', 'active') IN ('active', 'archived')
    )
    SELECT
      f.id AS family_id,
      f.name AS family_name,
      f.timezone,
      (SELECT string_agg(DISTINCT p.email, ', ') FROM parent p
        JOIN parent_child pc2 ON pc2.parent_id = p.id
        JOIN child c2 ON c2.id = pc2.child_id
        WHERE c2.family_id = f.id AND pc2.role IN ('primary', 'shared') AND pc2.revoked_at IS NULL
      ) AS parent_emails,
      (SELECT string_agg(DISTINCT c3.name, ', ') FROM child c3 WHERE c3.family_id = f.id) AS child_names,
      (pl.family_id IS NOT NULL) AS has_pedagog_link,
      COALESCE(pnc.note_count, 0) AS pedagog_note_count,
      pnc.last_note_date,
      COALESCE(sq.seven_questions_activity_count, 0) AS seven_questions_activity_count,
      ra.last_completed_date,
      (ra.last_completed_date >= CURRENT_DATE - INTERVAL '${RECENT_DAYS} days') AS active_recently,
      (ra.last_completed_date = (NOW() AT TIME ZONE COALESCE(f.timezone, 'Europe/Stockholm'))::date) AS active_today
    FROM family f
    LEFT JOIN pedagog_links pl ON pl.family_id = f.id
    LEFT JOIN pedagog_note_counts pnc ON pnc.family_id = f.id
    LEFT JOIN seven_questions_usage sq ON sq.family_id = f.id
    LEFT JOIN recent_activity ra ON ra.family_id = f.id
    WHERE f.id NOT IN (SELECT family_id FROM already_teacch)
      AND (pl.family_id IS NOT NULL OR COALESCE(pnc.note_count, 0) > 0 OR COALESCE(sq.seven_questions_activity_count, 0) >= 3)
    ORDER BY
      active_today DESC,
      has_pedagog_link DESC,
      pedagog_note_count DESC,
      seven_questions_activity_count DESC,
      ra.last_completed_date DESC NULLS LAST
    LIMIT ${CANDIDATE_LIMIT}
    `
  );

  if (rows.length === 0) {
    console.log('Inga kandidatfamiljer hittades utifrån dessa signaler (pedagog-koppling / pedagoganteckningar / de-sju-frågorna-aktiviteter).');
    console.log('Överväg att sänka tröskeln (seven_questions_activity_count >= 3) eller fråga supporten om kända NPF-familjer manuellt.');
    return;
  }

  console.log(`\n${rows.length} kandidatfamiljer (rankade, ej redan beviljade teacch):\n`);
  for (const r of rows) {
    console.log('─'.repeat(70));
    console.log(`Familj:        ${r.family_name || '(namnlös)'}  [id: ${r.family_id}]${r.active_today ? '  ⭐ AKTIV IDAG' : ''}`);
    console.log(`Förälder(ar):  ${r.parent_emails || '—'}`);
    console.log(`Barn:          ${r.child_names || '—'}`);
    console.log(`Tidszon:       ${r.timezone || 'Europe/Stockholm'}`);
    console.log(`Pedagog-koppling aktiv: ${r.has_pedagog_link ? 'JA' : 'nej'}`);
    console.log(`Pedagoganteckningar:    ${r.pedagog_note_count}${r.last_note_date ? ` (senast ${r.last_note_date.toISOString?.() ?? r.last_note_date})` : ''}`);
    console.log(`"De sju frågorna"-aktiviteter: ${r.seven_questions_activity_count}`);
    console.log(`Senast aktiv:           ${r.last_completed_date ? (r.last_completed_date.toISOString?.() ?? r.last_completed_date) : 'okänt'}${r.active_recently ? '  (aktiv senaste ' + RECENT_DAYS + ' dagarna)' : '  (INTE aktiv senaste ' + RECENT_DAYS + ' dagarna — överväg att hoppa över)'}`);
  }
  console.log('─'.repeat(70));

  const activeToday = rows.filter((r) => r.active_today);
  if (activeToday.length > 0) {
    const topPicks = activeToday.slice(0, TOP_PICK_LIMIT);
    console.log(`\n${activeToday.length} av dessa är aktiva IDAG (i sin egen tidszon). Topp ${topPicks.length} förslag:\n`);
    for (const r of topPicks) {
      console.log(`  • ${r.family_name || '(namnlös)'}  [id: ${r.family_id}]  — ${r.parent_emails || '—'}`);
    }
  } else {
    console.log('\nInga kandidater har aktivitet loggad idag ännu — kör igen senare, eller använd listan ovan (senast aktiv).');
  }

  console.log('\nNästa steg: välj 3–5 av dessa (prioritera aktiva idag + pedagog-koppling),');
  console.log('gå till Admin → Familjer → [familj] → Extra stöd → Bevilja.\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fel:', err.message);
    process.exit(1);
  });
