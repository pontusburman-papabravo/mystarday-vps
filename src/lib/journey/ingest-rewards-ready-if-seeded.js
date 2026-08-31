'use strict';

const db = require('../db');
const { ingestMilestone } = require('./ingest');

/**
 * Canonical "rewards exist" proof: at least one active family reward.
 * Registration seeds defaults; slim onboarding does not POST /onboarding/reward.
 */
async function familyHasActiveRewards(familyId, client) {
  if (!familyId) return false;
  const runner = client && typeof client.query === 'function' ? client : db;
  const result = await runner.query(
    'SELECT 1 FROM reward WHERE family_id = $1 AND is_active = true LIMIT 1',
    [familyId]
  );
  return result.rows.length > 0;
}

/**
 * Ingest rewards_ready only when seeded/active rewards already exist.
 * Does not create rewards. Idempotent via family_milestones unique once-index.
 */
async function ingestRewardsReadyIfSeeded(familyId, client) {
  if (!familyId) return { ok: false, ingested: false, reason: 'no_family' };
  const hasRewards = await familyHasActiveRewards(familyId, client);
  if (!hasRewards) return { ok: true, ingested: false, reason: 'no_rewards' };
  const result = await ingestMilestone({
    familyId,
    milestone: 'rewards_ready',
    source: 'system',
  }, client);
  return {
    ok: result.ok,
    ingested: Boolean(result.inserted),
    phase: result.phase,
  };
}

module.exports = {
  familyHasActiveRewards,
  ingestRewardsReadyIfSeeded,
};
