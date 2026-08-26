'use strict';

/**
 * Manual stuck-family growth interventions (V1).
 * Preview and send share evaluateStuckIntervention — no mutation on preview.
 */

const db = require('./db');
const config = require('./config');
const { sendEmail } = require('./email');
const { LEGACY_GENERIC_PARENT_ROLE_SQL } = require('./family-role-legacy');
const { mapGrowthStuckFamily } = require('./growth-stuck-work-queue');
const { evaluateCommunicationGate } = require('./journey/communication-gate');
const {
  buildInterventionEmail,
  interventionKeyForCohort,
  INTERVENTION_KEYS,
} = require('./growth-stuck-intervention-templates');
const interventionDb = require('../../db/family-growth-intervention');
const analytics = require('../../db/analytics');

const GROWTH_EMAIL_COOLDOWN_HOURS = 72;
const STUCK_MIN_AGE_HOURS = 48;
const STUCK_MAX_AGE_DAYS = 14;

function hoursSince(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.round((Date.now() - then) / 3600000));
}

function formatBlockerMessage(code, detail = {}) {
  switch (code) {
    case 'activation_nudge_recent':
      return `Activation-nudge skickad ${detail.hoursAgo} tim sedan (vänta ${GROWTH_EMAIL_COOLDOWN_HOURS}h mellan growth-mejl)`;
    case 'growth_intervention_recent':
      return `Stuck-mejl skickat ${detail.hoursAgo} tim sedan (vänta ${GROWTH_EMAIL_COOLDOWN_HOURS}h mellan growth-mejl)`;
    case 'email_disabled':
      return 'E-post avstängd i förälderns notisinställningar';
    case 'email_globally_disabled':
      return 'EMAIL_ENABLED=false på servern';
    case 'already_sent':
      return `Stuck-intervention "${detail.interventionKey}" redan skickad`;
    case 'send_in_progress':
      return 'Utskick pågår redan (pending claim) — vänta någon minut';
    case 'family_activated':
      return 'Familjen är aktiverad — inget stuck-mejl behövs';
    case 'intervention_goal_met':
      return 'Barnåtkomst är redan etablerad — inget stuck-mejl behövs';
    case 'no_longer_stuck':
      return 'Familjen ligger inte längre i stuck-fönstret (48h–14d)';
    case 'unsupported_cohort':
      return `Kohort "${detail.cohort || 'okänd'}" har ingen V1-mall`;
    case 'family_not_found':
      return 'Familjen hittades inte';
    case 'no_parent_email':
      return 'Ingen förälder med e-post hittades';
    case 'gate_blocked':
      return `Journey Gate: ${detail.reason || 'blockerad'}`;
    case 'support_in_progress':
      return 'Familjen har begärt support — vänta med utskick';
    default:
      return code;
  }
}

async function loadStuckFamilyRow(familyId) {
  const { rows } = await db.query(
    `WITH base AS (
       SELECT
         f.id AS family_id,
         f.name AS family_name,
         f.created_at,
         f.archived_at,
         f.preferred_locale AS locale,
         BOOL_OR(p.onboarding_completed) AS onboarding_completed,
         s.child_created_at,
         s.schema_saved_at,
         s.child_access_completed_at,
         s.first_completion_at,
         s.p0_activated_at,
         s.activation_nudge_sent_at,
         s.child_handoff_reminder_sent_at,
         (
           SELECT ae.event_type
           FROM analytics_events ae
           WHERE ae.family_id = f.id
           ORDER BY ae.created_at DESC
           LIMIT 1
         ) AS last_event_type,
         (
           SELECT ae.created_at
           FROM analytics_events ae
           WHERE ae.family_id = f.id
           ORDER BY ae.created_at DESC
           LIMIT 1
         ) AS last_event_at,
         EXISTS (
           SELECT 1 FROM analytics_events ae
           WHERE ae.family_id = f.id
             AND ae.event_type IN (
               'child_login_failed',
               'child_pin_lockout',
               'api_error_core_flow'
             )
             AND ae.created_at > NOW() - INTERVAL '14 days'
         ) AS has_core_flow_error,
         (
           SELECT MAX(le.occurred_at)
           FROM login_event le
           WHERE le.family_id = f.id
         ) AS last_login_at
       FROM family f
       JOIN parent p ON p.family_id = f.id
       LEFT JOIN family_activation_state s ON s.family_id = f.id
       WHERE f.id = $1
       GROUP BY
         f.id, f.name, f.created_at, f.archived_at, f.preferred_locale,
         s.child_created_at, s.schema_saved_at, s.child_access_completed_at,
         s.first_completion_at, s.p0_activated_at, s.activation_nudge_sent_at,
         s.child_handoff_reminder_sent_at
     ),
     classified AS (
       SELECT
         b.*,
         CASE
           WHEN b.archived_at IS NOT NULL THEN NULL
           WHEN b.created_at < NOW() - ($3::int * interval '1 day') THEN NULL
           WHEN b.created_at > NOW() - ($2::int * interval '1 hour') THEN NULL
           WHEN b.has_core_flow_error THEN 'core_flow_errors'
           WHEN NOT COALESCE(b.onboarding_completed, false) THEN 'onboarding_incomplete'
           WHEN b.schema_saved_at IS NOT NULL AND b.child_access_completed_at IS NULL
             THEN 'schema_no_child_login'
           WHEN b.child_access_completed_at IS NOT NULL AND b.first_completion_at IS NULL
             THEN 'login_no_completion'
           WHEN b.first_completion_at IS NOT NULL
             AND (b.last_login_at IS NULL OR b.last_login_at < NOW() - INTERVAL '7 days')
             AND b.first_completion_at < NOW() - INTERVAL '3 days'
             THEN 'completion_no_return'
           ELSE NULL
         END AS blocking_step
       FROM base b
     )
     SELECT * FROM classified`,
    [familyId, STUCK_MIN_AGE_HOURS, STUCK_MAX_AGE_DAYS]
  );
  return rows[0] || null;
}

