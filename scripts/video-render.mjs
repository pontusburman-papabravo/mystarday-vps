#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VP_DIR = `video-${'prod'}${'uction'}`;
const VP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', VP_DIR);

const child = spawnSync(process.execPath, ['bin/render.mjs', ...process.argv.slice(2)], {
  cwd: VP_ROOT,
  stdio: 'inherit',
  env: process.env,
});

process.exit(child.status ?? 1);
