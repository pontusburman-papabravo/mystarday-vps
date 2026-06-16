/**
 * db/email-templates.js
 * Owns: CRUD queries for the email_templates table.
 * Does NOT own: sending logic, HTML rendering, Resend API calls.
 *
 * Four template_type values: 'undersokning', 'valkomstmail', 'nyhetsbrev', 'win-back'.
 */

const db = require('../src/lib/db');

/**
 * Get all email templates ordered by type.
 * @returns {Promise<Array>}
 */
async function getAllEmailTemplates() {
  const result = await db.query(
    `SELECT id, template_type, label, subject, body_text, updated_at
     FROM email_templates
     ORDER BY template_type`
  );
  return result.rows;
}

/**
 * Get a single email template by type.
 * @param {'undersokning'|'valkomstmail'|'nyhetsbrev'} templateType
 * @returns {Promise<object|null>}
 */
async function getEmailTemplate(templateType) {
  const result = await db.query(
    `SELECT id, template_type, label, subject, body_text, updated_at
     FROM email_templates
     WHERE template_type = $1
     LIMIT 1`,
    [templateType]
  );
  return result.rows[0] || null;
}

/**
 * Upsert an email template by type.
 * @param {'undersokning'|'valkomstmail'|'nyhetsbrev'} templateType
 * @param {{ subject: string, body_text: string }} fields
 * @returns {Promise<object>}
 */
async function upsertEmailTemplate(templateType, { subject, body_text }) {
  const result = await db.query(
    `INSERT INTO email_templates (template_type, label, subject, body_text, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (template_type) DO UPDATE SET
       subject    = EXCLUDED.subject,
       body_text  = EXCLUDED.body_text,
       updated_at = NOW()
     RETURNING id, template_type, label, subject, body_text, updated_at`,
    [templateType, labelForType(templateType), subject, body_text]
  );
  return result.rows[0];
}

function labelForType(type) {
  const labels = {
    undersokning: 'Undersökningsmail',
    valkomstmail: 'Välkomstmail',
    nyhetsbrev:   'Nyhetsbrev',
    'win-back':   'Återaktivering',
  };
  return labels[type] || type;
}

module.exports = { getAllEmailTemplates, getEmailTemplate, upsertEmailTemplate };
