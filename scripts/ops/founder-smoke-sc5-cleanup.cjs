'use strict';

const SMOKE_EMAIL_RE = /^smoke-\d+@example\.com$/i;

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
    cleanup.verified_absent = await verifyFamilyAbsent();
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
      const fid = resolvedFamilyId || (await vpsDb('find-smoke-family', null, [
        '--email', email,
        '--not-before', String(smokeRunStartedAt),
      ]))?.family_id;
      if (!fid) return false;
      resolvedFamilyId = fid;
      const out = vpsDb('delete-smoke-family', fid, [
        '--email', email,
        '--not-before', String(smokeRunStartedAt),
      ]);
      return out?.ok === true;
    },
    verifyFamilyAbsent: async () => {
      if (vpsEnabled && vpsDb) {
        const lookup = await vpsDb('find-smoke-family', null, [
          '--email', email,
          '--not-before', String(smokeRunStartedAt),
        ]);
        if (lookup?.family_id) {
          resolvedFamilyId = lookup.family_id;
          const exists = vpsDb('family-exists', lookup.family_id);
          return exists?.exists !== true;
        }
        return true;
      }
      const fid = await resolveFamilyId();
      if (!fid) return true;
      const cookies = parentLogin.jar();
      const login = await parentLogin.fn(cookies, email, password);
      return login.res?.status !== 200;
    },
  });
}

module.exports = {
  SMOKE_EMAIL_RE,
  isSmokeDisposableEmail,
  evaluateSc5CleanupOk,
  runSc5CleanupContract,
  performSc5ProdCleanup,
};
