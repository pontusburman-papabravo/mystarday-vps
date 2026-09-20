'use strict';

/**
 * För dig outcome follow-up batches.
 * Eligibility comes only from listPendingOutcomesAdmin().
 * One recipient per (batch_id, parent_id). Open/click tracking is
 * newsletter_email_send (campaign_type for_dig_outcome_followup).
 */

const db = require('../src/lib/db');
const emailLib = require('../src/lib/email');
const { getGoalBySlug } = require('../src/lib/for-dig-config');
const { recordSend, getCampaignStats, getCampaignRecipients } = require('./newsletter-email-tracking');
const { listPendingOutcomesAdmin, insertFeedback } = require('./for-dig-goal-feedback');
const {
  ensurePreference,
  listOptedOutParentIds,
  isOptedOut,
} = require('./for-dig-followup-email-preference');
const { buildUnsubscribeUrl } = require('../src/lib/for-dig-followup-unsub-token');
const { buildAnswerUrl } = require('../src/lib/for-dig-followup-answer-token');
const {
  DEFAULT_SUBJECT_TEMPLATE,
  dashboardCtaUrl,
  buildSubject,
  buildOutcomeFollowupEmailHtml,
} = require('../src/lib/for-dig-outcome-email-template');
const analytics = require('./analytics');

const CAMPAIGN_TYPE = 'for_dig_outcome_followup';
const PREPARE_LIMIT = 5000;
const DEFAULT_MAX_RECIPIENTS = 5;
const BATCH_PARENT_UNIQUE = 'for_dig_outcome_followup_recipient_batch_parent_key';
const RECIPIENT_SEND = {
  PREPARED: 'prepared',
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
};
const BATCH_SEND = {
  DRAFT: 'draft',
  PREPARED: 'prepared',
  SENDING: 'sending',
  SENT: 'sent',
  PARTIAL_FAILED: 'partial_failed',
  FAILED: 'failed',
};
const RETRYABLE_BATCH = new Set([
  BATCH_SEND.PREPARED,
  BATCH_SEND.SENDING,
  BATCH_SEND.PARTIAL_FAILED,
  BATCH_SEND.FAILED,
]);

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
      installed_at: row.installed_at,
    });
  }
  for (const group of groups.values()) {
    delete group.itemKeys;
  }
  return { groups, skipped };
}

function emailedItemKey(parentId, item) {
  return `${parentId}:${pendingRowKey(item)}`;
}

function followupIdempotencyKey(batchId, recipientId) {
  return `for-dig-followup:${batchId}:${recipientId}`;
}

function parseMaxRecipients(raw) {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_MAX_RECIPIENTS;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    const err = new Error('max_recipients måste vara ett positivt heltal');
    err.statusCode = 400;
    throw err;
  }
  return n;
}

function minInstalledAtMs(group) {
  let min = Number.POSITIVE_INFINITY;
  for (const item of group.items || []) {
    const ts = new Date(item.installed_at || 0).getTime();
    if (Number.isFinite(ts) && ts < min) min = ts;
  }
  return min;
}

function sortParentsNewestEligibleFirst(groups) {
  return [...groups].sort((a, b) => {
    const diff = minInstalledAtMs(b) - minInstalledAtMs(a);
    if (diff !== 0) return diff;
    return String(a.parent_id).localeCompare(String(b.parent_id));
  });
}

function batchNotPreparable(batch) {
  return batch.status === BATCH_SEND.SENT
    || batch.status === BATCH_SEND.SENDING
    || batch.status === BATCH_SEND.PARTIAL_FAILED
    || Boolean(batch.sent_at);
}

async function listEmailedItemKeys() {
  const result = await db.query(
    `SELECT r.parent_id, i.family_id, i.child_id, i.goal_slug
       FROM for_dig_outcome_followup_recipient r
       JOIN for_dig_outcome_followup_recipient_item i ON i.recipient_id = r.id
      WHERE r.send_status = $1
         OR r.newsletter_email_send_id IS NOT NULL`,
    [RECIPIENT_SEND.SENT]
  );
  return new Set(result.rows.map((row) => emailedItemKey(row.parent_id, row)));
}

