'use strict';

const {
  parseUnlockSignal,
  evaluateRuleAccumulating,
  ruleEventSubscriptions,
} = require('./rules');
const { MemoryProgressionStore } = require('./store');

const PROGRESSION_STATES = Object.freeze({
  UNINITIALIZED: 'uninitialized',
  LOADED: 'loaded',
  ACTIVE: 'active',
});

const MAX_EVENTS_PER_FLUSH = 10000;

/**
 * ADR-004 Progression Runtime — unlock_signal evaluation, server truth via store.
 */
class ProgressionRuntime {
  /**
   * @param {{
   *   eventBus: import('../event-bus').EventBus,
   *   store?: import('./store').MemoryProgressionStore,
   *   packConfig?: (key: string) => unknown,
   * }} options
   */
  constructor(options) {
    this._eventBus = options.eventBus;
    this._store = options.store ?? new MemoryProgressionStore();
    this._packConfig = options.packConfig ?? (() => undefined);
    this._state = PROGRESSION_STATES.UNINITIALIZED;
    /** @type {Map<string, { map: object, index: Map<string, object[]> }>} */
    this._worldMaps = new Map();
    this._handlerIds = [];
    this._eventsProcessed = 0;
  }

  get state() {
    return this._state;
  }

  get store() {
    return this._store;
  }

  /**
   * @param {string} worldSlug
   * @param {object} map
   */
  loadMap(worldSlug, map) {
    if (!map || !Array.isArray(map.nodes)) {
      throw new Error(`Invalid progression map for ${worldSlug}`);
    }

    const index = new Map();
    const sortedNodes = [...map.nodes].sort((a, b) => a.order - b.order);

    for (const node of sortedNodes) {
      const rule = parseUnlockSignal(node.unlock_signal);
      const events = ruleEventSubscriptions(rule);
      for (const eventName of events) {
        if (!index.has(eventName)) index.set(eventName, []);
        index.get(eventName).push({ node, rule });
      }
    }

    this._worldMaps.set(worldSlug, { map: { ...map, nodes: sortedNodes }, index });
    this._state = PROGRESSION_STATES.LOADED;
  }

  attach() {
    if (this._handlerIds.length > 0) return;
    const events = [
      'onActivityComplete',
      'onStarGranted',
      'onMilestone',
      'onWorldEnter',
      'interaction.completed',
    ];
    for (const eventName of events) {
      const handlerId = `progression:${eventName}`;
      this._eventBus.subscribe(eventName, handlerId, (payload) => {
        this.evaluateEventSync(eventName, payload);
      });
      this._handlerIds.push({ eventName, handlerId });
    }
    this._state = PROGRESSION_STATES.ACTIVE;
  }

  detach() {
    for (const { eventName, handlerId } of this._handlerIds) {
      this._eventBus.unsubscribe(eventName, handlerId);
    }
    this._handlerIds = [];
    this._eventsProcessed = 0;
    if (this._worldMaps.size > 0) {
      this._state = PROGRESSION_STATES.LOADED;
    } else {
      this._state = PROGRESSION_STATES.UNINITIALIZED;
    }
  }

  /**
   * Same-tick sync evaluation for Event Bus handlers (ADR-005).
   * @param {string} eventName
   * @param {object} payload
   * @returns {object[]} newly unlocked nodes
   */
  evaluateEventSync(eventName, payload = {}) {
    this._eventsProcessed += 1;
    if (this._eventsProcessed > MAX_EVENTS_PER_FLUSH) {
      throw new Error('Progression event budget exceeded');
    }

    const childId = payload.child_id;
    if (!childId) return [];

    const unlocked = [];

    for (const [worldSlug, { index }] of this._worldMaps.entries()) {
      const candidates = index.get(eventName) ?? [];
      for (const { node, rule } of candidates) {
        if (this._store.isUnlocked(childId, worldSlug, node.node_id)) continue;

        const satisfiedParts = this._store.getCompoundProgress(childId, worldSlug, node.node_id);
        const ctx = {
          packConfig: this._packConfig,
          packConfigKey: node.pack_config_key,
          satisfiedParts,
        };

        const result = evaluateRuleAccumulating(rule, eventName, payload, ctx);

        if (rule.type === 'compound' && result.satisfiedParts && !result.matched) {
          this._store.setCompoundProgress(
            childId,
            worldSlug,
            node.node_id,
            result.satisfiedParts
          );
          continue;
        }

        if (!result.matched) continue;

        const insert = this._store.unlock(childId, worldSlug, node.node_id, {
          emotional_beat: node.emotional_beat,
          node_type: node.node_type,
          trigger_event: eventName,
        });

        if (insert.inserted) {
          const unlockPayload = {
            child_id: childId,
            world_slug: worldSlug,
            node_id: node.node_id,
            metadata: {
              emotional_beat: node.emotional_beat,
              node_type: node.node_type,
            },
          };
          unlocked.push(unlockPayload);
          this._eventBus.emit('onProgressionNodeUnlocked', unlockPayload);
        }
      }
    }

    return unlocked;
  }

  isUnlocked(childId, worldSlug, nodeId) {
    return this._store.isUnlocked(childId, worldSlug, nodeId);
  }

  getVisibleNodes(worldSlug, sceneId) {
    const entry = this._worldMaps.get(worldSlug);
    if (!entry) return [];
    return entry.map.nodes.filter((n) => !sceneId || !n.scene_id || n.scene_id === sceneId);
  }

  setPackConfig(fn) {
    this._packConfig = fn;
  }

  resetEventBudget() {
    this._eventsProcessed = 0;
  }
}

module.exports = {
  ProgressionRuntime,
  PROGRESSION_STATES,
};
