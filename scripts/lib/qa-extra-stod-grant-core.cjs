'use strict';

/**
 * Founder / Journey QA only: temporary Extra stöd (teacch + transition_support dev grant).
 * Snapshot → apply → restore. No global feature_flag writes.
 */

const crypto = require('crypto');
const familySubscriptions = require('../../db/family-subscriptions');
const features = require('../../db/features');
const { getFamilyAccess } = require('../../src/lib/package-access');
const {
  isFounderQaParentEmail,
  normalizeEmail,
} = require('../../src/lib/founder-qa-family-guard');
const { getAllowlist } = require('../../src/lib/activity-timer-rollout');

const TRANSITION_FEATURE = 'transition_support';
const TEACCH_COMPONENT = 'teacch';

function trimEnv(key) {
  const raw = process.env[key];
  return raw ? String(raw).split('#')[0].trim() : '';
}

function snapshotChecksum(snap) {
  return crypto.createHash('sha256').update(JSON.stringify(snap)).digest('hex').slice(0, 16);
}

async function assertQaFamilyAllowed(db, familyId) {
  const { rows } = await db.query(
    'SELECT email FROM parent WHERE family_id = $1',
    [familyId]
  );
  const emails = rows.map((r) => normalizeEmail(r.email));
  const journeyEmail = normalizeEmail(trimEnv('JOURNEY_QA_PARENT_EMAIL'));
  const founderOk = emails.some((e) => isFounderQaParentEmail(e));
  const journeyOk = journeyEmail && emails.some((e) => e === journeyEmail);
  const timerAllowlistOk = emails.some((e) => getAllowlist().includes(e));
  if (!founderOk && !journeyOk && !timerAllowlistOk) {
    const err = new Error('Family is not allowlisted for Extra stöd QA mutation');
    err.code = 'QA_FAMILY_NOT_ALLOWED';
    throw err;
  }
}

async function readPackageSnapshot(db, familyId, childIds = []) {
  const sub = await familySubscriptions.getByFamilyId(familyId);
  const ff = await db.query(
    'SELECT feature_slug FROM family_features WHERE family_id = $1 ORDER BY feature_slug',
    [familyId]
  );
  const children = {};
  for (const childId of childIds) {
    const r = await db.query(
      'SELECT transition_lead_minutes FROM child WHERE id = $1 AND family_id = $2',
      [childId, familyId]
    );
    children[childId] = {
      transition_lead_minutes: r.rows[0]?.transition_lead_minutes ?? null,
    };
  }
  return {
    tier: sub?.tier ?? null,
    components: JSON.parse(JSON.stringify(sub?.components || [])),
    family_features: ff.rows.map((row) => row.feature_slug),
    children,
  };
}

function planGrantFromSnapshot(snap) {
  const hadTeacch = (snap.components || []).some(
    (c) => c.component === TEACCH_COMPONENT && (c.state || 'active') === 'active'
  );
  const hadTransitionDev = snap.family_features.includes(TRANSITION_FEATURE);
  return {
    will_grant_teacch: !hadTeacch,
    will_add_transition_dev_family: !hadTransitionDev,
    checksum: snapshotChecksum(snap),
  };
}

async function applyTemporaryGrant(db, familyId) {
  await familySubscriptions.grantComponent(familyId, TEACCH_COMPONENT, null, {
    source: 'qa_extra_stod_gate',
  });
  await features.addFamily(familyId, TRANSITION_FEATURE);
}

async function restorePackageSnapshot(db, familyId, snap) {
  const tier = snap.tier || 'lifetime_free';
  await db.query(
    `INSERT INTO family_subscriptions (family_id, tier, components)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (family_id) DO UPDATE
       SET components = $3::jsonb,
           tier = COALESCE(family_subscriptions.tier, $2),
           updated_at = NOW()`,
    [familyId, tier, JSON.stringify(snap.components || [])]
  );

  const { rows: currentFf } = await db.query(
    'SELECT feature_slug FROM family_features WHERE family_id = $1',
    [familyId]
  );
  const current = new Set(currentFf.map((r) => r.feature_slug));
  const wanted = new Set(snap.family_features || []);

  for (const slug of current) {
    if (!wanted.has(slug) && slug === TRANSITION_FEATURE) {
      await features.removeFamily(familyId, slug);
    }
  }
  for (const slug of wanted) {
    if (!current.has(slug)) {
      await features.addFamily(familyId, slug);
    }
  }

  for (const [childId, data] of Object.entries(snap.children || {})) {
    await db.query(
      'UPDATE child SET transition_lead_minutes = $1 WHERE id = $2 AND family_id = $3',
      [data.transition_lead_minutes, childId, familyId]
    );
  }
}

async function readAccessFeatures(db, familyId) {
  const access = await getFamilyAccess(familyId);
  return {
    transition_support: access.features?.transition_support === true,
    teacch_has: access.components?.teacch?.has === true,
  };
}

module.exports = {
  assertQaFamilyAllowed,
  readPackageSnapshot,
  planGrantFromSnapshot,
  applyTemporaryGrant,
  restorePackageSnapshot,
  readAccessFeatures,
  snapshotChecksum,
  TRANSITION_FEATURE,
  TEACCH_COMPONENT,
};
