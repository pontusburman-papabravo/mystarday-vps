'use strict';

const WORLD_STATES = Object.freeze({
  UNLOADED: 'unloaded',
  LOADED: 'loaded',
  ACTIVE: 'active',
});

/**
 * World Runtime skeleton — binds pack worlds to progression, no world-specific logic.
 */
class WorldRuntime {
  /**
   * @param {{
   *   eventBus: import('../event-bus').EventBus,
   *   messageBus: import('../message-bus').MessageBus,
   * }} options
   */
  constructor(options) {
    this._eventBus = options.eventBus;
    this._messageBus = options.messageBus;
    this._state = WORLD_STATES.UNLOADED;
    this._handlerIds = [];
    /** @type {Map<string, object>} */
    this._worlds = new Map();
    /** @type {Map<string, { child_id: string, world_slug: string }>} */
    this._activeSessions = new Map();
    /** @type {Map<string, Set<string>>} */
    this._progressionOverlay = new Map();
  }

  get state() {
    return this._state;
  }

  /**
   * @param {object} packManifest
   */
  attach(packManifest) {
    this._worlds.clear();
    for (const worldRef of packManifest.worlds ?? []) {
      const slug = typeof worldRef === 'string' ? worldRef : worldRef.slug;
      this._worlds.set(slug, {
        slug,
        manifest_ref: typeof worldRef === 'string' ? worldRef : worldRef.manifest_ref,
        loaded: true,
      });
    }
    this._registerHandlers();
    this._state = WORLD_STATES.ACTIVE;
  }

  detach() {
    for (const { eventName, handlerId } of this._handlerIds) {
      this._eventBus.unsubscribe(eventName, handlerId);
    }
    this._handlerIds = [];
    this._worlds.clear();
    this._activeSessions.clear();
    this._progressionOverlay.clear();
    this._state = WORLD_STATES.UNLOADED;
  }

  _registerHandlers() {
    if (this._handlerIds.length > 0) return;

    this._eventBus.subscribe('onProgressionNodeUnlocked', 'world:progression', (payload) => {
      const key = `${payload.child_id}:${payload.world_slug}`;
      if (!this._progressionOverlay.has(key)) {
        this._progressionOverlay.set(key, new Set());
      }
      this._progressionOverlay.get(key).add(payload.node_id);
      this._eventBus.emit('world.progression_changed', {
        child_id: payload.child_id,
        world_slug: payload.world_slug,
        node_id: payload.node_id,
      });
    });

    this._handlerIds.push({ eventName: 'onProgressionNodeUnlocked', handlerId: 'world:progression' });
  }

  /**
   * @param {string} slug
   * @param {object} [manifest]
   */
  load(slug, manifest = {}) {
    this._worlds.set(slug, { slug, ...manifest, loaded: true });
    this._state = WORLD_STATES.LOADED;
    this._eventBus.emit('world.loaded', { world_slug: slug });
    return this._worlds.get(slug);
  }

  unload(slug) {
    this._worlds.delete(slug);
    for (const [sessionKey, session] of this._activeSessions.entries()) {
      if (session.world_slug === slug) this._activeSessions.delete(sessionKey);
    }
    this._eventBus.emit('world.unloaded', { world_slug: slug });
    if (this._worlds.size === 0) this._state = WORLD_STATES.UNLOADED;
  }

  /**
   * @param {string} childId
   * @param {string} worldSlug
   */
  enter(childId, worldSlug) {
    if (!this._worlds.has(worldSlug)) {
      throw new Error(`World not loaded: ${worldSlug}`);
    }
    this._activeSessions.set(childId, { child_id: childId, world_slug: worldSlug });
    this._eventBus.emit('onWorldEnter', { child_id: childId, world_slug: worldSlug });
    return { child_id: childId, world_slug: worldSlug };
  }

  /**
   * @param {string} childId
   */
  exit(childId) {
    const session = this._activeSessions.get(childId);
    if (!session) return null;
    this._activeSessions.delete(childId);
    this._eventBus.emit('onWorldExit', {
      child_id: childId,
      world_slug: session.world_slug,
    });
    return session;
  }

  getRegion(worldSlug, regionId) {
    const world = this._worlds.get(worldSlug);
    if (!world) return null;
    return { world_slug: worldSlug, region_id: regionId, loaded: true };
  }

  getProgressionState(childId, worldSlug) {
    const key = `${childId}:${worldSlug}`;
    const nodes = this._progressionOverlay.get(key);
    return {
      child_id: childId,
      world_slug: worldSlug,
      unlocked_nodes: nodes ? [...nodes] : [],
    };
  }

  /**
   * Delegate unlock signal resolution to message bus route (pack/world plugins later).
   * @param {string} signal
   */
  resolveUnlockSignal(signal) {
    return this._messageBus.send('world.resolveUnlockSignal', { signal });
  }

  listWorlds() {
    return [...this._worlds.values()];
  }
}

module.exports = {
  WorldRuntime,
  WORLD_STATES,
};
