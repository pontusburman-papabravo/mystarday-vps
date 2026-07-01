'use strict';

/**
 * @typedef {import('../types').CustodyResolveInput} CustodyResolveInput
 * @typedef {import('../types').PartialCustodyContext} PartialCustodyContext
 */

/** @type {{ name: string, resolve: (ctx: CustodyResolveInput, dateStr: string) => PartialCustodyContext|null }} */
const FallbackResolver = {
  name: 'fallback',
  resolve() {
    return {
      activeHome: null,
      source: 'fallback',
      patternType: null,
      activePeriod: null,
    };
  },
};

module.exports = FallbackResolver;
