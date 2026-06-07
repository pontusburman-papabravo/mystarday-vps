#!/usr/bin/env node
/**
 * Run all previously-skipped QA category scripts.
 */
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, FORCE_COLOR: '0' };

const steps = [
  ['qa:email', 'E-postflöden'],
  ['qa:admin', 'Admin API'],
  ['qa:browser', 'Browser/PWA/UX'],
  ['qa:destructive', 'Destruktiva tester'],
];

for (const [script, label] of steps) {
  console.log(`\n========== ${label} (${script}) ==========\n`);
  try {
    execSync(`npm run ${script}`, { cwd: root, stdio: 'inherit', env });
  } catch (e) {
    console.warn(`⚠️ ${script} avslutade med fel (fortsätter)`);
  }
}

console.log('\n========== Merge 300 ==========\n');
execSync('npm run qa:merge', { cwd: root, stdio: 'inherit', env });
