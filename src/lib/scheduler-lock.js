'use strict';

/**
 * Connection-scoped PostgreSQL advisory locks for schedulers.
 * Fail-closed: lock/client errors skip the job (K2/K3).
 */

const db = require('./db');

/**
 * @param {number} lockId
 * @param {(client: import('pg').PoolClient) => Promise<*>} fn
 * @returns {Promise<{ skipped?: 'lock'|'error', result?: * }>}
 */
async function withAdvisoryLock(lockId, fn) {
  let client;
  try {
    client = await db.getClient();
  } catch (err) {
    console.warn('[SCHEDULER-LOCK] getClient failed for lock', lockId, ':', err.message);
    return { skipped: 'error' };
  }

  try {
    const { rows } = await client.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [lockId]
    );
    if (!rows[0]?.acquired) {
      return { skipped: 'lock' };
    }
    const result = await fn(client);
    return { result };
  } catch (err) {
    console.warn('[SCHEDULER-LOCK] Job failed under lock', lockId, ':', err.message);
    return { skipped: 'error' };
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [lockId]).catch(() => {});
    client.release();
  }
}

module.exports = { withAdvisoryLock };
