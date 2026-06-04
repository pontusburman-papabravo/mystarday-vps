/**
 * Security regression tests.
 *
 * Covers:
 *   1. /api/debug-routes removed
 *   2. Cookie banner absent from child HTML files
 *   3. Upload: SVG rejected, magic byte validation, filename sanitization
 *   4. escapeHtml from dom-utils.js works correctly
 *   5. Password reset response does not contain a password field
 *   6. JWT_SECRET enforcement in production mode
 *
 * Run: node --test test/security.test.js
 * Uses node:test (Node >= 18). No live DB required.
 */

'use strict';

process.env.DATABASE_URL = 'REDACTED/mock_test';

const { describe, it, before } = require('node:test');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SERVER_JS  = path.join(__dirname, '..', 'server.js');
const UPLOAD_JS  = path.join(__dirname, '..', 'src', 'routes', 'upload.js');
const ADMIN_FAMILY_JS = path.join(__dirname, '..', 'src', 'routes', 'admin', 'family.js');
const ADMIN_DELEGATOR = path.join(__dirname, '..', 'src', 'routes', 'admin.js');
const DOM_UTILS  = path.join(PUBLIC_DIR, 'js', 'dom-utils.js');

// ─── Fix 1: debug-routes removed ──────────────────────────
describe('Fix 1 -- debug-routes removed', () => {
  it('server.js must not contain /api/debug-routes', () => {
    const src = fs.readFileSync(SERVER_JS, 'utf8');
    const hasDebugRoute = src.includes('/api/debug-routes');
    assert.strictEqual(hasDebugRoute, false, 'server.js still contains /api/debug-routes endpoint');
  });
});

// ─── Fix 2: Cookie banner not in child views ──────────────
describe('Fix 2 -- cookie banner not in child views', () => {
  const CHILD_FILES = [
    path.join(PUBLIC_DIR, 'child-dashboard.html'),
    path.join(PUBLIC_DIR, 'child-login.html'),
  ];

  for (const filePath of CHILD_FILES) {
    const name = path.basename(filePath);
    it(name + ' must not include cookie-banner.js', () => {
      const html = fs.readFileSync(filePath, 'utf8');
      const hasBanner = html.includes('cookie-banner.js');
      assert.strictEqual(hasBanner, false, name + ' still contains cookie-banner.js script tag');
    });
  }
});

// ─── Fix 3: Upload hardening ──────────────────────────────
describe('Fix 3 -- upload image hardening', () => {
  let detectImageMime;
  let sanitizeFilename;

  before(() => {
    // Upload helpers are exported from src/routes/upload.js
    const uploadModule = require(UPLOAD_JS);
    detectImageMime = uploadModule.detectImageMime;
    sanitizeFilename = uploadModule.sanitizeFilename;
  });

  it('detectImageMime accepts JPEG magic bytes (FF D8 FF)', () => {
    const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00]);
    assert.strictEqual(detectImageMime(jpeg), 'image/jpeg');
  });

  it('detectImageMime accepts PNG magic bytes (89 50 4E 47)', () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    assert.strictEqual(detectImageMime(png), 'image/png');
  });

  it('detectImageMime accepts WebP magic bytes (RIFF....WEBP)', () => {
    const webp = Buffer.alloc(12);
    webp[0] = 0x52; webp[1] = 0x49; webp[2] = 0x46; webp[3] = 0x46; // RIFF
    webp[8] = 0x57; webp[9] = 0x45; webp[10] = 0x42; webp[11] = 0x50; // WEBP
    assert.strictEqual(detectImageMime(webp), 'image/webp');
  });

  it('detectImageMime rejects SVG (text content)', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    assert.strictEqual(detectImageMime(svg), null, 'SVG should not match any image signature');
  });

  it('detectImageMime rejects arbitrary bytes', () => {
    const junk = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
    assert.strictEqual(detectImageMime(junk), null);
  });

  it('sanitizeFilename preserves safe filename unchanged', () => {
    assert.strictEqual(sanitizeFilename('my-photo.jpg'), 'my-photo.jpg');
  });

  it('sanitizeFilename returns upload.jpg for empty string', () => {
    assert.strictEqual(sanitizeFilename(''), 'upload.jpg');
  });

  it('sanitizeFilename returns upload.jpg for null', () => {
    assert.strictEqual(sanitizeFilename(null), 'upload.jpg');
  });

  it('upload.js multer fileSize limit is 5MB', () => {
    const uploadSrc = fs.readFileSync(UPLOAD_JS, 'utf8');
    const has5mb = uploadSrc.includes('fileSize: 5 * 1024 * 1024');
    assert.strictEqual(has5mb, true, 'multer fileSize limit should be 5MB');
  });

  it('upload endpoint rejects SVG mime type explicitly', () => {
    const uploadSrc = fs.readFileSync(UPLOAD_JS, 'utf8');
    const hasSvgCheck = uploadSrc.includes('image/svg+xml');
    assert.strictEqual(hasSvgCheck, true, 'upload endpoint should reject SVG mime type');
  });
});

