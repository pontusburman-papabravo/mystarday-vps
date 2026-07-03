'use strict';

/**
 * Pure helpers for Veckorapport aktivering (aktivering-exekveringsplan §6.1).
 */

/**
 * Find the funnel step with the largest relative drop-off (latest cohort with signups).
 * @param {{ cohorts: object[], steps: object[] }} funnelData
 */
function findBiggestFunnelDropoff(funnelData) {
  const cohorts = funnelData.cohorts || [];
  const steps = funnelData.steps || [];
  const latest = cohorts.find((c) => (c.counts && c.counts.signup) > 0);
  if (!latest || steps.length < 2) {
    return null;
  }

  let worst = null;
  for (let i = 1; i < steps.length; i++) {
    const fromStep = steps[i - 1];
    const toStep = steps[i];
    const key = fromStep.key + '_to_' + toStep.key;
    const conv = (latest.conversions && latest.conversions[key]) || null;
    if (!conv || conv.from_count === 0) continue;
    const dropPct = Math.round((1000 * (conv.from_count - conv.to_count)) / conv.from_count) / 10;
    if (!worst || dropPct > worst.drop_pct) {
      worst = {
        from_label: fromStep.label,
        to_label: toStep.label,
        from_count: conv.from_count,
        to_count: conv.to_count,
        drop_pct: dropPct,
        cohort_week: latest.cohort_week,
      };
    }
  }
  return worst;
}

/**
 * Week-over-week lift on activation_rate_48h (latest vs previous cohort week).
 * @param {Array<{ cohort_week: string, rate_48h: number, signups: number }>} p0Weekly
 */
function computeActivationRateLift(p0Weekly) {
  if (!p0Weekly || p0Weekly.length < 2) {
    return {
      delta_pp: null,
      message: 'Behöver minst två veckors data för jämförelse.',
    };
  }
  const current = p0Weekly[0];
  const previous = p0Weekly[1];
  if (!current.signups || !previous.signups) {
    return {
      delta_pp: null,
      message: 'För få signups i senaste eller föregående vecka för jämförelse.',
    };
  }
  const delta = Math.round((current.rate_48h - previous.rate_48h) * 10) / 10;
  const sign = delta > 0 ? '+' : '';
  return {
    delta_pp: delta,
    current_week: current.cohort_week,
    previous_week: previous.cohort_week,
    current_rate_48h: current.rate_48h,
    previous_rate_48h: previous.rate_48h,
    message: delta === 0
      ? 'Aktivering 48h oförändrad jämfört med förra veckan.'
      : `Aktivering 48h ${sign}${delta} pp jämfört med förra veckan (${previous.rate_48h}% → ${current.rate_48h}%).`,
  };
}

/**
 * Build §6.1 question payloads from funnel + P0 weekly rows.
 * @param {object} funnel
 * @param {Array<{ cohort_week: string, signups: number, p0_48h: number, rate_48h: number }>} p0Weekly
 */
function buildActivationWeeklyQuestions(funnel, p0Weekly) {
  const latestP0 = p0Weekly[0] || { signups: 0, p0_48h: 0, rate_48h: 0, cohort_week: null };
  const dropoff = findBiggestFunnelDropoff(funnel);
  const lift = computeActivationRateLift(p0Weekly);

  return {
    activation_48h: {
      label: 'Hur många nya familjer nådde aktivering inom 48 h?',
      cohort_week: latestP0.cohort_week,
      count: latestP0.p0_48h,
      signups: latestP0.signups,
      rate_pct: latestP0.rate_48h,
      summary: latestP0.signups > 0
        ? `${latestP0.p0_48h} av ${latestP0.signups} nya familjer (${latestP0.rate_48h}%) senaste veckan.`
        : 'Inga nya signups senaste veckan.',
    },
    biggest_dropoff: {
      label: 'Var i kedjan tappar vi dem?',
      step: dropoff
        ? `${dropoff.from_label} → ${dropoff.to_label}`
        : null,
      drop_pct: dropoff ? dropoff.drop_pct : null,
      from_count: dropoff ? dropoff.from_count : null,
      to_count: dropoff ? dropoff.to_count : null,
      cohort_week: dropoff ? dropoff.cohort_week : null,
      summary: dropoff
        ? `Största tappet: ${dropoff.from_label} → ${dropoff.to_label} (−${dropoff.drop_pct}%, ${dropoff.to_count}/${dropoff.from_count}).`
        : 'Ingen kohortdata för tappanalys ännu.',
    },
    lift: {
      label: 'Vilken förändring gav störst lyft i aktivering?',
      ...lift,
    },
  };
}

module.exports = {
  findBiggestFunnelDropoff,
  computeActivationRateLift,
  buildActivationWeeklyQuestions,
};