function applyPilotSelection(groupsMap, {
  optedOut,
  emailedKeys,
  maxRecipients,
}) {
  let excludedAlreadyEmailedItems = 0;
  const eligible = [];
  for (const group of groupsMap.values()) {
    if (optedOut.has(group.parent_id)) continue;
    const remainingItemsForParent = group.items.filter((item) => {
      const already = emailedKeys.has(emailedItemKey(group.parent_id, item));
      if (already) excludedAlreadyEmailedItems += 1;
      return !already;
    });
    if (!remainingItemsForParent.length) continue;
    eligible.push({ ...group, items: remainingItemsForParent });
  }
  const ordered = sortParentsNewestEligibleFirst(eligible);
  const selected = ordered.slice(0, maxRecipients);
  return {
    selected,
    eligible_parents: eligible.length,
    excluded_already_emailed_items: excludedAlreadyEmailedItems,
  };
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
            r.newsletter_email_send_id, r.send_status, r.send_error, r.created_at,
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

async function summarizePendingEligibility(options = {}) {
  const maxRecipients = parseMaxRecipients(options.maxRecipients);
  const pending = await listPendingOutcomesAdmin({ limit: PREPARE_LIMIT, offset: 0 });
  const grouped = groupPendingByParent(pending.rows);
  const parentIds = [...grouped.groups.keys()];
  const optedOut = await listOptedOutParentIds(parentIds);
  const emailedKeys = await listEmailedItemKeys();
  const selection = applyPilotSelection(grouped.groups, {
    optedOut,
    emailedKeys,
    maxRecipients,
  });
  return {
    pending_item_count: pending.total,
    unique_parents: parentIds.length,
    opted_out: optedOut.size,
    recipient_count: selection.selected.length,
    eligible_parents: selection.eligible_parents,
    skipped_missing_identity: grouped.skipped.length,
    excluded_already_emailed_items: selection.excluded_already_emailed_items,
    max_recipients: maxRecipients,
    pending,
    grouped,
    optedOut,
    selected: selection.selected,
  };
}

async function prepareFromPending(batchId, options = {}) {
  const batch = await getBatch(batchId);
  if (!batch) {
    const err = new Error('Batch hittades inte');
    err.statusCode = 404;
    throw err;
  }
  if (batchNotPreparable(batch)) {
    const err = new Error('Batch kan inte förberedas igen');
    err.statusCode = 409;
    throw err;
  }

  const eligibility = await summarizePendingEligibility(options);
  const client = await db.getClient();
  let inserted = 0;
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM for_dig_outcome_followup_recipient WHERE batch_id = $1', [batchId]);

    for (const group of eligibility.selected) {
      const rec = await client.query(
        `INSERT INTO for_dig_outcome_followup_recipient
           (batch_id, parent_id, recipient_email, send_status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (batch_id, parent_id) DO NOTHING
         RETURNING id`,
        [batchId, group.parent_id, group.recipient_email, RECIPIENT_SEND.PREPARED]
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
      `UPDATE for_dig_outcome_followup_batch SET status = $2 WHERE id = $1`,
      [batchId, BATCH_SEND.PREPARED]
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
    eligible_parents: eligibility.eligible_parents,
    opted_out: eligibility.opted_out,
    inserted,
    skipped: eligibility.skipped_missing_identity,
    skipped_missing_identity: eligibility.skipped_missing_identity,
    max_recipients: eligibility.max_recipients,
    excluded_already_emailed_items: eligibility.excluded_already_emailed_items,
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
    subjectTemplate: batch && batch.subject,
  });
  const answerUrl = recipient.id ? buildAnswerUrl(recipient.id) : dashboardCtaUrl();
  return {
    recipient_id: recipient.id,
    parent_id: recipient.parent_id,
    to: recipient.recipient_email,
    item_count: itemCount,
    template: 'one_question',
    subject,
    cta_url: answerUrl,
    html: buildOutcomeFollowupEmailHtml({
      parentName: extras.parentName || recipient.parent_name,
      items,
      subject,
      ctaUrl: answerUrl,
      unsubscribeUrl: extras.unsubscribeUrl,
      recipientId: recipient.id,
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

function daysSince(value) {
  const ts = new Date(value || 0).getTime();
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)));
}

function medianNumber(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return sorted[mid];
}

function resolveBatchStatusFromCounts(counts) {
  if ((counts.sending || 0) > 0) return BATCH_SEND.SENDING;
  if ((counts.failed || 0) > 0 && (counts.sent || 0) > 0) return BATCH_SEND.PARTIAL_FAILED;
  if ((counts.failed || 0) > 0) return BATCH_SEND.FAILED;
  if ((counts.sent || 0) > 0) return BATCH_SEND.SENT;
  return BATCH_SEND.PREPARED;
}

async function countRecipientSendStatuses(batchId) {
  const result = await db.query(
    `SELECT send_status, COUNT(*)::int AS n
       FROM for_dig_outcome_followup_recipient
      WHERE batch_id = $1
      GROUP BY send_status`,
    [batchId]
  );
  const counts = {
    prepared: 0,
    sending: 0,
    sent: 0,
    failed: 0,
  };
  for (const row of result.rows) {
    if (Object.prototype.hasOwnProperty.call(counts, row.send_status)) {
      counts[row.send_status] = row.n;
    }
  }
  return counts;
}

async function finalizeBatchSendStatus(batchId) {
  const counts = await countRecipientSendStatuses(batchId);
  const batchStatus = resolveBatchStatusFromCounts(counts);
  await db.query(
    `UPDATE for_dig_outcome_followup_batch
        SET status = $2,
            sent_at = CASE
              WHEN $3 THEN COALESCE(sent_at, NOW())
              ELSE sent_at
            END
      WHERE id = $1`,
    [
      batchId,
      batchStatus,
      batchStatus === BATCH_SEND.SENT || batchStatus === BATCH_SEND.PARTIAL_FAILED,
    ]
  );
  return { counts, batchStatus };
}

async function claimRecipientSend(recipientId) {
  const result = await db.query(
    `UPDATE for_dig_outcome_followup_recipient
        SET send_status = $2,
            send_claimed_at = NOW(),
            send_error = NULL
      WHERE id = $1
        AND newsletter_email_send_id IS NULL
        AND (
          send_status IN ($3, $4)
          OR (send_status = $5 AND send_claimed_at < NOW() - INTERVAL '2 minutes')
        )
      RETURNING id`,
    [
      recipientId,
      RECIPIENT_SEND.SENDING,
      RECIPIENT_SEND.PREPARED,
      RECIPIENT_SEND.FAILED,
      RECIPIENT_SEND.SENDING,
    ]
  );
  return Boolean(result.rows[0]);
}

async function markRecipientSent(recipientId, sendId) {
  await db.query(
    `UPDATE for_dig_outcome_followup_recipient
        SET send_status = $2,
            newsletter_email_send_id = COALESCE($3, newsletter_email_send_id),
            send_error = NULL
      WHERE id = $1`,
    [recipientId, RECIPIENT_SEND.SENT, sendId || null]
  );
}

async function markRecipientFailed(recipientId, message) {
  await db.query(
    `UPDATE for_dig_outcome_followup_recipient
        SET send_status = $2,
            send_error = $3
      WHERE id = $1`,
    [recipientId, RECIPIENT_SEND.FAILED, String(message || 'send_failed').slice(0, 500)]
  );
}

async function sendBatch(batchId) {
  const batch = await getBatch(batchId);
  if (!batch) {
    const err = new Error('Batch hittades inte');
    err.statusCode = 404;
    throw err;
  }
  if (batch.status === BATCH_SEND.SENT) {
    const err = new Error('Batch är redan skickad');
    err.statusCode = 409;
    throw err;
  }
  if (!RETRYABLE_BATCH.has(batch.status) && batch.status !== BATCH_SEND.DRAFT) {
    const err = new Error('Batch kan inte skickas');
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
      retryable: 0,
      batch_status: batch.status,
      batchId,
    };
  }

  await db.query(
    `UPDATE for_dig_outcome_followup_batch
        SET status = $2
      WHERE id = $1 AND status <> $3`,
    [batchId, BATCH_SEND.SENDING, BATCH_SEND.SENT]
  );

  const pending = await listPendingOutcomesAdmin({ limit: PREPARE_LIMIT, offset: 0 });
  const pendingKeys = new Set(pending.rows.map(pendingRowKey));
  const metaByKey = new Map(pending.rows.map((row) => [pendingRowKey(row), row]));

  let skippedOptedOut = 0;
  let skippedNoPending = 0;

  for (const recipient of recipients) {
    if (recipient.newsletter_email_send_id || recipient.send_status === RECIPIENT_SEND.SENT) {
      continue;
    }
    if (await isOptedOut(recipient.parent_id)) {
      skippedOptedOut += 1;
      continue;
    }
    const remaining = remainingItems(recipient.items, pendingKeys);
    if (!remaining.length) {
      skippedNoPending += 1;
      continue;
    }
    const claimed = await claimRecipientSend(recipient.id);
    if (!claimed) continue;
    const preference = await ensurePreference(recipient.parent_id);
    const unsubscribeUrl = buildUnsubscribeUrl(preference.unsub_token);
    const preview = previewForRecipient(batch, recipient, {
      parentName: recipient.parent_name,
      items: remaining,
      metaByKey,
      unsubscribeUrl,
    });
    try {
      const result = await emailLib.sendEmail({
        to: recipient.recipient_email,
        subject: preview.subject,
        html: preview.html,
        unsubscribeUrl,
        idempotencyKey: followupIdempotencyKey(batchId, recipient.id),
        tags: [
          { name: 'campaign_type', value: CAMPAIGN_TYPE },
          { name: 'campaign_id', value: String(batchId) },
        ],
      });
      if (!result.success) {
        await markRecipientFailed(recipient.id, result.error || 'provider_failed');
        continue;
      }
      let sendId = null;
      try {
        sendId = await recordSend({
          campaignType: CAMPAIGN_TYPE,
          campaignId: batchId,
          parentId: recipient.parent_id,
          recipientEmail: recipient.recipient_email,
          resendEmailId: result.emailId || null,
        });
      } catch (err) {
        console.error('[FOR-DIG-OUTCOME-FOLLOWUP] tracking failed after send:', err.message);
      }
      await markRecipientSent(recipient.id, sendId);
    } catch (err) {
      await markRecipientFailed(recipient.id, err.message);
      console.error('[FOR-DIG-OUTCOME-FOLLOWUP] send failed:', err.message);
    }
  }

  const finalized = await finalizeBatchSendStatus(batchId);
  return {
    dryRun: false,
    sent: finalized.counts.sent,
    failed: finalized.counts.failed,
    skipped: skippedOptedOut + skippedNoPending,
    skipped_opted_out: skippedOptedOut,
    skipped_no_pending: skippedNoPending,
    retryable: finalized.counts.failed,
    batch_status: finalized.batchStatus,
    batchId,
  };
}

async function previewPilotSelection(options = {}) {
  const eligibility = await summarizePendingEligibility(options);
  const selected = eligibility.selected;
  const itemDays = selected.flatMap((group) => (group.items || []).map((item) => daysSince(item.installed_at)));
  return {
    pending_item_count: eligibility.pending_item_count,
    unique_parents: eligibility.unique_parents,
    eligible_parents: eligibility.eligible_parents,
    max_recipients: eligibility.max_recipients,
    recipient_count: selected.length,
    remaining_parents: Math.max(0, eligibility.eligible_parents - selected.length),
    single_count: selected.filter((group) => group.items.length === 1).length,
    multi_count: selected.filter((group) => group.items.length > 1).length,
    pending_items_in_pilot: selected.reduce((n, group) => n + group.items.length, 0),
    days: {
      min: itemDays.length ? Math.min(...itemDays) : 0,
      median: medianNumber(itemDays),
      max: itemDays.length ? Math.max(...itemDays) : 0,
    },
    opted_out: eligibility.opted_out,
    skipped_missing_identity: eligibility.skipped_missing_identity,
    invalid_or_missing_email: eligibility.skipped_missing_identity,
    excluded_already_emailed_items: eligibility.excluded_already_emailed_items,
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

async function getRecipientById(recipientId) {
  const result = await db.query(
    `SELECT r.id, r.batch_id, r.parent_id, r.recipient_email,
            p.name AS parent_name
       FROM for_dig_outcome_followup_recipient r
       LEFT JOIN parent p ON p.id = r.parent_id
      WHERE r.id = $1`,
    [recipientId]
  );
  return result.rows[0] || null;
}

async function listAnswerableItems(recipientId) {
  const result = await db.query(
    `SELECT i.family_id, i.child_id, i.goal_slug, c.name AS child_name
       FROM for_dig_outcome_followup_recipient_item i
       JOIN child c ON c.id = i.child_id
      WHERE i.recipient_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM for_dig_goal_feedback f
           WHERE f.family_id = i.family_id
             AND f.child_id = i.child_id
             AND f.goal_slug = i.goal_slug
             AND f.phase = 'outcome'
        )
      ORDER BY i.created_at ASC, i.goal_slug ASC`,
    [recipientId]
  );
  return result.rows.map((row) => ({
    family_id: row.family_id,
    child_id: row.child_id,
    goal_slug: row.goal_slug,
    child_name: row.child_name,
    goal_title: (getGoalBySlug(row.goal_slug) || {}).title || row.goal_slug,
  }));
}

function parseOutcomeScore(raw) {
  const score = parseInt(raw, 10);
  if (!score || score < 1 || score > 4) return null;
  return score;
}

async function submitFollowupAnswer({ recipientId, childId, goalSlug, score }) {
  const recipient = await getRecipientById(recipientId);
  if (!recipient) return { ok: false, reason: 'invalid_token' };
  const parsedScore = parseOutcomeScore(score);
  if (!parsedScore) return { ok: false, reason: 'invalid_score' };

  const pending = await listAnswerableItems(recipientId);
  const item = pending.find((row) => (
    String(row.child_id) === String(childId)
    && String(row.goal_slug) === String(goalSlug)
  ));
  if (!item) {
    return {
      ok: false,
      reason: pending.length ? 'not_pending' : 'already_answered',
      remaining: pending,
    };
  }

  try {
    await insertFeedback({
      familyId: item.family_id,
      parentId: recipient.parent_id,
      childId: item.child_id,
      goalSlug: item.goal_slug,
      phase: 'outcome',
      outcomeScore: parsedScore,
    });
  } catch (err) {
    if (err.code === '23505') {
      const remaining = await listAnswerableItems(recipientId);
      return { ok: true, already: true, remaining };
    }
    throw err;
  }

  analytics.track(item.family_id, 'for_dig_feedback_outcome', {
    goal_slug: item.goal_slug,
    outcome_score: parsedScore,
    child_id: item.child_id,
    source: 'followup_email',
  }).catch(() => {});

  const remaining = await listAnswerableItems(recipientId);
  return { ok: true, already: false, item, remaining };
}

module.exports = {
  CAMPAIGN_TYPE,
  PREPARE_LIMIT,
  DEFAULT_MAX_RECIPIENTS,
  BATCH_PARENT_UNIQUE,
  BATCH_SEND,
  RECIPIENT_SEND,
  isEmailSendEnabled,
  pendingRowKey,
  emailedItemKey,
  followupIdempotencyKey,
  parseMaxRecipients,
  parseOutcomeScore,
  sortParentsNewestEligibleFirst,
  applyPilotSelection,
  groupPendingByParent,
  createBatch,
  listBatches,
  getBatch,
  getRecipientById,
  listRecipients,
  listAnswerableItems,
  submitFollowupAnswer,
  summarizePendingEligibility,
  previewPilotSelection,
  prepareFromPending,
  previewBatch,
  sendBatch,
  claimRecipientSend,
  listAttributedOutcomes,
  getBatchStats,
  getRecipientsTracking,
};
