#!/usr/bin/env node
/** Gate 0: fail if forbidden platform checks exist outside platform.js */
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOW = ['public/js/platform.js', 'public/js/push-manager.js'];

function rg(pattern) {
  try {
    const out = execSync(
      `rg -n "${pattern}" public/js public/*.html 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const checks = [
  { name: 'Capacitor.isNativePlatform in views', pattern: 'Capacitor\\.isNativePlatform' },
  { name: 'window.Capacitor in views', pattern: 'window\\.Capacitor' },
];

let fail = 0;
for (const { name, pattern } of checks) {
  const hits = rg(pattern).filter((line) => {
    const file = line.split(':')[0];
    return !ALLOW.some((a) => file.endsWith(a.replace('public/', '')) || line.includes(a));
  });
  if (hits.length) {
    console.error(`FAIL: ${name}`);
    hits.slice(0, 20).forEach((h) => console.error(' ', h));
    if (hits.length > 20) console.error(`  ... +${hits.length - 20} more`);
    fail++;
  } else {
    console.log(`OK: ${name}`);
  }
}

const ua = rg('userAgent.*(Android|iPhone|iPad)').filter(
  (l) => !l.includes('platform.js')
);
if (ua.length) {
  console.error('FAIL: userAgent platform branches outside platform.js');
  ua.slice(0, 15).forEach((h) => console.error(' ', h));
  fail++;
} else {
  console.log('OK: no userAgent platform branches in views');
}

process.exit(fail ? 1 : 0);
