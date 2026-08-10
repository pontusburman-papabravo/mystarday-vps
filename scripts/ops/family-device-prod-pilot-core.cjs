'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createCookieJar, readJson } = require('./family-device-pilot-http.cjs');
const {
  enablePilotOverrides,
  disablePilotOverrides,
  deletePilotFamily,
  snapshotGlobalPilotFlags,
  globalFlagsUnchanged,
} = require('./family-device-pilot-db.cjs');
const {
  assertFamilyDevicePilotDisposableEmail,
  isFamilyDevicePilotDisposableEmail,
  redactSecrets,
} = require('../../src/lib/family-device-pilot-guard');
const { isFounderQaParentEmail } = require('../../src/lib/founder-qa-family-guard');

function randPassword() {
  return `FdP-${crypto.randomBytes(18).toString('base64url')}1aA`;
}

function randParentPin() {
  let p;
  do {
    p = String(crypto.randomInt(1000, 10000));
  } while (/^(\d)\1{3}$/.test(p));
  return p;
}

function makeDisposableEmail() {
  return `fd-pilot-${Date.now()}@example.com`;
}

async function apiFetch(baseUrl, path, { method = 'GET', jar, csrf, body, track5xx, authBearer } = {}) {
  const headers = {};
  if (jar?.header()) headers.Cookie = jar.header();
  if (csrf) headers['X-CSRF-Token'] = csrf;
  if (authBearer) headers.Authorization = `Bearer ${authBearer}`;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  jar?.store(res);
  return readJson(res, track5xx);
}

function jarWithTrustedDevice(sourceJar) {
  const jar = createCookieJar();
  const td = sourceJar.get('trusted_device');
  if (td) {
    jar.store({ headers: { getSetCookie: () => [`trusted_device=${td}; Path=/`] } });
  }
  return jar;
}

let lastRegisterMs = 0;
const REGISTER_GAP_MS = 5500;

async function registerFamily(baseUrl, childCount, track5xx) {
  const gap = Date.now() - lastRegisterMs;
  if (lastRegisterMs && gap < REGISTER_GAP_MS) {
    await new Promise((r) => setTimeout(r, REGISTER_GAP_MS - gap));
  }
  lastRegisterMs = Date.now();

  let email = makeDisposableEmail();
  assertFamilyDevicePilotDisposableEmail(email);
  const password = randPassword();
  const parentPin = randParentPin();

  let regEmail = email;
  const reg = await apiFetch(baseUrl, '/api/auth/register', {
    method: 'POST',
    body: { email: regEmail, password, name: 'FD Pilot QA', preferred_locale: 'sv-SE' },
    track5xx,
  });
  let regStatus = reg.status;
  if (regStatus === 429) {
    await new Promise((r) => setTimeout(r, 90_000));
    regEmail = makeDisposableEmail();
    assertFamilyDevicePilotDisposableEmail(regEmail);
    const retry = await apiFetch(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { email: regEmail, password, name: 'FD Pilot QA', preferred_locale: 'sv-SE' },
      track5xx,
    });
    regStatus = retry.status;
    if (regStatus === 201) {
      Object.assign(reg, retry);
    }
  }
  if (regStatus !== 201) {
    throw new Error(`register_failed:${regStatus}`);
  }
  email = regEmail;

  const jar = createCookieJar();
  const login = await apiFetch(baseUrl, '/api/auth/login', {
    method: 'POST',
    jar,
    body: { email, password },
    track5xx,
  });
  if (login.status !== 200 || !login.body?.csrfToken) {
    throw new Error(`login_failed:${login.status}`);
  }
  const csrf = login.body.csrfToken;
  const familyId = login.body.user?.familyId || login.body.user?.family_id;

  const children = [];
  for (let i = 0; i < childCount; i++) {
    if (i === 0) {
      const childRes = await apiFetch(baseUrl, '/api/onboarding/child', {
        method: 'POST',
        jar,
        csrf,
        body: { name: childCount === 1 ? 'Solo' : 'Alma', emoji: '🌟' },
        track5xx,
      });
      if (childRes.status !== 200 && childRes.status !== 201) {
        throw new Error(`child_create_failed:${childRes.status}`);
      }
      children.push({
        id: childRes.body.id,
        username: childRes.body.username,
        pin: childRes.body.pin,
        name: childRes.body.name,
      });
      await apiFetch(baseUrl, '/api/onboarding/schedule', {
        method: 'POST',
        jar,
        csrf,
        body: { child_id: childRes.body.id, template_group: 'morgon' },
        track5xx,
      });
      await apiFetch(baseUrl, '/api/onboarding/complete', { method: 'POST', jar, csrf, body: {}, track5xx });
    } else {
      const childRes = await apiFetch(baseUrl, '/api/children', {
        method: 'POST',
        jar,
        csrf,
        body: { name: 'Bo', emoji: '🐻', birthday: '2018-06-01' },
        track5xx,
      });
      if (childRes.status !== 201) {
        throw new Error(`child_add_failed:${childRes.status}`);
      }
      children.push({
        id: childRes.body.id,
        username: childRes.body.username,
        pin: childRes.body.pin,
        name: childRes.body.name,
      });
    }
  }

  const pinRes = await apiFetch(baseUrl, '/api/family/set-pin', {
    method: 'POST',
    jar,
    csrf,
    body: { pin: parentPin, confirmPin: parentPin },
    track5xx,
  });
  if (pinRes.status !== 200) {
    throw new Error(`set_pin_failed:${pinRes.status}`);
  }

  const me = await apiFetch(baseUrl, '/api/auth/me', { jar, track5xx });
  const resolvedFamilyId = me.body?.familyId || me.body?.family_id || familyId;

  return {
    email,
    password,
    parentPin,
    familyId: resolvedFamilyId,
    children,
    session: { jar, csrf },
  };
}

