'use strict';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCsvEnv(name) {
  const raw = process.env[name];
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isValidFamilyUuid(value) {
  return UUID_RE.test(String(value).trim());
}

/**
 * Strict sandbox family allowlist (no wildcard).
 * @returns {{ ids: Set<string>, invalidEntries: string[] }}
 */
function getStrictSandboxFamilyAllowlist() {
  const raw = parseCsvEnv('REVENUECAT_SANDBOX_FAMILY_IDS');
  const ids = new Set();
  const invalidEntries = [];
  for (const entry of raw) {
    if (entry === '*') {
      invalidEntries.push('*');
      continue;
    }
    if (!isValidFamilyUuid(entry)) {
      invalidEntries.push(entry);
      continue;
    }
    ids.add(entry.toLowerCase());
  }
  return { ids, invalidEntries };
}

function isSandboxPurchasesFlagEnabled() {
  const v = process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
  return v === '1' || v === 'true' || v === 'yes';
}

function normalizeFamilyId(familyId) {
  if (!familyId || typeof familyId !== 'string') return null;
  const trimmed = familyId.trim();
  if (!isValidFamilyUuid(trimmed)) return null;
  return trimmed.toLowerCase();
}

function isFamilyInStrictSandboxAllowlist(familyId) {
  const normalized = normalizeFamilyId(familyId);
  if (!normalized) return false;
  const { ids } = getStrictSandboxFamilyAllowlist();
  return ids.has(normalized);
}

module.exports = {
  isValidFamilyUuid,
  getStrictSandboxFamilyAllowlist,
  isSandboxPurchasesFlagEnabled,
  normalizeFamilyId,
  isFamilyInStrictSandboxAllowlist,
};
