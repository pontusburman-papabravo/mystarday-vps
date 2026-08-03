#!/usr/bin/env node
/**
 * Verify DATABASE_URL is available for deploy ops (loads app .env when needed).
 * Prints sanitized identity only — never the connection string.
 */
import { resolveDeployDatabaseUrl, redactDeploySecrets } from './lib/deploy-database-url.mjs';

function parseArgs(argv) {
  const out = { verifyOnly: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--verify-only') out.verifyOnly = true;
  }
  return out;
}

function main() {
  parseArgs(process.argv);
  try {
    const { identity, source } = resolveDeployDatabaseUrl();
    console.error(
      `[deploy-db] OK identity_hash=${identity.identity_hash} host=${identity.host} database=${identity.database} source=${source === 'process_env' ? 'process_env' : 'env_file'}`
    );
  } catch (err) {
    console.error(`[deploy-db] ${err.code || err.message}`);
    process.exit(1);
  }
}

main();