async function enrollShared(baseUrl, session, track5xx) {
  const res = await apiFetch(baseUrl, '/api/family/trusted-devices/shared', {
    method: 'POST',
    jar: session.jar,
    csrf: session.csrf,
    body: { platform: 'web', label: 'pilot-shared' },
    track5xx,
  });
  if (res.status !== 201) throw new Error(`enroll_shared:${res.status}`);
  return session.jar;
}

async function enrollParent(baseUrl, session, track5xx) {
  const res = await apiFetch(baseUrl, '/api/family/trusted-devices/parent', {
    method: 'POST',
    jar: session.jar,
    csrf: session.csrf,
    body: { platform: 'web', label: 'pilot-parent' },
    track5xx,
  });
  if (res.status !== 201) throw new Error(`enroll_parent:${res.status}`);
  return session.jar;
}

async function enrollChildDevice(baseUrl, session, childId, track5xx) {
  const res = await apiFetch(baseUrl, '/api/family/trusted-devices/child', {
    method: 'POST',
    jar: session.jar,
    csrf: session.csrf,
    body: { child_id: childId, platform: 'web', label: 'pilot-child' },
    track5xx,
  });
  if (res.status !== 201) throw new Error(`enroll_child:${res.status}`);
  return session.jar;
}

async function appEntry(baseUrl, jar, query, track5xx) {
  const q = query ? `?${query}` : '';
  return apiFetch(baseUrl, `/api/auth/app-entry${q}`, { jar, track5xx });
}

async function trustedRestore(baseUrl, jar, body, track5xx) {
  return apiFetch(baseUrl, '/api/auth/trusted-device/restore', {
    method: 'POST',
    jar,
    body: body || {},
    track5xx,
  });
}

async function selectChild(baseUrl, jar, childId, track5xx) {
  return apiFetch(baseUrl, '/api/auth/trusted-device/select-child', {
    method: 'POST',
    jar,
    body: { child_id: childId },
    track5xx,
  });
}

async function childLoginHandoff(baseUrl, session, username, pin, track5xx) {
  return apiFetch(baseUrl, '/api/auth/child-login', {
    method: 'POST',
    jar: session.jar,
    csrf: session.csrf,
    body: { username, pin },
    track5xx,
  });
}

function decodeWidgetChildId(token, secret) {
  const decoded = jwt.verify(token, secret);
  if (decoded.type !== 'widget_binding') throw new Error('invalid_binding_token');
  return decoded.child_id;
}

/**
 * @param {{ db: object, baseUrl: string, jwtSecret?: string, dryRun?: boolean }} opts
 */
