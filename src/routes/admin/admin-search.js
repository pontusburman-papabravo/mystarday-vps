/**
 * Admin command palette search — Fas 3E.
 */
const express = require('express');
const db = require('../../lib/db');

const router = express.Router();

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ sections: [], families: [], messages: [], leads: [] });
    }
    const like = `%${q}%`;

    const [families, messages, leads] = await Promise.all([
      db.query(
        `SELECT f.id, f.name, f.created_at
         FROM family f
         WHERE f.archived_at IS NULL AND f.name ILIKE $1
         ORDER BY f.created_at DESC LIMIT 8`,
        [like]
      ),
      db.query(
        `SELECT cm.id, cm.name, cm.email, cm.status, cm.created_at
         FROM contact_message cm
         WHERE cm.name ILIKE $1 OR cm.email ILIKE $1 OR cm.message ILIKE $1
         ORDER BY cm.created_at DESC LIMIT 8`,
        [like]
      ),
      db.query(
        `SELECT source_type, id, title, lead_status, created_at FROM (
           SELECT 'package' AS source_type, pi.id::text, f.name AS title, pi.lead_status, pi.created_at
           FROM package_interest pi JOIN family f ON f.id = pi.family_id
           WHERE f.name ILIKE $1
           UNION ALL
           SELECT 'pedagog', pr.id::text, COALESCE(pr.name, pr.email), pr.lead_status, pr.created_at
           FROM professional_interest pr
           WHERE pr.name ILIKE $1 OR pr.email ILIKE $1
           UNION ALL
           SELECT 'waitlist', w.id::text, COALESCE(w.name, w.email), w.lead_status, w.created_at
           FROM waitlist w WHERE w.name ILIKE $1 OR w.email ILIKE $1
         ) x ORDER BY created_at DESC LIMIT 8`,
        [like]
      ),
    ]);

    const sections = [
      { label: 'Start', route: '#start', keywords: ['start', 'hem', 'översikt'] },
      { label: 'Familjer', route: '#familjer', keywords: ['familj', 'familjer'] },
      { label: 'Ärenden', route: '#arenden', keywords: ['ärende', 'meddelande', 'kontakt', 'inbox', 'support', 'bugg'] },
      { label: 'Tillväxt pipeline', route: '#tillvaxt-pipeline', keywords: ['pipeline', 'tillväxt', 'lead'] },
      { label: 'Extra stöd', route: '#extra-stod', keywords: ['paket', 'teacch', 'extra'] },
      { label: 'Produktanalys', route: '#produktanalys', keywords: ['analys', 'analytics'] },
    ].filter((s) =>
      s.label.toLowerCase().includes(q.toLowerCase()) ||
      s.keywords.some((k) => k.includes(q.toLowerCase()))
    );

    res.json({
      sections,
      families: families.rows,
      messages: messages.rows,
      leads: leads.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
