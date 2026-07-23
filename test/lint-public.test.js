'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('G5 — lint:public script + budget ratchet', () => {
  it('package.json routes lint:public through budget script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.match(pkg.scripts['lint:public'], /lint-public\.mjs/);
    assert.match(pkg.scripts['lint:public:sync-budget'], /--sync-budget/);
  });

  it('eslint.config.js includes public/js and public/admin', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'eslint.config.js'), 'utf8');
    assert.match(cfg, /public\/js\/\*\*\/\*\.js/);
    assert.match(cfg, /public\/admin\/\*\*\/\*\.js/);
  });

  it('eslint ignores intentional underscore catch bindings (ESLint 9)', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'eslint.config.js'), 'utf8');
    assert.match(cfg, /caughtErrorsIgnorePattern:\s*'\^_'/);
    assert.match(cfg, /destructuredArrayIgnorePattern:\s*'\^_'/);
  });

  it('committed lint:public budget is a non-negative integer', () => {
    const budget = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/lint-public-budget.json'), 'utf8')
    );
    assert.equal(typeof budget.maxWarnings, 'number');
    assert.ok(Number.isInteger(budget.maxWarnings));
    assert.ok(budget.maxWarnings >= 0);
  });

  it('lint-public.mjs refuses silent budget raises without --force-raise', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/lint-public.mjs'), 'utf8');
    assert.match(src, /--force-raise/);
    assert.match(src, /lint-public-budget\.json/);
    assert.match(src, /never raises without --force-raise|ForceRaise|forceRaise/i);
  });
});
