'use strict';

/**
 * Normalise journey registry locale sv → sv-SE and seed en-GB rows.
 */

const REGISTRY_SEED = require('../config/journey-experience-registry.json');

const EN_TRANSLATIONS = {
  handoff_to_child: ['Let your child try their routine', 'Open child mode together — your child sees what to do right away.', 'Try child mode now'],
  parent_ack_completion: ['Your child finished an activity!', 'Confirm so you can celebrate the first success together.', 'View'],
  celebrate_first_success: ['First star done!', 'Your child completed their first activity — and you saw it. That is a real milestone.', 'Lovely!'],
  fw_day1_morning: ['Good morning', 'The schedule is ready. Let your child log in and start the day at their own pace.', 'Show your child'],
  fw_day1_evening: ['A calm evening', 'A simple evening routine makes tomorrow easier. Look together at what is coming.', 'To evening'],
  fw_day2_quiet: ['Your child is finding the rhythm', 'You do not need to do much now — let your child lead.', 'View child experience'],
  fw_day3_new_day: ['Tomorrow is a new day', 'Yesterday did not go as planned — that is fine. The routine is here when you are ready.', 'OK'],
  fw_day4_discovery: ['Something new in the world', 'Your child found something new in the star world — all on their own.', 'See what happened'],
  fw_week_reflection: ['A week together', null, 'Close'],
  coach_consistency: ['Build the habit', 'Your child is underway — keep the routine light and fun this week.', 'Show tips'],
  coach_evening: ['Evening routine?', 'Families who add a simple evening routine often get steadier days.', 'Explore'],
  sj_day1_child_preview: ['Your routine is ready', 'The schedule is in place. Look at your child\'s day when it suits you — no need to do everything tonight.', 'View child\'s day'],
  sj_day2_try_routine: ['Try the routine in daily life', 'It is enough to look together for a while. No rush.', 'Open schedule'],
  sj_day3_child_try: ['Time to let your child try', 'Show the PIN and let your child log in to their own view.', 'Show child code'],
  sj_celebrate_star: ['A star!', 'Your child finished an activity — celebrate together.', 'Lovely!'],
  sj_introduce_stars: ['How stars work', 'Each ticked activity earns a star. Stars can be swapped for rewards in the Treasure Chest.', 'View Treasure Chest'],
  sj_welcome_child_login: ['Your child is in!', 'Good start — let your child lead at their own pace.', 'Lovely!'],
  sj_help_get_started: ['Need a nudge?', 'Your routine is waiting. Look at your child\'s day — it takes a minute.', 'View child\'s day'],
  sj_day7_reflection: ['A week together', null, 'Close'],
  coach_expand: ['You are in the flow', 'The routine is sticking. Explore new rewards or invite a co-parent.', 'Continue'],
};

module.exports = {
  name: '1810000000003_journey_registry_locale_en_gb',

  up: async (client) => {
    await client.query(`
      UPDATE journey_experience_registry
      SET locale = 'sv-SE'
      WHERE locale = 'sv'
    `);

    const version = REGISTRY_SEED.version || '2026-06-30-first-week-v1';

    for (const [phase, experiences] of Object.entries(REGISTRY_SEED.phases || {})) {
      for (const [experienceKey, exp] of Object.entries(experiences)) {
        const tr = EN_TRANSLATIONS[experienceKey];
        const headline = tr ? tr[0] : exp.headline;
        const body = tr ? tr[1] : exp.body;
        const cta = tr ? tr[2] : exp.cta;

        await client.query(
          `INSERT INTO journey_experience_registry
             (version, phase, experience_key, tone, headline, body, cta, locale, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'en-GB', true)
           ON CONFLICT (version, phase, experience_key, locale) DO UPDATE
             SET tone = EXCLUDED.tone, headline = EXCLUDED.headline,
                 body = EXCLUDED.body, cta = EXCLUDED.cta, is_active = true`,
          [version, phase, experienceKey, exp.tone, headline, body, cta]
        );
      }
    }
  },

  down: async (client) => {
    await client.query(`DELETE FROM journey_experience_registry WHERE locale = 'en-GB'`);
    await client.query(`
      UPDATE journey_experience_registry
      SET locale = 'sv'
      WHERE locale = 'sv-SE'
    `);
  },
};
