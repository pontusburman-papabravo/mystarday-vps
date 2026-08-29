'use strict';

/**
 * CHECK E — Auth / review access.
 *
 * Verifies, as far as repo data allows, that App Review always has a way
 * in: a documented reviewer account, and an email/password fallback that
 * does not depend solely on Sign in with Apple / Google (which reviewers
 * may not be able to use with an arbitrary Apple/Google ID).
 */

const { STATUS, worstStatus } = require('./constants.cjs');
const { loadReleaseComplianceConfig } = require('./load-config.cjs');
const { readFileSafe, fileExists } = require('./fs-utils.cjs');

function checkReviewAccountDocumented(repoRoot, config) {
  const docs = config.authReviewAccessEvidence?.reviewAccountDocs || ['docs/app-store-demo-konto.md'];
  const missing = docs.filter((d) => !fileExists(repoRoot, d));
  return {
    id: 'review_account_documented',
    status: missing.length ? STATUS.FAIL : STATUS.PASS,
    evidence: { expectedDocs: docs, missing },
  };
}

function checkEmailPasswordFallbackExists(repoRoot) {
  const loginRoute =
    readFileSafe(repoRoot, 'src/routes/auth/login.js') || readFileSafe(repoRoot, 'src/routes/auth/index.js');
  if (loginRoute == null) {
    return { id: 'email_password_fallback_route', status: STATUS.MANUAL_REVIEW_REQUIRED, evidence: { reason: 'login_route_file_not_found' } };
  }
  const hasEmailLogin = /router\.post\(['"]\/login['"]/i.test(loginRoute) || /email/i.test(loginRoute);
  return {
    id: 'email_password_fallback_route',
    status: hasEmailLogin ? STATUS.PASS : STATUS.FAIL,
    evidence: { hasEmailLogin },
  };
}

function checkChildAdultFlowDocumented(repoRoot, config) {
  const docs = config.authReviewAccessEvidence?.reviewAccountDocs || [];
  const anyMentionsPin = docs.some((d) => {
    const content = readFileSafe(repoRoot, d);
    return content && /\bPIN\b/i.test(content);
  });
  const reviewNotes = readFileSafe(repoRoot, 'docs/app-store-review-notes.md');
  const notesMentionPin = reviewNotes ? /\bPIN\b/i.test(reviewNotes) : false;
  const status = anyMentionsPin || notesMentionPin ? STATUS.PASS : STATUS.MANUAL_REVIEW_REQUIRED;
  return {
    id: 'child_adult_flow_documented',
    status,
    evidence: { anyMentionsPin, notesMentionPin },
  };
}

function checkNoAppleSignInOnlyOnAndroid(repoRoot) {
  const capacitorConfig =
    readFileSafe(repoRoot, 'capacitor.config.ts') || readFileSafe(repoRoot, 'capacitor.config.json');
  if (capacitorConfig == null) {
    return { id: 'no_apple_sign_in_only_on_android', status: STATUS.MANUAL_REVIEW_REQUIRED, evidence: { reason: 'capacitor_config_not_found' } };
  }
  const androidHasApple = /android[\s\S]{0,400}apple-sign-in/i.test(capacitorConfig);
  return {
    id: 'no_apple_sign_in_only_on_android',
    status: androidHasApple ? STATUS.MANUAL_REVIEW_REQUIRED : STATUS.PASS,
    evidence: { androidHasApple, note: 'Android must not require Apple Sign In (not offered there); email/password + Google are used instead.' },
  };
}

function runAuthReviewAccessChecks(repoRoot) {
  const config = loadReleaseComplianceConfig(repoRoot);
  const checks = [
    checkReviewAccountDocumented(repoRoot, config),
    checkEmailPasswordFallbackExists(repoRoot),
    checkChildAdultFlowDocumented(repoRoot, config),
    checkNoAppleSignInOnlyOnAndroid(repoRoot),
  ];
  const status = worstStatus(checks.map((c) => c.status));
  return {
    id: 'E_auth_review_access',
    title: 'E — Auth / review access',
    status,
    summary:
      status === STATUS.FAIL
        ? 'App Review does not have a documented, working way into the app independent of a personal Apple/Google account.'
        : status === STATUS.MANUAL_REVIEW_REQUIRED
          ? 'Automated auth/review-access checks pass; confirm live in App Store Connect / Play Console reviewer notes before submission.'
          : 'Reviewer account is documented, email/password login exists as a fallback, and the child/adult PIN flow is documented for reviewers.',
    evidence: { checks },
  };
}

module.exports = { runAuthReviewAccessChecks };
