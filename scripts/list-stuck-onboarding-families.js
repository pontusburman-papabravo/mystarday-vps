#!/usr/bin/env node
/**
 * List families counted as "fast i onboarding" (Start KPI / activation advisor).
 * Usage: node scripts/list-stuck-onboarding-families.js [--all]
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const db = require('../src/lib/db');
const { familyIsInternalQaSql } = require('../config/internal-qa-families');

async function main() {
  const showAll = process.argv.includes('--all');
  const qaExpr = familyIsInternalQaSql('f');

  const sql = `
SELECT f.id,
  f.name,
  f.created_at,
  (${qaExpr}) AS internal_qa,
  STRING_AGG(DISTINCT p.email, ', ' ORDER BY p.email) AS parent_emails,
  STRING_AGG(DISTINCT COALESCE(p.name, ''), ', ' ORDER BY COALESCE(p.name, '')) AS parent_names
FROM family f
JOIN parent p ON p.family_id = f.id
WHERE f.archived_at IS NULL
  AND f.created_at >= NOW() - INTERVAL '14 days'
  AND f.created_at <= NOW() - INTERVAL '48 hours'
GROUP BY f.id, f.name, f.created_at
HAVING NOT BOOL_OR(p.onboarding_completed)
ORDER BY internal_qa ASC, f.created_at DESC`;

  const { rows } = await db.query(sql);
  const product = rows.filter((r) => !r.internal_qa);
  const qa = rows.filter((r) => r.internal_qa);
  const list = showAll ? rows : product;

  console.log(`Kundfamiljer (produkt): ${product.length}`);
  console.log(`Test/automation exkluderade: ${qa.length}`);
  console.log(`Råtotalt: ${rows.length}`);
  console.log('');

  for (const r of list) {
    const days = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
    console.log(`- ${r.name || 'Namnlös'} (${days}d sedan)`);
    console.log(`  id: ${r.id}`);
    console.log(`  skapad: ${new Date(r.created_at).toISOString()}`);
    console.log(`  förälder: ${r.parent_names || '—'} <${r.parent_emails}>`);
  }

  if (!showAll && qa.length) {
    console.log('');
    console.log(`(+ ${qa.length} QA/automation — kör med --all för att lista)`);
  }

  await db.pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
