'use strict';

/** Active coach release — keep in sync with public/js/engine-coach-change.js */
const ACTIVE_RELEASE_ID = 'coach_primary_v1';

const QUESTIONS = [
  {
    id: 'intent_ok',
    label: 'Intent outcome OK? (t.ex. child access / funnel på rätt spår)',
    hint: 'Ja om P0-steg rör sig utan att coach måste klickas.',
  },
  {
    id: 'non_adoption_baseline',
    label: 'Non-adoption inom LEARNING-baseline?',
    hint: 'Ja om coach ignoreras men inget eskalerar.',
  },
  {
    id: 'qualitative_drift',
    label: 'Qualitative drift? (support: förvirring / "vem bestämmer")',
    hint: 'Nej rekommenderas om inget klagomål.',
  },
  {
    id: 'competition_drift',
    label: 'Competition/ambiguity i DRIFT? (bypass/conflict ↑ 2v)',
    hint: 'Nej om metrics är platta.',
  },
];

module.exports = {
  ACTIVE_RELEASE_ID,
  QUESTIONS,
};
