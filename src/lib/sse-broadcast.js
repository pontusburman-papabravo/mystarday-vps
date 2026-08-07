/**
 * SSE broadcast module.
 *
 * Owns: the in-process Map of connected SSE clients, keyed by familyId.
 * Does NOT own: authentication, routing, or event triggers.
 */

const { validateBroadcastPayload, getEventScope } = require('./sse-event-scope');

/**
 * @typedef {object} SseClient
 * @property {import('express').Response} res
 * @property {(type: string, data: object) => boolean} shouldDeliver
 * @property {string | null} [parentId]
 */

const clients = new Map();

function addClient(familyId, res, options = {}) {
  const shouldDeliver = options.shouldDeliver || (() => true);
  const client = { res, shouldDeliver, parentId: options.parentId || null };
  if (!clients.has(familyId)) clients.set(familyId, new Set());
  clients.get(familyId).add(client);
}

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
 * Close open SSE connections for a parent so they reconnect with fresh child scope.
 */
function disconnectParentClients(parentId, familyId) {
  if (!parentId || !familyId) return;
  const set = clients.get(familyId);
  if (!set) return;
  const wantParent = String(parentId);
  for (const client of [...set]) {
    if (String(client.parentId) === wantParent) {
      try {
        client.res.end();
      } catch {
        /* already closed */
      }
      set.delete(client);
    }
  }
  if (set.size === 0) clients.delete(familyId);
}

function broadcast(familyId, type, data) {
  const validation = validateBroadcastPayload(type, data || {});
  if (!validation.ok) {
    if (process.env.NODE_ENV === 'test') {
      throw new Error(`SSE broadcast blocked: ${type} (${validation.reason})`);
    }
    console.warn('[SSE] blocked child-scoped broadcast without childId', { type });
    return;
  }

  const set = clients.get(familyId);
  if (!set || set.size === 0) return;

  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of set) {
    try {
      if (!client.shouldDeliver(type, data || {})) continue;
      client.res.write(payload);
    } catch {
      /* disconnect cleanup via close listener */
    }
  }
}

module.exports = {
  addClient,
  removeClient,
  disconnectParentClients,
  broadcast,
  getEventScope,
};
