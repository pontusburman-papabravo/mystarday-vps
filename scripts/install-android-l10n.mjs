#!/usr/bin/env node
/**
 * Copy tracked Android l10n templates into the generated Capacitor project.
 * Run after `npx cap sync android`.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'scripts/android/l10n/res');
const DEST = path.join(ROOT, 'android/app/src/main/res');

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

if (!fs.existsSync(path.join(ROOT, 'android/app'))) {
  console.error('[install-android-l10n] Android project missing. Run: npm run cap:sync:android');
  process.exit(1);
}

copyDir(SRC, DEST);
console.log('[install-android-l10n] Copied l10n resources to android/app/src/main/res');
