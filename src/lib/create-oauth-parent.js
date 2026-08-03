'use strict';

const db = require('./db');
const { sendWelcomeEmail } = require('./welcome-mailer');
const { registerContact } = require('./email');
const { createNewsletterSubscription } = require('./newsletter-subscribe');

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
 */
async function seedDefaultActivities(client, familyId) {
  const categoryMap = {};
  for (const cat of TEMPLATE_CATEGORIES) {
    const catResult = await client.query(
      'INSERT INTO category (family_id, name, sort_order, is_default) VALUES ($1, $2, $3, true) RETURNING id',
      [familyId, cat.name, cat.sort_order]
    );
    categoryMap[cat.key] = catResult.rows[0].id;
  }

  for (const act of DEFAULT_ACTIVITIES) {
    const catId = categoryMap[act.schema_type];
    if (!catId) continue;
    const timeGroup = CATEGORY_TO_TIME_GROUP[act.category] || 'morgon';
    const timeOffset = TIME_CATEGORY_OFFSET[act.category] ?? 400;
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
 * @param {{ displayName: string, email: string, appleUserId?: string|null, appleEmail?: string|null, googleUserId?: string|null, attribution?: object|null }} opts
 */
async function createParentFromOAuth(opts) {
  const {
    displayName,
    email,
    appleUserId = null,
    appleEmail = null,
    googleUserId = null,
    attribution = null,
  } = opts;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const familyName = `${displayName}s familj`;
    const countResult = await client.query('SELECT COUNT(*)::int AS count FROM family');
    const familyCount = countResult.rows[0].count;
    const { getFounderFamilyLimitWithClient, qualifiesForLifetimeFree } = require('./payment-policy');
    const founderLimit = await getFounderFamilyLimitWithClient(client);
    const isLifetimeFree = qualifiesForLifetimeFree(familyCount, founderLimit);

    const familyResult = await client.query(
      `INSERT INTO family (name, subscription_status, trial_ends_at, is_lifetime_free)
       VALUES ($1, 'none', CASE WHEN $2 THEN NULL ELSE NOW() + INTERVAL '14 days' END, $2)
       RETURNING id`,
      [familyName, isLifetimeFree]
    );
    const familyId = familyResult.rows[0].id;

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

    await seedDefaultActivities(client, familyId);
    await client.query('INSERT INTO notification_preference (parent_id) VALUES ($1)', [parent.id]);
    await createNewsletterSubscription(client, parent.id, parent.email);

    const subTier = isLifetimeFree ? 'lifetime_free' : 'trial';
    const trialExpiresAt = subTier === 'trial'
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      : null;
    await client.query(
      `INSERT INTO family_subscriptions (family_id, tier, trial_expires_at, components)
       VALUES ($1, $2, $3, $4)`,
      [
        familyId,
        subTier,
        trialExpiresAt,
        JSON.stringify([{ component: 'basic_app', granted_at: new Date().toISOString(), expires_at: null }]),
      ]
    );

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

  // Optional attribution from OAuth body — never blocks signup
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
