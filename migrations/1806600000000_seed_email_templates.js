'use strict';

const { EMAIL_TEMPLATE_DEFAULTS } = require('../src/lib/email-template-defaults');

/**
 * email_templates table was created without seed data — admin Email-mallar showed empty fields.
 * Inserts defaults for all four types; does not overwrite admin-edited content.
 */
module.exports = {
  name: '1806600000000_seed_email_templates',

  up: async (client) => {
    for (const template of EMAIL_TEMPLATE_DEFAULTS) {
      await client.query(
        `INSERT INTO email_templates (template_type, label, subject, body_text, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (template_type) DO NOTHING`,
        [template.template_type, template.label, template.subject, template.body_text]
      );

      await client.query(
        `UPDATE email_templates
         SET label = $2,
             subject = $3,
             body_text = $4,
             updated_at = NOW()
         WHERE template_type = $1
           AND (
             subject IS NULL OR BTRIM(subject) = ''
             OR body_text IS NULL OR BTRIM(body_text) = ''
           )`,
        [template.template_type, template.label, template.subject, template.body_text]
      );
    }
  },
};
