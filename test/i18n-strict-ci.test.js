'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function stepBlock(yaml, stepName) {
  const marker = `- name: ${stepName}`;
  const start = yaml.indexOf(marker);
  assert.notEqual(start, -1, `missing CI step ${stepName}`);
  const rest = yaml.slice(start + marker.length);
  const next = rest.search(/\n      - name:/);
  return rest.slice(0, next === -1 ? rest.length : next);
}

describe('i18n strict CI always-on', () => {
  it('ci.yml runs strict audit and copy ratchet without if-gates', () => {
    const yaml = read('.github/workflows/ci.yml');
    const strict = stepBlock(yaml, 'i18n strict audit');
    const ratchet = stepBlock(yaml, 'i18n copy ratchet');
    assert.match(strict, /run: npm run audit:i18n:strict/);
    assert.doesNotMatch(strict, /\bif:/);
    assert.match(ratchet, /run: npm run audit:i18n\s*$/m);
    assert.doesNotMatch(ratchet, /\bif:/);
    assert.doesNotMatch(ratchet, /audit:i18n:strict/);
  });

  it('ci-evidence requires the always-on i18n steps', () => {
    const cfg = JSON.parse(read('config/ci-evidence.json'));
    const names = cfg.requiredStepContracts.map((c) => c.stepName);
    assert.ok(names.includes('i18n strict audit'));
    assert.ok(names.includes('i18n copy ratchet'));
    const strict = cfg.requiredStepContracts.find((c) => c.stepName === 'i18n strict audit');
    const ratchet = cfg.requiredStepContracts.find((c) => c.stepName === 'i18n copy ratchet');
    assert.equal(strict.runIncludes, 'audit:i18n:strict');
    assert.equal(ratchet.runIncludes, 'audit:i18n');
  });
});
