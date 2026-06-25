'use strict';

/**
 * Family image library — parents upload photos once, reuse on activities.
 * activity_template.image_url + daily_log_item.image_url for barnvy snapshots.
 */

exports.up = (pgm) => {
  pgm.createTable('family_image', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    family_id: { type: 'uuid', notNull: true, references: 'family(id)', onDelete: 'CASCADE' },
    label: { type: 'varchar(120)' },
    image_url: { type: 'text', notNull: true },
    sort_order: { type: 'smallint', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('family_image', 'family_id');

  pgm.addColumns('activity_template', {
    image_url: { type: 'text' },
  });

  pgm.addColumns('daily_log_item', {
    image_url: { type: 'text' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('daily_log_item', ['image_url']);
  pgm.dropColumns('activity_template', ['image_url']);
  pgm.dropTable('family_image');
};
