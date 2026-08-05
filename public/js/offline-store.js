/**
 * Min Stjärndag — Offline Store (IndexedDB wrapper)
 *
 * Owns: caching child schedule, profile, rewards in IndexedDB for offline access.
 * Does NOT own: service worker strategy, network requests, auth.
 *
 * Key scheme: {childId}_{date} for daily-log, simple childId for profile/rewards.
 * Used by child-dashboard.js when offline or when API fails.
 */

(function () {
  'use strict';

  const DB_NAME = 'stjarndag-offline';
  const DB_VERSION = 1;
  const STORES = ['dailyLog', 'childProfile', 'rewards'];

  // ── Database open/close ─────────────────────────────────

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        STORES.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'key' });
            if (storeName === 'dailyLog') {
              store.createIndex('childDate', ['childId', 'date'], { unique: true });
            }
          }
        });
      };

      req.onsuccess = (event) => resolve(event.target.result);
      req.onerror = (event) => reject(event.target.error);
    });
  }

  function withStore(storeName, mode, fn) {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
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

  // ── Daily Log (child schedule) ────────────────────────────

  /**
   * Save daily log data for a child+date.
   * @param {string} childId
   * @param {string} date - YYYY-MM-DD
   * @param {object} data - full /api/me/daily-log response
   */
  function saveDailyLog(childId, date, data) {
    const key = childId + '_' + date;
    return withStore('dailyLog', 'readwrite', (store) =>
      store.put({ key, childId, date, data, updatedAt: Date.now() })
    );
  }

  /**
   * Patch one item's completed flag in cached daily log (offline optimistic UI).
   */
  async function patchDailyLogItemCompleted(childId, date, itemId, completed) {
    const data = await getDailyLog(childId, date);
    if (!data || !Array.isArray(data.items)) return false;
    const item = data.items.find((i) => String(i.id) === String(itemId));
    if (!item) return false;
    item.completed = !!completed;
    if (completed) {
      item.completed_at = item.completed_at || new Date().toISOString();
      item.completed_by = item.completed_by || 'child';
    } else {
      item.completed_at = null;
      item.completed_by = null;
    }
    const doneCount = data.items.filter((i) => i.completed).length;
    if (typeof data.completed === 'number') data.completed = doneCount;
    if (typeof data.total === 'number') data.total = data.items.length;
    await saveDailyLog(childId, date, data);
    return true;
  }

  /**
   * Read cached daily log for child+date.
   * Returns null if nothing cached.
   * @returns {Promise<object|null>} - cached data or null
   */
  function getDailyLog(childId, date) {
    const key = childId + '_' + date;
    return withStore('dailyLog', 'readonly', (store) =>
      store.get(key)
    ).then((row) => {
      if (!row) return null;
      return row.data;
    }).catch(() => null);
  }

  /**
   * Check if a daily log exists in cache (without reading full data).
   */
  function hasDailyLog(childId, date) {
    const key = childId + '_' + date;
    return withStore('dailyLog', 'readonly', (store) =>
      store.get(key)
    ).then((row) => !!row).catch(() => false);
  }

  // ── Child Profile ───────────────────────────────────────

  /**
   * Cache child profile data (name, emoji, starBalance, etc.)
   * @param {string} childId
   * @param {object} data - /api/me child profile or relevant subset
   */
  function saveChildProfile(childId, data) {
    return withStore('childProfile', 'readwrite', (store) =>
      store.put({ key: childId, childId, data, updatedAt: Date.now() })
    );
  }

  /**
   * Read cached child profile.
   * @returns {Promise<object|null>}
   */
  function getChildProfile(childId) {
    return withStore('childProfile', 'readonly', (store) =>
      store.get(childId)
    ).then((row) => row ? row.data : null).catch(() => null);
  }

  // ── Rewards ─────────────────────────────────────────────

  /**
   * Cache rewards data (rewards list, star balance, redemptions).
   * @param {string} childId
   * @param {object} data - /api/me/rewards response
   */
  function saveRewards(childId, data) {
    return withStore('rewards', 'readwrite', (store) =>
      store.put({ key: childId, childId, data, updatedAt: Date.now() })
    );
  }

  /**
   * Read cached rewards.
   * @returns {Promise<object|null>}
   */
  function getRewards(childId) {
    return withStore('rewards', 'readonly', (store) =>
      store.get(childId)
    ).then((row) => row ? row.data : null).catch(() => null);
  }

  // ── Cleanup ─────────────────────────────────────────────

  /**
   * Delete cached entries older than given days (default 7).
   * Called on app start to prevent unbounded IndexedDB growth.
   * @param {number} daysOld
   */
  function clearStaleData(daysOld = 7) {
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    return Promise.all(STORES.map((storeName) =>
      withStore(storeName, 'readwrite', (store) => {
        const req = store.openCursor();
        req.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.value.updatedAt < cutoff) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
        return null; // don't wait for cursor iteration — let tx commit
      })
    ));
  }

  // ── Clear all ───────────────────────────────────────────

  /**
   * Wipe all cached data. Call on logout.
   */
  function clearAll() {
    return Promise.all(STORES.map((storeName) =>
      withStore(storeName, 'readwrite', (store) => store.clear())
    ));
  }

  // ── Export ───────────────────────────────────────────────

  window.OfflineStore = {
    saveDailyLog,
    getDailyLog,
    patchDailyLogItemCompleted,
    hasDailyLog,
    saveChildProfile,
    getChildProfile,
    saveRewards,
    getRewards,
    clearStaleData,
    clearAll,
  };
})();