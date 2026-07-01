'use strict';

const { findOverrideForDate } = require('../overrides/find-override-for-date');
const { resolveHomeRecord } = require('../homes');

/**
 * @typedef {import('../types').CustodyResolveInput} CustodyResolveInput
 * @typedef {import('../types').PartialCustodyContext} PartialCustodyContext
 */

/** @type {{ name: string, resolve: (ctx: CustodyResolveInput, dateStr: string) => PartialCustodyContext|null }} */
const OverrideResolver = {
  name: 'override',
  resolve(ctx, dateStr) {
    const override = findOverrideForDate(ctx.overrides, dateStr);
    if (!override) return null;

    const byId = ctx.homesById;
    return {
      activeHome: resolveHomeRecord(override.home_id, byId),
      source: 'override',
      patternType: null,
      activePeriod: {
        start: override.start_date,
        end: override.end_date,
      },
    };
  },
};

module.exports = OverrideResolver;