// ─── Fix 4: escapeHtml from dom-utils.js ──────────────────
describe('Fix 4 -- escapeHtml from dom-utils.js', () => {
  // Evaluate dom-utils.js by injecting a synthetic globalThis-like object
  let escapeHtml;

  before(() => {
    const src = fs.readFileSync(DOM_UTILS, 'utf8');
    // Use a sandbox object that acts as both window and globalThis
    const sandbox = {};
    // Wrap so that typeof window returns object (truthy) -> picks sandbox
    const wrapped = '(function(window){ ' + src + ' })(sandbox)';
    // eslint-disable-next-line no-new-func
    const fn = new Function('sandbox', wrapped);
    fn(sandbox);
    escapeHtml = sandbox.escapeHtml;
    assert.ok(typeof escapeHtml === 'function', 'dom-utils.js must export escapeHtml as a function');
  });

  it('escapes ampersand', () => {
    assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
  });

  it('escapes less-than bracket', () => {
    const result = escapeHtml('<script>');
    assert.ok(result.includes('&lt;'), 'should escape < to &lt;');
  });

  it('escapes greater-than bracket', () => {
    const result = escapeHtml('<script>');
    assert.ok(result.includes('&gt;'), 'should escape > to &gt;');
  });

  it('escapes double quote', () => {
    assert.strictEqual(escapeHtml('"hello"'), '&quot;hello&quot;');
  });

  it('escapes single quote', () => {
    const result = escapeHtml("it's");
    assert.ok(result.includes('&#x27;'), "single quote should become &#x27;");
  });

  it('returns empty string for null', () => {
    assert.strictEqual(escapeHtml(null), '');
  });

  it('returns empty string for undefined', () => {
    assert.strictEqual(escapeHtml(undefined), '');
  });

  it('coerces number to string', () => {
    assert.strictEqual(escapeHtml(42), '42');
  });

  it('neutralises script-injection payload', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const result = escapeHtml(payload);
    const hasLiteral = result.includes('<img');
    assert.strictEqual(hasLiteral, false, 'XSS payload angle brackets should be HTML-escaped');
    assert.ok(result.includes('&lt;img'), 'should have &lt;img entity');
  });

  it('dom-utils.js assigns escapeHtml to the root object', () => {
    const src = fs.readFileSync(DOM_UTILS, 'utf8');
    // Accept either 'root.escapeHtml' (current) or 'global.escapeHtml' (old)
    const assigns = src.includes('root.escapeHtml = escapeHtml') || src.includes('global.escapeHtml = escapeHtml');
    assert.ok(assigns, 'dom-utils.js must assign escapeHtml to the root/global object');
  });
});

