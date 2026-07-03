const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('G5 — lint:public script', () => {
  it('package.json defines lint:public for client JS', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.match(pkg.scripts['lint:public'], /eslint public/);
    assert.match(pkg.scripts['lint:public'], /max-warnings/);
  });

  it('lint:public budget is tight against current warning count', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const m = pkg.scripts['lint:public'].match(/max-warnings\s+(\d+)/);
    assert.ok(m, 'max-warnings required');
    const budget = Number(m[1]);
    assert.ok(budget <= 600, 'budget should ratchet down over time (BL-010)');
    assert.ok(budget >= 500, 'budget floor sanity');
  });

  it('eslint.config.js includes public/js and caughtErrors ignore', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'eslint.config.js'), 'utf8');
    assert.match(cfg, /public\/js\/\*\*\/\*\.js/);
    assert.match(cfg, /public\/admin\/\*\*\/\*\.js/);
    assert.match(cfg, /caughtErrorsIgnorePattern/);
  });
