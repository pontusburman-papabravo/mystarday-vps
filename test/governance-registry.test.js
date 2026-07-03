'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REGISTRY = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'config/governance-registry.json'), 'utf8')
);

test('POS required files exist', () => {
  for (const rel of REGISTRY.pos_required_files) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
  }
});

test('COS org OS files exist', () => {
  for (const rel of REGISTRY.cos_required_files) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
  }
});

test('Constitution has six rules', () => {
  const text = fs.readFileSync(
    path.join(ROOT, 'product-operating-system/00_PROJECT_CONSTITUTION.md'),
    'utf8'
  );
  const rules = text.match(/^## \d+\./gm) || [];
  assert.equal(rules.length, 6);
});

test('governance registry rule tests exist', () => {
  for (const [ruleId, entry] of Object.entries(REGISTRY.rules)) {
    for (const testRel of entry.tests || []) {
      assert.ok(fs.existsSync(path.join(ROOT, testRel)), `${ruleId}: missing ${testRel}`);
    }
  }
});

test('child IA ADR documents three canonical places', () => {
  const adr = fs.readFileSync(
    path.join(ROOT, 'product-operating-system/14_DECISION_LOG.md'),
    'utf8'
  );
  assert.match(adr, /Idag · Min värld · Familj/);
});

test('COS ORGANIZATION defines mission tiers', () => {
  const org = fs.readFileSync(path.join(ROOT, '.ai/company/ORGANIZATION.md'), 'utf8');
  assert.match(org, /T0/);
  assert.match(org, /T3/);
  assert.match(org, /Assurance Cell/);
});
