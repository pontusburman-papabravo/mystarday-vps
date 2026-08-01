'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const webGate = fs.readFileSync(
  path.join(root, '.github/workflows/rc1-web-release-gate.yml'),
  'utf8'
);
const prodSmoke = fs.readFileSync(
  path.join(root, '.github/workflows/rc1-prod-smoke.yml'),
  'utf8'
);

function enforceJobBlock(yaml) {
  const start = yaml.indexOf('enforce-release-context:');
  const end = yaml.indexOf('\n  prepare', start);
  return yaml.slice(start, end);
}

describe('rc1 workflow contract — web release gate', () => {
  it('enforce-release-context checks out github.sha before guard script', () => {
    const block = enforceJobBlock(webGate);
    const checkoutIdx = block.indexOf('actions/checkout@v4');
    const guardIdx = block.indexOf('rc1-assert-release-gate-context.js');
    assert.ok(checkoutIdx >= 0 && guardIdx > checkoutIdx);
    assert.match(block, /ref:\s*\$\{\{\s*github\.sha\s*\}\}/);
  });

  it('RC1_QA_DATABASE_URL appears only in prepare jobs', () => {
    const lines = webGate.split('\n');
    const dbLines = lines.filter((l) => l.includes('RC1_QA_DATABASE_URL'));
    assert.ok(dbLines.length >= 1);
    for (const line of dbLines) {
      assert.match(line, /DATABASE_URL|RC1_QA_DATABASE_URL/);
    }
    assert.doesNotMatch(webGate, /browser-smoke:[\s\S]*RC1_QA_DATABASE_URL/);
    assert.doesNotMatch(webGate, /mobile-browser-matrix:[\s\S]*RC1_QA_DATABASE_URL/);
  });

  it('prepare apply uses rc1-qa-db-prepare environment', () => {
    assert.match(webGate, /prepare-qa-fixture:[\s\S]*environment:\s*rc1-qa-db-prepare/);
  });

  it('browser and mobile jobs use rc1-prod-smoke environment', () => {
    assert.match(webGate, /browser-smoke:[\s\S]*environment:\s*rc1-prod-smoke/);
    assert.match(webGate, /mobile-browser-matrix:[\s\S]*environment:\s*rc1-prod-smoke/);
  });

  it('prepare_mode defaults to none (not apply)', () => {
    assert.match(webGate, /prepare_mode:[\s\S]*default:\s*none/);
  });

  it('mobile-browser receives RC1_EXPECTED_SHA and RC1_EXPECTED_CACHE', () => {
    const mobile = webGate.slice(webGate.indexOf('mobile-browser-matrix:'));
    assert.match(mobile, /RC1_EXPECTED_SHA/);
    assert.match(mobile, /RC1_EXPECTED_CACHE/);
    assert.match(mobile, /RC1_QA_FAMILY_ID/);
  });

  it('gate-verdict depends on enforce-release-context', () => {
    assert.match(webGate, /gate-verdict:[\s\S]*needs:[\s\S]*enforce-release-context/);
  });
});

describe('rc1 workflow contract — prod smoke', () => {
  it('enforce job uses github.sha checkout', () => {
    const block = enforceJobBlock(prodSmoke);
    assert.match(block, /ref:\s*\$\{\{\s*github\.sha\s*\}\}/);
  });

  it('prepare_mode default is none', () => {
    assert.match(prodSmoke, /prepare_mode:[\s\S]*default:\s*none/);
  });
});
