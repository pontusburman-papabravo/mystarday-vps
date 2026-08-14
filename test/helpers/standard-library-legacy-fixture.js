'use strict';

const { randomUUID } = require('crypto');

/**
 * Representative prod-like legacy default library fixture for PR2B simulation.
 * Counts are documented explicitly — not a claim of exact prod parity.
 */
function createProdLikeLegacyFixture() {
  const activities = [
    { name: 'Vakna', package_component: null, sort_order: 1 },
    { name: 'Klä på sig', package_component: null, sort_order: 2 },
    { name: 'Borsta tänderna', package_component: null, sort_order: 3 },
    { name: 'Äta frukost', package_component: null, sort_order: 4 },
    { name: 'Förskola/Skola', package_component: null, sort_order: 5 },
    { name: 'Leka ute', package_component: null, sort_order: 6 },
    { name: 'Mellanmål', package_component: null, sort_order: 8 },
    { name: 'Leka', package_component: null, sort_order: 9 },
    { name: 'Träning/Aktivitet', package_component: null, sort_order: 10 },
    { name: 'Middag', package_component: null, sort_order: 11 },
    { name: 'Pyjamas', package_component: null, sort_order: 13 },
    { name: 'Godnattsaga', package_component: null, sort_order: 14 },
    { name: 'Sova', package_component: null, sort_order: 15 },
    { name: 'Packa skolväska', package_component: null, sort_order: 17 },
    { name: 'Skola', package_component: null, sort_order: 18 },
    { name: 'Läxor', package_component: null, sort_order: 19 },
    { name: 'Duscha', package_component: null, sort_order: 20 },
    { name: 'Ledig tid', package_component: null, sort_order: 21 },
    { name: 'Utflykt', package_component: null, sort_order: 22 },
    { name: 'Familjeaktivitet', package_component: null, sort_order: 23 },
    { name: 'Hantverk eller spel', package_component: null, sort_order: 24 },
    { name: 'Utomhuslek', package_component: null, sort_order: 25 },
    { name: 'Julpyssel', package_component: null, sort_order: 26 },
    { name: 'Julmys och fika', package_component: null, sort_order: 27 },
    { name: 'Duka av', package_component: null, sort_order: 41 },
    { name: 'Hämta post', package_component: null, sort_order: 42 },
    { name: 'Hjälpa till', package_component: null, sort_order: 43 },
    { name: 'Borsta tänderna', package_component: 'teacch', sort_order: 9001 },
    { name: 'Äta frukost', package_component: 'teacch', sort_order: 9002 },
    { name: 'Sätta på skor', package_component: 'teacch', sort_order: 9003 },
  ].map((row) => ({
    id: randomUUID(),
    icon: '⭐',
    star_value: 1,
    sub_steps: [],
    seven_questions: row.package_component === 'teacch' ? { where: { text: 'x' } } : {},
    canonical_id: null,
    deprecated: false,
    ...row,
  }));

  const schedules = [
    'Förskola vardag',
    'Skola vardag',
    'Helg',
    'Morgonrutin',
    'Kvällsrutin',
    'Lov',
    'Sommarlov',
    'Jullov',
  ].map((name, index) => ({
    id: randomUUID(),
    name,
    description: `${name} legacy`,
    icon: '📋',
    sort_order: index,
    canonical_id: null,
    deprecated: false,
  }));

  const scheduleItems = [];
  for (const schedule of schedules) {
    const count = schedule.name === 'Förskola vardag' ? 12 : 11;
    for (let i = 0; i < count; i++) {
      const activity = activities[i % activities.length];
      scheduleItems.push({
        id: randomUUID(),
        default_schedule_id: schedule.id,
        default_activity_template_id: activity.id,
        name: activity.name,
        section: i < 4 ? 'morgon' : (i < 8 ? 'dag' : 'kvall'),
        sort_order: i,
        schedule_name: schedule.name,
        schedule_canonical_id: null,
      });
    }
  }

  const rewards = Array.from({ length: 17 }, (_, index) => ({
    id: randomUUID(),
    name: `Reward ${index + 1}`,
    icon: '🎁',
    star_cost: 10 + index,
    sort_order: index,
  }));

  return {
    activities,
    schedules,
    scheduleItems,
    rewards,
    counts: {
      activities: activities.length,
      schedules: schedules.length,
      scheduleItems: scheduleItems.length,
      rewards: rewards.length,
    },
  };
}

module.exports = {
  createProdLikeLegacyFixture,
};
