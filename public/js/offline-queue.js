/**
 * Min Stjärndag — Offline Action Queue
 *
 * Owns: queuing of all offline write actions (completions, stars, emotions, redemptions).
 * Does NOT own: API calls, UI updates, authentication.
 *
 * Uses IndexedDB (via OfflineStore) for persistence across app restarts.
 * Queue store key: 'stjarndag_offline_queue'
 *
 * Action types:
 *   'COMPLETE_ACTIVITY'    { itemId, substepId?, completed: true }
 *   'UNCOMPLETE_ACTIVITY' { itemId, substepId? }
 *   'COMPLETE_SUBSTEP'    { itemId, subStepId }
 *   'UNCOMPLETE_SUBSTEP'  { itemId, subStepId }
 *   'ADD_STARS'            { childId, count, reason }
 *   'CHILD_RATE'           { itemId, score?, emotion_key?, comment? }
 *   'REDEEM_REWARD'        { childId, rewardId }
 *
 * All actions use last-write-wins: a newer entry for the same entityId wins.
 */

(function () {
  'use strict';

  const QUEUE_STORE = 'pendingActions';
  const DB_NAME = 'stjarndag-offline';
  const DB_VERSION = 2; // bump to add new store

  // ── IndexedDB helpers ───────────────────────────────────

  function openQueueDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('entityId', 'entityId', { unique: false });
        }
      };

      req.onsuccess = (event) => resolve(event.target.result);
      req.onerror = (event) => reject(event.target.error);
    });
  }

  function withStore(mode, fn) {
    return openQueueDB().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, mode);
        const store = tx.objectStore(QUEUE_STORE);
        const result = fn(store);
        if (result && typeof result.onsuccess !== 'undefined') {
          result.onsuccess = (e) => resolve(e.target.result);
          result.onerror = (e) => reject(e.target.error);
        } else {
          tx.oncomplete = () => resolve(result);
          tx.onerror = (e) => reject(e.target.error);
        }
      });
    });
  }

  // ── ID generation ─────────────────────────────────────

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // ── Queue operations ──────────────────────────────────

  /**
   * Queue any offline action.
   * Replaces any existing pending entry for the same entityId (last-write-wins).
   * @param {{ type, payload }} action
   * @returns {string} entry id
   */
  function queueAction(action) {
    return openQueueDB().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        const store = tx.objectStore(QUEUE_STORE);

        // Remove any existing pending entry for this entityId (last-write-wins)
        // We determine entityId from action type
        const entityId = getEntityId(action);

        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const e = cursor.value;
            if (!e.synced && getEntityIdFromEntry(e) === entityId) {
              store.delete(e.id);
            }
            cursor.continue();
          }
        };

        tx.oncomplete = () => {
          const entry = {
            id: uuid(),
            type: action.type,
            payload: action.payload,
            timestamp: Date.now(),
            synced: false,
          };
          const addReq = store.add(entry);
          addReq.onsuccess = () => resolve(entry.id);
          addReq.onerror = () => reject(addReq.error);
        };
        tx.onerror = () => reject(tx.error);
      });
    });
  }

  /**
   * Compute entityId for deduplication from an action object.
   */
  function getEntityId(action) {
    switch (action.type) {
      case 'COMPLETE_ACTIVITY':
      case 'UNCOMPLETE_ACTIVITY':
        return 'item:' + (action.payload.itemId || action.payload.id);
      case 'COMPLETE_SUBSTEP':
      case 'UNCOMPLETE_SUBSTEP':
        return 'substep:' + action.payload.itemId + ':' + action.payload.subStepId;
      case 'ADD_STARS':
        return 'stars:' + action.payload.childId;
      case 'CHILD_RATE':
        return 'rate:' + (action.payload.itemId || action.payload.id);
      case 'REDEEM_REWARD':
        return 'redeem:' + action.payload.rewardId;
      default:
        return 'unknown:' + uuid();
    }
  }

  /**
   * Compute entityId from a stored queue entry.
   */
  function getEntityIdFromEntry(entry) {
    return getEntityId({ type: entry.type, payload: entry.payload });
  }

  /**
   * Mark an entry as synced by id.
   */
  function markSynced(entryId) {
    return withStore('readwrite', (store) => {
      const getReq = store.get(entryId);
      getReq.onsuccess = () => {
        const entry = getReq.result;
        if (entry) {
          entry.synced = true;
          store.put(entry);
        }
      };
      return getReq;
    });
  }

  /**
   * Get all pending (not synced) entries, oldest first.
   */
  function getPending() {
    return withStore('readonly', (store) => {
      const allReq = store.getAll();
      return allReq;
    }).then((entries) => {
      return entries
        .filter((e) => !e.synced)
        .sort((a, b) => a.timestamp - b.timestamp);
    });
  }

  /**
   * Remove all synced entries.
   */
  function pruneSynced() {
    return withStore('readwrite', (store) => {
      const idx = store.index('synced');
      const req = idx.openCursor(IDBKeyRange.only(true));
      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      return req;
    });
  }

  /**
   * Clear all queue entries (call on logout).
   */
  function clearQueue() {
    return withStore('readwrite', (store) => store.clear());
  }

  // ── Sync / flush ─────────────────────────────────────

  let _syncing = false;

  /**
   * Attempt to flush all pending actions to the server.
   * Dispatches window events for each synced entry.
   */
  async function flush() {
    if (_syncing) return;
    const pending = await getPending();
    if (pending.length === 0) return;

    _syncing = true;
    let successCount = 0;

    // Check login state before attempting sync
    const loggedIn = window.Auth && window.Auth.isLoggedIn();

    for (const entry of pending) {
      if (!loggedIn) break;

      try {
        const res = await sendAction(entry);
        if (res.ok || res.status === 409) {
          await markSynced(entry.id);
          successCount++;
          window.dispatchEvent(new CustomEvent('offlineQueue:synced', {
            detail: { type: entry.type, payload: entry.payload },
          }));
        }
      } catch {
        // Network error — leave in queue
      }
    }

    await pruneSynced();
    _syncing = false;

    if (successCount > 0) {
      window.dispatchEvent(new CustomEvent('offlineQueue:allSynced', {
        detail: { count: successCount },
      }));
    }

    return successCount;
  }

  /**
   * Send a single action to the server based on its type.
   */
  async function sendAction(entry) {
    const csrf = (window.Auth && window.Auth.getCsrfToken()) ||
      (function () {
        const m = document.cookie.match(/(?:^|;\\s*)csrf_token=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : null;
      })();

    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-CSRF-Token'] = csrf;

    const opts = { method: 'POST', headers, credentials: 'include' };

    switch (entry.type) {
      case 'COMPLETE_ACTIVITY': {
        const { itemId } = entry.payload;
        return fetch(`/api/me/daily-log-items/${itemId}/complete`, { ...opts, method: 'PUT' });
      }
      case 'UNCOMPLETE_ACTIVITY': {
        const { itemId } = entry.payload;
        return fetch(`/api/me/daily-log-items/${itemId}/uncomplete`, { ...opts, method: 'PUT' });
      }
      case 'ADD_STARS': {
        const { childId, count, reason } = entry.payload;
        return fetch('/api/rewards/manual-stars', {
          ...opts,
          body: JSON.stringify({ child_id: childId, star_count: count, reason }),
        });
      }
      case 'CHILD_RATE': {
        const { itemId, score, emotion_key, comment } = entry.payload;
        return fetch(`/api/me/daily-log-items/${itemId}/rate`, {
          ...opts,
          body: JSON.stringify({ score, emotion_key, comment }),
        });
      }
      case 'REDEEM_REWARD': {
        const { childId, rewardId } = entry.payload;
        return fetch('/api/me/rewards/redeem', {
          ...opts,
          body: JSON.stringify({ child_id: childId, reward_id: rewardId }),
        });
      }
      case 'COMPLETE_SUBSTEP': {
        const { itemId, subStepId } = entry.payload;
        return fetch(
          `/api/me/daily-log-items/${itemId}/sub-steps/${subStepId}/complete`,
          { ...opts, method: 'PUT' }
        );
      }
      case 'UNCOMPLETE_SUBSTEP': {
        const { itemId, subStepId } = entry.payload;
        return fetch(
          `/api/me/daily-log-items/${itemId}/sub-steps/${subStepId}/uncomplete`,
          { ...opts, method: 'PUT' }
        );
      }
      default:
        return new Response(JSON.stringify({ error: 'Unknown action type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  }

  // ── Retry at app start ──────────────────────────────────

  window.addEventListener('load', () => {
    setTimeout(flush, 800);
  });

  // ── Online event: flush queue ───────────────────────────

  window.addEventListener('online', () => {
    setTimeout(flush, 500);
  });

  // ── Visibility change: flush when tab becomes visible ──

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      setTimeout(flush, 500);
    }
  });

  // ── Export ─────────────────────────────────────────────

  window.OfflineQueue = {
    queueAction,
    markSynced,
    getPending,
    flush,
    clear: clearQueue,
    // Convenience wrappers for specific actions
    queueComplete(itemId) {
      return queueAction({ type: 'COMPLETE_ACTIVITY', payload: { itemId } });
    },
    queueUncomplete(itemId) {
      return queueAction({ type: 'UNCOMPLETE_ACTIVITY', payload: { itemId } });
    },
    queueAddStars(childId, count, reason) {
      return queueAction({ type: 'ADD_STARS', payload: { childId, count, reason } });
    },
    queueChildRate(itemId, payload) {
      return queueAction({ type: 'CHILD_RATE', payload: { itemId, ...payload } });
    },
    queueRedeem(childId, rewardId) {
      return queueAction({ type: 'REDEEM_REWARD', payload: { childId, rewardId } });
    },
    queueSubstepComplete(itemId, subStepId) {
      return queueAction({ type: 'COMPLETE_SUBSTEP', payload: { itemId, subStepId } });
    },
    queueSubstepUncomplete(itemId, subStepId) {
      return queueAction({ type: 'UNCOMPLETE_SUBSTEP', payload: { itemId, subStepId } });
    },
  };
})();