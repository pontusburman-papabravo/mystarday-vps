/**
 * child_sort_order NULL = use parent sort_order in child view.
 * Previously DEFAULT 0 caused stale child order after parent reordered the day.
 */
module.exports = {
  name: '1810120000000_child_sort_order_null_semantics',

  up: async (client) => {
    await client.query(`
      ALTER TABLE daily_log_item
      ALTER COLUMN child_sort_order DROP DEFAULT
    `);
    await client.query(`
      UPDATE daily_log_item
      SET child_sort_order = NULL
      WHERE child_sort_order IS NOT NULL
    `);
    await client.query(`
      ALTER TABLE daily_log_item
      ALTER COLUMN child_sort_order SET DEFAULT NULL
    `);
  },

  down: async (client) => {
    await client.query(`
      UPDATE daily_log_item
      SET child_sort_order = COALESCE(child_sort_order, sort_order, 0)
      WHERE child_sort_order IS NULL
    `);
    await client.query(`
      ALTER TABLE daily_log_item
      ALTER COLUMN child_sort_order SET DEFAULT 0
    `);
  },
};
