/**
 * engine-client.js — fetch + normalize Engine output; conflict scan vs B/C/D.
 * Sole consumer of GET /api/family/first-success on Hem.
 */
(function () {
  'use strict';

  const CACHE_MS = 60 * 1000;
  let cache = { at: 0, data: null };

  function readDomAuthorityState() {
    const readiness = document.getElementById('homeReadinessMount');
    const medforalder = document.getElementById('medforalderCtaBanner');
    const aha = document.getElementById('activationAhaModal');
    return {
      readinessVisible: readiness && !readiness.classList.contains('hidden') && readiness.innerHTML.trim().length > 0,
      medforalderCtaVisible: medforalder && medforalder.style.display !== 'none' && !medforalder.classList.contains('hidden'),
      activationAhaVisible: aha && !aha.classList.contains('hidden'),
    };
  }

  function detectAuthorityConflicts(engine, domState) {
    if (!engine || !engine.policy) return [];
    const conflicts = [];
    const name = engine.policy.name;

    if (domState.readinessVisible) {
      conflicts.push('readiness_and_engine_both_visible');
    }
    if (name === 'INVITE_CO_PARENT' && domState.medforalderCtaVisible) {
      conflicts.push('engine_invite_vs_cta_banner');
    }
    if (engine.milestone === 'first_success' && domState.activationAhaVisible) {
      conflicts.push('engine_milestone_vs_activation_aha');
    }
    return conflicts;
  }

  function trackConflicts(conflicts, engine) {
    if (!conflicts.length) return;
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, 'engine_authority_conflict', {
        conflicts: conflicts,
        policy: engine.policy.name,
        need: engine.trace && engine.trace.evaluatedNeed,
        coreState: engine.trace && engine.trace.coreState,
      });
    }
    if (typeof console !== 'undefined' && console.info) {
      console.info('[Engine authority] conflicts:', conflicts, engine.trace);
    }
  }

  async function fetchFirstSuccess(force) {
    const now = Date.now();
    if (!force && cache.data && now - cache.at < CACHE_MS) {
      return { ok: true, engine: cache.data, fromCache: true };
    }
    if (typeof window.apiFetch !== 'function') {
      return { ok: false, reason: 'no_api' };
    }
    try {
      const res = await window.apiFetch('/api/family/first-success');
      if (res.status === 503) {
        return { ok: false, reason: 'engine_disabled', legacyEndpoint: (await res.json().catch(() => ({}))).legacyEndpoint };
      }
      if (!res.ok) {
        return { ok: false, reason: 'http_' + res.status };
      }
      const engine = await res.json();
      cache = { at: now, data: engine };
      return { ok: true, engine: engine, fromCache: false };
    } catch (e) {
      return { ok: false, reason: 'network', error: e };
    }
  }

  async function load(options) {
    const result = await fetchFirstSuccess(options && options.force);
    if (!result.ok) return result;

    const domState = readDomAuthorityState();
    const conflicts = detectAuthorityConflicts(result.engine, domState);
    trackConflicts(conflicts, result.engine);

    return Object.assign({ conflicts: conflicts, domState: domState }, result);
  }

  window.EngineClient = {
    load: load,
    fetchFirstSuccess: fetchFirstSuccess,
    detectAuthorityConflicts: detectAuthorityConflicts,
    readDomAuthorityState: readDomAuthorityState,
    clearCache: function () { cache = { at: 0, data: null }; },
  };
})();