// ─── Fix 5: Password reset response contains no password ──
describe('Fix 5 -- password reset response contains no password', () => {
  it('admin/family.js must not return temporaryPassword field', () => {
    const src = fs.readFileSync(ADMIN_FAMILY_JS, 'utf8');
    const hasTemporary = src.includes('temporaryPassword');
    assert.strictEqual(hasTemporary, false, 'admin/family.js still returns temporaryPassword in API response');
  });

  it('admin/family.js must not use predictable Stjarndag+digits password', () => {
    const src = fs.readFileSync(ADMIN_FAMILY_JS, 'utf8');
    const hasPredictable = src.includes("'Stjarndag'");
    assert.strictEqual(hasPredictable, false, 'admin/family.js still generates predictable passwords');
  });

  it('admin/family.js uses crypto.randomBytes(16).toString(base64url)', () => {
    const src = fs.readFileSync(ADMIN_FAMILY_JS, 'utf8');
    const hasCrypto = src.includes("crypto.randomBytes(16).toString('base64url')");
    assert.strictEqual(hasCrypto, true, 'admin/family.js must use crypto.randomBytes for password generation');
  });

  it('admin/family.js calls sendEmail to deliver the new password', () => {
    const src = fs.readFileSync(ADMIN_FAMILY_JS, 'utf8');
    const hasSendEmail = src.includes('sendEmail(');
    assert.strictEqual(hasSendEmail, true, 'admin/family.js must call sendEmail to deliver the reset password');
  });

  it('admin/family.js response message indicates password sent via email', () => {
    const src = fs.readFileSync(ADMIN_FAMILY_JS, 'utf8');
    const hasMsg = src.includes('skickat via e-post');
    assert.ok(hasMsg, 'admin/family.js JSON response should confirm password was sent via email');
  });

  it('admin.js (delegator) does NOT contain reset code', () => {
    const src = fs.readFileSync(ADMIN_DELEGATOR, 'utf8');
    for (const needle of [
      'crypto.randomBytes',
      'sendEmail(',
      'temporaryPassword',
      "'Stjarndag'",
      'skickat via e-post',
    ]) {
      assert.ok(!src.includes(needle), `admin.js delegator must not contain '${needle}' — reset logic belongs in admin/family.js`);
    }
  });
});

// ─── Fix 6: JWT_SECRET enforcement in production ─────────
const CONFIG_JS = path.join(__dirname, '..', 'src', 'lib', 'config.js');

describe('Fix 6 -- JWT_SECRET production enforcement', () => {
  // Save original env so we can restore after each test
  const origEnv = {};

  function saveEnv() {
    origEnv.NODE_ENV = process.env.NODE_ENV;
    origEnv.JWT_SECRET = process.env.JWT_SECRET;
  }

  function restoreEnv() {
    // Restore original values (or delete if they were undefined)
    for (const key of ['NODE_ENV', 'JWT_SECRET']) {
      if (origEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = origEnv[key];
      }
    }
    // Clear require cache so config.js re-evaluates on next require
    delete require.cache[require.resolve(CONFIG_JS)];
  }

  it('crashes without JWT_SECRET in production', () => {
    saveEnv();
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      delete require.cache[require.resolve(CONFIG_JS)];
      assert.throws(
        () => require(CONFIG_JS),
        { message: /FATAL: JWT_SECRET must be set in production/ }
      );
    } finally {
      restoreEnv();
    }
  });

  it('crashes with short JWT_SECRET in production (< 32 chars)', () => {
    saveEnv();
    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'too-short';
      delete require.cache[require.resolve(CONFIG_JS)];
      assert.throws(
        () => require(CONFIG_JS),
        { message: /FATAL: JWT_SECRET must be at least 32 characters/ }
      );
    } finally {
      restoreEnv();
    }
  });

  it('accepts valid JWT_SECRET in production (>= 32 chars)', () => {
    saveEnv();
    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(64);
      delete require.cache[require.resolve(CONFIG_JS)];
      const config = require(CONFIG_JS);
      assert.strictEqual(config.jwt.secret, 'a'.repeat(64));
    } finally {
      restoreEnv();
    }
  });

  it('starts OK in development without JWT_SECRET (dev fallback)', () => {
    saveEnv();
    try {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;
      delete require.cache[require.resolve(CONFIG_JS)];
      const config = require(CONFIG_JS);
      assert.ok(config.jwt.secret, 'should have a dev fallback secret');
      assert.strictEqual(config.jwt.secret, 'dev-only-not-for-production');
    } finally {
      restoreEnv();
    }
  });

  it('config.js does NOT contain the old hardcoded fallback string', () => {
    const src = fs.readFileSync(CONFIG_JS, 'utf8');
    const hasOldFallback = src.includes('dev-jwt-secret-change-in-production');
    assert.strictEqual(hasOldFallback, false,
      'config.js still contains the old hardcoded fallback "dev-jwt-secret-change-in-production"');
  });
});
