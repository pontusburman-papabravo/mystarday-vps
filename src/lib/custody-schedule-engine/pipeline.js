'use strict';

const OverrideResolver = require('./resolvers/override-resolver');
const PatternResolver = require('./resolvers/pattern-resolver');
const FallbackResolver = require('./resolvers/fallback-resolver');

/**
 * Ordered resolver pipeline — add resolvers here, never if/else chains in the engine.
 */
class ResolverPipeline {
  /**
   * @param {Array<{ name: string, resolve: Function }>} [resolvers]
   */
  constructor(resolvers = [OverrideResolver, PatternResolver, FallbackResolver]) {
    this.resolvers = resolvers;
  }

  /**
   * @param {import('./types').CustodyResolveInput} ctx
   * @param {string} dateStr
   * @returns {import('./types').PartialCustodyContext|null}
   */
  resolve(ctx, dateStr) {
    for (const resolver of this.resolvers) {
      const result = resolver.resolve(ctx, dateStr);
      if (result) return result;
    }
    return null;
  }
}

const defaultPipeline = new ResolverPipeline();

module.exports = {
  ResolverPipeline,
  defaultPipeline,
  OverrideResolver,
  PatternResolver,
  FallbackResolver,
};
