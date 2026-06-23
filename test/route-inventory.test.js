'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(REPO_ROOT, 'docs/route-inventory-pre-split.md');

test('E0 route inventory snapshot exists and is reproducible', () => {
  assert.ok(fs.existsSync(INVENTORY), 'docs/route-inventory-pre-split.md missing');
  const body = fs.readFileSync(INVENTORY, 'utf8');
  assert.match(body, /## Global middleware order/);
  assert.match(body, /## Routes/);
  assert.match(body, /checkMaintenanceMode/);
  assert.match(body, /\| GET \| `\/health`/);
  assert.match(body, /Routes: \d+/);
  const count = Number(body.match(/Routes: (\d+)/)[1]);
  assert.ok(count >= 400, `expected hundreds of routes, got ${count}`);
});

test('dump-routes --check matches committed inventory', () => {
  execSync('node scripts/dump-routes.js --check', {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://mock_test:mock@localhost:5432/mock_test',
      JWT_SECRET: process.env.JWT_SECRET || 'test-secret-at-least-32-chars-long-for-ci', // pragma: allowlist secret
    },
  });
});
