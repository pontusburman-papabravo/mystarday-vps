'use strict';

/**
 * Fas 1 contract — resolveAppEntry I/O (implementation Fas 2).
 * Tests run against pure resolver once public/js or src/lib module exists.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SPEC = path.join(__dirname, '..', 'docs', 'family-device-architecture.md');
const RESOLVER_CANDIDATES = [
  path.join(__dirname, '..', 'src', 'lib', 'app-entry-resolve.js'),
  path.join(__dirname, '..', 'public', 'js', 'app-entry-orchestrator.js'),
];

function findResolver() {
  for (const p of RESOLVER_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

describe('app entry orchestrator contract (Fas 1)', () => {
  it('normative spec documents resolveAppEntry and device_mode', () => {
    const md = fs.readFileSync(SPEC, 'utf8');
    assert.match(md, /resolveAppEntry/);
    assert.match(md, /device_mode/);
    assert.match(md, /credentialContext/);
    assert.match(md, /Device role ≠ view context ≠ credential/);
  });

  it('implementation module exports resolveAppEntry', () => {
    const resolver = findResolver();
    assert.ok(resolver, 'src/lib/app-entry-resolve.js expected');
    const mod = require(resolver);
    assert.equal(typeof mod.resolveAppEntry, 'function');
  });
});
