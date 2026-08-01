#!/usr/bin/env node
/**
 * RC-1 mobile **browser** QA (Chromium + viewport/UA profiles).
 * Not native iOS/Android/Capacitor — see docs/rc1-native-device-automation-plan.md
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { RC1_QA_CHILD_USERNAME } = require('../test/support/rc1-qa-fixture.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const base = process.env.RC1_SMOKE_BASE_URL || process.env.BASE || 'http://127.0.0.1:3000';
const childLoginName = process.env.RC1_CHILD_USERNAME || RC1_QA_CHILD_USERNAME;
if (process.env.RC1_CHILD_USERNAME && process.env.RC1_CHILD_USERNAME !== RC1_QA_CHILD_USERNAME) {
  console.error('[rc1-mobile-browser-qa] RC1_CHILD_USERNAME must match fixture child_username');
  process.exit(1);
}

const profile = process.env.RC1_MOBILE_PROFILE || 'ios';
const env = {
  ...process.env,
  BASE: base,
  SMOKE_PARENT_EMAIL: process.env.RC1_QA_EMAIL,
  SMOKE_PARENT_PASSWORD: process.env.RC1_QA_PASSWORD,
  SMOKE_CHILD_NAME: childLoginName,
  SMOKE_CHILD_PIN: process.env.RC1_CHILD_PIN,
  RC1_QA_SINGLE_CHILD: '1',
  QA_MODE: process.env.RC1_MOBILE_BROWSER_QA_MODE || 'gate',
  RC1_MOBILE_PROFILE: profile,
  SMOKE_ARTIFACTS: process.env.SMOKE_ARTIFACTS
    || path.join(root, 'artifacts', 'rc1-mobile-browser-qa', profile),
};

if (process.env.RC1_EXPECTED_SHA && process.env.RC1_EXPECTED_CACHE && process.env.RC1_QA_FAMILY_ID) {
  env.RC1_ENFORCE_RELEASE_IDENTITY = '1';
}

if (!env.SMOKE_PARENT_EMAIL || !env.SMOKE_PARENT_PASSWORD) {
  console.error('[rc1-mobile-browser-qa] missing RC1_QA_EMAIL / RC1_QA_PASSWORD');
  process.exit(1);
}

const result = spawnSync('npm', ['run', env.QA_MODE === 'full' ? 'qa:mobile-full' : 'qa:mobile-gate'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
