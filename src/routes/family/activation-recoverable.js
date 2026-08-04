'use strict';

const crypto = require('crypto');
const express = require('express');
const db = require('../../lib/db');
const analytics = require('../../../db/analytics');
const activationDb = require('../../../db/family-activation-state');
const { requireNotPedagogOnly } = require('../../middleware/authz');
const { isActivationFlagEnabled, FLAG_KEYS } = require('../../lib/activation-flags');
const { buildActivationScheduleOptions } = require('../../lib/activation/schedule-options');
const { resolveContinueDestination } = require('../../lib/activation/continue-destination');
const {
  STEP_STATUSES,
  STEP_IDS,
  ACTIVATION_ERROR_CODES,
} = require('../../lib/activation/error-codes');
const { sendEmail } = require('../../lib/email');
const { getFamilyLocale } = require('../../lib/onboarding-locale');
const { validateLocale } = require('../../lib/locale');

const router = express.Router();

const VALID_STEPS = new Set(Object.values(STEP_IDS));
const VALID_SKIP_STATUSES = new Set([STEP_STATUSES.SKIPPED_BY_USER, STEP_STATUSES.DEFERRED]);

function pseudonymId(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function sanitizeActivationReportMetadata(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const safe = {};
  const allowed = [
    'activation_step_id',
    'activation_state',
    'error_code',
    'route',
    'locale',
    'platform',
    'app_version',
    'cache_version',
    'build_sha',
    'correlation_id',
    'rollout_source',
    'retry_count',
    'duration_bucket',
    'child_id_pseudo',
  ];
  const maxLengths = {
    activation_step_id: 64,
    activation_state: 32,
    error_code: 80,
    route: 200,
    locale: 16,
    platform: 64,
    app_version: 64,
    cache_version: 64,
    build_sha: 64,
    correlation_id: 64,
    rollout_source: 64,
    duration_bucket: 32,
    child_id_pseudo: 32,
  };
  for (const key of allowed) {
    if (raw[key] == null || typeof raw[key] === 'object') continue;
    const max = maxLengths[key] || 120;
    safe[key] = String(raw[key]).slice(0, max);
  }
  if (typeof raw.retry_count === 'number' && Number.isFinite(raw.retry_count)) {
    safe.retry_count = Math.min(99, Math.max(0, Math.floor(raw.retry_count)));
  }
  return safe;
}

router.get('/activation/schedule-options', requireNotPedagogOnly, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const flagOn = await isActivationFlagEnabled(FLAG_KEYS.firstSuccessV1, familyId);
    if (!flagOn) {
      return res.status(404).json({ error: 'Not found', error_code: 'flag_off' });
    }

    const childId = typeof req.query.child_id === 'string' ? req.query.child_id : undefined;
    const data = await buildActivationScheduleOptions(familyId, childId);
    if (data.invalid_child) {
      return res.status(400).json({
        error: 'Ogiltigt barn',
        error_code: ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_403,
      });
    }
    res.json(data);
  } catch (err) {
    console.error('[FAMILY] GET /activation/schedule-options error:', err);
    res.status(500).json({
      error: 'Kunde inte ladda scheman',
      error_code: ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_5XX,
    });
  }
});

router.post('/activation/step-status', requireNotPedagogOnly, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const flagOn = await isActivationFlagEnabled(FLAG_KEYS.firstSuccessV1, familyId);
    if (!flagOn) {
      return res.status(404).json({ error: 'Not found' });
    }

    const stepId = req.body?.step_id;
    const status = req.body?.status;
    if (!stepId || !VALID_STEPS.has(stepId)) {
      return res.status(400).json({ error: 'Ogiltigt steg' });
    }
    if (!status || !VALID_SKIP_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Ogiltig status' });
    }

    const state = await activationDb.getByFamilyId(familyId);
    const childHasSchedule = Boolean(req.body?.child_has_schedule);
    const destination = resolveContinueDestination({
      stepId,
      activationState: state,
      childHasSchedule,
    });

    const eventType = status === STEP_STATUSES.DEFERRED
      ? 'activation_step_deferred'
      : 'activation_step_skipped';

    analytics.track(familyId, eventType, {
      step_id: stepId,
      status,
      reason: req.body?.reason || null,
      error_code: req.body?.error_code || null,
      rollout_source: 'activation_first_success_v1',
    });

    res.json({
      ok: true,
      step_id: stepId,
      status,
      continue_url: destination.url,
      continue_reason: destination.reason,
    });
  } catch (err) {
    console.error('[FAMILY] POST /activation/step-status error:', err);
    res.status(500).json({ error: 'Kunde inte spara steget' });
  }
});

router.post('/activation/problem-report', requireNotPedagogOnly, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const flagOn = await isActivationFlagEnabled(FLAG_KEYS.firstSuccessV1, familyId);
    if (!flagOn) {
      return res.status(404).json({ error: 'Not found' });
    }

    const stepId = req.body?.activation_step_id;
    if (!stepId || !VALID_STEPS.has(stepId)) {
      return res.status(400).json({ error: 'Ogiltigt steg' });
    }

    const userNote = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 500) : '';
    const clientMeta = sanitizeActivationReportMetadata(req.body?.metadata || {});
    const lang = validateLocale(await getFamilyLocale(familyId));

    const metadata = {
      ...clientMeta,
      activation_step_id: stepId,
      locale: lang,
      family_id_pseudo: pseudonymId(familyId),
      child_id_pseudo: clientMeta.child_id_pseudo || pseudonymId(req.body?.child_id),
      source: 'activation_coach',
      timestamp: new Date().toISOString(),
    };

    const title = `Activation — ${stepId}`;
    const bodyLines = [
      userNote || '(Ingen frivillig beskrivning)',
      '',
      `Felkod: ${clientMeta.error_code || '—'}`,
      `Stegstatus: ${clientMeta.activation_state || '—'}`,
    ];

    const parentName = req.user.name || req.user.email || 'Okänd användare';
    const parentEmail = req.user.email || '';

    const result = await db.query(
      `INSERT INTO contact_message (name, email, message, message_type, family_id, metadata)
       VALUES ($1, $2, $3, 'bug', $4, $5::jsonb)
       RETURNING id`,
      [parentName.trim(), parentEmail, bodyLines.join('\n'), familyId, JSON.stringify(metadata)]
    );

    analytics.track(familyId, 'activation_problem_report_submitted', {
      step_id: stepId,
      error_code: clientMeta.error_code || null,
      rollout_source: 'activation_first_success_v1',
    });

    try {
      const feedbackTo = process.env.FEEDBACK_EMAIL || process.env.EMAIL_FROM;
      if (feedbackTo) {
        await sendEmail({
          to: feedbackTo,
          subject: `[Activation] ${title}`,
          html: `<pre style="font-family:monospace;font-size:12px">${bodyLines.join('\n')}</pre>`,
        });
      }
    } catch (emailErr) {
      console.warn('[FAMILY] activation problem-report email failed:', emailErr.message);
    }

    res.status(201).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error('[FAMILY] POST /activation/problem-report error:', err);
    analytics.track(req.user.familyId, 'activation_problem_report_failed', {
      step_id: req.body?.activation_step_id || null,
    }).catch(() => {});
    res.status(500).json({
      error: 'Rapporten kunde inte skickas',
      error_code: ACTIVATION_ERROR_CODES.REPORT_SUBMIT_FAILED,
    });
  }
});

module.exports = router;
