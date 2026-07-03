/**
 * Paket admin V2 — starter content on default_activity_template.
 * seven_questions + package_component for per-package standard library.
 */
module.exports = {
  name: '1809600000000_package_admin_content',

  up: async (client) => {
    await client.query(`
      ALTER TABLE default_activity_template
        ADD COLUMN IF NOT EXISTS seven_questions JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS package_component VARCHAR(32)
    `);

    const starters = [
      {
        name: 'Borsta tänderna',
        icon: '🪥',
        star_value: 1,
        sort_order: 9001,
        seven_questions: {
          where: { text: 'Badrummet', emoji: '🚿' },
          who: { text: 'Själv', emoji: '🧒' },
          how_long: { text: '2 minuter', emoji: '⏱️' },
          what_next: { text: 'Frukost', emoji: '🥣' },
          what_need: { text: 'Tandborste och tandkräm', emoji: '🪥' },
          why: { text: 'För att tänderna ska vara rena', emoji: '✨' },
        },
      },
      {
        name: 'Äta frukost',
        icon: '🥣',
        star_value: 1,
        sort_order: 9002,
        seven_questions: {
          where: { text: 'Köket', emoji: '🍽️' },
          who: { text: 'Själv', emoji: '🧒' },
          how_long: { text: '15 minuter', emoji: '⏱️' },
          what_next: { text: 'Sätta på skor', emoji: '👟' },
          what_need: { text: 'Frukost och vatten', emoji: '🥛' },
          why: { text: 'För att orka till skolan', emoji: '💪' },
        },
      },
      {
        name: 'Sätta på skor',
        icon: '👟',
        star_value: 1,
        sort_order: 9003,
        seven_questions: {
          where: { text: 'Vid dörren', emoji: '🚪' },
          who: { text: 'Själv', emoji: '🧒' },
          how_long: { text: '3 minuter', emoji: '⏱️' },
          what_next: { text: 'Gå till skolan', emoji: '🏫' },
          what_need: { text: 'Skor och jacka', emoji: '🧥' },
          why: { text: 'För att vara redo att gå', emoji: '✅' },
        },
      },
    ];

    for (const act of starters) {
      const { rows } = await client.query(
        'SELECT id FROM default_activity_template WHERE name = $1 AND package_component = $2 LIMIT 1',
        [act.name, 'teacch']
      );
      if (rows[0]) continue;
      await client.query(
        `INSERT INTO default_activity_template (name, icon, star_value, sort_order, sub_steps, seven_questions, package_component)
         VALUES ($1, $2, $3, $4, '[]'::jsonb, $5::jsonb, $6)`,
        [act.name, act.icon, act.star_value, act.sort_order, JSON.stringify(act.seven_questions), 'teacch']
      );
    }
  },

  down: async (client) => {
    await client.query(`
      DELETE FROM default_activity_template
      WHERE package_component = 'teacch'
        AND name IN ('Borsta tänderna', 'Äta frukost', 'Sätta på skor')
    `);
    await client.query(`
      ALTER TABLE default_activity_template
        DROP COLUMN IF EXISTS package_component,
        DROP COLUMN IF EXISTS seven_questions
    `);
  },
};
