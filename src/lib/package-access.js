/**
 * Paket v1.2 — unified access resolution (§6.6, §8, §16.3).
 * Single source of truth for rollout, components, features, preview, view_mode.
 */

const appConfig = require('../../db/app-config');
const familySubscriptions = require('../../db/family-subscriptions');
const packageInterest = require('../../db/package-interest');
const featuresDb = require('../../db/features');
const db = require('./db');
const {
  ALL_COMPONENTS,
  PACKAGE_FEATURES,
  getComponentForFeature,
  getFeaturesForComponent,
} = require('../../config/component-feature-map');

const VALID_ROLLOUT_MODES = ['off', 'interest', 'purchase'];

/**
 * Rollout mode: app_config → env fallback → 'off'.
 * @returns {Promise<'off'|'interest'|'purchase'>}
 */
async function getRolloutMode() {
  const fromDb = await appConfig.get('PACKAGES_ROLLOUT_MODE');
  const raw = fromDb ?? process.env.PACKAGES_ROLLOUT_MODE ?? 'off';
  return VALID_ROLLOUT_MODES.includes(raw) ? raw : 'off';
}

/**
 * Derived rollout flags (§9.8).
 * @param {'off'|'interest'|'purchase'} rolloutMode
 */
function getRolloutFlags(rolloutMode) {
  return {
    purchase_enabled: rolloutMode === 'purchase',
    show_prices: rolloutMode === 'purchase',
  };
}

/**
 * View mode priority (§6.9).
 * @param {object|null} user — JWT payload (req.user)
 * @param {{ preferredViewMode?: string, hasActiveTeacchActivity?: boolean }} [session]
 */
function resolveViewMode(user, session = {}) {
  if (!user) return { mode: 'parent' };

  if (user.type === 'child') {
    if (session.hasActiveTeacchActivity) {
      return { mode: 'child_teacch' };
    }
    return { mode: 'child' };
  }

  const viewMode = session.preferredViewMode ?? user.preferred_view_mode ?? user.preferredViewMode;
  if (viewMode === 'pedagog') {
    return { mode: 'pedagog' };
  }

  return { mode: 'parent' };
}

/**
 * Normalize a component entry from family_subscriptions.components JSONB.
 * @param {string} slug
 * @param {object[]} components
 */
function resolveComponentEntry(slug, components) {
  const entry = (components || []).find((c) => c.component === slug);
  if (!entry) {
    return { has: false, state: 'disabled' };
  }

  if (entry.expires_at && new Date(entry.expires_at) <= new Date()) {
    return { has: false, state: 'disabled' };
  }

  const state = entry.state || 'active';
  if (state === 'archived') {
    return { has: true, state: 'archived' };
  }
  if (state === 'active') {
    return { has: true, state: 'active' };
  }

  return { has: false, state: 'disabled' };
}

/**
 * Archive counts per package (§8.5) — lightweight counts for access API.
 * @param {string} familyId
 */
async function getArchiveCounts(familyId) {
  const { rows } = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM professional_share_link
        WHERE family_id = $1 AND revoked_at IS NULL) AS reporting,
       (SELECT COUNT(*)::int FROM pedagog_notes pn
        JOIN child c ON c.id = pn.child_id
        WHERE c.family_id = $1) AS pedagog,
       0::int AS teacch`,
    [familyId]
  );
  return rows[0] || { reporting: 0, pedagog: 0, teacch: 0 };
}

/**
 * Build feature map for client — package features only (§8.2).
 * @param {string} familyId
 * @param {Record<string, { has: boolean, state: string }>} componentMap
 */
async function buildFeatureAccess(familyId, componentMap) {
  const result = {};
  for (const slug of PACKAGE_FEATURES) {
    const component = getComponentForFeature(slug);
    const comp = componentMap[component];
    if (!comp?.has || comp.state !== 'active') {
      result[slug] = false;
      continue;
    }
    result[slug] = await featuresDb.hasFeatureFlag(familyId, slug);
  }
  return result;
}

/**
 * Full access payload for GET /api/subscription/access.
 * @param {string} familyId
 * @param {object|null} user
 * @param {object} [session]
 */
async function getFamilyAccess(familyId, user = null, session = {}) {
  const rollout_mode = await getRolloutMode();
  const rolloutFlags = getRolloutFlags(rollout_mode);
  const view = resolveViewMode(user, session);

  const sub = await familySubscriptions.getByFamilyId(familyId);
  const rawComponents = sub?.components || [];

  // Families without subscription row are legacy lifetime_free with basic_app only
  const components = {};
  for (const slug of ALL_COMPONENTS) {
    if (!sub && slug === 'basic_app') {
      components[slug] = { has: true, state: 'active' };
    } else {
      components[slug] = resolveComponentEntry(slug, rawComponents);
    }
  }

  const preview = {};
  for (const slug of ['reporting', 'pedagog', 'teacch']) {
    preview[slug] = rollout_mode !== 'off' && !components[slug].has;
  }

  const archiveRows = await getArchiveCounts(familyId);
  const archive = {
    reporting: archiveRows.reporting ?? 0,
    pedagog: archiveRows.pedagog ?? 0,
    teacch: archiveRows.teacch ?? 0,
  };

  const featureAccess = await buildFeatureAccess(familyId, components);
  const interest = await packageInterest.getInterestMapForFamily(familyId);

  return {
    rollout_mode,
    ...rolloutFlags,
    view_mode: view.mode,
    components,
    features: featureAccess,
    preview,
    archive,
    interest,
  };
}

module.exports = {
  VALID_ROLLOUT_MODES,
  getRolloutMode,
  getRolloutFlags,
  resolveViewMode,
  resolveComponentEntry,
  getArchiveCounts,
  buildFeatureAccess,
  getFamilyAccess,
  getComponentForFeature,
  getFeaturesForComponent,
  ALL_COMPONENTS,
};
