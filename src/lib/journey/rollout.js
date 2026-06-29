'use strict';

const db = require('../db');
const appConfig = require('../../../db/app-config');
const { FLAG_KEYS, isFlagEnabled } = require('./flags');

const CONFIG_KEY = 'JOURNEY_ROLLOUT_WAVE';
const CONFIG_AT_KEY = 'JOURNEY_ROLLOUT_WAVE_AT';

/** @type {Array<{ wave: number, label: string, requiredOn: string[], requiredOff?: string[] }>} */
const ROLLOUT_WAVES = [
  {
    wave: 1,
    label: 'Wave 1 — Fas 1 (shadow)',
    requiredOn: [
      FLAG_KEYS.ingestEnabled,
      FLAG_KEYS.evaluatorEnabled,
      FLAG_KEYS.contextApi,
    ],
  },
  {
    wave: 2,
    label: 'Wave 2 — Fas 2 (parent ack + handoff)',
    requiredOn: [
      FLAG_KEYS.registryV2,
      FLAG_KEYS.parentAckV1,
      FLAG_KEYS.handoffV2,
      FLAG_KEYS.onboardingV1,
    ],
  },
  {
    wave: 3,
    label: 'Wave 3 — Fas 3 (coach + established)',
    requiredOn: [
      FLAG_KEYS.establishedPhase,
      FLAG_KEYS.coachV1,
      FLAG_KEYS.engineShadow,
    ],
  },
  {
    wave: 4,
    label: 'Wave 4 — Fas 4 (activation sunset)',
    requiredOn: [
      FLAG_KEYS.activationUiRemoved,
      FLAG_KEYS.activationApiDeprecated,
    ],
    requiredOff: [FLAG_KEYS.activationNewEnrollments],
  },
  {
    wave: 5,
    label: 'Wave 5 — Fas 5 (expanding + push)',
    requiredOn: [
      FLAG_KEYS.expandingPhase,
      FLAG_KEYS.addChildV1,
      FLAG_KEYS.independencePhase,
      FLAG_KEYS.pushV1,
    ],
  },
];

async function setFlag(key, enabled, updatedBy = null) {
  const existing = await db.query('SELECT 1 FROM feature_flag WHERE key = $1 LIMIT 1', [key]);
  if (existing.rows.length) {
    await db.query(
      'UPDATE feature_flag SET enabled = $1, updated_at = NOW(), updated_by = $2 WHERE key = $3',
      [enabled, updatedBy, key]
    );
    return;
  }
  await db.query(
    'INSERT INTO feature_flag (key, enabled, description) VALUES ($1, $2, $3)',
    [key, enabled, `Journey rollout — ${key}`]
  );
}

async function getFlagMap() {
  const result = await db.query('SELECT key, enabled FROM feature_flag');
  const map = {};
  for (const row of result.rows) map[row.key] = Boolean(row.enabled);
  return map;
}

function waveIsComplete(waveDef, flagMap) {
  const onOk = waveDef.requiredOn.every((k) => flagMap[k] === true);
  const offOk = (waveDef.requiredOff || []).every((k) => flagMap[k] !== true);
  return onOk && offOk;
}

/**
 * Highest wave (1–5) where all required flags match; 0 if Wave 1 not complete.
 */
function deriveActiveWave(flagMap) {
  let active = 0;
  for (const w of ROLLOUT_WAVES) {
    if (waveIsComplete(w, flagMap)) active = w.wave;
    else break;
  }
  return active;
}

async function getPhaseDistribution() {
  const result = await db.query(
    `SELECT COALESCE(journey_phase, 'SETTING_UP') AS phase, COUNT(*)::int AS n
     FROM family
     WHERE archived_at IS NULL
     GROUP BY journey_phase
     ORDER BY n DESC`
  );
  return result.rows;
}

