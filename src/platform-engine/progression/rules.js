'use strict';

/**
 * Parse and evaluate unlock_signal strings (ADR-004) — deterministic, pack-config aware.
 */

/**
 * @param {string} signal
 * @returns {{ type: 'compound', parts: object[] } | object}
 */
function parseUnlockSignal(signal) {
  const trimmed = String(signal).trim();
  if (trimmed.includes(' + ')) {
    return {
      type: 'compound',
      parts: trimmed.split(' + ').map((part) => parseUnlockSignal(part.trim())),
    };
  }

  if (!trimmed.includes(':')) {
    return { type: 'literal', id: trimmed, events: inferEventsForLiteral(trimmed) };
  }

  const segments = trimmed.split(':');
  const head = segments[0];

  switch (head) {
    case 'milestone':
      return { type: 'milestone', value: segments[1], events: ['onMilestone'] };
    case 'first_activity_complete':
      return { type: 'first_activity_complete', section: segments[1], events: ['onActivityComplete'] };
    case 'activity_streak':
      return {
        type: 'activity_streak',
        activity: segments[1],
        countKey: segments[2] ?? null,
        events: ['onActivityComplete'],
      };
    case 'activity_group':
      return {
        type: 'activity_group',
        group: segments[1],
        criterion: segments.slice(2).join(':'),
        events: ['onActivityComplete', 'onMilestone'],
      };
    case 'world_unlock':
      return { type: 'world_unlock', world: segments[1], events: ['onWorldEnter'] };
    case 'daily':
      return { type: 'daily', criterion: segments.slice(1).join(':'), events: ['onActivityComplete'] };
    case 'explore':
      return {
        type: 'explore',
        metric: segments[1],
        countKey: segments[2] ?? null,
        events: ['interaction.completed'],
      };
    case 'project_unlock':
      return { type: 'project_unlock', project: segments[1], events: ['onMilestone', 'onActivityComplete'] };
    case 'project_stage':
      return {
        type: 'project_stage',
        project: segments[1],
        stageKey: segments[2] ?? null,
        events: ['onActivityComplete', 'onMilestone'],
      };
    case 'kindness':
      return { type: 'kindness', flag: segments[1], events: ['onMilestone', 'interaction.completed'] };
    default:
      return { type: 'custom', raw: trimmed, events: ['onMilestone', 'onActivityComplete'] };
  }
}

/**
 * @param {string} literal
 */
function inferEventsForLiteral(literal) {
  if (literal === 'first_world_enter') return ['onWorldEnter'];
  if (literal.startsWith('first_')) return ['onActivityComplete'];
  if (literal.includes('world')) return ['onWorldEnter'];
  return ['onMilestone', 'onActivityComplete'];
}

/**
 * @param {object} rule
 * @param {string} eventName
 * @param {object} payload
 * @param {{ packConfig?: (key: string) => unknown, packConfigKey?: string }} ctx
 */
function evaluateRulePart(rule, eventName, payload, ctx = {}) {
  if (rule.type === 'compound') {
    return rule.parts.every((part) => evaluateRulePart(part, eventName, payload, ctx));
  }

  switch (rule.type) {
    case 'milestone':
      return eventName === 'onMilestone'
        && payload.milestone_type === rule.value;
    case 'first_activity_complete':
      return eventName === 'onActivityComplete'
        && payload.section === rule.section
        && payload.first_in_section === true;
    case 'world_unlock':
      return eventName === 'onWorldEnter'
        && payload.world_slug === rule.world;
    case 'activity_streak': {
      if (eventName !== 'onActivityComplete' || payload.activity_id !== rule.activity) return false;
      const threshold = resolveThreshold(rule.countKey, ctx);
      return threshold != null && Number(payload.streak_count) >= Number(threshold);
    }
    case 'explore': {
      if (eventName !== 'interaction.completed' || payload.verb !== rule.metric) return false;
      const threshold = resolveThreshold(rule.countKey, ctx);
      return threshold != null && Number(payload.count) >= Number(threshold);
    }
    case 'daily':
      return eventName === 'onActivityComplete'
        && payload.daily_criterion === rule.criterion;
    case 'activity_group':
      return (eventName === 'onActivityComplete' || eventName === 'onMilestone')
        && payload.activity_group === rule.group
        && payload.group_criterion === rule.criterion;
    case 'project_unlock':
      return payload.project_id === rule.project
        && (eventName === 'onMilestone' || eventName === 'onActivityComplete');
    case 'project_stage':
      return payload.project_id === rule.project
        && Number(payload.stage) === Number(resolveThreshold(rule.stageKey, ctx));
    case 'kindness':
      return payload.kindness_flag === rule.flag;
    case 'literal':
      if (rule.id === 'first_world_enter') {
        return eventName === 'onWorldEnter';
      }
      return payload.unlock_literal === rule.id
        || (eventName === 'onMilestone' && payload.milestone_type === rule.id);
    default:
      return payload.unlock_signal === rule.raw;
  }
}

/**
 * @param {string|null} inlineKey
 * @param {{ packConfig?: (key: string) => unknown, packConfigKey?: string }} ctx
 */
function resolveThreshold(inlineKey, ctx) {
  if (inlineKey != null && inlineKey !== '' && !Number.isNaN(Number(inlineKey))) {
    return Number(inlineKey);
  }
  if (ctx.packConfig && ctx.packConfigKey) {
    const cfg = ctx.packConfig(ctx.packConfigKey);
    if (cfg == null) return null;
    if (typeof cfg === 'number') return cfg;
    if (typeof cfg === 'object' && cfg.threshold != null) return Number(cfg.threshold);
    if (typeof cfg === 'object' && cfg.count != null) return Number(cfg.count);
  }
  return null;
}

/**
 * Compound rules accumulate satisfied parts across events.
 * @param {object} rule
 * @param {string} eventName
 * @param {object} payload
 * @param {{ packConfig?: Function, packConfigKey?: string, satisfiedParts?: Set<number> }} ctx
 * @returns {{ matched: boolean, partIndex?: number }}
 */
function evaluateRuleAccumulating(rule, eventName, payload, ctx = {}) {
  if (rule.type !== 'compound') {
    const matched = evaluateRulePart(rule, eventName, payload, ctx);
    return { matched };
  }

  const satisfied = ctx.satisfiedParts ?? new Set();
  for (let i = 0; i < rule.parts.length; i += 1) {
    if (satisfied.has(i)) continue;
    if (evaluateRulePart(rule.parts[i], eventName, payload, ctx)) {
      satisfied.add(i);
    }
  }
  return { matched: satisfied.size === rule.parts.length, satisfiedParts: satisfied };
}

/**
 * @param {object} rule
 * @returns {string[]}
 */
function ruleEventSubscriptions(rule) {
  if (rule.type === 'compound') {
    const events = new Set();
    for (const part of rule.parts) {
      for (const e of ruleEventSubscriptions(part)) events.add(e);
    }
    return [...events];
  }
  return rule.events ?? ['onMilestone'];
}

module.exports = {
  parseUnlockSignal,
  evaluateRulePart,
  evaluateRuleAccumulating,
  ruleEventSubscriptions,
};
