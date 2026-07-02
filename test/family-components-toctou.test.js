'use strict';

/**
 * N10 — admin family-components PUT must use a transaction + row lock
 * (SELECT … FOR UPDATE) so parallel grants don't overwrite each other.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, 'src/routes/admin/family-components.js');

describe('family-components TOCTOU contract (N10)', () => {
  it('PUT handler uses BEGIN/COMMIT/ROLLBACK transaction', () => {
    const src = fs.readFileSync(API, 'utf8');
    assert.match(src, /client\.query\('BEGIN'\)/);
    assert.match(src, /client\.query\('COMMIT'\)/);
    assert.match(src, /client\.query\('ROLLBACK'\)/);
    assert.match(src, /db\.getClient\(\)/);
  });

  it('PUT handler locks family_subscriptions row with FOR UPDATE before read-modify-write', () => {
    const src = fs.readFileSync(API, 'utf8');
    assert.match(
      src,
      /SELECT components FROM family_subscriptions WHERE family_id = \$1 FOR UPDATE/
    );
  });

  it('PUT handler writes components and audit log inside the same transaction', () => {
    const src = fs.readFileSync(API, 'utf8');
    const putStart = src.indexOf("router.put('/families/:familyId/components/:slug'");
    assert.ok(putStart >= 0, 'PUT route must exist');
    const putBlock = src.slice(putStart, putStart + 3500);
    const beginIdx = putBlock.indexOf("client.query('BEGIN')");
    const commitIdx = putBlock.indexOf("client.query('COMMIT')");
    const auditIdx = putBlock.indexOf('admin_audit_log');
    assert.ok(beginIdx >= 0 && commitIdx > beginIdx, 'COMMIT must follow BEGIN');
    assert.ok(auditIdx > beginIdx && auditIdx < commitIdx, 'audit log insert must be inside transaction');
  });
});
