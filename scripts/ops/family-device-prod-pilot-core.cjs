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
const { createDisposableFamilyDeviceQaFamily } = require('./family-device-qa-fixture.cjs');
const { makeDisposableEmail } = require('./family-device-pilot-guard-helpers.cjs');
const { isFounderQaParentEmail } = require('../../src/lib/founder-qa-family-guard');
const { PILOT_FLAG_KEYS } = require('../../src/lib/family-device-pilot-guard');

const PILOT_TRUSTED_DEVICE_KEYS = PILOT_FLAG_KEYS.filter((k) => k !== 'adult_privilege_v1');

async function apiFetch(baseUrl, path, { method = 'GET', jar, csrf, body, track5xx, track429, authBearer } = {}) {
  const headers = {};
  if (jar?.header()) headers.Cookie = jar.header();
  const csrfHeader = jar?.get('csrf_token') || csrf;
  if (csrfHeader) headers['X-CSRF-Token'] = csrfHeader;
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
  return readJson(res, track5xx, track429);
}

function jarWithTrustedDevice(sourceJar) {
  const jar = createCookieJar();
  const td = sourceJar.get('trusted_device');
  if (td) {
    jar.store({ headers: { getSetCookie: () => [`trusted_device=${td}; Path=/`] } });
  }
  return jar;
}

async function provisionFamily(db, baseUrl, childCount, track5xx, track429Fixture) {
  const fixture = await createDisposableFamilyDeviceQaFamily(db, { childCount });
  assertFamilyDevicePilotDisposableEmail(fixture.email);

  const jar = createCookieJar();
  const login = await apiFetch(baseUrl, '/api/auth/login', {
    method: 'POST',
    jar,
    body: { email: fixture.email, password: fixture.password },
    track5xx,
    track429: track429Fixture,
  });
  if (login.status !== 200 || !login.body?.csrfToken) {
    throw new Error(`login_failed:${login.status}`);
  }
  const jarCsrf = jar.get('csrf_token');
  const sessionCsrf = jarCsrf || login.body.csrfToken;

  return {
    email: fixture.email,
    password: fixture.password,
    parentPin: fixture.parentPin,
    familyId: fixture.familyId,
    children: fixture.children,
    session: { jar, csrf: sessionCsrf },
  };
}

const TRUSTED_DEVICE_PROPAGATION_MS = 20_000;
const TRUSTED_DEVICE_POLL_MS = 400;

/** Wait until app HTTP sees per-family trusted_device override (DB replica lag). */
async function assertTrustedDeviceEnabledOnServer(baseUrl, session, track5xx, track429) {
  const deadline = Date.now() + TRUSTED_DEVICE_PROPAGATION_MS;
  while (Date.now() < deadline) {
    const res = await apiFetch(baseUrl, '/api/family/trusted-devices', {
      jar: session.jar,
      csrf: session.csrf,
      track5xx,
      track429,
    });
    if (res.status === 200 && res.body?.enabled === true) {
      const jarCsrf = session.jar.get('csrf_token');
      if (jarCsrf) session.csrf = jarCsrf;
      return;
    }
    await new Promise((r) => setTimeout(r, TRUSTED_DEVICE_POLL_MS));
  }
  throw new Error('trusted_device_enable_timeout');
}

async function enablePilotForFamily(db, baseUrl, fam, track5xx, track429, keys = PILOT_TRUSTED_DEVICE_KEYS) {
  await enablePilotOverrides(db, fam.familyId, fam.email, 'family-device-prod-pilot', keys);
  await assertTrustedDeviceEnabledOnServer(baseUrl, fam.session, track5xx, track429);
}

async function reloginParentIfNeeded(baseUrl, fam, track5xx, track429) {
  const me = await apiFetch(baseUrl, '/api/auth/me', {
    jar: fam.session.jar,
    csrf: fam.session.csrf,
    track5xx,
    track429,
  });
  if (me.body?.type === 'parent') return;
  const jar = createCookieJar();
  const login = await apiFetch(baseUrl, '/api/auth/login', {
    method: 'POST',
    jar,
    body: { email: fam.email, password: fam.password },
    track5xx,
    track429,
  });
  if (login.status !== 200 || !login.body?.csrfToken) {
    throw new Error(`parent_relogin_failed:${login.status}`);
  }
  fam.session.jar = jar;
  fam.session.csrf = jar.get('csrf_token') || login.body.csrfToken;
}

async function enrollShared(baseUrl, fam, track5xx, track429) {
  await reloginParentIfNeeded(baseUrl, fam, track5xx, track429);
  const res = await apiFetch(baseUrl, '/api/family/trusted-devices/shared', {
    method: 'POST',
    jar: fam.session.jar,
    csrf: fam.session.csrf,
    body: { platform: 'web', label: 'pilot-shared' },
    track5xx,
  });
  if (res.status !== 201) {
    throw new Error(
      `enroll_shared:${res.status}:${res.body?.code || JSON.stringify(res.body)?.slice(0, 120)}`
    );
  }
  return fam.session.jar;
}

