'use strict';

/**
 * Renumber default_schedule_item.sort_order globally per schedule in day order
 * (morgon → dag → kvall → natt). Previously sort_order was per-section only,
 * which broke ORDER BY sort_order ASC without section prefix.
 */

module.exports = {
  name: '1808740000000_default_schedule_item_day_order',

  up: async (client) => {
    await client.query(`
      WITH ordered AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY default_schedule_id
                 ORDER BY
                   CASE section
                     WHEN 'morgon' THEN 0
                     WHEN 'dag' THEN 1
                     WHEN 'kvall' THEN 2
                     WHEN 'natt' THEN 3
                     ELSE 4
                   END,
                   sort_order ASC,
                   name ASC
               ) - 1 AS new_sort
        FROM default_schedule_item
      )
      UPDATE default_schedule_item dsi
      SET sort_order = ordered.new_sort
      FROM ordered
      WHERE dsi.id = ordered.id
        AND dsi.sort_order IS DISTINCT FROM ordered.new_sort
    `);
  },
};
