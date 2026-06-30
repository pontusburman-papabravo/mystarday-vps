'use strict';

const REWARD_STATES = Object.freeze({
  UNINITIALIZED: 'uninitialized',
  ACTIVE: 'active',
});

/**
 * Reward Runtime skeleton — listens for platform events, no hardcoded gameplay.
 * Pack manifest drives reward presentation via config keys.
 */
class RewardRuntime {
  /**
   * @param {{ eventBus: import('../event-bus').EventBus }} options
   */
  constructor(options) {
    this._eventBus = options.eventBus;
    this._state = REWARD_STATES.UNINITIALIZED;
    this._handlerIds = [];
    /** @type {object|null} */
    this._pack = null;
    /** @type {Array<{ child_id: string, source: string, payload: object }>} */
    this._pendingSignals = [];
  }

  get state() {
    return this._state;
  }

  get pendingSignals() {
    return [...this._pendingSignals];
  }

  /**
   * @param {object} packManifest active experience pack
   */
  attach(packManifest) {
    this._pack = packManifest;
    if (this._handlerIds.length > 0) return;

    const handlers = [
      ['onStarGranted', 'reward:star'],
      ['onProgressionNodeUnlocked', 'reward:progression'],
    ];

    for (const [eventName, handlerId] of handlers) {
      this._eventBus.subscribe(eventName, handlerId, (payload) => {
        this._handleRewardSignal(eventName, payload);
      });
      this._handlerIds.push({ eventName, handlerId });
    }

    this._state = REWARD_STATES.ACTIVE;
  }

  detach() {
    for (const { eventName, handlerId } of this._handlerIds) {
      this._eventBus.unsubscribe(eventName, handlerId);
    }
    this._handlerIds = [];
    this._pack = null;
    this._state = REWARD_STATES.UNINITIALIZED;
  }

  /**
   * Resolve pack-driven reward config for a signal — returns undefined if not configured.
   * @param {string} configKey
   */
  resolveRewardConfig(configKey) {
    if (!this._pack || !configKey) return undefined;
    const pacing = this._pack.pacing ?? {};
    const parts = configKey.split('.');
    let cur = pacing;
    for (const part of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[part];
    }
    return cur;
  }

  /**
   * @param {string} eventName
   * @param {object} payload
   */
  _handleRewardSignal(eventName, payload) {
    if (!payload.child_id) return;

    const configKey = payload.reward_config_key
      ?? (eventName === 'onProgressionNodeUnlocked'
        ? `rewards.progression.${payload.node_id}`
        : `rewards.${eventName}`);

    const config = this.resolveRewardConfig(configKey);
    this._pendingSignals.push({
      child_id: payload.child_id,
      source: eventName,
      payload: {
        ...payload,
        reward_config_key: configKey,
        reward_config: config ?? null,
      },
    });

    if (config) {
      this._eventBus.emit('reward.signal', {
        child_id: payload.child_id,
        source: eventName,
        config_key: configKey,
      });
    }
  }

  clearPending() {
    this._pendingSignals = [];
  }
}

module.exports = {
  RewardRuntime,
  REWARD_STATES,
};
