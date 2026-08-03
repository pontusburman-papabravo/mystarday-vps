#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureDbIntegritySnapshot } from './lib/db-integrity-snapshot-core.mjs';
import { resolveDeployDatabaseUrl, redactDeploySecrets } from './lib/deploy-database-url.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { out: null, label: null, deploySha: process.env.DEPLOY_SHA || null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--out') out.out = argv[++i];
    else if (argv[i] === '--label') out.label = argv[++i];
    else if (argv[i] === '--deploy-sha') out.deploySha = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  let databaseUrl;
  try {
    ({ databaseUrl } = resolveDeployDatabaseUrl());
  } catch (err) {
    console.error(`[db-snapshot] ${err.code || err.message}`);
    process.exit(1);
  }
  const snapshot = await captureDbIntegritySnapshot(databaseUrl, {
    label: args.label || 'manual',
    deploySha: args.deploySha,
  });
  const json = JSON.stringify(snapshot, null, 2);
  if (args.out) {
    const dir = path.dirname(path.resolve(args.out));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(args.out, json, { mode: 0o600 });
    console.error(`[db-snapshot] wrote ${args.out}`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

main().catch((err) => {
  console.error(`[db-snapshot] ${redactDeploySecrets(err.message)}`);
  process.exit(1);
});
