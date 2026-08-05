'use strict';

/**
 * VPS-only: resolve allowlisted QA family sessions without logging secrets.
 * Parent: API login when JOURNEY_QA_PARENT_* or FOUNDER_QA_* present.
 * Child: mint access+refresh via app modules (no PIN) when child PIN env absent.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../src/lib/config');
const db = require('../../src/lib/db');
const { createRefreshToken, revokeRefreshToken } = require('../../src/lib/refresh-tokens');
const { generateCsrfToken } = require('../../src/middleware/csrf');
const { parseDuration } = require('../../src/routes/auth/session');
const { isFounderQaParentEmail, normalizeEmail } = require('../../src/lib/founder-qa-family-guard');

function trimEnv(key) {
  const raw = process.env[key];
  return raw ? String(raw).split('#')[0].trim() : '';
}

function resolveQaParentEmail() {
  return trimEnv('JOURNEY_QA_PARENT_EMAIL') || trimEnv('FOUNDER_QA_EMAIL');
}

function cookieCollector() {
  const jar = {};
  const res = {
    cookie(name, value, options = {}) {
      jar[name] = { value, options };
    },
    clearCookie() {},
  };
  return { res, jar };
}

function jarToCookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : v.value}`)
    .join('; ');
}

function mergeSetCookie(jar, setCookieHeaders) {
  for (const h of setCookieHeaders || []) {
    const pair = h.split(';')[0];
    const i = pair.indexOf('=');
    if (i > 0) jar[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return jar;
}

function puppeteerCookies(jar, baseUrl) {
  const host = new URL(baseUrl).hostname;
  const out = [];
  for (const [name, val] of Object.entries(jar)) {
    const value = typeof val === 'string' ? val : val.value;
    const opts = typeof val === 'string' ? {} : (val.options || {});
    out.push({
      name,
      value,
      domain: host,
      path: opts.path || '/',
      httpOnly: !!opts.httpOnly,
      secure: opts.secure !== false,
      sameSite: opts.sameSite === 'strict' ? 'Strict' : 'Lax',
    });
  }
  return out;
}

async function resolveAllowlistedFamily() {
  const email = resolveQaParentEmail();
  if (!email) {
    const err = new Error('QA parent email env missing');
    err.code = 'QA_EMAIL_MISSING';
    throw err;
  }
  const { rows } = await db.query(
    `SELECT p.id AS parent_id, p.family_id, p.email, p.is_admin, p.onboarding_completed
     FROM parent p WHERE lower(p.email) = $1`,
    [normalizeEmail(email)]
  );
  if (rows.length !== 1) {
    const err = new Error('Allowlisted QA parent must match exactly one account');
    err.code = 'QA_FAMILY_AMBIGUOUS';
    throw err;
  }
  const row = rows[0];
  const journeyEmail = trimEnv('JOURNEY_QA_PARENT_EMAIL');
  if (journeyEmail) {
    if (normalizeEmail(journeyEmail) !== normalizeEmail(row.email)) {
      const err = new Error('Journey QA email mismatch');
      err.code = 'QA_FAMILY_NOT_ALLOWED';
      throw err;
    }
  } else if (!isFounderQaParentEmail(row.email)) {
    const err = new Error('Parent email not on founder QA allowlist');
    err.code = 'QA_FAMILY_NOT_ALLOWED';
    throw err;
  }
  return row;
}

async function parentSessionViaApi(baseUrl) {
  const email = resolveQaParentEmail();
  const password = trimEnv('JOURNEY_QA_PARENT_PASSWORD') || trimEnv('FOUNDER_QA_PASSWORD');
  if (!password) {
    return null;
  }
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    const err = new Error(`Parent API login failed (${loginRes.status})`);
    err.code = 'QA_PARENT_LOGIN_FAILED';
    throw err;
  }
  const body = await loginRes.json();
  const jar = mergeSetCookie({}, loginRes.headers.getSetCookie?.() || []);
  return { jar, csrf: body.csrfToken, user: body.user, via: 'api_login' };
}

async function mintParentSession(parentRow) {
  const { res, jar } = cookieCollector();
  const accessToken = jwt.sign(
    {
      id: parentRow.parent_id,
      type: 'parent',
      familyId: parentRow.family_id,
      email: parentRow.email,
      isAdmin: parentRow.is_admin || false,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  const rawRefresh = await createRefreshToken({
    userId: parentRow.parent_id,
    userType: 'parent',
    familyId: parentRow.family_id,
  });
  const expiresInSecs = typeof config.jwt.expiresIn === 'string'
    ? parseDuration(config.jwt.expiresIn)
    : config.jwt.expiresIn;
  const { setAccessCookie, setRefreshCookie } = require('../../src/lib/refresh-tokens');
  setRefreshCookie(res, rawRefresh);
  setAccessCookie(res, accessToken, expiresInSecs);
  const csrf = generateCsrfToken(res);
  const flat = {};
  for (const [k, v] of Object.entries(jar)) flat[k] = v.value;
  return {
    jar: flat,
    csrf,
    refreshRaw: rawRefresh,
    user: { id: parentRow.parent_id, familyId: parentRow.family_id, type: 'parent' },
    via: 'mint',
  };
}

async function pickQaChild(familyId) {
  const nameHint = trimEnv('QA_CHILD_NAME') || 'Astrid';
  const { rows } = await db.query(
    `SELECT id, family_id, name, username, activity_timers_enabled
     FROM child WHERE family_id = $1 ORDER BY created_at ASC`,
    [familyId]
  );
  if (!rows.length) {
    const err = new Error('No children in QA family');
    err.code = 'QA_CHILD_MISSING';
    throw err;
  }
  const match = rows.find((c) => new RegExp(nameHint, 'i').test(c.name));
  return match || rows[0];
}

async function childSessionViaApi(baseUrl, username, pin) {
  const loginRes = await fetch(`${baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  if (!loginRes.ok) return null;
  const body = await loginRes.json();
  const jar = mergeSetCookie({}, loginRes.headers.getSetCookie?.() || []);
  return { jar, csrf: body.csrfToken, user: body.user, via: 'api_login' };
}

async function mintChildSession(childRow) {
  const { res, jar } = cookieCollector();
  const accessToken = jwt.sign(
    {
      id: childRow.id,
      type: 'child',
      familyId: childRow.family_id,
      username: childRow.username,
      name: childRow.name,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.childExpiresIn }
  );
  const rawRefresh = await createRefreshToken({
    userId: childRow.id,
    userType: 'child',
    familyId: childRow.family_id,
  });
  const expiresInSecs = parseDuration(config.jwt.childExpiresIn);
  const { setAccessCookie, setRefreshCookie } = require('../../src/lib/refresh-tokens');
  setRefreshCookie(res, rawRefresh);
  setAccessCookie(res, accessToken, expiresInSecs);
  const csrf = generateCsrfToken(res);
  const flat = {};
  for (const [k, v] of Object.entries(jar)) flat[k] = v.value;
  return {
    jar: flat,
    csrf,
    refreshRaw: rawRefresh,
    user: { id: childRow.id, familyId: childRow.family_id, type: 'child', name: childRow.name },
    via: 'mint',
  };
}

/**
 * @returns {Promise<{ parent, child, childRow, parentRow, cleanup: Function, meta: object }>}
 */
