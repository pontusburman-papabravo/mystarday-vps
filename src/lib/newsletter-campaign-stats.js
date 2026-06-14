'use strict';

/** Compute open/click rates (0–100, one decimal) from campaign counters. */
function computeCampaignRates(sent, openedUnique, clickedUnique) {
  const openRate = sent > 0 ? Math.round((openedUnique / sent) * 1000) / 10 : 0;
  const clickRate = sent > 0 ? Math.round((clickedUnique / sent) * 1000) / 10 : 0;
  return { open_rate: openRate, click_rate: clickRate };
}

module.exports = { computeCampaignRates };