async function loadParentRecipient(familyId) {
  const { rows } = await db.query(
    `SELECT p.id, p.email, p.name,
            COALESCE(np.email_enabled, true) AS email_enabled,
            COALESCE(f.preferred_locale, 'sv-SE') AS preferred_locale
     FROM parent p
     JOIN family f ON f.id = p.family_id
     LEFT JOIN notification_preference np ON np.parent_id = p.id
     WHERE p.family_id = $1 AND ${LEGACY_GENERIC_PARENT_ROLE_SQL}
     ORDER BY p.created_at ASC
     LIMIT 1`,
    [familyId]
  );
  return rows[0] || null;
}

async function hasOpenSupportRequest(familyId) {
  const { rows } = await db.query(
    `SELECT support_requested_at
     FROM family_system_help_state
     WHERE family_id = $1 AND support_requested_at IS NOT NULL
     LIMIT 1`,
    [familyId]
  );
  return Boolean(rows[0]?.support_requested_at);
}

function isFamilyActivated(row) {
  if (!row) return false;
  if (row.p0_activated_at) return true;
  if (row.first_completion_at) return true;
  return false;
}

function isInterventionGoalMet(interventionKey, row) {
  if (!row) return false;
  if (interventionKey === INTERVENTION_KEYS.schema_without_child_access) {
    return Boolean(row.child_access_completed_at);
  }
  return isFamilyActivated(row);
}

