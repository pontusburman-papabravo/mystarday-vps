'use strict';

const WIZARD_PIN_TTL_MS = 10 * 60 * 1000;
const pending = new Map();

function rememberCreatedPin(childId, parentId, pin) {
  if (!childId || !parentId || !pin) return;
  pending.set(String(childId), {
    pin: String(pin),
    parentId: String(parentId),
    expiresAt: Date.now() + WIZARD_PIN_TTL_MS,
  });
}

function consumeCreatedPin(childId, parentId) {
  const key = String(childId);
  const row = pending.get(key);
  if (!row) return null;
  pending.delete(key);
  if (row.expiresAt <= Date.now()) return null;
  if (row.parentId !== String(parentId)) return null;
  return row.pin;
}

function clearCreatedPin(childId) {
  pending.delete(String(childId));
}

module.exports = {
  WIZARD_PIN_TTL_MS,
  rememberCreatedPin,
  consumeCreatedPin,
  clearCreatedPin,
};
