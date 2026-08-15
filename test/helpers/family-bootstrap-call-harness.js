'use strict';

/**
 * Executable instrumentation for Family / Settings bootstrap API call counts.
 * Used by family-device-rate-limit-hardening tests — not shipped client code.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '../..');

function createSandbox() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    document: {
      getElementById: function () { return null; },
      createElement: function (tag) {
        return {
          tagName: tag,
          className: '',
          id: '',
          textContent: '',
          innerHTML: '',
          classList: { add: function () {}, remove: function () {} },
          setAttribute: function () {},
          appendChild: function () {},
        };
      },
      querySelector: function () { return null; },
      body: { insertBefore: function () {} },
    },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function loadModule(sandbox, relativePath) {
  const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  vm.runInContext(code, sandbox, { filename: relativePath });
}

function loadStack(sandbox, modules) {
  modules.forEach(function (mod) { loadModule(sandbox, mod); });
}

function resetFamilyWarmState(sandbox) {
  delete sandbox.__familyWarmData;
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
    count: function (url) {
      return log.filter(function (u) { return u === url; }).length;
    },
    snapshot: function () {
      return {
        family: this.count('/api/family'),
        me: this.count('/api/auth/me'),
        total: log.length,
      };
    },
  };
}

/**
 * Legacy family hard load: parallel consumers each call /api/family directly.
 */
async function simulateLegacyFamilyHardLoad() {
  const sandbox = createSandbox();
  const tracked = createTrackedApi(sandbox);
  resetFamilyWarmState(sandbox);
  await Promise.all([
    tracked.apiFn('/api/family'),
    tracked.apiFn('/api/family'),
  ]);
  return tracked.snapshot();
}

/**
 * Current family hard load: SharedFamilyFetch + warm prefetch coalescing.
 */
async function simulateFamilyHardLoad() {
  const sandbox = createSandbox();
  const tracked = createTrackedApi(sandbox);
  loadStack(sandbox, [
    'public/js/api-error-classification.js',
    'public/js/shared-family-fetch.js',
  ]);
  resetFamilyWarmState(sandbox);

  function prefetchFamily() {
    if (sandbox.__familyWarmFetch || sandbox.__familyWarmData) return;
    sandbox.__familyWarmFetch = sandbox.SharedFamilyFetch.fetch(sandbox.Auth.api.bind(sandbox.Auth))
      .catch(function () {
        sandbox.__familyWarmFetch = null;
        return null;
      });
  }

  async function fetchFamily() {
    if (sandbox.__familyWarmFetch) return sandbox.__familyWarmFetch;
    return sandbox.SharedFamilyFetch.fetch(sandbox.Auth.api.bind(sandbox.Auth));
  }

  prefetchFamily();
  await Promise.all([fetchFamily(), fetchFamily()]);
  return tracked.snapshot();
}

/**
 * Parent Magic soft-nav to Family: warmFamilyFetch + prefetch + init fetchFamily.
 */
async function simulateFamilySoftNav(useSharedFetch) {
  const sandbox = createSandbox();
  const tracked = createTrackedApi(sandbox);
  if (useSharedFetch) {
    loadStack(sandbox, [
      'public/js/api-error-classification.js',
      'public/js/shared-family-fetch.js',
    ]);
  }
  resetFamilyWarmState(sandbox);

  function warmFamilyFetchLegacy() {
    if (sandbox.__familyWarmFetch) return;
    sandbox.__familyWarmFetch = sandbox.Auth.api('/api/family')
      .then(function (data) {
        sandbox.__familyWarmData = data;
        return data;
      })
      .catch(function () {
        sandbox.__familyWarmFetch = null;
        return null;
      });
  }

  function warmFamilyFetchCurrent() {
    if (sandbox.__familyWarmFetch) return;
    if (sandbox.SharedFamilyFetch) {
      sandbox.__familyWarmFetch = sandbox.SharedFamilyFetch.fetch(sandbox.Auth.api.bind(sandbox.Auth))
        .catch(function () {
          sandbox.__familyWarmFetch = null;
          return null;
        });
      return;
    }
    warmFamilyFetchLegacy();
  }

  function prefetchFamily() {
    if (sandbox.__familyWarmData || sandbox.__familyWarmFetch) return;
    if (sandbox.SharedFamilyFetch) {
      sandbox.__familyWarmFetch = sandbox.SharedFamilyFetch.fetch(sandbox.Auth.api.bind(sandbox.Auth))
        .catch(function () {
          sandbox.__familyWarmFetch = null;
          return null;
        });
      return;
    }
    warmFamilyFetchLegacy();
  }

  async function fetchFamily() {
    if (sandbox.__familyWarmFetch) return sandbox.__familyWarmFetch;
    if (sandbox.SharedFamilyFetch) {
      return sandbox.SharedFamilyFetch.fetch(sandbox.Auth.api.bind(sandbox.Auth));
    }
    return sandbox.Auth.api('/api/family');
  }

  const warmFn = useSharedFetch ? warmFamilyFetchCurrent : warmFamilyFetchLegacy;
  warmFn();
  prefetchFamily();
  await fetchFamily();
  return tracked.snapshot();
}

/**
 * Settings bootstrap with optional duplicate coparent boot (inline — no DOM modal).
 */
async function simulateSettingsBoot(useSharedFetch, includeDuplicateCoparent) {
  const sandbox = createSandbox();
  const tracked = createTrackedApi(sandbox);
  loadStack(sandbox, ['public/js/api-error-classification.js']);
  if (useSharedFetch) {
    loadModule(sandbox, 'public/js/shared-family-fetch.js');
  }
  loadModule(sandbox, 'public/js/settings-page-bootstrap.js');
  resetFamilyWarmState(sandbox);

  const Boot = sandbox.SettingsPageBootstrap;
  const apiBind = sandbox.Auth.api.bind(sandbox.Auth);

  async function bootCoParent(meArg, famArg) {
    if (meArg && famArg) return { me: meArg, fam: famArg };
    const me = meArg || await sandbox.Auth.api('/api/auth/me');
    const fam = famArg || (sandbox.SharedFamilyFetch
      ? await sandbox.SharedFamilyFetch.fetch(apiBind)
      : await sandbox.Auth.api('/api/family'));
    return { me: me, fam: fam };
  }

  const session = await Boot.validateSession(apiBind);
  const familyResult = await Boot.loadFamilyData(apiBind);

  if (includeDuplicateCoparent) {
    await bootCoParent();
  } else if (familyResult.ok) {
    await bootCoParent(session.me, familyResult.fam);
  }

  return tracked.snapshot();
}

module.exports = {
  simulateLegacyFamilyHardLoad,
  simulateFamilyHardLoad,
  simulateFamilySoftNav,
  simulateSettingsBoot,
};
