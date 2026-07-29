'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('vps-deploy-revision.sh requires DEPLOY_SHA and validates format', () => {
  const script = fs.readFileSync(
    path.join(__dirname, '../scripts/vps-deploy-revision.sh'),
    'utf8'
  );
  assert.match(script, /DEPLOY_SHA/);
  assert.match(script, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(script, /set -Eeuo pipefail/);
  assert.match(script, /npm ci --legacy-peer-deps/);
  assert.match(script, /git fetch --depth 1 origin "\$TARGET_SHA"/);
  assert.match(script, /git checkout --detach "\$TARGET_SHA"/);
  assert.doesNotMatch(script, /git fetch origin main/);
  assert.doesNotMatch(script, /git reset --hard origin\/main/);
  assert.match(script, /git rev-parse HEAD/);
  assert.doesNotMatch(script, /npm install/);
});

test('deploy workflow pins workflow_run.head_sha', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '../.github/workflows/deploy.yml'),
    'utf8'
  );
  assert.match(workflow, /workflow_run\.head_sha/);
  assert.match(workflow, /workflow_run\.head_branch == 'main'/);
  assert.match(workflow, /group: vps-deploy/);
  assert.match(workflow, /vps-deploy-revision\.sh/);
});
