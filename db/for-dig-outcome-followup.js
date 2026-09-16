'use strict';

/**
 * För dig outcome follow-up batches.
 * Eligibility comes only from listPendingOutcomesAdmin().
 * One recipient per (batch_id, parent_id). Open/click tracking is
 * newsletter_email_send (campaign_type for_dig_outcome_followup).
 */

const db = require('../src/lib/db');
const { sendEmail } = require('../src/lib/email');
const { getGoalBySlug } = require('../src/lib/for-dig-config');
const { recordSend, getCampaignStats, getCampaignRecipients } = require('./newsletter-email-tracking');
const { listPendingOutcomesAdmin } = require('./for-dig-goal-feedback');
const {
  ensurePreference,
  listOptedOutParentIds,
  isOptedOut,
} = require('./for-dig-followup-email-preference');
const { buildUnsubscribeUrl } = require('../src/lib/for-dig-followup-unsub-token');
const {
  DEFAULT_SUBJECT_TEMPLATE,
  dashboardCtaUrl,
  buildSubject,
  buildOutcomeFollowupEmailHtml,
} = require('../src/lib/for-dig-outcome-email-template');

const CAMPAIGN_TYPE = 'for_dig_outcome_followup';
const PREPARE_LIMIT = 5000;
const BATCH_PARENT_UNIQUE = 'for_dig_outcome_followup_recipient_batch_parent_key';

function isEmailSendEnabled() {
  return process.env.EMAIL_SEND_ENABLED === 'true';
}

function pendingRowKey(row) {
  return `${row.family_id}:${row.child_id}:${row.goal_slug}`;
}