async function evaluateStuckIntervention(familyId) {
  const blockers = [];
  const row = await loadStuckFamilyRow(familyId);

  if (!row || row.family_id == null) {
    blockers.push({ code: 'family_not_found', message: formatBlockerMessage('family_not_found') });
    return { eligible: false, blockers, family: null };
  }

  const interventionKey = interventionKeyForCohort(row.blocking_step);

  if (interventionKey && isInterventionGoalMet(interventionKey, row)) {
    const code = interventionKey === INTERVENTION_KEYS.schema_without_child_access
      ? 'intervention_goal_met'
      : 'family_activated';
    blockers.push({ code, message: formatBlockerMessage(code) });
  }

  if (!row.blocking_step) {
    blockers.push({ code: 'no_longer_stuck', message: formatBlockerMessage('no_longer_stuck') });
  }

  if (row.blocking_step && !interventionKey) {
    blockers.push({
      code: 'unsupported_cohort',
      message: formatBlockerMessage('unsupported_cohort', { cohort: row.blocking_step }),
      cohort: row.blocking_step,
    });
  }

  const parent = await loadParentRecipient(familyId);
  if (!parent?.email) {
    blockers.push({ code: 'no_parent_email', message: formatBlockerMessage('no_parent_email') });
  } else if (parent.email_enabled === false) {
    blockers.push({ code: 'email_disabled', message: formatBlockerMessage('email_disabled') });
  }

  if (process.env.EMAIL_ENABLED === 'false') {
    blockers.push({
      code: 'email_globally_disabled',
      message: formatBlockerMessage('email_globally_disabled'),
    });
  }

  if (interventionKey) {
    const existing = await interventionDb.getSentIntervention(familyId, interventionKey);
    if (existing) {
      blockers.push({
        code: 'already_sent',
        message: formatBlockerMessage('already_sent', { interventionKey }),
        interventionKey,
        sentAt: existing.sent_at,
      });
    }

    const pending = await interventionDb.getPendingIntervention(familyId, interventionKey);
    if (pending?.claimed_at) {
      const pendingHours = hoursSince(pending.claimed_at);
      if (pendingHours == null || pendingHours * 60 < interventionDb.PENDING_STALE_MINUTES) {
        blockers.push({
          code: 'send_in_progress',
          message: formatBlockerMessage('send_in_progress'),
          claimedAt: pending.claimed_at,
        });
      }
    }
  }

  const nudgeHours = hoursSince(row.activation_nudge_sent_at);
  const latestIntervention = await interventionDb.getLatestSentForFamily(familyId);
  const interventionHours = hoursSince(latestIntervention?.sent_at);

  if (nudgeHours != null && nudgeHours < GROWTH_EMAIL_COOLDOWN_HOURS) {
    blockers.push({
      code: 'activation_nudge_recent',
      message: formatBlockerMessage('activation_nudge_recent', { hoursAgo: nudgeHours }),
      hoursAgo: nudgeHours,
      lastGrowthEmailAt: row.activation_nudge_sent_at,
    });
  } else if (interventionHours != null && interventionHours < GROWTH_EMAIL_COOLDOWN_HOURS) {
    blockers.push({
      code: 'growth_intervention_recent',
      message: formatBlockerMessage('growth_intervention_recent', { hoursAgo: interventionHours }),
      hoursAgo: interventionHours,
      lastGrowthEmailAt: latestIntervention.sent_at,
    });
  }

  if (await hasOpenSupportRequest(familyId)) {
    blockers.push({ code: 'support_in_progress', message: formatBlockerMessage('support_in_progress') });
  }

  if (interventionKey && blockers.length === 0) {
    const gate = await evaluateCommunicationGate(familyId, {
      channel: 'email',
      intent: 'stuck_intervention',
    });
    if (!gate.allowed) {
      blockers.push({
        code: 'gate_blocked',
        message: formatBlockerMessage('gate_blocked', { reason: gate.reason }),
        gateReason: gate.reason,
      });
    }
  }

  const mapped = mapGrowthStuckFamily(row);

  let emailPreview = null;
  if (interventionKey && parent?.email) {
    emailPreview = buildInterventionEmail(interventionKey, {
      parentName: parent.name,
      locale: parent.preferred_locale,
    });
  }

  return {
    eligible: blockers.length === 0 && Boolean(interventionKey && emailPreview),
    blockers,
    family: mapped,
    cohort: row.blocking_step,
    interventionKey,
    recipientEmail: parent?.email || null,
    emailPreview: emailPreview
      ? {
          subject: emailPreview.subject,
          html: emailPreview.html,
          bodyVersion: emailPreview.bodyVersion,
          from: emailPreview.from,
          ctaUrl: emailPreview.ctaUrl,
        }
      : null,
    commsHistory: {
      activationNudgeSentAt: row.activation_nudge_sent_at || null,
      childHandoffReminderSentAt: row.child_handoff_reminder_sent_at || null,
      lastStuckIntervention: latestIntervention
        ? {
            interventionKey: latestIntervention.intervention_key,
            cohort: latestIntervention.cohort,
            sentAt: latestIntervention.sent_at,
            subjectSnapshot: latestIntervention.subject_snapshot,
          }
        : null,
    },
  };
}

async function previewStuckIntervention(familyId, { track = true } = {}) {
  const result = await evaluateStuckIntervention(familyId);
  if (track && result.interventionKey && result.cohort) {
    analytics.track(familyId, 'stuck_intervention_previewed', {
      intervention_key: result.interventionKey,
      cohort: result.cohort,
      eligible: result.eligible,
      blocker_count: result.blockers.length,
    });
  }
  return result;
}

