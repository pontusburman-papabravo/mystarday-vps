import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function run(cmd, args, env = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

run('node', ['scripts/setup-test-assets.mjs']);

console.log('Running dry-run…');
const dryRun = run('node', ['bin/dry-run.mjs']);
assert.match(dryRun, /Total API calls/);
assert.match(dryRun, /A Morning Without Nagging/);

console.log('Generating placeholders for one film…');
run('node', ['bin/generate.mjs', '--placeholders', '--film', 'a-morning-without-nagging']);

console.log('Rendering with placeholders…');
run('node', ['bin/render.mjs', '--placeholders', '--film', 'a-morning-without-nagging']);

const outDir = path.join(ROOT, 'output', 'morning-without-nagging');
for (const suffix of ['landscape', 'vertical', 'square']) {
  const file = path.join(outDir, `morning-without-nagging-${suffix}.mp4`);
  assert.ok(fs.existsSync(file), `missing export: ${file}`);
  const stat = fs.statSync(file);
  assert.ok(stat.size > 10_000, `${file} too small`);
}

console.log('✓ Placeholder pipeline test passed');
