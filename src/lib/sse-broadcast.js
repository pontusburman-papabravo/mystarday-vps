/**
 * SSE broadcast module.
 *
 * Owns: the in-process Map of connected SSE clients, keyed by familyId.
 * Does NOT own: authentication, routing, or event triggers.
 *
 * Usage:
 *   const { addClient, removeClient, broadcast } = require('./sse-broadcast');
 */

/**
 * @typedef {object} SseClient
 * @property {import('express').Response} res
 * @property {(type: string, data: object) => boolean} shouldDeliver
 */

// Map<familyId, Set<SseClient>>
const clients = new Map();

/**
 * Register an SSE response object for a family.
 * @param {string} familyId
 * @param {import('express').Response} res
 * @param {{ shouldDeliver?: (type: string, data: object) => boolean }} [options]
 */
function addClient(familyId, res, options = {}) {
  const shouldDeliver = options.shouldDeliver || (() => true);
  const client = { res, shouldDeliver };
  if (!clients.has(familyId)) clients.set(familyId, new Set());
  clients.get(familyId).add(client);
}

/**
 * Remove an SSE response object (called on connection close).
 * @param {string} familyId
 * @param {import('express').Response} res
 */
function removeClient(familyId, res) {
  const set = clients.get(familyId);
  if (!set) return;
  for (const client of set) {
    if (client.res === res) {
      set.delete(client);
      break;
    }
  }
  if (set.size === 0) clients.delete(familyId);
}

/**
 * Broadcast an SSE event to all clients in the same family.
 * Silent if no clients are connected — no error, no queue.
 *
 * @param {string} familyId
 * @param {string} type   — e.g. 'DAILY_LOG_ITEM_COMPLETED'
 * @param {object} data   — payload (will be JSON-serialised)
 */
function broadcast(familyId, type, data) {
  const set = clients.get(familyId);
  if (!set || set.size === 0) return;

  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of set) {
    try {
      if (!client.shouldDeliver(type, data || {})) continue;
      client.res.write(payload);
    } catch {
      // Client already disconnected — cleanup handled by close listener
    }
  }
}

module.exports = { addClient, removeClient, broadcast };
