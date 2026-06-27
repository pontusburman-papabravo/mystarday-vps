'use strict';

const { QUESTIONS } = require('./l1-governance-config');

/**
 * @param {Record<string, boolean>} answers
 * @param {{ metrics: object, learning_day: number }} ctx
 */
function recommendDecision(answers, ctx) {
  const a = {
    intent_ok: Boolean(answers.intent_ok),
    non_adoption_baseline: Boolean(answers.non_adoption_baseline),
    qualitative_drift: Boolean(answers.qualitative_drift),
    competition_drift: Boolean(answers.competition_drift),
    edge_case: Boolean(answers.edge_case),
  };

  if (a.qualitative_drift || a.competition_drift) {
    return {
      decision_type: a.competition_drift ? 'ACT-SURFACE' : 'INVESTIGATE',
      state: 'DRIFT',
      reason: a.competition_drift ? 'competition_drift' : 'qualitative_drift',
    };
  }

  if (a.edge_case) {
    return { decision_type: 'edge-HOLD', state: 'LEARNING', reason: 'edge_case' };
  }

  if (a.intent_ok && a.non_adoption_baseline && !a.qualitative_drift && !a.competition_drift) {
    return { decision_type: 'ACCEPT-UNKNOWN', state: 'STABLE', reason: 'criteria_met' };
  }

  if (!a.intent_ok || !a.non_adoption_baseline) {
    return { decision_type: 'INVESTIGATE', state: 'LEARNING', reason: 'unclear_outcome' };
  }

  return { decision_type: 'HOLD', state: 'LEARNING', reason: 'default_hold' };
}

function buildLogLine(releaseId, decisionType, answers, ownerLabel) {
  const owner = ownerLabel ? `@${ownerLabel.replace(/^@/, '')}` : '@owner';
  if (decisionType === 'ACCEPT-UNKNOWN') {
    return [
      'ACCEPT-UNKNOWN',
      releaseId,
      'intent:' + (answers.intent_ok ? 'ok' : 'no'),
      'non-adoption:' + (answers.non_adoption_baseline ? 'baseline' : 'high'),
      'qual:' + (answers.qualitative_drift ? 'yes' : 'none'),
      'drift:' + (answers.competition_drift ? 'yes' : 'no'),
      owner,
    ].join(' | ');
  }
  if (decisionType === 'INVESTIGATE') {
    return `INVESTIGATE | ${releaseId} | reason:"governance review" | deadline:+7d | ${owner}`;
  }
  if (decisionType === 'ACT-SURFACE') {
    return `ACT-SURFACE | ${releaseId} | zone:Z1 | reason:"competition_drift" | ${owner}`;
  }
  if (decisionType === 'edge-HOLD') {
    return `HOLD | ${releaseId} | edge:yes | reason:"admin edge case" | review:+7d | ${owner}`;
  }
  return `HOLD | ${releaseId} | LEARNING | ${owner}`;
}

/**
 * Default yes/no recommendations from metrics (heuristic, not causal).
 */
function defaultAnswersFromMetrics(metrics, learningDay) {
  return {
    intent_ok: metrics.child_access_completed_7d > 0 || learningDay < 7,
    non_adoption_baseline: metrics.coach_clicks_7d > 0 || metrics.conflicts_7d < 50,
    qualitative_drift: false,
    competition_drift: metrics.conflicts_7d > 20 && metrics.readiness_clicks_7d > metrics.coach_clicks_7d,
    edge_case: false,
  };
}

function questionPayload(metrics, learningDay, priorAnswers) {
  const defaults = { ...defaultAnswersFromMetrics(metrics, learningDay), ...priorAnswers };
  return QUESTIONS.map((q) => ({
    id: q.id,
    label: q.label,
    hint: q.hint,
    recommended: defaults[q.id] === true ? 'yes' : defaults[q.id] === false ? 'no' : 'yes',
  }));
}

module.exports = {
  recommendDecision,
  buildLogLine,
  defaultAnswersFromMetrics,
  questionPayload,
  QUESTIONS,
};
