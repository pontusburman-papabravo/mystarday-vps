'use strict';

const { disconnectParentClients } = require('./sse-broadcast');

/**
 * After parent_child access changes, drop stale SSE scope for that parent.
 */
function notifyParentAccessRevoked(parentId, familyId) {
  if (!parentId || !familyId) return;
  disconnectParentClients(parentId, familyId);
}

module.exports = { notifyParentAccessRevoked };
