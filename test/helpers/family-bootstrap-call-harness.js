'use strict';

/**
 * Executable instrumentation for Family / Settings bootstrap API call counts.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const runtime = require('./family-runtime-integration-harness');

const ROOT = path.join(__dirname, '../..');

function createSandbox() {
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function loadModule(sandbox, relativePath) {
  const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  vm.runInContext(code, sandbox, { filename: relativePath });
}

function resetInflight(sandbox) {
  if (sandbox.SharedFamilyFetch && sandbox.SharedFamilyFetch.clearInflight) {
    sandbox.SharedFamilyFetch.clearInflight();
  }
  delete sandbox.__familyWarmFetch;
}

function createTrackedApi(sandbox) {
  const log = [];
  const me = { id: 'parent-1', type: 'parent', email: 'qa@example.com' };
  const fam = { id: 'fam-1', name: 'Testfamilj', children: [] };
  const apiFn = async function (url) {
    log.push(url);
    if (url === '/api/auth/me') return me;
    if (url === '/api/family') return fam;
    throw new Error('unexpected api call: ' + url);
  };
  sandbox.Auth = { api: apiFn, getUser: function () { return me; } };
  return {
    log: log,
    me: me,
    fam: fam,
    apiFn: apiFn,
    count: function (url) { return log.filter(function (u) { return u === url; }).length; },
    snapshot: function () {
      return { family: this.count('/api/family'), me: this.count('/api/auth/me'), total: log.length };
    },
  };
}

async function simulateLegacyFamilyHardLoad() {
  const sandbox = createSandbox();
  const tracked = createTrackedApi(sandbox);
  await Promise.all([tracked.apiFn('/api/family'), tracked.apiFn('/api/family')]);
  return tracked.snapshot();
}

async function simulateFamilyHardLoad() {
  const result = await runtime.runSharedFetchConcurrent({ id: 'fam-1', children: [] });
  return { family: result.tracker.count('/api/family'), me: 0, total: result.tracker.log.length };
}

async function simulateFamilySoftNav() {
  const result = await runtime.runFamilyInit({ id: 'fam-1', name: 'Soft nav', children: [] });
  return { family: result.tracker.count('/api/family'), me: 0, total: result.tracker.log.length };
}

async function simulateSettingsBoot(useSharedFetch, includeDuplicateCoparent) {
  const sandbox = createSandbox();
  const tracked = createTrackedApi(sandbox);
  loadModule(sandbox, 'public/js/api-error-classification.js');
  if (useSharedFetch) loadModule(sandbox, 'public/js/shared-family-fetch.js');
  loadModule(sandbox, 'public/js/settings-page-bootstrap.js');
  resetInflight(sandbox);

  const Boot = sandbox.SettingsPageBootstrap;
  const apiBind = sandbox.Auth.api.bind(sandbox.Auth);

  async function bootCoParent(meArg, famArg) {
    const me = meArg || await sandbox.Auth.api('/api/auth/me');
    const fam = famArg || (sandbox.SharedFamilyFetch
      ? await sandbox.SharedFamilyFetch.fetch(apiBind)
      : await sandbox.Auth.api('/api/family'));
    return { me: me, fam: fam };
  }

  const session = await Boot.validateSession(apiBind);
  const familyResult = await Boot.loadFamilyData(apiBind);
  if (includeDuplicateCoparent) await bootCoParent();
  else if (familyResult.ok) await bootCoParent(session.me, familyResult.fam);

  return tracked.snapshot();
}

async function simulateLaterFamilyRefresh() {
  const result = await runtime.runSharedFetchSequentialRefresh(
    { id: 'fam-1', name: 'A', children: [] },
    { id: 'fam-1', name: 'B', children: [] }
  );
  return {
    first: result.first.name,
    second: result.second.name,
    family: result.tracker.count('/api/family'),
  };
}

module.exports = {
  simulateLegacyFamilyHardLoad,
  simulateFamilyHardLoad,
  simulateFamilySoftNav,
  simulateSettingsBoot,
  simulateLaterFamilyRefresh,
};
