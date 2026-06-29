'use strict';

const { FLAG_KEYS, isFlagEnabled } = require('./flags');
const { buildContextForFamily } = require('./context-builder');

/**
 * Log Engine vs Journey divergence — no UI writes.
 */
async function shadowCompare(familyId, engineOutput) {
  const enabled = await isFlagEnabled(FLAG_KEYS.engineShadow);
  if (!enabled || !familyId) return;

  try {
    const journey = await buildContextForFamily(familyId);
    const enginePolicy = engineOutput?.policy?.name || engineOutput?.trace?.evaluatedNeed || 'unknown';
    const journeyPriority = journey.priority || 'none';
    const journeyExp = journey.recommended_experiences?.[0] || 'none';

    if (enginePolicy !== 'none' && journeyPriority === 'none' && !journeyExp) return;

    const divergent = !String(enginePolicy).toLowerCase().includes(String(journeyExp).split('_')[0]);
    if (divergent) {
      console.log('[journey-engine-shadow]', JSON.stringify({
        familyId,
        enginePolicy,
        journeyPriority,
        journeyExp,
        journeyPhase: journey.phase,
      }));
    }
  } catch (err) {
    console.error('[journey-engine-shadow] error:', err.message);
  }
}

module.exports = { shadowCompare };
