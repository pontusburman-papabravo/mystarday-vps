'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { resolveAppEntry, DESTINATIONS } = require('../src/lib/app-entry-resolve');
const { toPublicEntryDecision } = require('../src/lib/app-entry-decision-public');
const { isFamilyDeviceEntryEnabled } = require('../src/lib/family-device-entry-flags');
const {
  loadOrchestratorSandbox,
  childHomeAppEntryBody,
} = require('./helpers/app-entry-orchestrator-harness');

const ROOT = path.join(__dirname, '..');
const FIRST_RUN = '/login?entry=native_first_run&src=cold_start';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function nativeSandbox(extra) {
  const env = loadOrchestratorSandbox(Object.assign({ deviceMode: 'parent' }, extra || {}));
  env.sandbox.Capacitor = {
    isNativePlatform() { return true; },
    getPlatform() { return (extra && extra.platform) || 'ios'; },
  };
  return env;
}

function loggedOutBody() {
  const resolved = resolveAppEntry({
    parentSession: null,
    childSession: null,
    trustedDevice: null,
    allowedChildren: [],
  });
  return {
    orchestratorActive: false,
    decision: toPublicEntryDecision(resolved),
  };
}

function trustedUrls(fetchCalls) {
  return fetchCalls
    .map((c) => c.url)
    .filter((u) => u.indexOf('/api/auth/trusted-device') !== -1);
}

describe('native first-run — server decision stays authoritative for no-session only', () => {
  it('no session publishes parent-login that may apply while the orchestrator is off', () => {
    const pub = loggedOutBody().decision;
    assert.equal(pub.destination, DESTINATIONS.PARENT_LOGIN);
    assert.equal(pub.reason, 'no_family_or_device_auth');
    assert.equal(pub.failClosed, false);
    assert.equal(pub.applyWhenOrchestratorOff, true);
    assert.equal(pub.path, '/login');
  });

  it('parent-home, child-home, and revoked parent-login do not apply while the orchestrator is off', () => {
    const parent = toPublicEntryDecision(resolveAppEntry({
      parentPrivilegeActive: true,
      parentSession: { authenticated: true, privilegeActive: true },
      childSession: null,
      trustedDevice: null,
      allowedChildren: [],
    }));
    assert.equal(parent.destination, DESTINATIONS.PARENT_HOME);
    assert.equal(parent.reason, 'legacy_parent_session_no_trusted_device');
    assert.equal(parent.applyWhenOrchestratorOff, false);

    const child = toPublicEntryDecision(resolveAppEntry({
      parentSession: null,
      childSession: { valid: true, childId: 'child-1' },
      trustedDevice: null,
      allowedChildren: [{ id: 'child-1' }],
    }));
    assert.equal(child.destination, DESTINATIONS.CHILD_HOME);
    assert.equal(child.applyWhenOrchestratorOff, false);

    const revoked = toPublicEntryDecision(resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: { valid: false, revoked: true, deviceMode: 'shared' },
      allowedChildren: [],
    }));
    assert.equal(revoked.destination, DESTINATIONS.PARENT_LOGIN);
    assert.equal(revoked.reason, 'trusted_device_revoked');
    assert.equal(revoked.failClosed, true);
    assert.equal(revoked.applyWhenOrchestratorOff, false);
  });

  it('missing familyId does not enable family_device_entry_v1', async () => {
    assert.equal(await isFamilyDeviceEntryEnabled(null), false);
    assert.equal(await isFamilyDeviceEntryEnabled(''), false);
    assert.equal(await isFamilyDeviceEntryEnabled(undefined), false);
  });
});

