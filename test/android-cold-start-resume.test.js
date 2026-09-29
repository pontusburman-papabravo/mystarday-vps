'use strict';

/**
 * ADR-022 native cold start.
 * Role picker is not the ordinary start screen when resumable state exists.
 * 53a8b2e0 GPU loop must stay fixed: one navigateOnce, GPU CSS still stripped.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  resolveAppEntry,
  DESTINATIONS,
  SERVER_ACTIONS,
} = require('../src/lib/app-entry-resolve');
const { pathForDestination } = require('../src/lib/app-entry-decision-public');
const { stripAndroidGpuHtml } = require('../src/middleware/platform-html');
const { loadOrchestratorSandbox } = require('./helpers/app-entry-orchestrator-harness');

const ROOT = path.join(__dirname, '..');
const A = 'child-a-uuid';
const B = 'child-b-uuid';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function td(mode, extra) {
  return {
    valid: true,
    revoked: false,
    deviceMode: mode,
    defaultChildId: null,
    lastActiveChildId: null,
    ...extra,
  };
}

function resumeFn() {
  const src = read('public/js/app-entry-orchestrator.js');
  const start = src.indexOf('async function resumeFromLogin');
  const end = src.indexOf('async function applyAfterDeviceSetup');
  assert.ok(start > 0 && end > start);
  return src.slice(start, end);
}

describe('ADR-022 Android cold start', () => {
  it('1 parent cold start: legacy parent session → /dashboard, never role-picker login', () => {
    const r = resolveAppEntry({
      parentPrivilegeActive: true,
      parentSession: { authenticated: true, privilegeActive: true },
      childSession: null,
      trustedDevice: null,
      allowedChildren: [{ id: A }],
    });
    assert.equal(r.destination, DESTINATIONS.PARENT_HOME);
    assert.equal(r.serverAction, SERVER_ACTIONS.NONE);
    assert.equal(pathForDestination(r.destination), '/dashboard');
    assert.notEqual(r.destination, DESTINATIONS.PARENT_LOGIN);
  });

  it('2 bound child device → /child/today, not the login role picker', () => {
    const r = resolveAppEntry({
      parentPrivilegeActive: false,
      parentSession: { authenticated: true, privilegeActive: false },
      childSession: null,
      trustedDevice: td('child', { defaultChildId: A }),
      allowedChildren: [{ id: A }],
    });
    assert.equal(r.destination, DESTINATIONS.CHILD_HOME);
    assert.equal(r.childId, A);
    assert.equal(pathForDestination(r.destination), '/child/today');
    assert.notEqual(r.destination, DESTINATIONS.PARENT_LOGIN);
  });

  it('3 shared device, one child → Idag', () => {
    const r = resolveAppEntry({
      parentPrivilegeActive: false,
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }],
    });
    assert.equal(r.destination, DESTINATIONS.CHILD_HOME);
    assert.equal(pathForDestination(r.destination), '/child/today');
  });

  it('4 shared device, multiple children → profile picker', () => {
    const r = resolveAppEntry({
      parentPrivilegeActive: true,
      parentSession: { authenticated: true, privilegeActive: true },
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }, { id: B }],
    });
    assert.equal(r.destination, DESTINATIONS.PROFILE_PICKER);
    assert.equal(pathForDestination(r.destination, { dailyUxActive: true }), '/child/profile-picker');
    assert.notEqual(r.destination, DESTINATIONS.PARENT_LOGIN);
  });

  it('5 no resumable state → parent-login (role picker allowed)', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: null,
      allowedChildren: [],
    });
    assert.equal(r.destination, DESTINATIONS.PARENT_LOGIN);
    assert.equal(pathForDestination(r.destination), '/login');
    const resume = resumeFn();
    assert.match(resume, /destination === 'parent-login'/);
    assert.match(resume, /NO_RESUMABLE_STATE/);
  });

  it('6 parent → child handoff does not restore the same role picker', () => {
    const entry = read('public/js/app-entry.js');
    const magic = read('public/js/login-magic.js');
    const child = read('public/js/child-login.js');
    assert.doesNotMatch(entry, /setItem\('entry_restore', 'ENTRY_ROLE_PICK'\)/);
    assert.match(magic, /entry_explicit_role/);
    assert.match(magic, /The link owns navigation/);
    assert.match(child, /explicitChildRole/);
    assert.match(child, /!explicitChildRole && window\.AppEntryOrchestrator/);
    const kidHandler = magic.slice(magic.indexOf("getElementById('kid-role-card')"), magic.indexOf("parentCard.addEventListener"));
    const afterAddChild = kidHandler.slice(kidHandler.indexOf('Explicit child choice'));
    assert.doesNotMatch(afterAddChild, /preventDefault/);
    assert.doesNotMatch(afterAddChild, /location\.href/);
  });

  it('7 platform-theme does not choose a destination from stjarndag_user', () => {
    const theme = read('public/js/platform-theme.js');
    assert.doesNotMatch(theme, /stjarndag_user/);
    assert.match(theme, /location\.replace\('\/home'/);
    const inject = read('src/middleware/platform-html.js');
    assert.match(inject, /location\.replace\("\/home"\+location\.search\+location\.hash\)/);
    assert.doesNotMatch(inject, /stjarndag_user/);
  });

  it('8 GPU regression: strip 3D CSS and resume does not reload or href-loop', () => {
    const html = '<link rel="stylesheet" href="/css/parent-magic-3d.css?v=1"><link rel="stylesheet" href="/css/theme.css">';
    assert.doesNotMatch(stripAndroidGpuHtml(html), /parent-magic-3d/);
    assert.match(stripAndroidGpuHtml(html), /theme\.css/);
    const css = read('public/css/platform-native.css');
    assert.match(css, /transform-style:\s*flat/);
    const resume = resumeFn();
    assert.match(resume, /navigateOnce\(decision\.path\)/);
    assert.doesNotMatch(resume, /location\.reload/);
    assert.doesNotMatch(resume, /location\.href/);
    const login = read('public/login.html');
    assert.doesNotMatch(login, /nativeStayOnLogin/);
    assert.match(login, /53a8b2e0/);
    const nativeBlock = login.slice(login.indexOf('function isNativeLoginShell'), login.indexOf('// Web only'));
    assert.doesNotMatch(nativeBlock, /location\.href/);
  });

  it('9 child-first physical flicker harness is still in the suite', () => {
    const harness = read('test/native-child-cold-launch-harness.test.js');
    const helper = read('test/helpers/native-child-cold-launch-harness.js');
    const qa = read('docs/ACTIVATION-FIRST-SUCCESS-PHYSICAL-QA-RESULT.md');
    assert.match(harness, /legacy intermittent model bounces/);
    assert.match(harness, /fixed model stabilizes on \/child\/today/);
    assert.match(helper, /\/child\/today/);
    assert.match(qa, /SM-G991B/);
    assert.match(qa, /Child login first/);
  });

  it('clearAuth does not clear httpOnly access_token; resume reads the server decision', () => {
    const auth = read('public/js/auth.js');
    const start = auth.indexOf('clearAuth()');
    const end = auth.indexOf('isLoggedIn()');
    const body = auth.slice(start, end);
    assert.doesNotMatch(body, /access_token=/);
    assert.match(body, /httpOnly access_token is server-owned/);
    const resume = resumeFn();
    assert.match(resume, /fetched\.body && fetched\.body\.decision/);
    assert.match(resume, /ORCHESTRATOR_REQUIRED/);
    assert.doesNotMatch(resume, /stjarndag_user/);
  });
});

function legacyParentEntryBody() {
  return {
    orchestratorActive: false,
    decision: {
      destination: 'parent-home',
      reason: 'legacy_parent_session_no_trusted_device',
      serverAction: 'none',
      path: '/dashboard',
    },
  };
}

function resumeLogin(opts) {
  const env = loadOrchestratorSandbox({
    pathname: '/login',
    deviceMode: opts.deviceMode,
    appEntryBody: opts.appEntryBody,
  });
  return env.sandbox.AppEntryOrchestrator.resumeFromLogin().then((result) => ({
    result,
    redirects: env.redirects,
    sessionStorage: env.sandbox.sessionStorage,
    location: env.sandbox.location,
  }));
}

describe('fail-closed legacy parent resume on a child hint', () => {
  it('A normal parent phone: legacy parent session + DeviceMode parent → /dashboard', async () => {
    const { result, redirects } = await resumeLogin({
      deviceMode: 'parent',
      appEntryBody: legacyParentEntryBody(),
    });
    assert.equal(result.resumed, true);
    assert.equal(result.code, 'LEGACY_RESUME');
    assert.deepEqual(redirects, ['/dashboard']);
  });

  it('B child hint vetoes automatic /dashboard and does not navigate', async () => {
    const { result, redirects } = await resumeLogin({
      deviceMode: 'child',
      appEntryBody: legacyParentEntryBody(),
    });
    assert.equal(result.resumed, false);
    assert.equal(result.code, 'LEGACY_PARENT_CHILD_HINT_CONFLICT');
    assert.equal(result.decision.destination, 'parent-home');
    assert.deepEqual(redirects, []);
    const resume = resumeFn();
    const guardAt = resume.indexOf('LEGACY_PARENT_CHILD_HINT_CONFLICT');
    const navAt = resume.indexOf('navigateOnce(decision.path)');
    const actionAt = resume.indexOf("serverAction || 'none'");
    assert.ok(actionAt > 0 && guardAt > actionAt && navAt > guardAt);
    assert.match(resume, /DeviceMode never grants parent authority/);
    assert.match(resume, /only a veto of/);
    assert.match(resume, /Explicit adult flow remains/);
    assert.match(resume, /parent cookie and child device state are out of sync/);
    assert.doesNotMatch(read('src/lib/app-entry-resolve.js'), /LEGACY_PARENT_CHILD_HINT_CONFLICT/);
    assert.doesNotMatch(read('src/lib/build-app-entry-input.js'), /LEGACY_PARENT_CHILD_HINT_CONFLICT/);
  });

  it('C trusted parent privilege still resumes to /dashboard', async () => {
    const resolved = resolveAppEntry({
      parentPrivilegeActive: true,
      parentSession: { authenticated: true, privilegeActive: true },
      childSession: null,
      trustedDevice: td('parent'),
      allowedChildren: [{ id: A }],
    });
    assert.equal(resolved.destination, DESTINATIONS.PARENT_HOME);
    assert.equal(resolved.reason, 'parent_device_parent_privilege');
    assert.equal(resolved.serverAction, SERVER_ACTIONS.NONE);
    assert.equal(pathForDestination(resolved.destination), '/dashboard');

    const { result, redirects } = await resumeLogin({
      deviceMode: 'child',
      appEntryBody: {
        orchestratorActive: false,
        decision: {
          destination: resolved.destination,
          reason: resolved.reason,
          serverAction: resolved.serverAction,
          path: '/dashboard',
        },
      },
    });
    assert.equal(result.resumed, true);
    assert.equal(result.code, 'LEGACY_RESUME');
    assert.deepEqual(redirects, ['/dashboard']);
  });

  it('D trusted child or shared device + dormant parent JWT is never parent-home', () => {
    const builder = read('src/lib/build-app-entry-input.js');
    const fn = builder.slice(
      builder.indexOf('function resolveParentPrivilegeActive'),
      builder.indexOf('async function buildAppEntryInput')
    );
    assert.match(fn, /if \(activeTrustedRow\) return false/);

    const childDevice = resolveAppEntry({
      parentPrivilegeActive: false,
      parentSession: { authenticated: true, privilegeActive: false },
      childSession: null,
      trustedDevice: td('child', { defaultChildId: A }),
      allowedChildren: [{ id: A }],
    });
    assert.equal(childDevice.destination, DESTINATIONS.CHILD_HOME);
    assert.notEqual(childDevice.destination, DESTINATIONS.PARENT_HOME);

    const sharedOne = resolveAppEntry({
      parentPrivilegeActive: false,
      parentSession: { authenticated: true, privilegeActive: false },
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }],
    });
    assert.equal(sharedOne.destination, DESTINATIONS.CHILD_HOME);
    assert.equal(pathForDestination(sharedOne.destination), '/child/today');

    const sharedMany = resolveAppEntry({
      parentPrivilegeActive: false,
      parentSession: { authenticated: true, privilegeActive: false },
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }, { id: B }],
    });
    assert.equal(sharedMany.destination, DESTINATIONS.PROFILE_PICKER);
    assert.equal(
      pathForDestination(sharedMany.destination, { dailyUxActive: true }),
      '/child/profile-picker'
    );
    assert.notEqual(sharedMany.destination, DESTINATIONS.PARENT_HOME);
  });

  it('E child JWT legacy resumes to /child/today, not the role picker', async () => {
    const resolved = resolveAppEntry({
      parentPrivilegeActive: false,
      parentSession: null,
      childSession: { valid: true, childId: A },
      trustedDevice: null,
      allowedChildren: [{ id: A }],
    });
    assert.equal(resolved.destination, DESTINATIONS.CHILD_HOME);
    assert.equal(resolved.reason, 'legacy_child_session_no_trusted_device');
    assert.equal(resolved.serverAction, SERVER_ACTIONS.NONE);
    assert.equal(pathForDestination(resolved.destination), '/child/today');
    assert.notEqual(resolved.destination, DESTINATIONS.PARENT_LOGIN);

    const { result, redirects } = await resumeLogin({
      deviceMode: 'child',
      appEntryBody: {
        orchestratorActive: false,
        decision: {
          destination: resolved.destination,
          reason: resolved.reason,
          serverAction: resolved.serverAction,
          path: '/child/today',
        },
      },
    });
    assert.equal(result.resumed, true);
    assert.equal(result.code, 'LEGACY_RESUME');
    assert.deepEqual(redirects, ['/child/today']);
  });

  it('no resumable state stays on the role picker and is not a dead end', async () => {
    const { result, redirects } = await resumeLogin({
      deviceMode: 'child',
      appEntryBody: {
        orchestratorActive: false,
        decision: {
          destination: 'parent-login',
          reason: 'no_family_or_device_auth',
          serverAction: 'none',
          path: '/login',
        },
      },
    });
    assert.equal(result.resumed, false);
    assert.equal(result.code, 'NO_RESUMABLE_STATE');
    assert.deepEqual(redirects, []);
    const login = read('public/login.html');
    assert.match(login, /if \(resume && resume\.resumed\) return/);
    const declined = read('public/js/app-entry.js');
    assert.match(declined, /resume already declined/);
    assert.match(declined, /showScreen\('ENTRY_ROLE_PICK'\)/);
  });

  it('NAV_GUARD_KEY blocks a second navigation to the same target in the WebView session', async () => {
    const env = loadOrchestratorSandbox({
      pathname: '/login',
      deviceMode: 'parent',
      appEntryBody: {
        orchestratorActive: true,
        decision: {
          destination: 'parent-home',
          viewContext: 'parent',
          credentialContext: 'parent',
          reason: 'parent_device_parent_privilege',
          serverAction: 'none',
          path: '/dashboard',
        },
      },
    });
    env.sandbox.sessionStorage.setItem('stjarndag_entry_nav_guard', '/dashboard');
    const result = await env.sandbox.AppEntryOrchestrator.resumeFromLogin();
    assert.equal(result.resumed, true);
    assert.equal(result.decision.destination, 'parent-home');
    assert.deepEqual(env.redirects, []);
    assert.equal(env.sandbox.sessionStorage.getItem('stjarndag_entry_nav_guard'), '/dashboard');
    const nav = read('public/js/app-entry-orchestrator.js');
    const fn = nav.slice(nav.indexOf('function navigateOnce'), nav.indexOf('function resolveAlreadyAppliedColdStart'));
    assert.match(fn, /NAV_GUARD_KEY\) === path\) return/);
  });
});
