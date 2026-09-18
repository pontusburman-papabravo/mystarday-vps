#!/usr/bin/env node
'use strict';

/**
 * Cursor / ops helper: validate a Meta Ads brief and optionally insert it as a draft.
 *
 *   node scripts/meta-ads-propose.js path/to/brief.json
 *   node scripts/meta-ads-propose.js path/to/brief.json --submit
 *
 * Never publishes to Meta. Admin must approve in /admin#meta-annonser.
 */

const fs = require('fs');
const path = require('path');
const { parseCampaignBrief } = require('../src/lib/meta-ads');

function usage() {
  console.error('Usage: node scripts/meta-ads-propose.js <brief.json> [--submit]');
  process.exit(2);
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((arg) => !arg.startsWith('--'));
  if (!fileArg) usage();
  const abs = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(abs)) {
    console.error('File not found:', abs);
    process.exit(1);
  }
  const raw = abs.endsWith('.js') ? require(abs) : JSON.parse(fs.readFileSync(abs, 'utf8'));
  const brief = parseCampaignBrief({ ...raw, created_source: 'cursor' });
  const preview = {
    kind: brief.kind,
    slug: brief.slug,
    name: brief.name,
    daily_budget_sek: brief.daily_budget_sek,
    destination_url: brief.destination_url,
    source_post_id: brief.source_post_id,
    headline: brief.headline,
    hypothesis: brief.hypothesis,
    primary_metric: brief.primary_metric,
  };
  console.log(JSON.stringify({ ok: true, brief: preview }, null, 2));

  if (!args.includes('--submit')) {
    console.log('\nUtkast validerat. Godkänn i admin efter import, eller kör med --submit mot DATABASE_URL.');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('--submit kräver DATABASE_URL');
    process.exit(1);
  }

  const db = require('../src/lib/db');
  const campaigns = require('../db/meta-ad-campaigns');
  try {
    const row = await campaigns.insertCampaign(brief, { actorId: null, actorSource: 'cursor' });
    await campaigns.submitForApproval(row.id, null);
    const saved = await campaigns.getById(row.id);
    console.log(JSON.stringify({
      inserted: true,
      id: saved.id,
      status: saved.status,
      admin_hash: '#meta-annonser',
    }, null, 2));
  } finally {
    await db.pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.violations) {
    for (const violation of err.violations) console.error('-', violation.message);
  }
  process.exit(1);
});
