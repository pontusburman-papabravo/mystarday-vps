'use strict';

const { performance } = require('node:perf_hooks');
const { HANDLER_BUDGET_MS, CORE_EVENTS } = require('./constants');
const { HandlerBudgetExceededError } = require('./errors');

const MAX_DELIVERIES_PER_FLUSH = 10000;

/**
 * ADR-005 broadcast event bus — same-tick queued delivery.
 */
class EventBus {
  /**
   * @param {{ enforceBudget?: boolean, handlerBudgetMs?: number }} [options]
   */
  constructor(options = {}) {
    this._handlers = new Map();
    this._queue = [];
    this._flushing = false;
    this._enforceBudget = options.enforceBudget !== false;
    this._handlerBudgetMs = options.handlerBudgetMs ?? HANDLER_BUDGET_MS;
  }

  /**
   * @param {string} eventName
   * @param {string} handlerId
   * @param {(payload: object, meta: { eventName: string, handlerId: string }) => void | Promise<void>} fn
   */
  subscribe(eventName, handlerId, fn) {
    if (!CORE_EVENTS.includes(eventName) && !eventName.includes('.')) {
      throw new Error(`Invalid event name: ${eventName}`);
    }
    const key = `${eventName}:${handlerId}`;
    if (this._handlers.has(key)) {
      throw new Error(`Handler already registered: ${key}`);
    }
    this._handlers.set(key, { eventName, handlerId, fn });
  }

  unsubscribe(eventName, handlerId) {
    this._handlers.delete(`${eventName}:${handlerId}`);
  }

  /**
   * Queue event for delivery on next flush/tick.
   * @returns {{ eventName: string, payload: object, enqueuedAt: number }}
   */
  emit(eventName, payload = {}) {
    const entry = {
      eventName,
      payload: Object.freeze({ ...payload }),
      enqueuedAt: Date.now(),
    };
    this._queue.push(entry);
    return entry;
  }

  /** @returns {number} delivered count */
  flush() {
    if (this._flushing) {
      throw new Error('Re-entrant flush');
    }
    this._flushing = true;
    let delivered = 0;
    try {
      while (this._queue.length > 0) {
        if (delivered >= MAX_DELIVERIES_PER_FLUSH) {
          throw new Error('Event bus delivery budget exceeded');
        }
        const entry = this._queue.shift();
        delivered += this._deliver(entry);
      }
    } finally {
      this._flushing = false;
    }
    return delivered;
  }

  pendingCount() {
    return this._queue.length;
  }

  handlerCount(eventName) {
    let n = 0;
    for (const h of this._handlers.values()) {
      if (h.eventName === eventName) n += 1;
    }
    return n;
  }

  _deliver(entry) {
    let count = 0;
    for (const h of this._handlers.values()) {
      if (h.eventName !== entry.eventName) continue;
      const start = performance.now();
      const result = h.fn(entry.payload, { eventName: entry.eventName, handlerId: h.handlerId });
      if (result && typeof result.then === 'function') {
        throw new Error(`Async handlers not allowed on event bus: ${h.handlerId}`);
      }
      const elapsed = performance.now() - start;
      if (this._enforceBudget && elapsed > this._handlerBudgetMs) {
        throw new HandlerBudgetExceededError(h.handlerId, elapsed);
      }
      count += 1;
    }
    return count;
  }
}

module.exports = { EventBus };
