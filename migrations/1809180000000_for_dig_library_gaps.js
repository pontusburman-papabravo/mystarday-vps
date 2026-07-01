'use strict';

/**
 * Seed standard-library items required by För dig goals (samarbete-hemma, motivation).
 * Idempotent — skips rows that already exist by exact name.
 */

const FOR_DIG_ACTIVITIES = [
  {
    name: 'Duka av',
    icon: '✨',
    star_value: 1,
    sort_order: 41,
    sub_steps: [
      { name: 'Placera tallrikar', icon: '🍽️' },
      { name: 'Torka bordet', icon: '🧽' },
    ],
  },
  {
    name: 'Hämta post',
    icon: '📬',
    star_value: 1,
    sort_order: 42,
    sub_steps: [
      { name: 'Gå till brevlådan', icon: '📬' },
      { name: 'Lägg posten på plats', icon: '📋' },
    ],
  },
  {
    name: 'Hjälpa till',
    icon: '🤝',
    star_value: 1,
    sort_order: 43,
    sub_steps: [
      { name: 'Fråga vad som behövs', icon: '💬' },
      { name: 'Gör uppgiften', icon: '✅' },
    ],
  },
];

const FOR_DIG_REWARDS = [
  {
    name: 'Glass',
    icon: '🍦',
    star_cost: 30,
    sort_order: 15,
  },
  {
    name: 'Skärmtid',
    icon: '📱',
    star_cost: 40,
    sort_order: 16,
  },
];

module.exports = {
  name: '1809180000000_for_dig_library_gaps',

  up: async (client) => {
    for (const act of FOR_DIG_ACTIVITIES) {
      const existing = await client.query(
        'SELECT id FROM default_activity_template WHERE name = $1 LIMIT 1',
        [act.name]
      );
      if (existing.rows.length > 0) continue;

      await client.query(
        `INSERT INTO default_activity_template (name, icon, star_value, sort_order, sub_steps)
         VALUES ($1, $2, $3, $4, $5)`,
        [act.name, act.icon, act.star_value, act.sort_order, JSON.stringify(act.sub_steps)]
      );
    }

    for (const reward of FOR_DIG_REWARDS) {
      const existing = await client.query(
        'SELECT id FROM default_reward WHERE name = $1 LIMIT 1',
        [reward.name]
      );
      if (existing.rows.length > 0) continue;

      await client.query(
        `INSERT INTO default_reward (name, icon, star_cost, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [reward.name, reward.icon, reward.star_cost, reward.sort_order]
      );
    }
  },

  down: async (client) => {
    for (const act of FOR_DIG_ACTIVITIES) {
      await client.query('DELETE FROM default_activity_template WHERE name = $1', [act.name]);
    }

    for (const reward of FOR_DIG_REWARDS) {
      await client.query('DELETE FROM default_reward WHERE name = $1', [reward.name]);
    }
  },
};