function normalizeItems(items) {
  if (Array.isArray(items)) return items;
  if (!items) return [];
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function groupPendingByParent(rows) {
  const groups = new Map();
  const skipped = [];
  for (const row of rows) {
    if (!row.parent_id || !row.parent_email) {
      skipped.push(pendingRowKey(row));
      continue;
    }
    let group = groups.get(row.parent_id);
    if (!group) {
      group = {
        parent_id: row.parent_id,
        recipient_email: row.parent_email,
        parent_name: row.parent_name,
        items: [],
        itemKeys: new Set(),
      };
      groups.set(row.parent_id, group);
    }
    const key = pendingRowKey(row);
    if (group.itemKeys.has(key)) continue;
    group.itemKeys.add(key);
    group.items.push({
      family_id: row.family_id,
      child_id: row.child_id,
      goal_slug: row.goal_slug,
      child_name: row.child_name,
      goal_title: row.goal_title || (getGoalBySlug(row.goal_slug) || {}).title || row.goal_slug,
    });
  }
  for (const group of groups.values()) {
    delete group.itemKeys;
  }
  return { groups, skipped };
}

async function createBatch({ subject } = {}) {
  const result = await db.query(
    `INSERT INTO for_dig_outcome_followup_batch (subject, status)
     VALUES ($1, 'draft')
     RETURNING id, subject, status, created_at, sent_at`,
    [subject && String(subject).trim() ? String(subject).trim() : DEFAULT_SUBJECT_TEMPLATE]
  );
  return result.rows[0];
}

async function listBatches() {
  const result = await db.query(
    `SELECT b.id, b.subject, b.status, b.created_at, b.sent_at,
            COUNT(r.id)::int AS recipient_count
     FROM for_dig_outcome_followup_batch b
     LEFT JOIN for_dig_outcome_followup_recipient r ON r.batch_id = b.id
     GROUP BY b.id
     ORDER BY b.created_at DESC`
  );
  return result.rows;
}

async function getBatch(batchId) {
  const result = await db.query(
    `SELECT id, subject, status, created_at, sent_at
     FROM for_dig_outcome_followup_batch
     WHERE id = $1`,
    [batchId]
  );
  return result.rows[0] || null;
}

async function listRecipients(batchId) {
  const result = await db.query(
    `SELECT r.id, r.batch_id, r.parent_id, r.recipient_email,
            r.newsletter_email_send_id, r.created_at,
            p.name AS parent_name,
            COALESCE(
              json_agg(
                json_build_object(
                  'family_id', i.family_id,
                  'child_id', i.child_id,
                  'goal_slug', i.goal_slug,
                  'child_name', c.name
                ) ORDER BY i.created_at ASC, i.goal_slug ASC
              ) FILTER (WHERE i.id IS NOT NULL),
              '[]'::json
            ) AS items
       FROM for_dig_outcome_followup_recipient r
       LEFT JOIN parent p ON p.id = r.parent_id
       LEFT JOIN for_dig_outcome_followup_recipient_item i ON i.recipient_id = r.id
       LEFT JOIN child c ON c.id = i.child_id
      WHERE r.batch_id = $1
      GROUP BY r.id, p.name
      ORDER BY r.created_at ASC`,
    [batchId]
  );
  return result.rows.map((row) => {
    const items = normalizeItems(row.items).map((item) => ({
      ...item,
      goal_title: (getGoalBySlug(item.goal_slug) || {}).title || item.goal_slug,
    }));
    return { ...row, items };
  });
}

async function summarizePendingEligibility() {
  const pending = await listPendingOutcomesAdmin({ limit: PREPARE_LIMIT, offset: 0 });
  const grouped = groupPendingByParent(pending.rows);
  const parentIds = [...grouped.groups.keys()];
  const optedOut = await listOptedOutParentIds(parentIds);
  const recipientCount = parentIds.filter((id) => !optedOut.has(id)).length;
  return {
    pending_item_count: pending.total,
    unique_parents: parentIds.length,
    opted_out: optedOut.size,
    recipient_count: recipientCount,
    skipped_missing_identity: grouped.skipped.length,
    pending,
    grouped,
    optedOut,
  };
}

async function prepareFromPending(batchId) {
  const batch = await getBatch(batchId);
  if (!batch) {
    const err = new Error('Batch hittades inte');
    err.statusCode = 404;
    throw err;
  }
  if (batch.status === 'sent' || batch.sent_at) {
    const err = new Error('Batch är redan skickad');
    err.statusCode = 409;
    throw err;
  }

  const eligibility = await summarizePendingEligibility();
  const client = await db.getClient();
  let inserted = 0;
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM for_dig_outcome_followup_recipient WHERE batch_id = $1', [batchId]);

    for (const group of eligibility.grouped.groups.values()) {
      if (eligibility.optedOut.has(group.parent_id)) continue;
      const rec = await client.query(
        `INSERT INTO for_dig_outcome_followup_recipient
           (batch_id, parent_id, recipient_email)
         VALUES ($1, $2, $3)
         ON CONFLICT (batch_id, parent_id) DO NOTHING
         RETURNING id`,
        [batchId, group.parent_id, group.recipient_email]
      );
      const recipientId = rec.rows[0] && rec.rows[0].id;
      if (!recipientId) continue;
      inserted += 1;
      for (const item of group.items) {
        await client.query(
          `INSERT INTO for_dig_outcome_followup_recipient_item
             (recipient_id, family_id, child_id, goal_slug)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (recipient_id, family_id, child_id, goal_slug) DO NOTHING`,
          [recipientId, item.family_id, item.child_id, item.goal_slug]
        );
      }
    }

    await client.query(
      `UPDATE for_dig_outcome_followup_batch SET status = 'prepared' WHERE id = $1`,
      [batchId]
    );
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }

  return {
    batchId,
    pendingTotal: eligibility.pending_item_count,
    pending_item_count: eligibility.pending_item_count,
    unique_parents: eligibility.unique_parents,
    opted_out: eligibility.opted_out,
    inserted,
    skipped: eligibility.skipped_missing_identity,
    skipped_missing_identity: eligibility.skipped_missing_identity,
  };
}

function decorateItems(items, metaByKey) {
  return items.map((item) => {
    const meta = metaByKey.get(pendingRowKey(item)) || {};
    return {
      family_id: item.family_id,
      child_id: item.child_id,
      goal_slug: item.goal_slug,
      childName: meta.child_name || item.child_name,
      goalTitle: meta.goal_title || item.goal_title || (getGoalBySlug(item.goal_slug) || {}).title || item.goal_slug,
    };
  });
}

