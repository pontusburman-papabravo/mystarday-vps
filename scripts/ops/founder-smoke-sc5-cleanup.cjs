'use strict';

const SMOKE_EMAIL_RE = /^smoke-\d+@example\.com$/i;
/** Clock skew margin for VPS `not-before` guards (ms). */
const SMOKE_NOT_BEFORE_MARGIN_MS = 5 * 60 * 1000;

function smokeNotBeforeMs(smokeRunStartedAt) {
  return Math.max(0, Number(smokeRunStartedAt) - SMOKE_NOT_BEFORE_MARGIN_MS);
}

function isSmokeDisposableEmail(email) {
  return SMOKE_EMAIL_RE.test(String(email || '').trim());
}

/**
 * @param {object} cleanup
 */
function evaluateSc5CleanupOk(cleanup) {
  return cleanup?.ok === true;
}

/**
 * Fail-closed interpretation of VPS find-smoke-family (and post-delete re-check).
 * @returns {{ verified_absent: boolean, fail_reason?: string, family_id?: string }}
 */
function evaluateVpsLookupForAbsent(lookup) {
  if (lookup?.reason === 'too_old') {
    return { verified_absent: false, fail_reason: 'too_old' };
  }
  if (lookup?.family_id) {
    return { verified_absent: false, family_id: lookup.family_id };
  }
  return { verified_absent: true };
}

/**
 * @param {object} opts
 * @param {() => Promise<number|null>} opts.tryApiDelete — returns HTTP status or null if not attempted
 * @param {() => Promise<boolean>} opts.tryVpsDelete — VPS hard delete when API unavailable
 * @param {() => Promise<boolean>} opts.verifyFamilyAbsent — true when family/email gone
 * @param {string|null} opts.familyId
 * @param {string} opts.email
 * @param {boolean} opts.registerCreatedFamily
 */
async function runSc5CleanupContract(opts) {
  const {
    tryApiDelete,
    tryVpsDelete,
    verifyFamilyAbsent,
    familyId,
    email,
    registerCreatedFamily,
  } = opts;

  const cleanup = {
    attempted: true,
    family_id: familyId || null,
    email,
    api_status: null,
    vps_deleted: false,
    verified_absent: false,
    ok: false,
  };

  if (!registerCreatedFamily) {
    const absentResult = await verifyFamilyAbsent();
    cleanup.verified_absent = absentResult === true;
    cleanup.ok = cleanup.verified_absent === true;
    cleanup.note = 'register_did_not_create_family';
    return cleanup;
  }

  if (!isSmokeDisposableEmail(email)) {
    cleanup.error = 'email_not_smoke_disposable';
    return cleanup;
  }

  const apiStatus = await tryApiDelete();
  cleanup.api_status = apiStatus;

  let absent = await verifyFamilyAbsent();
  if (!absent) {
    cleanup.vps_deleted = await tryVpsDelete();
    absent = await verifyFamilyAbsent();
  }

  cleanup.verified_absent = absent === true;
  cleanup.ok = cleanup.verified_absent === true;
  return cleanup;
}

/**
 * Prod smoke wiring — API delete-account with VPS lookup/delete fallback.
 */
async function performSc5ProdCleanup({
  base,
  email,
  password,
  smokeRunStartedAt,
  registerCreatedFamily,
  knownFamilyId,
  parentLogin,
  parentMe,
  deleteSmokeFamily,
  vpsEnabled,
  vpsDb,
}) {
  let resolvedFamilyId = knownFamilyId || null;
  const notBeforeMs = smokeNotBeforeMs(smokeRunStartedAt);

  async function vpsLookup() {
    if (!vpsEnabled || !vpsDb) return null;
    return vpsDb('find-smoke-family', null, [
      '--email', email,
      '--not-before', String(notBeforeMs),
    ]);
  }

  async function verifyAbsentFailClosed() {
    if (vpsEnabled && vpsDb) {
      const lookup = await vpsLookup();
      const interpreted = evaluateVpsLookupForAbsent(lookup);
      if (interpreted.fail_reason) {
        return false;
      }
      if (interpreted.family_id) {
        resolvedFamilyId = interpreted.family_id;
        const exists = vpsDb('family-exists', interpreted.family_id);
        return exists?.exists !== true;
      }
      return interpreted.verified_absent === true;
    }
    if (registerCreatedFamily) {
      const fid = await resolveFamilyId();
      if (!fid) return false;
      resolvedFamilyId = fid;
      const cookies = parentLogin.jar();
      const login = await parentLogin.fn(cookies, email, password);
      return login.res?.status !== 200;
    }
    return true;
  }

  async function resolveFamilyId() {
    if (resolvedFamilyId) return resolvedFamilyId;
    const cookies = parentLogin.jar();
    const login = await parentLogin.fn(cookies, email, password);
    if (login.body?.user?.family_id) {
      resolvedFamilyId = login.body.user.family_id;
      return resolvedFamilyId;
    }
    const meRes = await fetch(`${base}/api/auth/me`, {
      headers: { Cookie: cookies.h() },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      resolvedFamilyId = me.family_id || null;
    }
    return resolvedFamilyId;
  }

  return runSc5CleanupContract({
    email,
    familyId: resolvedFamilyId,
    registerCreatedFamily,
    tryApiDelete: async () => {
      const cookies = parentLogin.jar();
      const login = await parentLogin.fn(cookies, email, password);
      if (login.res?.status !== 200) return null;
      if (parentMe) {
        const me = await parentMe(cookies);
        resolvedFamilyId = me?.family_id || resolvedFamilyId;
      }
      return deleteSmokeFamily(cookies, login.csrf);
    },
    tryVpsDelete: async () => {
      if (!vpsEnabled || !vpsDb) return false;
      let fid = resolvedFamilyId;
      if (!fid) {
        const lookup = await vpsLookup();
        if (lookup?.reason === 'too_old') return false;
        fid = lookup?.family_id;
      }
      if (!fid) return false;
      resolvedFamilyId = fid;
      const out = vpsDb('delete-smoke-family', fid, [
        '--email', email,
        '--not-before', String(notBeforeMs),
      ]);
      return out?.ok === true;
    },
    verifyFamilyAbsent: verifyAbsentFailClosed,
  });
}

module.exports = {
  SMOKE_EMAIL_RE,
  SMOKE_NOT_BEFORE_MARGIN_MS,
  smokeNotBeforeMs,
  isSmokeDisposableEmail,
  evaluateSc5CleanupOk,
  evaluateVpsLookupForAbsent,
  runSc5CleanupContract,
  performSc5ProdCleanup,
};
