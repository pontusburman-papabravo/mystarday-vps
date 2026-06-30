'use strict';

const { EventBus } = require('./event-bus');
const { MessageBus } = require('./message-bus');
const { ExperiencePackLoader } = require('./pack');
const { ProgressionRuntime } = require('./progression');
const { RewardRuntime } = require('./reward');
const { WorldRuntime } = require('./world');
const { ENGINE_STATES, DEFAULT_PACK_ID } = require('./constants');
const { PlatformEngineError } = require('./errors');

/**
 * Core Engine skeleton — orchestrates platform runtimes (ADR-002).
 * Distinct from ProductEngine (src/core-engine/) First Success Brain.
 */
class PlatformEngine {
  /**
   * @param {{
   *   eventBus?: EventBus,
   *   messageBus?: MessageBus,
   *   progressionStore?: import('./progression/store').ProgressionStore,
   *   enforceHandlerBudget?: boolean,
   * }} [options]
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus ?? new EventBus({
      enforceBudget: options.enforceHandlerBudget,
    });
    this.messageBus = options.messageBus ?? new MessageBus();
    this.packLoader = new ExperiencePackLoader();
    this.progressionRuntime = new ProgressionRuntime({
      eventBus: this.eventBus,
      store: options.progressionStore,
    });
    this.rewardRuntime = new RewardRuntime({ eventBus: this.eventBus });
    this.worldRuntime = new WorldRuntime({
      eventBus: this.eventBus,
      messageBus: this.messageBus,
    });
    this._state = ENGINE_STATES.COLD;
    this._packId = null;
  }

  get state() {
    return this._state;
  }

  get packId() {
    return this._packId;
  }

  /**
   * @param {{ packId?: string, manifest: object, progressionMaps?: Record<string, object> }} config
   */
  async initialize(config) {
    if (this._state !== ENGINE_STATES.COLD && this._state !== ENGINE_STATES.TERMINATED) {
      throw new PlatformEngineError(`Cannot initialize from state ${this._state}`, 'INVALID_STATE');
    }
    this._state = ENGINE_STATES.LOADING;
    const packId = config.packId ?? DEFAULT_PACK_ID;
    const maps = config.progressionMaps ?? {};
    this.packLoader.load(packId, config.manifest, { progressionMaps: maps });
    this._packId = packId;

    this.progressionRuntime.setPackConfig((key) => this.packLoader.getConfig(key));

    for (const worldRef of this.packLoader.getActive().worlds) {
      const slug = typeof worldRef === 'string' ? worldRef : worldRef.slug;
      const map = maps[slug];
      if (map) {
        this.progressionRuntime.loadMap(slug, map);
      }
    }

    this.progressionRuntime.attach();
    this.rewardRuntime.attach(this.packLoader.getActive());
    this.worldRuntime.attach(this.packLoader.getActive());

    this._state = ENGINE_STATES.READY;
    return { packId, state: this._state };
  }

  start() {
    if (this._state !== ENGINE_STATES.READY) {
      throw new PlatformEngineError(`Cannot start from state ${this._state}`, 'INVALID_STATE');
    }
    this._state = ENGINE_STATES.RUNNING;
  }

  /**
   * Emit + flush same tick (ADR-005).
   */
  emit(eventName, payload) {
    this.progressionRuntime.resetEventBudget();
    this.eventBus.emit(eventName, payload);
    return this.eventBus.flush();
  }

  subscribe(eventName, handlerId, fn) {
    this.eventBus.subscribe(eventName, handlerId, fn);
  }

  shutdown() {
    this._state = ENGINE_STATES.SHUTTING_DOWN;
    this.progressionRuntime.detach();
    this.rewardRuntime.detach();
    this.worldRuntime.detach();
    this._state = ENGINE_STATES.TERMINATED;
  }
}

module.exports = {
  PlatformEngine,
  EventBus,
  MessageBus,
  ExperiencePackLoader,
  ProgressionRuntime,
  RewardRuntime,
  WorldRuntime,
  MemoryProgressionStore: require('./progression/store').MemoryProgressionStore,
  PgProgressionStore: require('./progression/store').PgProgressionStore,
};