function previewForRecipient(batch, recipient, extras = {}) {
  const items = decorateItems(
    extras.items || recipient.items || [],
    extras.metaByKey || new Map()
  );
  const itemCount = items.length;
  const first = items[0] || {};
  const subject = buildSubject({
    goalTitle: first.goalTitle,
    itemCount,
    subjectTemplate: itemCount > 1 ? undefined : batch.subject,
  });
  const ctaUrl = dashboardCtaUrl();
  return {
    recipient_id: recipient.id,
    parent_id: recipient.parent_id,
    to: recipient.recipient_email,
    item_count: itemCount,
    template: itemCount > 1 ? 'multi' : 'single',
    subject,
    cta_url: ctaUrl,
    html: buildOutcomeFollowupEmailHtml({
      parentName: extras.parentName || recipient.parent_name,
      items,
      subject,
      ctaUrl,
      unsubscribeUrl: extras.unsubscribeUrl,
    }),
  };
}

async function previewBatch(batchId) {
  const batch = await getBatch(batchId);
  if (!batch) {
    const err = new Error('Batch hittades inte');
    err.statusCode = 404;
    throw err;
  }
  const eligibility = await summarizePendingEligibility();
  const recipients = await listRecipients(batchId);
  const metaByKey = new Map(eligibility.pending.rows.map((row) => [pendingRowKey(row), row]));

  return {
    batch,
    cta_url: dashboardCtaUrl(),
    pending_item_count: eligibility.pending_item_count,
    unique_parents: eligibility.unique_parents,
    opted_out: eligibility.opted_out,
    recipient_count: eligibility.recipient_count,
    eligibility: {
      pending_item_count: eligibility.pending_item_count,
      unique_parents: eligibility.unique_parents,
      opted_out: eligibility.opted_out,
      recipient_count: eligibility.recipient_count,
    },
    previews: recipients.map((recipient) => previewForRecipient(batch, recipient, {
      parentName: recipient.parent_name,
      items: recipient.items,
      metaByKey,
    })),
  };
}

function remainingItems(recipientItems, pendingKeys) {
  return (recipientItems || []).filter((item) => pendingKeys.has(pendingRowKey(item)));
}

async function sendBatch(batchId) {
  const batch = await getBatch(batchId);
  if (!batch) {
    const err = new Error('Batch hittades inte');
    err.statusCode = 404;
    throw err;
  }
  if (batch.status === 'sent' || batch.sent_at) {
    const err = new Error('Batch är redan skickad');
    err.statusCode = 409;
    throw err;
  }

  const recipients = await listRecipients(batchId);
  if (!isEmailSendEnabled()) {
    return {
      dryRun: true,
      sent: 0,
      failed: 0,
      skipped: recipients.length,
      skipped_opted_out: 0,
      skipped_no_pending: 0,
      batchId,
    };
  }

  const pending = await listPendingOutcomesAdmin({ limit: PREPARE_LIMIT, offset: 0 });
  const pendingKeys = new Set(pending.rows.map(pendingRowKey));
  const metaByKey = new Map(pending.rows.map((row) => [pendingRowKey(row), row]));

  let sent = 0;
  let failed = 0;
  let skippedOptedOut = 0;
  let skippedNoPending = 0;

  for (const recipient of recipients) {
    if (recipient.newsletter_email_send_id) continue;
    if (await isOptedOut(recipient.parent_id)) {
      skippedOptedOut += 1;
      continue;
    }
    const remaining = remainingItems(recipient.items, pendingKeys);
    if (!remaining.length) {
      skippedNoPending += 1;
      continue;
    }
    const preference = await ensurePreference(recipient.parent_id);
    const unsubscribeUrl = buildUnsubscribeUrl(preference.unsub_token);
    const preview = previewForRecipient(batch, recipient, {
      parentName: recipient.parent_name,
      items: remaining,
      metaByKey,
      unsubscribeUrl,
    });
    try {
      const result = await sendEmail({
        to: recipient.recipient_email,
        subject: preview.subject,
        html: preview.html,
        unsubscribeUrl,
        tags: [
          { name: 'campaign_type', value: CAMPAIGN_TYPE },
          { name: 'campaign_id', value: String(batchId) },
        ],
      });
      if (!result.success) {
        failed += 1;
        continue;
      }
      const sendId = await recordSend({
        campaignType: CAMPAIGN_TYPE,
        campaignId: batchId,
        parentId: recipient.parent_id,
        recipientEmail: recipient.recipient_email,
        resendEmailId: result.emailId || null,
      });
      if (sendId) {
        await db.query(
          `UPDATE for_dig_outcome_followup_recipient
           SET newsletter_email_send_id = $1
           WHERE id = $2`,
          [sendId, recipient.id]
        );
      }
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error('[FOR-DIG-OUTCOME-FOLLOWUP] send failed:', err.message);
    }
  }

  await db.query(
    `UPDATE for_dig_outcome_followup_batch
     SET status = 'sent', sent_at = NOW()
     WHERE id = $1`,
    [batchId]
  );

  return {
    dryRun: false,
    sent,
    failed,
    skipped: skippedOptedOut + skippedNoPending,
    skipped_opted_out: skippedOptedOut,
    skipped_no_pending: skippedNoPending,
    batchId,
  };
}

