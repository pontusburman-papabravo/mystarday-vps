/**
 * src/routes/admin/email-templates.js
 * Owns: Admin CRUD for email templates (undersokning, valkomstmail, nyhetsbrev, win-back).
 * Does NOT own: Send logic, approval flow, subscriber management.
 *
 * All routes require admin auth — applied by the parent admin router before mount.
 */

const express = require('express');
const db = require('../../../db/email-templates');
const {
  getDefaultEmailTemplate,
  mergeWithEmailTemplateDefaults,
} = require('../../lib/email-template-defaults');

const router = express.Router();

const VALID_TYPES = ['undersokning', 'valkomstmail', 'nyhetsbrev', 'win-back'];

// GET /api/admin/email-templates — all templates
router.get('/', async (req, res) => {
  try {
    const templates = await db.getAllEmailTemplates();
    res.json(mergeWithEmailTemplateDefaults(templates));
  } catch (err) {
    console.error('[EMAIL-TEMPLATES] list error:', err);
    res.status(500).json({ error: 'Kunde inte hämta email-mallar' });
  }
});

// GET /api/admin/email-templates/:type — one template
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Ogiltig malltyp. Tillåtna: ${VALID_TYPES.join(', ')}` });
  }
  try {
    const template = await db.getEmailTemplate(type);
    if (!template) {
      const defaults = getDefaultEmailTemplate(type);
      if (!defaults) return res.status(404).json({ error: 'Mall hittades inte' });
      return res.json({ ...defaults, id: null, updated_at: null });
    }
    if (!template.subject?.trim() || !template.body_text?.trim()) {
      const defaults = getDefaultEmailTemplate(type);
      if (defaults) {
        return res.json({
          ...template,
          label: template.label || defaults.label,
          subject: template.subject?.trim() ? template.subject : defaults.subject,
          body_text: template.body_text?.trim() ? template.body_text : defaults.body_text,
        });
      }
    }
    res.json(template);
  } catch (err) {
    console.error('[EMAIL-TEMPLATES] get error:', err);
    res.status(500).json({ error: 'Kunde inte hämta email-mall' });
  }
});

// PUT /api/admin/email-templates/:type — upsert subject + body_text
router.put('/:type', async (req, res) => {
  const { type } = req.params;
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Ogiltig malltyp. Tillåtna: ${VALID_TYPES.join(', ')}` });
  }

  const { subject, body_text } = req.body;
  if (typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: 'subject krävs (text)' });
  }
  if (typeof body_text !== 'string' || !body_text.trim()) {
    return res.status(400).json({ error: 'body_text krävs (text)' });
  }

  try {
    const updated = await db.upsertEmailTemplate(type, { subject: subject.trim(), body_text });
    res.json({ message: 'Email-mall sparad', template: updated });
  } catch (err) {
    console.error('[EMAIL-TEMPLATES] upsert error:', err);
    res.status(500).json({ error: 'Kunde inte spara email-mall' });
  }
});

module.exports = router;