'use strict';

/**
 * In-memory progression store for tests and same-tick event evaluation.
 */
class MemoryProgressionStore {
  constructor() {
    /** @type {Map<string, { unlocked_at: string, metadata: object }>} */
    this._rows = new Map();
    /** @type {Map<string, Set<number>>} */
    this._compoundParts = new Map();
  }

  _key(childId, worldSlug, nodeId) {
    return `${childId}:${worldSlug}:${nodeId}`;
  }

  _compoundKey(childId, worldSlug, nodeId) {
    return `compound:${childId}:${worldSlug}:${nodeId}`;
  }

  getUnlocked(childId, worldSlug) {
    const prefix = `${childId}:${worldSlug}:`;
    const nodes = [];
    for (const [key, row] of this._rows.entries()) {
      if (key.startsWith(prefix)) {
        nodes.push({
          node_id: key.slice(prefix.length),
          unlocked_at: row.unlocked_at,
          metadata: row.metadata,
        });
      }
    }
    return nodes.sort((a, b) => a.node_id.localeCompare(b.node_id));
  }

  isUnlocked(childId, worldSlug, nodeId) {
    return this._rows.has(this._key(childId, worldSlug, nodeId));
  }

  unlock(childId, worldSlug, nodeId, metadata = {}) {
    const key = this._key(childId, worldSlug, nodeId);
    if (this._rows.has(key)) {
      return { inserted: false, node_id: nodeId };
    }
    this._rows.set(key, {
      unlocked_at: new Date().toISOString(),
      metadata: { ...metadata },
    });
    this._compoundParts.delete(this._compoundKey(childId, worldSlug, nodeId));
    return { inserted: true, node_id: nodeId };
  }

  getCompoundProgress(childId, worldSlug, nodeId) {
    return this._compoundParts.get(this._compoundKey(childId, worldSlug, nodeId)) ?? new Set();
  }

  setCompoundProgress(childId, worldSlug, nodeId, satisfiedParts) {
    this._compoundParts.set(
      this._compoundKey(childId, worldSlug, nodeId),
      new Set(satisfiedParts)
    );
  }

  clearCompoundProgress(childId, worldSlug, nodeId) {
    this._compoundParts.delete(this._compoundKey(childId, worldSlug, nodeId));
  }
}

/**
 * PostgreSQL-backed store (ADR-004 child_progression_node) — async API for routes/tests.
 */
class PgProgressionStore {
  /**
   * @param {{ query: (text: string, params?: unknown[]) => Promise<{ rows: object[] }> }} db
   */
  constructor(db) {
    this._db = db;
    /** @type {Map<string, Set<number>>} */
    this._compoundParts = new Map();
  }

  _compoundKey(childId, worldSlug, nodeId) {
    return `compound:${childId}:${worldSlug}:${nodeId}`;
  }

  async getUnlocked(childId, worldSlug) {
    const { rows } = await this._db.query(
      `SELECT node_id, unlocked_at, metadata
       FROM child_progression_node
       WHERE child_id = $1 AND world_slug = $2
       ORDER BY node_id`,
      [childId, worldSlug]
    );
    return rows;
  }

  async isUnlocked(childId, worldSlug, nodeId) {
    const { rows } = await this._db.query(
      `SELECT 1 FROM child_progression_node
       WHERE child_id = $1 AND world_slug = $2 AND node_id = $3
       LIMIT 1`,
      [childId, worldSlug, nodeId]
    );
    return rows.length > 0;
  }

  async unlock(childId, worldSlug, nodeId, metadata = {}) {
    const { rows } = await this._db.query(
      `INSERT INTO child_progression_node (child_id, world_slug, node_id, metadata)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (child_id, world_slug, node_id) DO NOTHING
       RETURNING node_id`,
      [childId, worldSlug, nodeId, JSON.stringify(metadata)]
    );
    this._compoundParts.delete(this._compoundKey(childId, worldSlug, nodeId));
    return { inserted: rows.length > 0, node_id: nodeId };
  }

  async getCompoundProgress(childId, worldSlug, nodeId) {
    return this._compoundParts.get(this._compoundKey(childId, worldSlug, nodeId)) ?? new Set();
  }

  async setCompoundProgress(childId, worldSlug, nodeId, satisfiedParts) {
    this._compoundParts.set(
      this._compoundKey(childId, worldSlug, nodeId),
      new Set(satisfiedParts)
    );
  }

  async clearCompoundProgress(childId, worldSlug, nodeId) {
    this._compoundParts.delete(this._compoundKey(childId, worldSlug, nodeId));
  }
}

module.exports = {
  MemoryProgressionStore,
  PgProgressionStore,
};