async function listAttributedOutcomes(batchId) {
  const result = await db.query(
    `SELECT fo.id AS feedback_id,
            i.family_id,
            i.child_id,
            i.goal_slug,
            r.parent_id,
            fo.outcome_score,
            fo.created_at AS outcome_at,
            b.sent_at
     FROM for_dig_outcome_followup_recipient r
     JOIN for_dig_outcome_followup_batch b ON b.id = r.batch_id
     JOIN for_dig_outcome_followup_recipient_item i ON i.recipient_id = r.id
     JOIN for_dig_goal_feedback fo
       ON fo.family_id = i.family_id
      AND fo.child_id = i.child_id
      AND fo.goal_slug = i.goal_slug
      AND fo.phase = 'outcome'
      AND fo.created_at >= b.sent_at
     WHERE r.batch_id = $1
       AND b.sent_at IS NOT NULL
     ORDER BY fo.created_at ASC`,
    [batchId]
  );
  return result.rows;
}

async function getBatchStats(batchId) {
  const batch = await getBatch(batchId);
  if (!batch) {
    const err = new Error('Batch hittades inte');
    err.statusCode = 404;
    throw err;
  }
  const tracking = await getCampaignStats(CAMPAIGN_TYPE, batchId);
  const attributed = await listAttributedOutcomes(batchId);
  return {
    batch,
    tracking,
    attributed_outcomes: attributed.length,
  };
}

async function getRecipientsTracking(batchId) {
  const batch = await getBatch(batchId);
  if (!batch) {
    const err = new Error('Batch hittades inte');
    err.statusCode = 404;
    throw err;
  }
  const attributed = await listAttributedOutcomes(batchId);
  const attributedKeys = new Set(attributed.map((row) => pendingRowKey(row)));
  const sends = await getCampaignRecipients(CAMPAIGN_TYPE, batchId);
  const recipients = await listRecipients(batchId);
  return recipients.map((recipient) => {
    const send = sends.find((row) => row.id === recipient.newsletter_email_send_id)
      || sends.find((row) => row.email === recipient.recipient_email)
      || null;
    const items = (recipient.items || []).map((item) => ({
      ...item,
      attributed: attributedKeys.has(pendingRowKey(item)),
    }));
    return {
      ...recipient,
      items,
      attributed: items.some((item) => item.attributed),
      sent_at: send ? send.sent_at : null,
      delivered_at: send ? send.delivered_at : null,
      first_opened_at: send ? send.first_opened_at : null,
      open_count: send ? send.open_count : 0,
      first_clicked_at: send ? send.first_clicked_at : null,
      click_count: send ? send.click_count : 0,
      last_click_url: send ? send.last_click_url : null,
    };
  });
}

module.exports = {
  CAMPAIGN_TYPE,
  PREPARE_LIMIT,
  BATCH_PARENT_UNIQUE,
  isEmailSendEnabled,
  pendingRowKey,
  groupPendingByParent,
  createBatch,
  listBatches,
  getBatch,
  listRecipients,
  summarizePendingEligibility,
  prepareFromPending,
  previewBatch,
  sendBatch,
  listAttributedOutcomes,
  getBatchStats,
  getRecipientsTracking,
};