async function sendStuckIntervention(familyId, adminParentId) {
  const evaluated = await evaluateStuckIntervention(familyId);
  if (!evaluated.eligible || !evaluated.emailPreview) {
    return { ok: false, ...evaluated };
  }

  const idempotencyKey = interventionDb.buildIdempotencyKey(
    familyId,
    evaluated.interventionKey
  );

  const claimed = await interventionDb.claimPendingIntervention({
    familyId,
    cohort: evaluated.cohort,
    interventionKey: evaluated.interventionKey,
    sentBy: adminParentId,
    subjectSnapshot: evaluated.emailPreview.subject,
    bodyVersion: evaluated.emailPreview.bodyVersion,
    idempotencyKey,
  });

  if (!claimed) {
    const existing = await interventionDb.getSentIntervention(
      familyId,
      evaluated.interventionKey
    );
    const pending = await interventionDb.getPendingIntervention(
      familyId,
      evaluated.interventionKey
    );
    const blockers = [];
    if (existing) {
      blockers.push({
        code: 'already_sent',
        message: formatBlockerMessage('already_sent', {
          interventionKey: evaluated.interventionKey,
        }),
        sentAt: existing.sent_at,
      });
    } else if (pending) {
      blockers.push({
        code: 'send_in_progress',
        message: formatBlockerMessage('send_in_progress'),
        claimedAt: pending.claimed_at,
      });
    } else {
      blockers.push({
        code: 'already_sent',
        message: formatBlockerMessage('already_sent', {
          interventionKey: evaluated.interventionKey,
        }),
      });
    }
    return {
      ok: false,
      eligible: false,
      blockers,
      family: evaluated.family,
      cohort: evaluated.cohort,
      interventionKey: evaluated.interventionKey,
      commsHistory: evaluated.commsHistory,
    };
  }

  let emailResult;
  try {
    emailResult = await sendEmail({
      to: evaluated.recipientEmail,
      subject: evaluated.emailPreview.subject,
      html: evaluated.emailPreview.html,
      from: evaluated.emailPreview.from || config.email.from,
      idempotencyKey: claimed.idempotency_key || idempotencyKey,
    });
  } catch (err) {
    await interventionDb.markInterventionFailed(claimed.id, err.message);
    throw err;
  }

  if (!emailResult?.success) {
    await interventionDb.markInterventionFailed(
      claimed.id,
      emailResult?.error || 'email_send_failed'
    );
    return {
      ok: false,
      eligible: false,
      blockers: [{
        code: 'email_send_failed',
        message: emailResult?.error || 'Mejlet kunde inte skickas',
      }],
      family: evaluated.family,
      cohort: evaluated.cohort,
      interventionKey: evaluated.interventionKey,
      commsHistory: evaluated.commsHistory,
    };
  }

  const sent = await interventionDb.markInterventionSent(claimed.id);
  if (!sent) {
    await interventionDb.markInterventionUnknown(
      claimed.id,
      'mark_sent_after_provider_success'
    );
    return {
      ok: false,
      eligible: false,
      blockers: [{
        code: 'delivery_state_unknown',
        message: 'Mejl skickat men leveransstatus oklar — kontrollera innan nytt försök',
      }],
      interventionId: claimed.id,
      family: evaluated.family,
      cohort: evaluated.cohort,
      interventionKey: evaluated.interventionKey,
      commsHistory: evaluated.commsHistory,
    };
  }

  analytics.track(familyId, 'stuck_intervention_sent', {
    intervention_key: evaluated.interventionKey,
    cohort: evaluated.cohort,
    body_version: evaluated.emailPreview.bodyVersion,
    channel: 'email',
  });

  return {
    ok: true,
    eligible: true,
    blockers: [],
    interventionId: sent.id,
    sentAt: sent.sent_at,
    cohort: evaluated.cohort,
    interventionKey: evaluated.interventionKey,
    subject: sent.subject_snapshot,
    commsHistory: {
      activationNudgeSentAt: evaluated.commsHistory.activationNudgeSentAt,
      lastStuckIntervention: {
        interventionKey: sent.intervention_key,
        cohort: sent.cohort,
        sentAt: sent.sent_at,
        subjectSnapshot: sent.subject_snapshot,
      },
    },
  };
}

async function skipStuckIntervention(familyId, adminParentId, skipReason) {
  const evaluated = await evaluateStuckIntervention(familyId);
  const reason = String(skipReason || '').trim() || 'Manuellt hoppad i admin';
  const subjectSnapshot = evaluated.emailPreview?.subject
    || `skip:${evaluated.interventionKey || 'unknown'}`;

  const row = await interventionDb.insertSkippedIntervention({
    familyId,
    cohort: evaluated.cohort || 'unknown',
    interventionKey: evaluated.interventionKey || 'unknown',
    skipReason: reason,
    sentBy: adminParentId,
    subjectSnapshot,
    bodyVersion: evaluated.emailPreview?.bodyVersion || 'v1',
  });

  if (evaluated.interventionKey && evaluated.cohort) {
    analytics.track(familyId, 'stuck_intervention_skipped', {
      intervention_key: evaluated.interventionKey,
      cohort: evaluated.cohort,
      skip_reason: reason.slice(0, 120),
    });
  }

  return { ok: Boolean(row), skipped: row, evaluation: evaluated };
}

module.exports = {
  GROWTH_EMAIL_COOLDOWN_HOURS,
  evaluateStuckIntervention,
  previewStuckIntervention,
  sendStuckIntervention,
  skipStuckIntervention,
  formatBlockerMessage,
  loadStuckFamilyRow,
  isFamilyActivated,
  isInterventionGoalMet,
};