async function enrollParent(baseUrl, fam, track5xx, track429) {
  await reloginParentIfNeeded(baseUrl, fam, track5xx, track429);
  const res = await apiFetch(baseUrl, '/api/family/trusted-devices/parent', {
    method: 'POST',
    jar: fam.session.jar,
    csrf: fam.session.csrf,
    body: { platform: 'web', label: 'pilot-parent' },
    track5xx,
  });
  if (res.status !== 201) throw new Error(`enroll_parent:${res.status}`);
  return fam.session.jar;
}

async function enrollChildDevice(baseUrl, fam, childId, track5xx, track429) {
  await reloginParentIfNeeded(baseUrl, fam, track5xx, track429);
  const res = await apiFetch(baseUrl, '/api/family/trusted-devices/child', {
    method: 'POST',
    jar: fam.session.jar,
    csrf: fam.session.csrf,
    body: { child_id: childId, platform: 'web', label: 'pilot-child' },
    track5xx,
  });
  if (res.status !== 201) throw new Error(`enroll_child:${res.status}`);
  return fam.session.jar;
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
  const track429 = [];
  const track429Fixture = [];
  const families = [];
  const report = {
    ok: false,
    scenarios: {},
    unexpected5xx: track5xx,
    unexpected429: track429,
    unexpected429DuringFixtureSetup: track429Fixture,
    publicSignupUsedForFixture: false,
    fixtureCreationMethod: 'db_ops',
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

    const single = await provisionFamily(opts.db, opts.baseUrl, 1, track5xx, track429Fixture);
    const multi = await provisionFamily(opts.db, opts.baseUrl, 2, track5xx, track429Fixture);
    families.push(single, multi);

    for (const fam of families) {
      if (isFounderQaParentEmail(fam.email)) {
        report.founderCredentialsUsed = true;
        throw new Error('founder_email_in_fixture');
      }
      await enablePilotForFamily(opts.db, opts.baseUrl, fam, track5xx, track429);
      await reloginParentIfNeeded(opts.baseUrl, fam, track5xx, track429);
      report.disposableFamilies.push({ family_id: fam.familyId, email_domain: 'example.com' });
    }

    // A — shared one child
    {
      await enrollShared(opts.baseUrl, single, track5xx, track429);
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
      await enrollShared(opts.baseUrl, multi, track5xx, track429);
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
      const pFam = await provisionFamily(opts.db, opts.baseUrl, 1, track5xx, track429Fixture);
      families.push(pFam);
      await enablePilotForFamily(opts.db, opts.baseUrl, pFam, track5xx, track429);
      await enrollParent(opts.baseUrl, pFam, track5xx, track429);
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
      await reloginParentIfNeeded(opts.baseUrl, single, track5xx, track429);
      await enrollChildDevice(opts.baseUrl, single, boundId, track5xx, track429);
      const tdJar = jarWithTrustedDevice(single.session.jar);
      const entry = await appEntry(opts.baseUrl, tdJar, '', track5xx);
      const pass =
        entry.body.decision?.destination === 'child-home' &&
        entry.body.decision?.childId === boundId &&
        entry.body.decision?.deviceMode === 'child';
      report.scenarios.CHILD_DEVICE_SERVER = pass ? 'PASS' : 'FAIL';
    }

    // E — adult privilege server (PIN unlock, no biometric claim)
    {
      await enablePilotOverrides(
        opts.db,
        multi.familyId,
        multi.email,
        'family-device-prod-pilot',
        ['adult_privilege_v1']
      );
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
      const rFam = await provisionFamily(opts.db, opts.baseUrl, 1, track5xx, track429Fixture);
      families.push(rFam);
      await enablePilotForFamily(opts.db, opts.baseUrl, rFam, track5xx, track429);
      await enrollChildDevice(opts.baseUrl, rFam, rFam.children[0].id, track5xx, track429);
      const list = await apiFetch(opts.baseUrl, '/api/family/trusted-devices', {
        jar: rFam.session.jar,
        csrf: rFam.session.csrf,
        track5xx,
        track429,
      });
      const deviceId = list.body?.devices?.[0]?.id;
      const del = await apiFetch(opts.baseUrl, `/api/family/trusted-devices/${deviceId}`, {
        method: 'DELETE',
        jar: rFam.session.jar,
        csrf: rFam.session.csrf,
        track5xx,
        track429,
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
      await enrollShared(opts.baseUrl, single, track5xx, track429);
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
        await enrollShared(opts.baseUrl, multi, track5xx, track429);
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
    report.ok =
      keys.every((k) => report.scenarios[k] === 'PASS') &&
      track5xx.length === 0 &&
      track429Fixture.length === 0 &&
      !report.publicSignupUsedForFixture;
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
  runFamilyDeviceProdPilot,
  redactSecrets,
};
