'use strict';

const db = require('../src/lib/db');

async function getIdempotentResponse(installationId, idempotencyKey) {
  const result = await db.query(
    `SELECT response_json FROM widget_completion_idempotency
     WHERE installation_id = $1 AND idempotency_key = $2`,
    [installationId, idempotencyKey]
  );
  return result.rows[0]?.response_json || null;
}

async function storeIdempotentResponse(installationId, idempotencyKey, dailyLogItemId, responseJson) {
  await db.query(
    `INSERT INTO widget_completion_idempotency (installation_id, idempotency_key, daily_log_item_id, response_json)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (installation_id, idempotency_key) DO NOTHING`,
    [installationId, idempotencyKey, dailyLogItemId, responseJson]
  );
  const again = await getIdempotentResponse(installationId, idempotencyKey);
  return again;
}

module.exports = {
  getIdempotentResponse,
  storeIdempotentResponse,
};
