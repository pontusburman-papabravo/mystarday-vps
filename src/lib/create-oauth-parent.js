'use strict';

const db = require('./db');
const { sendWelcomeEmail } = require('./welcome-mailer');
const { registerContact } = require('./email');
const { createNewsletterSubscription } = require('./newsletter-subscribe');
const { seedFamilyStarterActivitiesFromCanonicalDb } = require('./standard-library-family-seed');
const { loadDefaultContent } = require('./default-content');
const { enableEnglishAppForFamily } = require('./i18n-enable-english');
const { buildAutoFamilyName } = require('./registration-market-context');

const DEFAULT_ACTIVITIES = [
  { name: 'Vakna', icon: '🛏️', category: 'Morgon', star_value: 1, sort_order: 0, schema_type: 'forskola' },
  { name: 'Klä på sig', icon: '🌟', category: 'Morgon', star_value: 1, sort_order: 1, schema_type: 'forskola' },
  { name: 'Borsta tänderna', icon: '🪥', category: 'Morgon', star_value: 1, sort_order: 2, schema_type: 'forskola' },
  { name: 'Äta frukost', icon: '🍳', category: 'Morgon', star_value: 1, sort_order: 3, schema_type: 'forskola' },
  { name: 'Förskola/Skola', icon: '🏫', category: 'Förmiddag', star_value: 1, sort_order: 0, schema_type: 'forskola' },
  { name: 'Leka ute', icon: '🛝', category: 'Förmiddag', star_value: 1, sort_order: 1, schema_type: 'forskola' },
  { name: 'Pyssel', icon: '🎨', category: 'Förmiddag', star_value: 1, sort_order: 2, schema_type: 'forskola' },
  { name: 'Mellanmål', icon: '🍎', category: 'Eftermiddag', star_value: 1, sort_order: 0, schema_type: 'forskola' },
  { name: 'Leka', icon: '🧩', category: 'Eftermiddag', star_value: 1, sort_order: 1, schema_type: 'forskola' },
  { name: 'Träning/Aktivitet', icon: '🏃', category: 'Eftermiddag', star_value: 1, sort_order: 2, schema_type: 'forskola' },
  { name: 'Middag', icon: '🍽️', category: 'Kväll', star_value: 1, sort_order: 0, schema_type: 'forskola' },
  { name: 'Borsta tänderna (kväll)', icon: '🪥', category: 'Kväll', star_value: 1, sort_order: 1, schema_type: 'forskola' },
  { name: 'Pyjamas', icon: '🧸', category: 'Kväll', star_value: 1, sort_order: 2, schema_type: 'forskola' },
  { name: 'Godnattsaga', icon: '📕', category: 'Kväll', star_value: 1, sort_order: 3, schema_type: 'forskola' },
  { name: 'Sova', icon: '😴', category: 'Kväll', star_value: 1, sort_order: 4, schema_type: 'forskola' },
];

const TEMPLATE_CATEGORIES = [
  { key: 'forskola', name: 'Förskola', sort_order: 0 },
  { key: 'morgon', name: 'Morgon', sort_order: 2 },
  { key: 'dag', name: 'Dag', sort_order: 3 },
  { key: 'kvall', name: 'Kväll', sort_order: 4 },
];

const TIME_CATEGORY_OFFSET = { Morgon: 0, Förmiddag: 100, Eftermiddag: 200, Kväll: 300 };
const CATEGORY_TO_TIME_GROUP = {
  Morgon: 'morgon',
  Förmiddag: 'formiddag',
  Eftermiddag: 'eftermiddag',
  Kväll: 'kvall',
};

/**
 * @param {import('pg').PoolClient} client
 * @param {string} familyId
 * @param {string} familyLocale
 */
async function seedDefaultActivities(client, familyId, familyLocale = 'sv-SE') {
  const categoryMap = {};
  const defaultContent = loadDefaultContent(familyLocale);
  const templateCategories = defaultContent.templateCategories || TEMPLATE_CATEGORIES;

  for (const cat of templateCategories) {
    const catResult = await client.query(
      'INSERT INTO category (family_id, name, sort_order, is_default) VALUES ($1, $2, $3, true) RETURNING id',
      [familyId, cat.name, cat.sort_order]
    );
    categoryMap[cat.key] = catResult.rows[0].id;
  }

  if (familyLocale === 'sv-SE') {
    const canonicalCount = await client.query(
      `SELECT COUNT(*)::int AS count FROM default_activity_template WHERE canonical_id IS NOT NULL`
    );
    if (canonicalCount.rows[0].count > 0) {
      await seedFamilyStarterActivitiesFromCanonicalDb(client, familyId, categoryMap, familyLocale);
      return;
    }
  }

  const activities = defaultContent.activities || DEFAULT_ACTIVITIES;
  const { resolveTimeGroup, resolveTimeOffset } = require('./default-content');

  for (const act of activities) {
    const catId = categoryMap[act.schema_type];
    if (!catId) continue;
    const timeGroup = resolveTimeGroup ? resolveTimeGroup(act.category) : (CATEGORY_TO_TIME_GROUP[act.category] || 'morgon');
    const timeOffset = resolveTimeOffset ? resolveTimeOffset(act.category) : (TIME_CATEGORY_OFFSET[act.category] ?? 400);
    const combinedSort = timeOffset + (act.sort_order ?? 0);
    await client.query(
      `INSERT INTO activity_template (family_id, name, icon, category_id, star_value, is_favorite, time_group, schema_type, sort_order, source)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8, 'admin')`,
      [familyId, act.name, act.icon, catId, act.star_value, timeGroup, act.schema_type, combinedSort]
    );
  }
}

