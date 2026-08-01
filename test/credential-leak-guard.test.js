'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

describe('credential leak guard', () => {
  it('check-committed-credentials passes on current tree', () => {
    execSync('node scripts/check-committed-credentials.cjs', { cwd: ROOT, stdio: 'pipe' });
  });

  it('founder doc references secret names only', () => {
    const t = fs.readFileSync(path.join(ROOT, 'docs/founder-qa-test-account.md'), 'utf8');
    assert.match(t, /FOUNDER_QA_PASSWORD/);
    assert.match(t, /outside the repository/i);
    assert.doesNotMatch(t, /pragma:\s*allowlist secret/i);
  });

  it('cursor rules reference secret names only', () => {
    const t = fs.readFileSync(path.join(ROOT, '.cursor/rules/125-qa-test-account.mdc'), 'utf8');
    assert.match(t, /FOUNDER_CHILD_PIN/);
    assert.doesNotMatch(t, /PIN `1112`/);
  });

  it('app store demo doc has no password table literals', () => {
    const t = fs.readFileSync(path.join(ROOT, 'docs/app-store-demo-konto.md'), 'utf8');
    assert.match(t, /APP_REVIEW_PASSWORD/);
    assert.doesNotMatch(t, /AppReview20\d{2}!/);
  });
});