async function getRolloutStatus() {
  const flagMap = await getFlagMap();
  const activeWave = deriveActiveWave(flagMap);
  const nextWave = activeWave < 5 ? activeWave + 1 : null;
  const configEntry = await appConfig.getEntry(CONFIG_KEY);
  const configAtEntry = await appConfig.getEntry(CONFIG_AT_KEY);
  const recordedWave = parseInt(configEntry?.value || '0', 10) || 0;

  const waves = ROLLOUT_WAVES.map((w) => ({
    wave: w.wave,
    label: w.label,
    status: w.wave <= activeWave ? 'active' : w.wave === nextWave ? 'next' : 'pending',
    complete: waveIsComplete(w, flagMap),
    flags_on: w.requiredOn.filter((k) => flagMap[k]),
    flags_off: (w.requiredOff || []).filter((k) => !flagMap[k]),
    flags_missing: w.requiredOn.filter((k) => !flagMap[k]),
    flags_should_be_off: (w.requiredOff || []).filter((k) => flagMap[k]),
  }));

  return {
    active_wave: activeWave,
    next_wave: nextWave,
    recorded_wave: recordedWave,
    wave_enabled_at: configAtEntry?.updated_at || null,
    waves,
    phase_distribution: await getPhaseDistribution(),
    flag_map: flagMap,
  };
}

/**
 * Enable flags for waves 1..targetWave (cumulative). Does not disable higher waves.
 */
async function enableWaveUpTo(targetWave, { updatedBy = null } = {}) {
  const wave = Math.min(Math.max(1, targetWave), 5);
  for (const w of ROLLOUT_WAVES) {
    if (w.wave > wave) break;
    for (const key of w.requiredOn) {
      await setFlag(key, true, updatedBy);
    }
    for (const key of w.requiredOff || []) {
      await setFlag(key, false, updatedBy);
    }
  }
  await appConfig.set(CONFIG_KEY, String(wave), {
    description: 'Family Journey rollout wave (1–5)',
    updatedBy,
  });
  await appConfig.set(CONFIG_AT_KEY, new Date().toISOString(), {
    description: 'Timestamp when rollout wave last changed',
    updatedBy,
  });
  return getRolloutStatus();
}

/**
 * Advance exactly one wave (active + 1).
 */
async function advanceOneWave({ updatedBy = null, minObservationHours = 0 } = {}) {
  const status = await getRolloutStatus();
  if (status.active_wave >= 5) {
    return { ok: false, error: 'already_at_wave_5', status };
  }

  if (minObservationHours > 0 && status.wave_enabled_at) {
    const elapsed = Date.now() - new Date(status.wave_enabled_at).getTime();
    const required = minObservationHours * 3600_000;
    if (elapsed < required) {
      return {
        ok: false,
        error: 'observation_period',
        hours_remaining: Math.ceil((required - elapsed) / 3600_000),
        status,
      };
    }
  }

  const target = status.active_wave + 1;
  const newStatus = await enableWaveUpTo(target, { updatedBy });
  return { ok: true, enabled_wave: target, status: newStatus };
}

async function runHealthChecks() {
  const checks = [];
  const flagMap = await getFlagMap();

  checks.push({
    id: 'context_api_flag',
    ok: flagMap[FLAG_KEYS.contextApi] === true || deriveActiveWave(flagMap) === 0,
    detail: 'context API flag consistent with active wave',
  });

  try {
    const ingestErrors = await db.query(
      `SELECT COUNT(*)::int AS n FROM family_milestones WHERE milestone = 'first_success'
       AND NOT EXISTS (
         SELECT 1 FROM family_milestones fm2
         WHERE fm2.family_id = family_milestones.family_id
           AND fm2.milestone IN ('child_first_completion', 'parent_saw_completion')
       )`
    );
    checks.push({
      id: 'first_success_integrity',
      ok: ingestErrors.rows[0].n === 0,
      detail: `orphan first_success rows: ${ingestErrors.rows[0].n}`,
    });
  } catch (err) {
    checks.push({ id: 'first_success_integrity', ok: false, detail: err.message });
  }

  const allOk = checks.every((c) => c.ok);
  return { ok: allOk, checks };
}

module.exports = {
  ROLLOUT_WAVES,
  CONFIG_KEY,
  deriveActiveWave,
  waveIsComplete,
  getRolloutStatus,
  enableWaveUpTo,
  advanceOneWave,
  runHealthChecks,
  setFlag,
};
