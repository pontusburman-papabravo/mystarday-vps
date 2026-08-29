'use strict';

/**
 * CHECK F — Account deletion (Apple 5.1.1(v) / Play Data Safety account
 * deletion requirement).
 *
 * Verifies a user-visible entry point exists in the client, a server route
 * exists to actually delete the account, and the release checklist requires
 * a manual functional test (this repo check cannot click a button).
 */

const { STATUS, worstStatus } = require('./constants.cjs');
const { loadReleaseComplianceConfig } = require('./load-config.cjs');
const { readFileSafe, fileExists } = require('./fs-utils.cjs');

function runAccountDeletionChecks(repoRoot) {
  const config = loadReleaseComplianceConfig(repoRoot);
  const evidence = config.accountDeletionEvidence || {};
  const checks = [];

  const routeContent = readFileSafe(repoRoot, evidence.routeFile || 'src/routes/family/account.js');
  const routeRegex = evidence.routeMustMatch ? new RegExp(evidence.routeMustMatch) : null;
  checks.push({
    id: 'server_route_exists',
    status: routeContent && routeRegex && routeRegex.test(routeContent) ? STATUS.PASS : STATUS.FAIL,
    evidence: { file: evidence.routeFile, found: Boolean(routeContent) },
  });

  const clientContent = readFileSafe(repoRoot, evidence.clientEntryFile || 'public/settings.html');
  const clientMustMatch = evidence.clientEntryMustMatch || 'deleteAccountBtn';
  checks.push({
    id: 'client_entry_point_exists',
    status: clientContent && clientContent.includes(clientMustMatch) ? STATUS.PASS : STATUS.FAIL,
    evidence: { file: evidence.clientEntryFile, mustMatch: clientMustMatch, found: Boolean(clientContent) },
  });

  // Cannot be verified by static analysis — the button must actually delete
  // the account end-to-end on a real build before every submission.
  checks.push({
    id: 'manual_functional_test_required',
    status: STATUS.MANUAL_REVIEW_REQUIRED,
    evidence: {
      reason: 'Automated checks only prove the code paths exist. A human must click through account deletion on the review build before submission.',
    },
  });

  const status = worstStatus(checks.map((c) => c.status));
  return {
    id: 'F_account_deletion',
    title: 'F — Account deletion',
    status,
    summary:
      status === STATUS.FAIL
        ? 'Account deletion entry point and/or server route is missing or was moved without updating config/release-compliance-gate.json.'
        : 'Server route and client entry point both exist. Manual functional test on the review build is still required before submission.',
    evidence: { checks },
  };
}

module.exports = { runAccountDeletionChecks };
