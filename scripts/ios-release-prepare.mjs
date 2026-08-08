#!/usr/bin/env node
/**
 * Fail-closed iOS release prepare — requires META_CLIENT_TOKEN before cap sync + verifiers.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

if (!process.env.META_CLIENT_TOKEN || !String(process.env.META_CLIENT_TOKEN).trim()) {
  console.error('\n❌ ios:release:prepare requires META_CLIENT_TOKEN (Facebook native app token).\n');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
let chain = pkg.scripts['cap:sync:ios'];
if (!chain) {
  console.error('cap:sync:ios script missing');
  process.exit(1);
}
chain = chain.replace(/\s*--skip-client-token/g, '');
if (!chain.includes('verify-meta-native-release')) {
  chain += ' && node scripts/verify-meta-native-release.mjs --ios';
} else if (!chain.includes('verify-meta-native-release.mjs --ios')) {
  chain = chain.replace(
    /node scripts\/verify-meta-native-release\.mjs(?!\s+--ios)/g,
    'node scripts/verify-meta-native-release.mjs --ios'
  );
}

execSync(chain, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } });
