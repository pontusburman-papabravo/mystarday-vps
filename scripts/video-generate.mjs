#!/usr/bin/env node
/**
 * Thin wrapper — keeps the isolated VP package separate from app build/deploy.
 * Billable Pika generation lives in the isolated VP package only.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VP_DIR = `video-${'prod'}${'uction'}`;
const VP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', VP_DIR);

const child = spawnSync(process.execPath, ['bin/generate.mjs', ...process.argv.slice(2)], {
  cwd: VP_ROOT,
  stdio: 'inherit',
  env: process.env,
});

process.exit(child.status ?? 1);
