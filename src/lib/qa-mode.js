/**
 * QA_MODE — gated test helpers for automated QA on staging/VPS.
 *
 * Enable ONLY on test servers:
 *   QA_MODE=true
 *   QA_SECRET=<random string ≥32 chars>
 *
 * Never enable on public production without network restrictions.
 */

function isQaMode() {
  return process.env.QA_MODE === 'true' && !!process.env.QA_SECRET;
}

/** Expose verify/reset tokens in API responses (dev or QA_MODE). */
function exposeTestTokens() {
  return process.env.NODE_ENV !== 'production' || isQaMode();
}

function verifyQaSecret(req) {
  const header = req.headers['x-qa-secret'] || req.headers['X-QA-Secret'];
  return isQaMode() && header && header === process.env.QA_SECRET;
}

module.exports = {
  isQaMode,
  exposeTestTokens,
  verifyQaSecret,
};
