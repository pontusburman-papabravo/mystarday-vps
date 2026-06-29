'use strict';

const { performance } = require('node:perf_hooks');

/**
 * ADR-005 point-to-point commands between runtimes (not broadcast).
 */
class MessageBus {
  constructor() {
    /** @type {Map<string, (payload: object) => unknown>} */
    this._routes = new Map();
  }

  /**
   * @param {string} route e.g. camera.transitionTo
   * @param {(payload: object) => unknown} handler
   */
  register(route, handler) {
    if (this._routes.has(route)) {
      throw new Error(`Route already registered: ${route}`);
    }
    this._routes.set(route, handler);
  }

  /**
   * @param {string} route
   * @param {object} payload
   * @param {{ timeoutMs?: number }} [options]
   */
  send(route, payload = {}, options = {}) {
    const handler = this._routes.get(route);
    if (!handler) {
      return { ok: false, error: 'route_not_found', route };
    }
    const start = performance.now();
    const result = handler(payload);
    const elapsedMs = performance.now() - start;
    if (options.timeoutMs != null && elapsedMs > options.timeoutMs) {
      return { ok: false, error: 'timeout', route, elapsedMs };
    }
    return { ok: true, route, result, elapsedMs };
  }
}

module.exports = { MessageBus };