/**
 * Create family + verified parent from OAuth (Apple or Google).
 * @param {{
 *   displayName: string,
 *   email: string,
 *   appleUserId?: string|null,
 *   appleEmail?: string|null,
 *   googleUserId?: string|null,
 *   attribution?: object|null,
 *   familyLocale: string,
 *   countryCode: string,
 *   marketRegion: string,
 *   timezone: string,
 *   localeSelectionSource: string,
 *   englishBetaOfferState: string,
 *   countrySelectionSource: string,
 *   familyName?: string|null,
 * }} opts
 */
async function createParentFromOAuth(opts) {
  const {
    displayName,
    email,
    appleUserId = null,
    appleEmail = null,
    googleUserId = null,
    attribution = null,
    familyLocale,
    countryCode,
    marketRegion,
    timezone,
    localeSelectionSource,
    englishBetaOfferState,
    countrySelectionSource,
    familyName = null,
  } = opts;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const finalFamilyName = familyName || buildAutoFamilyName(displayName, familyLocale);
    const { syncCreatedFamilyAccessMirrors } = require('./family-entitlements');

    const familyResult = await client.query(
      `INSERT INTO family (
         name, timezone, subscription_status, trial_ends_at, is_lifetime_free, preferred_locale,
         locale_selected_at, locale_selection_source, english_beta_offer_state,
         country_code, market_region, country_selected_at, country_selection_source
       )
       VALUES ($1, $2, 'none', NULL, false, $3, NOW(), $4, $5, $6, $7, NOW(), $8)
       RETURNING id, created_at`,
      [
        finalFamilyName,
        timezone,
        familyLocale,
        localeSelectionSource,
        englishBetaOfferState,
        countryCode,
        marketRegion,
        countrySelectionSource,
      ]
    );
    const familyId = familyResult.rows[0].id;
    const familyCreatedAt = familyResult.rows[0].created_at;

    if (familyLocale === 'en-GB') {
      await enableEnglishAppForFamily(familyId, { client });
    }

    const parentResult = await client.query(
      `INSERT INTO parent (family_id, email, password_hash, name, verified,
                          newsletter_subscribed, family_role, apple_user_id, apple_email,
                          google_user_id, onboarding_completed)
       VALUES ($1, $2, NULL, $3, true, true, 'förälder', $4, $5, $6, false)
       RETURNING id, family_id, email, name, verified, is_admin, created_at,
                 COALESCE(onboarding_completed, true) as onboarding_completed`,
      [familyId, email, displayName, appleUserId, appleEmail, googleUserId]
    );
    const parent = parentResult.rows[0];

    await seedDefaultActivities(client, familyId, familyLocale);
    await client.query('INSERT INTO notification_preference (parent_id) VALUES ($1)', [parent.id]);
    await createNewsletterSubscription(client, parent.id, parent.email);

    await syncCreatedFamilyAccessMirrors(familyId, familyCreatedAt, countryCode, { client });

    await client.query('COMMIT');
    await runOAuthSignupSideEffects(familyId, parent, displayName, email, attribution);
    return parent;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function runOAuthSignupSideEffects(familyId, parent, displayName, email, attributionInput = null) {
  require('./analytics-tracker').trackSignupStarted(familyId);

  if (attributionInput) {
    try {
      const {
        normalizeAttributionInput,
        recordFamilyAttribution,
        toAnalyticsMetadata,
      } = require('./acquisition-attribution');
      const normalized = normalizeAttributionInput(attributionInput);
      if (normalized) {
        await recordFamilyAttribution(familyId, attributionInput, { registeredAt: new Date() });
        require('./analytics-tracker').trackSignupAttribution(
          familyId,
          toAnalyticsMetadata(normalized)
        );
      }
    } catch (attrErr) {
      console.error('[AUTH] OAuth attribution failed:', attrErr.message);
    }
  }

  if (email) {
    try {
      const waitlistDb = require('../../db/waitlist');
      if (typeof waitlistDb.linkWaitlistConversion === 'function') {
        await waitlistDb.linkWaitlistConversion(email, familyId);
      }
    } catch (wlErr) {
      console.error('[AUTH] waitlist conversion link failed:', wlErr.message);
    }
  }

  const activationP0 = require('./activation-p0');
  activationP0.resolveDefaultActivationVariant(familyId)
    .then((variant) => activationP0.ensureActivationState(familyId, new Date(), variant))
    .catch((err) => {
      console.error('[AUTH] ensureActivationState failed for', familyId, ':', err.message);
    });

  require('./journey/ingest').ingestMilestoneAsync({
    familyId,
    milestone: 'account_created',
    source: 'system',
  });

  if (!email) return;

  await registerContact(email, displayName, 'signup').catch((err) => {
    console.error('[AUTH] registerContact failed for', email, ':', err.message);
  });

  const { hasAccess } = require('../../db/features');
  const welcomeEmailAllowed = await hasAccess(familyId, 'valkomstmail');
  if (welcomeEmailAllowed) {
    sendWelcomeEmail(email, parent.id, { foralderns_namn: displayName, barnets_namn: '' }).catch((err) => {
      console.error('[AUTH] Welcome email send failed for', email, ':', err.message);
    });
  }
}

module.exports = { createParentFromOAuth, runOAuthSignupSideEffects };
