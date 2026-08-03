'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('child-login active session resume (no PIN re-prompt)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/child-login.js'), 'utf8');

  it('defines resumeActiveChildSessionIfPresent', () => {
    assert.match(src, /async function resumeActiveChildSessionIfPresent/);
  });

  it('requires server-validated type child before redirect', () => {
    assert.match(src, /me\.type !== 'child'/);
    assert.match(src, /\/api\/auth\/me/);
    assert.match(src, /location\.replace\('\/child\/today'\)/);
  });

  it('does not skip PIN for picker or add-child flows', () => {
    assert.match(src, /forcePicker \|\| options\.resumeAddChild/);
    assert.match(
      src,
      /resumeActiveChildSessionIfPresent\(\{\s*forcePicker:\s*forcePicker,\s*resumeAddChild:\s*resumeAddChild\s*\}\)/
    );
  });

  it('does not store or replay child PIN client-side', () => {
    assert.doesNotMatch(src, /localStorage\.setItem\(['"]child_pin/);
    assert.doesNotMatch(src, /rememberPin|savedPin|pin_plaintext/i);
  });
});

describe('loadDay clears expanded substep state', () => {
  const loadDay = fs.readFileSync(
    path.join(ROOT, 'public/js/child-dashboard-load-day.js'),
    'utf8'
  );

  it('clears subStepExpanded when clearing subStepCache', () => {
    assert.match(loadDay, /subStepCache\s*=\s*\{\s*\}/);
    assert.match(loadDay, /delete subStepExpanded\[id\]/);
  });
});
