'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CHECKOFF_JS = path.join(__dirname, '../public/js/child-dashboard-checkoff.js');

describe('child checkoff 429 handling', () => {
  const src = fs.readFileSync(CHECKOFF_JS, 'utf8');

  it('sends completion client origin header on mutation', () => {
    assert.match(src, /X-Completion-Client-Id/);
    assert.match(src, /getChildCompletionClientId/);
  });

  it('does not run success-only path when mutation failed', () => {
    assert.match(src, /mutationSucceeded/);
    assert.match(src, /if \(!mutationSucceeded\)/);
  });

  it('429 branch does not call coalescedLoadDay (only generic failure path does)', () => {
    assert.match(src, /err\.status === 429[\s\S]*?showToast\(t\('checkoff\.tooFast'\)/);
    const between429AndElse = src.split('err.status === 429')[1].split('} else {')[0];
    assert.doesNotMatch(between429AndElse, /coalescedLoadDay/);
  });
});
