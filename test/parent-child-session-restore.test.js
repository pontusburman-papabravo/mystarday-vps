'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const config = require('../src/lib/config');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('parent session restore from child session', () => {
  it('exposes activate-saved-parent-session before requireParent gate', () => {
    const idx = read('src/routes/family/index.js');
    assert.match(idx, /session-public/);
    assert.match(idx, /router\.use\('\/', require\('\.\/session-public'\)\)/);
    assert.match(idx, /router\.use\(requireParent\)/);
    const sessionPublicIdx = idx.indexOf("require('./session-public')");
    const requireParentUseIdx = idx.indexOf('router.use(requireParent)');
    assert.ok(sessionPublicIdx !== -1 && requireParentUseIdx !== -1);
    assert.ok(sessionPublicIdx < requireParentUseIdx);
  });

  it('childParentApiBlock allows activate-saved-parent-session for child JWT', () => {
    const { childParentApiBlock } = require('../src/middleware/child-parent-api-block');
    let called = false;
    const req = { user: { type: 'child', id: 'c1' }, path: '/family/activate-saved-parent-session' };
    childParentApiBlock(req, { status() { return this; }, json() {} }, () => { called = true; });
    assert.equal(called, true);
  });

  it('childParentApiBlock allows GET /subscription/access for package features', () => {
    const { childParentApiBlock } = require('../src/middleware/child-parent-api-block');
    let called = false;
    const req = { user: { type: 'child', id: 'c1' }, path: '/subscription/access' };
    childParentApiBlock(req, { status() { return this; }, json() {} }, () => { called = true; });
    assert.equal(called, true);
  });

  it('activate route swaps cookies when family has no PIN', async (t) => {
    const db = require('../src/lib/db');
    if (!process.env.DATABASE_URL) {
      t.skip('DATABASE_URL not set');
      return;
    }

    const { acquireDbTestLock } = require('./helpers/db-test-lock');
    const releaseLock = await acquireDbTestLock();
    t.after(async () => { await releaseLock(); });

    const email = `session-restore-${Date.now()}@example.com`;
      const familyRes = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Test', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = familyRes.rows[0].id;
      const parentRes = await db.query(
        `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed)
         VALUES ($1, 'x', $2, 'Test', true) RETURNING id`,
        [email, familyId]
      );
      const parentId = parentRes.rows[0].id;
      const childRes = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Maja', '⭐', 'maja', 'x', 0) RETURNING id`,
        [familyId]
      );
      const childId = childRes.rows[0].id;
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
        [parentId, childId]
      );

      const { createRefreshToken } = require('../src/lib/refresh-tokens');
      const { hashOpaque } = require('../src/lib/parent-session-handoff');
      const crypto = require('crypto');
      const rawRefresh = await createRefreshToken({
        userId: parentId,
        userType: 'parent',
        familyId,
      });
      const { verifyRefreshToken } = require('../src/lib/refresh-tokens');
      const refreshRow = await verifyRefreshToken(rawRefresh);
      assert.ok(refreshRow?.id, 'refresh token row required');
      const opaque = crypto.randomBytes(32).toString('base64url');
      await db.query(
        `INSERT INTO parent_session_handoff (token_hash, parent_id, family_id, refresh_token_id, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [hashOpaque(opaque), parentId, familyId, refreshRow.id, refreshRow.expires_at]
      );

      const childToken = jwt.sign(
        { type: 'child', id: childId, familyId, username: 'maja' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      const sessionPublic = require('../src/routes/family/session-public');
      const express = require('express');
      const cookieParser = require('cookie-parser');
      const app = express();
      app.use(cookieParser());
      app.use(express.json());
      app.use((req, _res, next) => {
        req.user = { type: 'child', id: childId, familyId };
        next();
      });
      app.use('/api/family', sessionPublic);

      const server = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
      });
      const { port } = server.address();

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/family/activate-saved-parent-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `access_token=${childToken}; refresh_token=${rawRefresh}; stjarndag_parent_session=${opaque}`,
          },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.ok, true);
        assert.equal(body.parent.type, 'parent');
        assert.equal(body.parent.id, parentId);
        const setCookie = res.headers.get('set-cookie') || '';
        assert.match(setCookie, /access_token=/);
      } finally {
        await new Promise((resolve) => server.close(resolve));
        await db.query('DELETE FROM parent_child WHERE parent_id = $1', [parentId]);
        await db.query('DELETE FROM child WHERE id = $1', [childId]);
        await db.query('DELETE FROM parent WHERE id = $1', [parentId]);
        await db.query('DELETE FROM family WHERE id = $1', [familyId]);
      }
  });

  it('auth.js restores parent on parent pages when child cookie is active', () => {
    const auth = read('public/js/auth.js');
    assert.match(auth, /activateSavedParentSession/);
    assert.match(auth, /ensureParentAccessFromChild/);
    assert.match(auth, /tryActivateSavedParentSession/);
    assert.match(auth, /user\.type === 'child'/);
  });

  it('login.html does not always bounce child sessions to child/today on web', () => {
    const html = read('public/login.html');
    assert.match(html, /parentIntent/);
    assert.doesNotMatch(html, /window\.location\.href = '\/child\/today';\s*return;\s*\}\s*\}\s*if \(window\.SessionGate/);
  });

  it('login-magic parent card restores parent when child session is stored', () => {
    const src = read('public/js/login-magic.js');
    assert.match(src, /storedUser\.type === 'child'/);
    assert.match(src, /ensureParentAccessFromChild/);
  });
});
