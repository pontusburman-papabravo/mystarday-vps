'use strict';

/**
 * R4.6c — Align outbound comms with canonical Hem retention decision.
 */

const db = require('../db');
const familyMilestones = require('../../../db/family-milestones');
const {
  isRetentionHomeEnabled,
  buildRetentionHomeDecision,
} = require('./retention-home-decision');

/**
 * @param {string} familyId
 * @returns {Promise<{ suppress: boolean, reason: string, action: string }|null>}
 */
async function getRetentionHomeCommsBlock(familyId) {
  if (!familyId) return null;
  if (!(await isRetentionHomeEnabled(familyId))) return null;

  const milestones = await familyMilestones.getMilestoneMap(familyId);
  if (!milestones.first_success) return null;

  const parentRow = await db.query(
    `SELECT id FROM parent WHERE family_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [familyId]
  );
  const parentId = parentRow.rows[0]?.id;
  if (!parentId) return null;

  const decision = await buildRetentionHomeDecision(familyId, parentId);
  if (!decision) return null;

  if (decision.action === 'SILENT') {
    return {
      suppress: true,
      reason: 'journey_home_silent',
      action: decision.action,
    };
  }

  if (decision.show_primary_coach) {
    return {
      suppress: true,
      reason: 'journey_home_primary_active',
      action: decision.action,
    };
  }

  return null;
}

async function hasFamilyRetentionCommToday(familyId, client = db) {
  const result = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM retention_reengagement_push
       WHERE family_id = $1 AND sent_at >= CURRENT_DATE
     ) OR EXISTS (
       SELECT 1 FROM win_back_email_log w
       WHERE w.family_id = $1
         AND w.status = 'sent'
         AND w.sent_at >= CURRENT_DATE
     ) AS sent_today`,
    [familyId]
  );
  return result.rows[0]?.sent_today === true;
}

module.exports = {
  getRetentionHomeCommsBlock,
  hasFamilyRetentionCommToday,
};
