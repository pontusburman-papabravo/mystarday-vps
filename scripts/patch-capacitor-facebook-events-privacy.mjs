#!/usr/bin/env node
/**
 * Apply privacy-safe Meta App Events patches to capacitor-facebook-events.
 * Run after npm install / before cap sync. Idempotent copy from scripts/{ios,android}/*.patched.
 *
 * Policy: AutoLog + activateApp + advertiser ID off until configureConsent(marketingConsent=true).
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const pluginRoot = path.join(root, 'node_modules', 'capacitor-facebook-events');

const copies = [
  {
    from: path.join(root, 'scripts/ios/FacebookEvents.swift.patched'),
    to: path.join(pluginRoot, 'ios/Plugin/FacebookEvents.swift'),
  },
  {
    from: path.join(root, 'scripts/ios/FacebookEventsPlugin.swift.patched'),
    to: path.join(pluginRoot, 'ios/Plugin/FacebookEventsPlugin.swift'),
  },
  {
    from: path.join(root, 'scripts/ios/FacebookEventsPlugin.m.patched'),
    to: path.join(pluginRoot, 'ios/Plugin/FacebookEventsPlugin.m'),
  },
  {
    from: path.join(root, 'scripts/android/FacebookEventsPlugin.java.patched'),
    to: path.join(
      pluginRoot,
      'android/src/main/java/com/dabchy/plugins/facebookevents/FacebookEventsPlugin.java'
    ),
  },
  {
    from: path.join(root, 'scripts/android/FacebookEvents.java.patched'),
    to: path.join(
      pluginRoot,
      'android/src/main/java/com/dabchy/plugins/facebookevents/FacebookEvents.java'
    ),
  },
];

if (!fs.existsSync(pluginRoot)) {
  console.warn('[patch-capacitor-facebook-events-privacy] plugin not installed — skip');
  process.exit(0);
}

let changed = 0;
for (const { from, to } of copies) {
  if (!fs.existsSync(from)) {
    console.error('Missing patch source:', from);
    process.exit(1);
  }
  if (!fs.existsSync(path.dirname(to))) {
    console.warn('Missing target dir, skip:', to);
    continue;
  }
  const next = fs.readFileSync(from, 'utf8');
  const prev = fs.existsSync(to) ? fs.readFileSync(to, 'utf8') : '';
  if (prev !== next) {
    fs.writeFileSync(to, next);
    changed += 1;
    console.log('Patched', path.relative(root, to));
  } else {
    console.log('Already patched', path.relative(root, to));
  }
}

// Keep web definitions documenting configureConsent (JS uses Capacitor.Plugins).
const defsPath = path.join(pluginRoot, 'dist/esm/definitions.d.ts');
if (fs.existsSync(defsPath)) {
  let defs = fs.readFileSync(defsPath, 'utf8');
  if (!defs.includes('configureConsent')) {
    defs = defs.replace(
      'logEvent(options: {\n        event: string;\n        params?: any;\n    }): Promise<void>;\n}',
      `logEvent(options: {
        event: string;
        params?: any;
    }): Promise<void>;
    configureConsent(options: {
        marketingConsent: boolean;
        advertiserTrackingAllowed?: boolean;
    }): Promise<void>;
}`
    );
    fs.writeFileSync(defsPath, defs);
    console.log('Patched definitions.d.ts with configureConsent');
    changed += 1;
  }
}

console.log(`[patch-capacitor-facebook-events-privacy] done (${changed} file(s) updated)`);
