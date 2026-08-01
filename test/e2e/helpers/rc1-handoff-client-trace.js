'use strict';

/**
 * Test-only hooks: SessionGate, navigation, and safe storage snapshot (no secret values).
 */
async function installLogoutClientTrace(page) {
  await page.evaluate(() => {
    window.__rc1LogoutTrace = {
      branches: [],
      navTargets: [],
      gateBlockedCalls: [],
    };

    const trace = window.__rc1LogoutTrace;

    if (window.SessionGate && typeof window.SessionGate.shouldBlockSessionRestore === 'function') {
      const original = window.SessionGate.shouldBlockSessionRestore.bind(window.SessionGate);
      window.SessionGate.shouldBlockSessionRestore = function rc1WrappedShouldBlock() {
        const blocked = original();
        trace.gateBlockedCalls.push(blocked);
        return blocked;
      };
      trace.sessionGateWrapped = true;
    }

    const recordNav = (type, url) => {
      let pathOnly = String(url || '');
      try {
        pathOnly = new URL(pathOnly, window.location.origin).pathname;
      } catch {
        pathOnly = pathOnly.split('?')[0];
      }
      trace.navTargets.push({ type, path: pathOnly });
      if (pathOnly === '/dashboard') trace.branches.push('session_restored_dashboard');
      if (pathOnly === '/child-login') trace.branches.push('session_restored_but_gate_blocked');
    };

    try {
      const loc = window.location;
      const origReplace = loc.replace.bind(loc);
      const origAssign = loc.assign.bind(loc);
      loc.replace = function rc1Replace(url) {
        recordNav('replace', url);
        return origReplace(url);
      };
      loc.assign = function rc1Assign(url) {
        recordNav('assign', url);
        return origAssign(url);
      };
      trace.locationWrapped = true;
    } catch {
      trace.locationWrapped = false;
    }
  });
}

async function readLogoutClientTrace(page) {
  return page.evaluate(() => {
    const trace = window.__rc1LogoutTrace || {};
    const storageKeys = (store) => {
      try {
        return Object.keys(store);
      } catch {
        return [];
      }
    };
    return {
      branches: trace.branches || [],
      navTargets: trace.navTargets || [],
      gateBlockedCalls: trace.gateBlockedCalls || [],
      sessionGateWrapped: trace.sessionGateWrapped === true,
      locationWrapped: trace.locationWrapped === true,
      sessionGatePresent: Boolean(window.SessionGate),
      shouldBlockMethodPresent: Boolean(window.SessionGate?.shouldBlockSessionRestore),
      deviceModePresent: Boolean(window.DeviceMode),
      deviceModeIsChild: window.DeviceMode?.isChildMode?.() ?? null,
      localStorageKeys: storageKeys(window.localStorage),
      sessionStorageKeys: storageKeys(window.sessionStorage),
    };
  });
}

async function readSessionGateSnapshotBeforeLogout(page) {
  return page.evaluate(() => ({
    sessionGatePresent: Boolean(window.SessionGate),
    shouldBlockMethodPresent: Boolean(window.SessionGate?.shouldBlockSessionRestore),
    shouldBlockBeforeLogout: window.SessionGate?.shouldBlockSessionRestore?.() ?? null,
    deviceModePresent: Boolean(window.DeviceMode),
    deviceModeIsChild: window.DeviceMode?.isChildMode?.() ?? null,
    localStorageKeys: (() => {
      try {
        return Object.keys(localStorage);
      } catch {
        return [];
      }
    })(),
    sessionStorageKeys: (() => {
      try {
        return Object.keys(sessionStorage);
      } catch {
        return [];
      }
    })(),
  }));
}

function inferClientBranch(trace) {
  if (!trace) return null;
  if (trace.branches?.includes('session_restored_but_gate_blocked')) {
    return 'session_restored_but_gate_blocked';
  }
  if (trace.branches?.includes('session_restored_dashboard')) {
    return 'session_restored_dashboard';
  }
  if (trace.gateBlockedCalls?.some((v) => v === true)) {
    return 'session_restored_but_gate_blocked';
  }
  return trace.inferredBranch || null;
}

module.exports = {
  installLogoutClientTrace,
  readLogoutClientTrace,
  readSessionGateSnapshotBeforeLogout,
  inferClientBranch,
};
