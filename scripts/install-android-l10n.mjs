#!/usr/bin/env node
/**
 * Copy tracked Android l10n templates into the generated Capacitor project.
 * Run after `npx cap sync android`.
 *
 * Replaces cloud-agent [REDACTED] placeholders with the real launcher name
 * (Swedish default, My Starday for en-*) so Play Billing / search never ship
 * the placeholder string.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { patchAndroidResStrings } from './lib/native-brand-name.mjs';

export function installAndroidL10n(root = process.cwd()) {
  const src = path.join(root, 'scripts/android/l10n/res');
  const dest = path.join(root, 'android/app/src/main/res');

  if (!fs.existsSync(path.join(root, 'android/app'))) {
    console.error('[install-android-l10n] Android project missing. Run: npm run cap:sync:android');
    process.exit(1);
  }

  copyDir(src, dest);
  const patched = patchAndroidResStrings(dest);
  console.log(
    `[install-android-l10n] Copied l10n resources and patched ${patched.length} strings.xml with real brand names`
  );
  return patched;
}

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

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  installAndroidL10n();
}