describe('native first-run — cold start navigation', () => {
  it('native + no session on /home goes to first-run login and does not call trusted-device APIs', async () => {
    const env = nativeSandbox({
      pathname: '/home',
      deviceMode: 'child',
      appEntryBody: loggedOutBody(),
    });
    const result = await env.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(result.ok, true);
    assert.equal(result.code, 'LOGGED_OUT_NATIVE_ENTRY');
    assert.deepEqual(env.redirects, [FIRST_RUN]);
    assert.deepEqual(trustedUrls(env.fetchCalls), []);
    assert.equal(env.sandbox.DeviceMode.isChildMode(), false);
    assert.equal(env.sandbox.sessionStorage.getItem('stjarndag_family_device_entry_v1'), '0');
  });

  it('native + no session on / uses the same first-run login and never /child-login', async () => {
    const env = nativeSandbox({
      pathname: '/',
      appEntryBody: loggedOutBody(),
    });
    const result = await env.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(result.code, 'LOGGED_OUT_NATIVE_ENTRY');
    assert.deepEqual(env.redirects, [FIRST_RUN]);
    assert.equal(env.redirects.some((u) => u.indexOf('/child-login') !== -1), false);
  });

  it('web + no session on / stays put so the marketing page is not replaced', async () => {
    const env = loadOrchestratorSandbox({
      pathname: '/',
      appEntryBody: loggedOutBody(),
    });
    const result = await env.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'ORCHESTRATOR_OFF');
    assert.deepEqual(env.redirects, []);
  });

  it('native + parent session with orchestrator off stays on the parent shell', async () => {
    const resolved = resolveAppEntry({
      parentPrivilegeActive: true,
      parentSession: { authenticated: true, privilegeActive: true },
      childSession: null,
      trustedDevice: null,
      allowedChildren: [],
    });
    const env = nativeSandbox({
      pathname: '/home',
      appEntryBody: {
        orchestratorActive: false,
        decision: toPublicEntryDecision(resolved),
      },
    });
    const result = await env.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(result.code, 'ORCHESTRATOR_OFF');
    assert.deepEqual(env.redirects, []);
    assert.deepEqual(trustedUrls(env.fetchCalls), []);
  });

  it('native + parent session with orchestrator on still opens the parent destination', async () => {
    const env = nativeSandbox({
      pathname: '/home',
      appEntryBody: {
        orchestratorActive: true,
        decision: {
          destination: 'parent-home',
          viewContext: 'parent',
          credentialContext: 'parent',
          reason: 'parent_device_parent_privilege',
          serverAction: 'none',
          path: '/dashboard',
          failClosed: false,
          applyWhenOrchestratorOff: false,
        },
      },
    });
    const result = await env.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(result.ok, true);
    assert.deepEqual(env.redirects, ['/dashboard']);
    assert.deepEqual(trustedUrls(env.fetchCalls), []);
  });

  it('native + child session with orchestrator off does not restore or leave /home', async () => {
    const body = childHomeAppEntryBody('child-1');
    body.orchestratorActive = false;
    body.decision.applyWhenOrchestratorOff = false;
    body.decision.serverAction = 'restore-child';
    const env = nativeSandbox({
      pathname: '/home',
      deviceMode: 'child',
      appEntryBody: body,
    });
    const result = await env.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(result.code, 'ORCHESTRATOR_OFF');
    assert.deepEqual(env.redirects, []);
    assert.deepEqual(trustedUrls(env.fetchCalls), []);
    assert.equal(env.sandbox.DeviceMode.isChildMode(), true);
  });

  it('native + trusted child with orchestrator on still restores and opens child home', async () => {
    const env = nativeSandbox({
      pathname: '/home',
      deviceMode: 'child',
      appEntryBody: childHomeAppEntryBody('child-1'),
    });
    const result = await env.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(result.ok, true);
    assert.deepEqual(env.redirects, ['/child/today']);
    assert.equal(trustedUrls(env.fetchCalls).length, 1);
  });

  it('orchestrator off does not apply revoked parent-login or a forged off-flag on another destination', async () => {
    const revoked = nativeSandbox({
      pathname: '/home',
      appEntryBody: {
        orchestratorActive: false,
        decision: {
          destination: 'parent-login',
          reason: 'trusted_device_revoked',
          serverAction: 'enroll-prompt',
          failClosed: true,
          applyWhenOrchestratorOff: false,
          path: '/login',
        },
      },
    });
    const revokedResult = await revoked.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(revokedResult.code, 'ORCHESTRATOR_OFF');
    assert.deepEqual(revoked.redirects, []);
    assert.deepEqual(trustedUrls(revoked.fetchCalls), []);

    const forged = nativeSandbox({
      pathname: '/home',
      appEntryBody: {
        orchestratorActive: false,
        decision: {
          destination: 'child-home',
          reason: 'no_family_or_device_auth',
          serverAction: 'restore-child',
          failClosed: false,
          applyWhenOrchestratorOff: true,
          path: '/child/today',
          childId: 'child-1',
        },
      },
    });
    const forgedResult = await forged.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(forgedResult.code, 'ORCHESTRATOR_OFF');
    assert.deepEqual(forged.redirects, []);
    assert.deepEqual(trustedUrls(forged.fetchCalls), []);
  });
});

