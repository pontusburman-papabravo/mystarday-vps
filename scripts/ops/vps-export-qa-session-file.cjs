#!/usr/bin/env node
'use strict';

/**
 * VPS-only: mint allowlisted QA sessions and write to a chmod 600 file (no stdout secrets).
 * Usage: node scripts/ops/vps-export-qa-session-file.cjs /tmp/qa-session.json
 */

const fs = require('fs');
const path = require('path');
const { resolveQaBrowserSessions } = require('./vps-allowlisted-qa-sessions.cjs');

const outPath = process.argv[2];
if (!outPath || !outPath.startsWith('/tmp/')) {
  console.error(JSON.stringify({ ok: false, error: 'output_must_be_under_tmp' }));
  process.exit(2);
}

const baseRaw = process.env.JOURNEY_QA_BASE_URL || process.env.SMOKE_BASE_URL;
if (!baseRaw) {
  console.error(JSON.stringify({ ok: false, error: 'base_url_missing' }));
  process.exit(2);
}
const base = String(baseRaw).replace(/\/$/, '');

(async () => {
  const sessions = await resolveQaBrowserSessions(base.replace(/\/$/, ''));
  const payload = {
    base: base.replace(/\/$/, ''),
    parent: { jar: sessions.parent.jar, csrf: sessions.parent.csrf },
    child: { jar: sessions.child.jar, csrf: sessions.child.csrf },
    qaChildId: sessions.childRow.id,
    childUsername: sessions.childRow.username,
    familyId: sessions.childRow.family_id,
    meta: sessions.meta,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload), { mode: 0o600 });
  console.log(JSON.stringify({ ok: true, path: outPath, meta: sessions.meta }));
  await sessions.cleanup();
})().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message, code: e.code || 'ERROR' }));
  process.exit(1);
});
