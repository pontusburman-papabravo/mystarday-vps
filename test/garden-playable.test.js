'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { injectMockDb } = require('./helpers/setup.js');

const FEATURE_SLUG = 'garden_playable';
const FAMILY_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const FAMILY_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function mockFeatureAccess(scenario) {
  const mock = injectMockDb();
  mock.setQuery(async (sql, params) => {
    const q = String(sql);

    if (q.includes('FROM features WHERE slug')) {
      const slug = params[0];
      if (slug !== FEATURE_SLUG) return { rows: [] };
      if (scenario.status === 'missing') return { rows: [] };
      return { rows: [{ slug, status: scenario.status }] };
    }

    if (q.includes('FROM family_features WHERE family_id')) {
      const [familyId, slug] = params;
      if (slug !== FEATURE_SLUG) return { rows: [] };
      if (scenario.allowlist && scenario.allowlist.has(familyId)) {
        return { rows: [{ family_id: familyId }] };
      }
      return { rows: [] };
    }

    if (q.includes('family_subscriptions') || q.includes('has_component')) {
      return { rows: [{ has_component: true }] };
    }

    return { rows: [] };
  });
  return mock;
}

function loadLivingWorldAccess() {
  const modPath = require.resolve('../src/lib/living-world-access');
  const featuresPath = require.resolve('../db/features');
  delete require.cache[modPath];
  delete require.cache[featuresPath];
  return require(modPath);
}

describe('garden_playable — feature access rollout', () => {
  it('migration registers dev feature without family allowlist seed', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1809140000000_living_object_instance.js'),
      'utf8'
    );
    assert.match(src, /garden_playable/);
    assert.match(src, /'dev'/);
    assert.match(src, /living_object_instance/);
    assert.match(src, /UNIQUE \(child_id, world_slug, slot_id\)/);
    assert.doesNotMatch(src, /family_features.*INSERT/i);
    assert.doesNotMatch(src, /Pontus@burman\.cc/);
  });

  it('seed-features registers garden_playable as dev', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../scripts/seed-features.js'),
      'utf8'
    );
    assert.match(src, /slug: 'garden_playable'/);
    assert.match(src, /status: 'dev'/);
  });

  it('hasLivingWorldAccess uses hasAccess, not global feature_flag', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/living-world-access.js'),
      'utf8'
    );
    assert.match(src, /hasAccess\(familyId, featureSlug\)/);
    assert.doesNotMatch(src, /feature_flag/);
    assert.match(src, /GARDEN_WORLD_SLUG/);
  });

  it('off — denied for all families', async () => {
    mockFeatureAccess({ status: 'off', allowlist: new Set([FAMILY_A]) });
    const { hasLivingWorldAccess } = loadLivingWorldAccess();
    assert.equal(await hasLivingWorldAccess(FAMILY_A, FEATURE_SLUG), false);
    assert.equal(await hasLivingWorldAccess(FAMILY_B, FEATURE_SLUG), false);
  });

  it('dev + allowlist — allowed only for assigned family', async () => {
    mockFeatureAccess({ status: 'dev', allowlist: new Set([FAMILY_A]) });
    const { hasLivingWorldAccess, GARDEN_WORLD_SLUG } = loadLivingWorldAccess();
    assert.equal(await hasLivingWorldAccess(FAMILY_A, FEATURE_SLUG), true);
    assert.equal(await hasLivingWorldAccess(FAMILY_B, FEATURE_SLUG), false);
    assert.equal(await hasLivingWorldAccess(FAMILY_A, GARDEN_WORLD_SLUG), true);
    assert.equal(await hasLivingWorldAccess(FAMILY_B, GARDEN_WORLD_SLUG), false);
  });

  it('dev + not on allowlist — denied', async () => {
    mockFeatureAccess({ status: 'dev', allowlist: new Set() });
    const { hasLivingWorldAccess } = loadLivingWorldAccess();
    assert.equal(await hasLivingWorldAccess(FAMILY_A, FEATURE_SLUG), false);
  });

  it('live — allowed for any family', async () => {
    mockFeatureAccess({ status: 'live', allowlist: new Set() });
    const { hasLivingWorldAccess } = loadLivingWorldAccess();
    assert.equal(await hasLivingWorldAccess(FAMILY_A, FEATURE_SLUG), true);
    assert.equal(await hasLivingWorldAccess(FAMILY_B, FEATURE_SLUG), true);
  });

  it('missing familyId — denied', async () => {
    mockFeatureAccess({ status: 'live', allowlist: new Set() });
    const { hasLivingWorldAccess } = loadLivingWorldAccess();
    assert.equal(await hasLivingWorldAccess(null, FEATURE_SLUG), false);
    assert.equal(await hasLivingWorldAccess(undefined, FEATURE_SLUG), false);
  });
});
