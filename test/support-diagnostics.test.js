'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const {
  ALLOWED_KEYS,
  assertAllowlistedPayload,
  formatClipboardText,
  mergeClientDiagnostics,
  buildServerDiagnostics,
} = require('../src/lib/support-diagnostics');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('support-diagnostics allowlist', () => {
  it('exports fixed allowlisted keys only', () => {
    assert.deepEqual(ALLOWED_KEYS, [
      'schema_version',
      'app_version',
      'cache_version',
      'git_sha',
      'platform',
      'device_mode',
      'locale',
      'viewport',
      'correlation_id',
      'sw_controller',
      'generated_at',
    ]);
  });

  it('rejects unknown and secret-like keys', () => {
    const base = {
      schema_version: '1',
      app_version: '2.3.1',
      cache_version: 'stjarndag-v784',
      correlation_id: 'req-abc',
      generated_at: '2026-01-01T00:00:00.000Z',
    };
    assert.doesNotThrow(() => assertAllowlistedPayload(base));
    assert.throws(
      () => assertAllowlistedPayload({ ...base, jwt: 'x' }),
      /disallowed key: jwt/
    );
    assert.throws(
      () => assertAllowlistedPayload({ ...base, email: 'a@b.c' }),
      /disallowed key: email/
    );
    assert.throws(
      () => assertAllowlistedPayload({ ...base, family_id: 'uuid' }),
      /disallowed key: family_id/
    );
    assert.throws(
      () => assertAllowlistedPayload({ ...base, locale: 'user@evil.test' }),
      /looks like email/
    );
  });

  it('formatClipboardText omits empty fields and uses key=value lines', () => {
    const text = formatClipboardText({
      schema_version: '1',
      app_version: '2.3.1',
      cache_version: 'stjarndag-v784',
      correlation_id: 'corr-1',
      generated_at: '2026-01-01T00:00:00.000Z',
      git_sha: null,
    });
    assert.match(text, /^schema_version=1/m);
    assert.match(text, /correlation_id=corr-1/);
    assert.doesNotMatch(text, /git_sha=/);
    assert.doesNotMatch(text, /@/);
  });

  it('mergeClientDiagnostics only copies safe client fields', () => {
    const server = buildServerDiagnostics({ id: 'rid-99' });
    const merged = mergeClientDiagnostics(server, {
      platform: 'web',
      device_mode: 'parent',
      locale: 'sv-SE',
      viewport: '390x844',
      sw_controller: 'sw.js',
      password: 'nope',
      email: 'nope@example.com',
    });
    assert.equal(merged.platform, 'web');
    assert.equal(merged.correlation_id, 'rid-99');
    assert.equal(merged.password, undefined);
    assert.equal(merged.email, undefined);
  });
});

describe('support-diagnostics wiring', () => {
  it('settings exposes copy control and loads client module', () => {
    const html = read('public/settings.html');
    assert.match(html, /id="copySupportDiagnosticsBtn"/);
    assert.match(html, /support-diagnostics\.js/);
    assert.match(html, /Teknisk info för support/);
  });

  it('account router mounts POST /support-diagnostics behind requireParent', () => {
    const route = read('src/routes/account/support-diagnostics.js');
    assert.match(route, /router\.post\('\/support-diagnostics', requireParent/);
    assert.match(route, /formatClipboardText/);
    const idx = read('src/routes/account/index.js');
    assert.match(idx, /support-diagnostics/);
  });

  it('client uses Auth.api POST without embedding secrets', () => {
    const src = read('public/js/support-diagnostics.js');
    assert.match(src, /\/api\/account\/support-diagnostics/);
    assert.doesNotMatch(src, /localStorage\.getItem\(['"]stjarndag_user/);
    assert.doesNotMatch(src, /password|email|pin/i);
  });
});

test('POST /api/account/support-diagnostics returns allowlisted clipboard payload', async (t) => {
  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const res = await fetch(`${http.baseUrl}/api/account/support-diagnostics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({
        platform: 'web',
        device_mode: 'parent',
        locale: 'sv-SE',
        viewport: '390x844',
        sw_controller: 'sw.js',
        email: 'must-not-appear@example.com',
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    const reqId = res.headers.get('x-request-id');
    assert.ok(reqId, 'X-Request-ID header');
    assert.equal(body.diagnostics.correlation_id, reqId);
    assert.match(body.clipboard_text, /cache_version=stjarndag-v\d+/);
    assert.match(body.clipboard_text, /correlation_id=/);
    assert.doesNotMatch(body.clipboard_text, /@/);
    assert.doesNotThrow(() => assertAllowlistedPayload(body.diagnostics));
  } finally {
    await http.close();
    await db.cleanup();
  }
});
