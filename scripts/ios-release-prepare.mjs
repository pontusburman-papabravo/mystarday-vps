#!/usr/bin/env node
/**
 * Fail-closed iOS release prepare — cap sync + verifiers (no META_CLIENT_TOKEN on iOS 1.4).
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const iosPodfile = path.join(ROOT, 'ios', 'App', 'Podfile');
if (!fs.existsSync(iosPodfile)) {
  console.error('\n❌ ios:release:prepare requires the committed Capacitor iOS project at ios/App/.\n');
  console.error('   Capacitor error "ios platform has not been added yet" means ios/ was deleted or missing.');
  console.error('   Restore from git (do NOT run `npx cap add ios` on release checkouts — use the repo tree):\n');
  console.error('     git restore ios\n');
  console.error('   To reset only generated CocoaPods artifacts (keep ios/):\n');
  console.error('     rm -rf ios/App/Pods ios/App/Podfile.lock\n');
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