describe('native first-run — login copy, child login, and auth fail-safe', () => {
  it('Irish and other English locales use en-GB copy; Swedish stays Swedish', () => {
    const en = JSON.parse(read('src/locales/en-GB.json'));
    const sv = JSON.parse(read('src/locales/sv-SE.json'));
    const enWelcome = en.auth.entry.welcome;
    const svWelcome = sv.auth.entry.welcome;
    assert.equal(enWelcome.firstRunHeadline, 'Welcome to {{brand}}');
    assert.equal(enWelcome.firstRunCreateAccount, 'Create account');
    assert.equal(enWelcome.firstRunLogIn, 'Log in');
    assert.equal(enWelcome.firstRunChildLink, "I'm a child");
    assert.equal(svWelcome.firstRunHeadline, 'Välkommen till {{brand}}');
    assert.equal(svWelcome.firstRunCreateAccount, 'Skapa konto');
    assert.equal(svWelcome.firstRunLogIn, 'Logga in');
    assert.doesNotMatch(enWelcome.firstRunCreateAccount, /[åäöÅÄÖ]/);

    const sandbox = {
      console,
      document: {
        documentElement: {
          lang: 'sv',
          setAttribute() {},
          removeAttribute() {},
        },
        addEventListener() {},
        body: { dataset: { i18nManualInit: 'true' } },
      },
      navigator: { language: 'en-IE', languages: ['en-IE'] },
      sessionStorage: { getItem() { return null; }, setItem() {} },
      localStorage: { getItem() { return null; }, setItem() {} },
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(read('public/js/i18n.js'), sandbox, { filename: 'i18n.js' });
    assert.equal(sandbox.I18n._normalize('en-IE'), 'en-GB');
    assert.equal(sandbox.I18n._normalize('en-GB'), 'en-GB');
    assert.equal(sandbox.I18n._normalize('en-US'), 'en-GB');
    assert.equal(sandbox.I18n._normalize('sv'), 'sv-SE');
  });

  it('first-run puts Create account before Log in and does not auto-open child login', () => {
    const html = read('public/login.html');
    const createAt = html.indexOf('id="entryFirstRunCreateBtn"');
    const loginAt = html.indexOf('id="entryFirstRunLoginBtn"');
    const childAt = html.indexOf('id="entryFirstRunChildBtn"');
    const kidCardAt = html.indexOf('id="kid-role-card"');
    assert.ok(createAt > 0 && loginAt > createAt && childAt > loginAt);
    assert.ok(childAt < kidCardAt);
    assert.match(html, /id="entryWelcomeFirstRun" hidden/);

    const entry = read('public/js/app-entry.js');
    const initAt = entry.indexOf('function init()');
    const initFn = entry.slice(initAt, entry.indexOf('window.AppEntry'));
    assert.doesNotMatch(initFn, /\/child-login/);
    assert.match(initFn, /showNativeFirstRun\(\)/);
    assert.match(entry, /resume already declined/);
    assert.match(entry, /showScreen\('ENTRY_ROLE_PICK'\)/);
    assert.match(entry, /native_first_run_shown/);
    assert.match(entry, /native_create_account_click/);
    assert.match(entry, /native_login_click/);
  });

  it('auth me timeout and 5xx send a native user with no cached session to first-run', () => {
    const auth = read('public/js/auth.js');
    assert.match(auth, /nativeLoggedOutEntryPath\('auth_failsafe'\)/);
    assert.match(auth, /nativeLoggedOutEntryPath\('auth_me_5xx'\)/);
    assert.match(auth, /nativeLoggedOutEntryPath\(isTimeout \? 'auth_me_timeout' : 'auth_me_error'\)/);
    assert.match(auth, /const hadCachedUser = !!Auth\.getUser\(\)/);
    assert.match(auth, /!hadCachedUser && isNativeClient\(\)/);
    assert.match(auth, /res\.status >= 500 && isNativeClient\(\) && !Auth\.getUser\(\)/);
    const allow = read('src/routes/analytics.js');
    for (const name of [
      'native_first_run_shown',
      'native_create_account_click',
      'native_login_click',
      'register_viewed',
      'signup_started',
      'signup_completed',
    ]) {
      assert.match(allow, new RegExp("'" + name + "'"));
    }
  });
});