async function runFamilyDeviceProdPilot(opts) {
  const track5xx = [];
  const families = [];
  const report = {
    ok: false,
    scenarios: {},
    unexpected5xx: track5xx,
    wrongChildWrites: 0,
    globalFlagsChanged: false,
    founderCredentialsUsed: false,
    disposableFamilies: [],
    cleanup: { ok: false },
  };

  let globalBefore = null;
  let globalAfter = null;

  try {
    if (opts.dryRun) {
      report.ok = true;
      report.dryRun = true;
      return report;
    }

    globalBefore = await snapshotGlobalPilotFlags(opts.db);

    const single = await registerFamily(opts.baseUrl, 1, track5xx);
    const multi = await registerFamily(opts.baseUrl, 2, track5xx);
    families.push(single, multi);

    for (const fam of families) {
      if (isFounderQaParentEmail(fam.email)) {
        report.founderCredentialsUsed = true;
        throw new Error('founder_email_in_fixture');
      }
      await enablePilotOverrides(opts.db, fam.familyId, fam.email);
      report.disposableFamilies.push({ family_id: fam.familyId, email_domain: 'example.com' });
    }

    // A — shared one child
    {
      await enrollShared(opts.baseUrl, single.session, track5xx);
      const tdOnly = jarWithTrustedDevice(single.session.jar);
      const entry = await appEntry(opts.baseUrl, tdOnly, '', track5xx);
      const restore = await trustedRestore(opts.baseUrl, tdOnly, {}, track5xx);
      const pass =
        entry.status === 200 &&
        entry.body.orchestratorActive === true &&
        entry.body.decision?.destination === 'child-home' &&
        entry.body.decision?.childId === single.children[0].id &&
        entry.body.decision?.path !== '/child-login' &&
        restore.status === 200 &&
        restore.body.ok === true &&
        restore.body.user?.id === single.children[0].id;
      report.scenarios.SHARED_ONE_CHILD_SERVER = pass ? 'PASS' : 'FAIL';
    }

    // B — shared multi
    {
      await enrollShared(opts.baseUrl, multi.session, track5xx);
      const tdJar = jarWithTrustedDevice(multi.session.jar);
      const entry = await appEntry(opts.baseUrl, tdJar, '', track5xx);
      const pickerOk =
        entry.status === 200 &&
        entry.body.decision?.destination === 'profile-picker' &&
        (entry.body.allowedChildren?.length || 0) === 2;

      const selA = await selectChild(opts.baseUrl, tdJar, multi.children[0].id, track5xx);
      const selB = await selectChild(opts.baseUrl, tdJar, multi.children[1].id, track5xx);
      const pass =
        pickerOk &&
        selA.status === 200 &&
        selA.body.ok === true &&
        selA.body.user?.id === multi.children[0].id &&
        selB.status === 200 &&
        selB.body.user?.id === multi.children[1].id;
      report.scenarios.SHARED_MULTI_CHILD_SERVER = pass ? 'PASS' : 'FAIL';
    }

    // C — parent device
    {
      const pFam = await registerFamily(opts.baseUrl, 1, track5xx);
      families.push(pFam);
      await enablePilotOverrides(opts.db, pFam.familyId, pFam.email);
      await enrollParent(opts.baseUrl, pFam.session, track5xx);
      const cold = jarWithTrustedDevice(pFam.session.jar);
      const entry = await appEntry(opts.baseUrl, pFam.session.jar, '', track5xx);
      const restore = await trustedRestore(opts.baseUrl, cold, {}, track5xx);
      const pass =
        entry.body.decision?.destination === 'parent-home' &&
        restore.status === 200 &&
        restore.body.ok === true &&
        restore.body.redirect === '/dashboard';
      report.scenarios.PARENT_DEVICE_SERVER = pass ? 'PASS' : 'FAIL';
    }

    // D — child device (reuse single-child family)
    {
      const boundId = single.children[0].id;
      const childSession = {
        jar: createCookieJar(),
        csrf: single.session.csrf,
      };
      for (const k of single.session.jar.keys()) {
        const v = single.session.jar.get(k);
        childSession.jar.store({ headers: { getSetCookie: () => [`${k}=${v}; Path=/`] } });
      }
      await enrollChildDevice(opts.baseUrl, childSession, boundId, track5xx);
      const tdJar = jarWithTrustedDevice(childSession.jar);
      const entry = await appEntry(opts.baseUrl, tdJar, '', track5xx);
      const pass =
        entry.body.decision?.destination === 'child-home' &&
        entry.body.decision?.childId === boundId &&
        entry.body.decision?.deviceMode === 'child';
      report.scenarios.CHILD_DEVICE_SERVER = pass ? 'PASS' : 'FAIL';
    }

    // E — adult privilege server (PIN unlock, no biometric claim)
    {
      const child = multi.children[0];
      const handoff = await childLoginHandoff(
        opts.baseUrl,
        multi.session,
        child.username,
        child.pin,
        track5xx
      );
      const childJar = createCookieJar();
      for (const k of multi.session.jar.keys()) {
        const v = multi.session.jar.get(k);
        childJar.store({ headers: { getSetCookie: () => [`${k}=${v}; Path=/`] } });
      }

      const blocked = await apiFetch(opts.baseUrl, '/api/family', { jar: childJar, track5xx });
      const unlock = await apiFetch(opts.baseUrl, '/api/family/adult-privilege/unlock', {
        method: 'POST',
        jar: childJar,
        csrf: handoff.body?.csrfToken,
        body: { unlockMethod: 'pin', pin: multi.parentPin },
        track5xx,
      });
      const parentJar = createCookieJar();
      for (const k of childJar.keys()) {
        const v = childJar.get(k);
        parentJar.store({ headers: { getSetCookie: () => [`${k}=${v}; Path=/`] } });
      }
      const allowed = await apiFetch(opts.baseUrl, '/api/family', { jar: parentJar, track5xx });
      const expire = await apiFetch(opts.baseUrl, '/api/family/adult-privilege/expire', {
        method: 'POST',
        jar: parentJar,
        csrf: unlock.body?.csrfToken,
        body: {},
        track5xx,
      });
      const blockedAfter = await apiFetch(opts.baseUrl, '/api/family', { jar: parentJar, track5xx });

      const pass =
        blocked.status === 403 &&
        blocked.body?.code === 'CHILD_PARENT_API_BLOCKED' &&
        unlock.status === 200 &&
        unlock.body?.state === 'active' &&
        allowed.status === 200 &&
        expire.status === 200 &&
        blockedAfter.status === 403;
      report.scenarios.ADULT_PRIVILEGE_SERVER = pass ? 'PASS' : 'FAIL';
      report.adult_biometric_hardware = 'PENDING';
    }

    // F — revoke (dedicated one-child family)
    {
      const rFam = await registerFamily(opts.baseUrl, 1, track5xx);
      families.push(rFam);
      await enablePilotOverrides(opts.db, rFam.familyId, rFam.email);
      await enrollChildDevice(opts.baseUrl, rFam.session, rFam.children[0].id, track5xx);
      const list = await apiFetch(opts.baseUrl, '/api/family/trusted-devices', {
        jar: rFam.session,
        csrf: rFam.session.csrf,
        track5xx,
      });
      const deviceId = list.body?.devices?.[0]?.id;
      const del = await apiFetch(opts.baseUrl, `/api/family/trusted-devices/${deviceId}`, {
        method: 'DELETE',
        jar: rFam.session,
        csrf: rFam.session.csrf,
        track5xx,
      });
      const tdJar = jarWithTrustedDevice(rFam.session.jar);
      const entry = await appEntry(opts.baseUrl, tdJar, '', track5xx);
      const restore = await trustedRestore(opts.baseUrl, tdJar, {}, track5xx);
      const pass =
        del.status === 200 &&
        entry.body.decision?.failClosed === true &&
        entry.body.decision?.destination === 'parent-login' &&
        restore.status === 401;
      report.scenarios.REVOKE_SERVER = pass ? 'PASS' : 'FAIL';
    }

    // G — wrong child (deep link out of scope)
    {
      await enrollShared(opts.baseUrl, single.session, track5xx);
      const tdJar = jarWithTrustedDevice(single.session.jar);
      const bogus = '00000000-0000-4000-8000-00000000abcd';
      const entry = await appEntry(
        opts.baseUrl,
        tdJar,
        `intent_child_id=${encodeURIComponent(bogus)}`,
        track5xx
      );
      const pass =
        entry.body.decision?.failClosed === true &&
        entry.body.decision?.reason === 'deep_link_child_out_of_scope';
      report.scenarios.WRONG_CHILD = pass ? 'PASS' : 'FAIL';
      report.scenarios.DEEP_LINK = pass ? 'PASS' : 'FAIL';
    }

    // I — offline identity contract (static — same as unit test)
    {
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(path.join(__dirname, '../../public/js/offline-queue.js'), 'utf8');
      const pass =
        /COMPLETE_ACTIVITY/.test(src) &&
        /return 'item:' \+ \(action\.payload\.itemId/.test(src) &&
        /child_id: childId/.test(src);
      report.scenarios.OFFLINE_IDENTITY = pass ? 'PASS' : 'FAIL';
    }

    // J — widget server scope
    {
      const secret = opts.jwtSecret;
      if (!secret) {
        report.scenarios.WIDGET_SERVER_SCOPE = 'FAIL';
      } else {
        const wJar = jarWithTrustedDevice(multi.session.jar);
        await enrollShared(opts.baseUrl, multi.session, track5xx);
        const childA = multi.children[0].id;
        const childB = multi.children[1].id;
        const bind = await apiFetch(opts.baseUrl, '/api/widget/bindings', {
          method: 'POST',
          jar: multi.session.jar,
          csrf: multi.session.csrf,
          body: {
            installation_id: `pilot-${Date.now()}`,
            platform: 'ios',
            child_id: childA,
          },
          track5xx,
        });
        const token = bind.body?.binding_token;
        let pass = bind.status === 201 && token;
        if (pass) {
          pass = decodeWidgetChildId(token, secret) === childA;
          await selectChild(opts.baseUrl, wJar, childB, track5xx);
          const authRes = await apiFetch(opts.baseUrl, '/api/widget/context', {
            authBearer: token,
            track5xx,
          });
          pass =
            pass &&
            authRes.status === 200 &&
            authRes.body.active_child?.id === childA &&
            decodeWidgetChildId(token, secret) === childA;
        }
        report.scenarios.WIDGET_SERVER_SCOPE = pass ? 'PASS' : 'FAIL';
      }
    }

    const keys = Object.keys(report.scenarios).filter(
      (k) =>
        k.endsWith('_SERVER') ||
        k === 'WRONG_CHILD' ||
        k === 'DEEP_LINK' ||
        k === 'OFFLINE_IDENTITY' ||
        k === 'WIDGET_SERVER_SCOPE'
    );
    report.ok = keys.every((k) => report.scenarios[k] === 'PASS') && track5xx.length === 0;
  } finally {
    if (!opts.dryRun) {
      for (const fam of families) {
        try {
          await disablePilotOverrides(opts.db, fam.familyId, fam.email);
          await deletePilotFamily(opts.db, fam.familyId, fam.email);
        } catch (err) {
          report.cleanup = { ok: false, error: redactSecrets(err.message) };
        }
      }
      if (!report.cleanup.error) {
        const { countPilotOverrides } = require('./family-device-pilot-db.cjs');
        let leftover = 0;
        for (const fam of families) {
          leftover += await countPilotOverrides(opts.db, fam.familyId);
        }
        const existsChecks = await Promise.all(
          families.map((fam) =>
            opts.db.query('SELECT 1 FROM family WHERE id = $1', [fam.familyId]).then((r) => r.rows.length)
          )
        );
        report.cleanup = {
          ok: leftover === 0 && existsChecks.every((n) => n === 0),
        };
      }
      globalAfter = await snapshotGlobalPilotFlags(opts.db);
      report.globalFlagsChanged = globalBefore && !globalFlagsUnchanged(globalBefore, globalAfter);
      report.GLOBAL_FLAGS_CHANGED = report.globalFlagsChanged ? 'YES' : 'NO';
      report.FOUNDER_CREDENTIALS_USED = report.founderCredentialsUsed ? 'YES' : 'NO';
    }
  }

  return report;
}

module.exports = {
  makeDisposableEmail,
  isFamilyDevicePilotDisposableEmail,
  randPassword,
  runFamilyDeviceProdPilot,
  redactSecrets,
};
