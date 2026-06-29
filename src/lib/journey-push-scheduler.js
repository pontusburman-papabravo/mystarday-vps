'use strict';

const db = require('./db');
const { projectPushForFamily } = require('./journey/push-projector');
const { FLAG_KEYS, isFlagEnabled } = require('./journey/flags');

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
let _timer = null;

async function runJourneyPushJob() {
  const pushOn = await isFlagEnabled(FLAG_KEYS.pushV1);
  if (!pushOn) return;

  const families = await db.query(
    `SELECT id FROM family
     WHERE archived_at IS NULL
       AND journey_phase IN ('FIRST_USE', 'BUILDING_ROUTINE', 'EXPANDING')
     LIMIT 200`
  );

  for (const { id } of families.rows) {
    try {
      const payload = await projectPushForFamily(id);
      if (!payload) continue;
      require('../../db/analytics').track(id, 'journey_push_projected', {
        experience_key: payload.experienceKey,
        phase: payload.phase,
      });
    } catch (err) {
      console.error('[journey-push] family', id, err.message);
    }
  }
}

function startJourneyPushScheduler() {
  if (_timer) return;
  _timer = setInterval(() => {
    runJourneyPushJob().catch((err) => console.error('[journey-push] job error:', err.message));
  }, CHECK_INTERVAL_MS);
}

function stopJourneyPushScheduler() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = { startJourneyPushScheduler, stopJourneyPushScheduler, runJourneyPushJob };
