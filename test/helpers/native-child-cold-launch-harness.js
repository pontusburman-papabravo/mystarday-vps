'use strict';

/**
 * Deterministic simulation of native child-first cold launch navigation.
 * Models stale parent access_token + valid child refresh_token (pre-fix loop).
 */

const PARENT = 'parent';
const CHILD = 'child';

/**
 * @typedef {'parent'|'child'|null} MeType
 */

/**
 * Legacy client: /api/auth/me reads access JWT only; restoreParentSession may apply handoff.
 */
function legacyResolveMeType(state) {
  if (state.accessType === CHILD) return CHILD;
  if (state.accessType === PARENT) return PARENT;
  return null;
}

/**
 * Fixed stack: refresh child wins → access aligned before /me.
 */
function fixedResolveMeType(state) {
  if (state.refreshType === CHILD && state.refreshValid) return CHILD;
  if (state.accessType === CHILD) return CHILD;
  if (state.accessType === PARENT) return PARENT;
  return null;
}

/**
 * One cold-launch navigation step (child/today ↔ child-login).
 * @returns {{ nextPath: string, navigations: number, loop: boolean }}
 */
function simulateColdLaunchStep(path, meType, options) {
  const opts = options || {};
  const deviceModeChild = opts.deviceModeChild !== false;
  const picker = !!opts.picker;
  let navigations = 0;

  if (path === '/child/today') {
    if (meType !== CHILD) {
      navigations += 1;
      const hops = (opts.loopHops || 0) + 1;
      const dest = deviceModeChild && hops >= 2 ? '/child-login?picker=1' : '/child-login';
      return { nextPath: dest, navigations, loop: false, loopHops: hops };
    }
    return { nextPath: '/child/today', navigations: 0, loop: false, loopHops: 0 };
  }

  if (path === '/child-login' || path.startsWith('/child-login')) {
    if (picker) {
      return { nextPath: path, navigations: 0, loop: false, loopHops: opts.loopHops || 0 };
    }
    if (meType === CHILD && deviceModeChild) {
      navigations += 1;
      return { nextPath: '/child/today', navigations, loop: false, loopHops: opts.loopHops || 0 };
    }
    return { nextPath: path, navigations: 0, loop: false, loopHops: opts.loopHops || 0 };
  }

  return { nextPath: path, navigations: 0, loop: false, loopHops: opts.loopHops || 0 };
}

/**
 * Run up to maxSteps navigations; detect redirect loop (repeated path toggling).
 */
function runColdLaunchHarness(resolveMeType, initialState, maxSteps) {
  const steps = maxSteps || 6;
  let path = '/child/today';
  let totalNav = 0;
  let loopHops = 0;
  const trace = [path];

  for (let i = 0; i < steps; i++) {
    const meType =
      resolveMeType.length >= 2
        ? resolveMeType(initialState, path)
        : resolveMeType(initialState);
    const step = simulateColdLaunchStep(path, meType, {
      deviceModeChild: true,
      picker: path.indexOf('picker=1') !== -1,
      loopHops,
    });
    totalNav += step.navigations;
    loopHops = step.loopHops || 0;
    if (step.nextPath === path) break;
    path = step.nextPath;
    trace.push(path);
  }

  const loop =
    trace.length >= 4
    && trace[trace.length - 1] !== trace[trace.length - 2]
    && trace[trace.length - 1] === trace[trace.length - 3];

  const finalMe =
    resolveMeType.length >= 2
      ? resolveMeType(initialState, path)
      : resolveMeType(initialState);

  return {
    trace,
    totalNavigations: totalNav,
    stableOnChildToday: path === '/child/today' && finalMe === CHILD,
    redirectLoop: loop,
    endedOnPicker: path.indexOf('picker=1') !== -1,
  };
}

/**
 * Android WebView race: parent access on barnvy, child refresh visible after bounce to login.
 */
function legacyIntermittentResolveMeType(state, path) {
  if (path.indexOf('/child-login') === 0 && state.refreshType === CHILD && state.refreshValid) {
    return CHILD;
  }
  return legacyResolveMeType(state);
}

module.exports = {
  legacyResolveMeType,
  legacyIntermittentResolveMeType,
  fixedResolveMeType,
  simulateColdLaunchStep,
  runColdLaunchHarness,
};
