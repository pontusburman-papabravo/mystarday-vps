'use strict';

const { resolvePattern } = require('../patterns');

/**
 * @typedef {import('../types').CustodyResolveInput} CustodyResolveInput
 * @typedef {import('../types').PartialCustodyContext} PartialCustodyContext
 */

/** @type {{ name: string, resolve: (ctx: CustodyResolveInput, dateStr: string) => PartialCustodyContext|null }} */
const PatternResolver = {
  name: 'pattern',
  resolve(ctx, dateStr) {
    if (!ctx.schedule) return null;

    const partial = resolvePattern(ctx.schedule, ctx.homesById, dateStr);
    return {
      activeHome: partial.activeHome,
      source: 'pattern',
      patternType: partial.patternType,
      activePeriod: partial.activePeriod,
    };
  },
};

module.exports = PatternResolver;
