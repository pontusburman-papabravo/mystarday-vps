'use strict';

const { DESTINATIONS, SERVER_ACTIONS } = require('./app-entry-resolve');

const ALLOWED_DESTINATIONS = new Set(Object.values(DESTINATIONS));
const ALLOWED_SERVER_ACTIONS = new Set(Object.values(SERVER_ACTIONS));

function pathForDestination(destination, options) {
  const dailyUx = options && options.dailyUxActive === true;
  switch (destination) {
    case DESTINATIONS.PARENT_HOME:
      return '/dashboard';
    case DESTINATIONS.CHILD_HOME:
      return '/child/today';
    case DESTINATIONS.PROFILE_PICKER:
      return dailyUx ? '/child/profile-picker' : '/child-login?shared_device=1&entry_picker=1';
    case DESTINATIONS.PARENT_LOGIN:
      return '/login';
    case DESTINATIONS.DEVICE_SETUP:
      return '/settings#trusted-devices';
    default:
      return '/login';
  }
}

/**
 * Strip internal fields; safe for browser consumption (no tokens/secrets).
 */
function toPublicEntryDecision(resolved, options) {
  const destination = ALLOWED_DESTINATIONS.has(resolved.destination)
    ? resolved.destination
    : DESTINATIONS.PARENT_LOGIN;
  const serverAction = ALLOWED_SERVER_ACTIONS.has(resolved.serverAction)
    ? resolved.serverAction
    : SERVER_ACTIONS.NONE;

  return {
    destination,
    deviceMode: resolved.deviceMode ?? null,
    viewContext: resolved.viewContext,
    credentialContext: resolved.credentialContext,
    childId: resolved.childId ?? null,
    reason: resolved.reason,
    serverAction,
    failClosed: resolved.failClosed === true,
    path: pathForDestination(destination, options),
  };
}

module.exports = {
  toPublicEntryDecision,
  pathForDestination,
};
