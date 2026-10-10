/**
 * Landing request order and campaign query.
 * A late country response must not paint, and a launch offer must not replace UTM.
 */
(function landingChoiceGuards(root, factory) {
  'use strict';
  const api = factory();
  if (root) root.LandingChoiceGuards = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis, function factory() {
  'use strict';

  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const LAUNCH_OFFER = 'launch_cohort_offer_v1';

  function createLandingRequestGuard() {
    let seq = 0;
    let controller = null;
    return {
      next() {
        seq += 1;
        if (controller) controller.abort();
        controller = new AbortController();
        const ticket = seq;
        const signal = controller.signal;
        return {
          signal,
          current() { return ticket === seq && !signal.aborted; },
        };
      },
    };
  }

  function preservedCampaignParams(searchParams, stored) {
    const params = new URLSearchParams();
    const source = searchParams && typeof searchParams.get === 'function' ? searchParams : new URLSearchParams();
    const memory = stored && typeof stored === 'object' ? stored : {};
    UTM_KEYS.forEach(function (key) {
      const fromUrl = source.get(key);
      const fromStore = memory[key];
      const value = fromUrl || fromStore || '';
      if (value) params.set(key, String(value));
    });
    return params;
  }

  function registerSearch(input) {
    const params = preservedCampaignParams(input.searchParams, input.stored);
    if (input.country) {
      params.set('residence', input.country);
      params.set('residence_explicit', '0');
    }
    if (input.appLocale) params.set('display_locale', input.appLocale);
    if (input.status === 'launch_cohort') params.set('landing_offer', LAUNCH_OFFER);
    return params;
  }

  return {
    LAUNCH_OFFER,
    createLandingRequestGuard,
    preservedCampaignParams,
    registerSearch,
  };
}));