async function resolveQaBrowserSessions(baseUrl) {
  const parentRow = await resolveAllowlistedFamily();
  const childRow = await pickQaChild(parentRow.family_id);
  const mintedRefresh = [];

  let parent = await parentSessionViaApi(baseUrl);
  if (!parent) parent = await mintParentSession(parentRow);
  if (parent.refreshRaw) mintedRefresh.push(parent.refreshRaw);

  const childPin = trimEnv('FOUNDER_CHILD_PIN') || trimEnv('QA_CHILD_PIN');
  const childUser = trimEnv('FOUNDER_CHILD_USERNAME') || childRow.username;
  let child = null;
  if (childPin && childUser) {
    child = await childSessionViaApi(baseUrl, childUser, childPin);
  }
  if (!child) child = await mintChildSession(childRow);
  if (child.refreshRaw) mintedRefresh.push(child.refreshRaw);

  async function cleanup() {
    for (const raw of mintedRefresh) {
      try {
        await revokeRefreshToken(raw);
      } catch {
        /* ignore */
      }
    }
  }

  return {
    parent,
    child,
    childRow,
    parentRow,
    cleanup,
    meta: {
      parent_auth: parent.via,
      child_auth: child.via,
      child_name: childRow.name,
    },
  };
}

module.exports = {
  resolveQaBrowserSessions,
  jarToCookieHeader,
  puppeteerCookies,
  resolveQaParentEmail,
};
