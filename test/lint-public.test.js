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

  it('eslint.config.js includes public/js and public/admin', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'eslint.config.js'), 'utf8');
    assert.match(cfg, /public\/js\/\*\*\/\*\.js/);
    assert.match(cfg, /public\/admin\/\*\*\/\*\.js/);
  });
});
