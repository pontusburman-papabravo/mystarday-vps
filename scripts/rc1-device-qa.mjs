#!/usr/bin/env node
/**
 * RC-1 automated device/browser matrix — maps RC1_QA_* to mobile QA harness.
 * Requires local or deployed BASE + RC1_QA credentials (see docs/rc1-qa-fixture.md).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const base = process.env.RC1_SMOKE_BASE_URL || process.env.BASE || 'http://127.0.0.1:3000';
const childLoginName = process.env.RC1_CHILD_USERNAME || 'rc1qachild';

const env = {
  ...process.env,
  BASE: base,
  SMOKE_PARENT_EMAIL: process.env.RC1_QA_EMAIL,
  SMOKE_PARENT_PASSWORD: process.env.RC1_QA_PASSWORD,
  // mobile harness uses name field as child-login username (lowercased)
  SMOKE_CHILD_NAME: childLoginName,
  SMOKE_CHILD_PIN: process.env.RC1_CHILD_PIN,
  RC1_QA_SINGLE_CHILD: '1',
  QA_MODE: process.env.RC1_DEVICE_QA_MODE || 'gate',
  SMOKE_ARTIFACTS: process.env.SMOKE_ARTIFACTS
    || path.join(root, 'artifacts', 'rc1-device-qa', process.env.RC1_DEVICE_PROFILE || 'mobile'),
};

if (!env.SMOKE_PARENT_EMAIL || !env.SMOKE_PARENT_PASSWORD) {
  console.error('[rc1-device-qa] missing RC1_QA_EMAIL / RC1_QA_PASSWORD');
  process.exit(1);
}

const result = spawnSync('npm', ['run', env.QA_MODE === 'full' ? 'qa:mobile-full' : 'qa:mobile-gate'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
