/**
 * QA & smoke-test accounts — single source of truth.
 * Docs: docs/qa-test-account.md
 *
 * Tiers:
 *   PROD_REVIEW  — App Store review + prod manual QA (never delete)
 *   LOCAL_SMOKE  — local/CI mobile gate (2 children, idempotent seed)
 */

/** Prod: App Store review + all logged-in prod QA */
const REVIEW_DOMAIN = 'my' + 'star' + 'day.se';
export const PROD_REVIEW = {
  parentEmail: 'review@' + REVIEW_DOMAIN,
  parentPassword: 'AppReview2026!',
  parentName: 'Review Tester',
  childName: 'Anna',
  childPin: '4455',
  baseUrl: 'https://' + REVIEW_DOMAIN,
};

/** Local dev / CI: mobile gate + hub screenshots (2 children) */
export const LOCAL_SMOKE = {
  parentEmail: 'qa.mobil@test.stjarndag.local',
  parentPassword: 'QaMobilTest2026!Secure',
  parentName: 'QA Mobil',
  baseUrl: 'http://127.0.0.1:3000',
  children: [
    { name: 'Astrid', pin: '4829', emoji: '⭐', birthday: '2016-05-15' },
    { name: 'Erik', pin: '7391', emoji: '🚀', birthday: '2018-03-20' },
  ],
};

/** First child of LOCAL_SMOKE — default for single-child scripts */
export const LOCAL_SMOKE_PRIMARY = LOCAL_SMOKE.children[0];

/** Parent emails that cleanup scripts must never delete */
export const PROTECTED_PARENT_EMAILS = [
  PROD_REVIEW.parentEmail,
  LOCAL_SMOKE.parentEmail,
  'Pontus@burman.cc',
];

/** Local-part prefixes that must never be deleted on any domain (App Store review). */
const PROTECTED_EMAIL_LOCAL_PARTS = ['review'];

/**
 * App Store review account — must never be deleted by cleanup or test scripts.
 */
export function isProtectedParentEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const lower = email.trim().toLowerCase();
  if (PROTECTED_PARENT_EMAILS.some((p) => lower === p.toLowerCase())) return true;
  const at = lower.indexOf('@');
  if (at <= 0) return false;
  const local = lower.slice(0, at);
  return PROTECTED_EMAIL_LOCAL_PARTS.includes(local);
}

export function assertEmailsSafeToDelete(emails, context = 'cleanup') {
  const blocked = (emails || []).filter((e) => isProtectedParentEmail(e));
  if (blocked.length) {
    throw new Error(
      `[${context}] BLOCKED: cannot delete protected account(s): ${blocked.join(', ')}`
    );
  }
}

/**
 * Ephemeral test families safe to delete (regex on parent email).
 * See scripts/cleanup-qa-test-families.js
 */
export const EPHEMERAL_EMAIL_PATTERNS = [
  /^act1-(e2e|curl|debug)-.+@example\.com$/i,
  /^feat1-qa-.+@example\.com$/i,
  /^feat1c-browser-.+@example\.com$/i,
  /^helrutin-qa-.+@example\.com$/i,
  /^(platform|family|planning|rewards)-qa-test@example\.com$/i,
];

export function isEphemeralTestEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (isProtectedParentEmail(email)) return false;
  const lower = email.toLowerCase();
  return EPHEMERAL_EMAIL_PATTERNS.some((re) => re.test(lower));
}

function isLocalBase(base) {
  if (!base) return true;
  try {
    const host = new URL(base).hostname;
    return host === '127.0.0.1' || host === 'localhost';
  } catch {
    return false;
  }
}

/**
 * Resolve smoke credentials from env with tier-appropriate defaults.
 * Prod base URL → no defaults (caller must set SMOKE_* or use PROD_REVIEW explicitly).
 */
export function resolveSmokeCredentials(env = process.env) {
  const base = env.BASE || env.BASE_URL || LOCAL_SMOKE.baseUrl;
  const local = isLocalBase(base);
  const tier = local ? LOCAL_SMOKE : null;

  const parentEmail = env.SMOKE_PARENT_EMAIL || env.REVIEW_EMAIL || (local ? tier.parentEmail : '');
  const parentPassword =
    env.SMOKE_PARENT_PASSWORD || env.REVIEW_PASSWORD || (local ? tier.parentPassword : '');
  const parentName = env.SMOKE_PARENT_NAME || (local ? tier.parentName : 'QA');

  const childName = env.SMOKE_CHILD_NAME || (local ? LOCAL_SMOKE_PRIMARY.name : PROD_REVIEW.childName);
  const childPin = env.SMOKE_CHILD_PIN || (local ? LOCAL_SMOKE_PRIMARY.pin : PROD_REVIEW.childPin);
  const child2Name = env.SMOKE_CHILD2_NAME || (local ? LOCAL_SMOKE.children[1].name : '');
  const child2Pin = env.SMOKE_CHILD2_PIN || (local ? LOCAL_SMOKE.children[1].pin : '');

  return {
    base,
    parentEmail,
    parentPassword,
    parentName,
    childName,
    childPin,
    child2Name,
    child2Pin,
    children: local
      ? tier.children.map((c, i) => ({
          name: (i === 0 ? childName : child2Name) || c.name,
          pin: (i === 0 ? childPin : child2Pin) || c.pin,
          emoji: c.emoji,
          birthday: c.birthday,
        }))
      : [{ name: childName, pin: childPin }],
  };
}

/** Platform/hub QA — same local family; override via PLATFORM_QA_* or SMOKE_* */
export function resolvePlatformCredentials(env = process.env) {
  const smoke = resolveSmokeCredentials(env);
  return {
    email:
      env.PLATFORM_QA_EMAIL ||
      env.FAMILY_QA_EMAIL ||
      env.PLANNING_QA_EMAIL ||
      env.REWARDS_QA_EMAIL ||
      env.SMOKE_PARENT_EMAIL ||
      smoke.parentEmail,
    password:
      env.PLATFORM_QA_PASSWORD ||
      env.FAMILY_QA_PASSWORD ||
      env.PLANNING_QA_PASSWORD ||
      env.REWARDS_QA_PASSWORD ||
      env.SMOKE_PARENT_PASSWORD ||
      smoke.parentPassword,
    parentName: smoke.parentName,
  };
}
