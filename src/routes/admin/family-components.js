/**
 * Admin: per-family package components (§9.10.6, E13).
 */

const express = require('express');
const familySubscriptions = require('../../../db/family-subscriptions');
const db = require('../../lib/db');
const { ALL_COMPONENTS } = require('../../lib/package-access');
const { INTEREST_COMPONENTS } = require('../../lib/package-interest-constants');

const router = express.Router();

const GRANTABLE = [...INTEREST_COMPONENTS];

router.get('/families/:familyId/subscription', async (req, res, next) => {
  try {
    const familyId = req.params.familyId;
    const { rows: famRows } = await db.query(
      'SELECT id, name, is_lifetime_free FROM family WHERE id = $1',
      [familyId]
    );
    if (!famRows[0]) return res.status(404).json({ error: 'Familj hittades inte' });

    const sub = await familySubscriptions.getByFamilyId(familyId);
    const components = {};
    for (const slug of ALL_COMPONENTS) {
      const entry = (sub?.components || []).find((c) => c.component === slug);
      if (!entry && slug === 'basic_app' && !sub) {
        components[slug] = { state: 'active', source: 'legacy' };
      } else if (entry) {
        components[slug] = {
          state: entry.state || 'active',
          source: entry.source || 'unknown',
          granted_at: entry.granted_at,
        };
      } else {
        components[slug] = { state: 'disabled' };
      }
    }

    res.json({
      family: famRows[0],
      tier: sub?.tier || 'lifetime_free',
      components,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/families/:familyId/components/:slug', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { familyId, slug } = req.params;
    const { action } = req.body;

    if (slug === 'basic_app') {
      return res.status(400).json({ error: 'basic_app kan inte ändras via admin' });
    }

    if (!GRANTABLE.includes(slug)) {
      return res.status(400).json({ error: 'Ogiltig komponent' });
    }

    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT components FROM family_subscriptions WHERE family_id = $1 FOR UPDATE',
      [familyId]
    );
    const components = [...(rows[0]?.components || [])];
    const idx = components.findIndex((c) => c.component === slug);

    if (action === 'grant' || action === 'reactivate') {
      const entry = {
        component: slug,
        state: 'active',
        source: 'admin',
        granted_at: new Date().toISOString(),
        expires_at: null,
        archived_at: null,
      };
      if (idx >= 0) components[idx] = { ...components[idx], ...entry };
      else components.push(entry);
    } else if (action === 'archive') {
      if (idx < 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Komponent saknas' });
      }
      components[idx] = {
        ...components[idx],
        state: 'archived',
        archived_at: new Date().toISOString(),
      };
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'action måste vara grant, archive eller reactivate' });
    }

    await client.query(
      `INSERT INTO family_subscriptions (family_id, components)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (family_id) DO UPDATE SET components = $2::jsonb, updated_at = NOW()`,
      [familyId, JSON.stringify(components)]
    );

    await client.query(
      `INSERT INTO admin_audit_log (admin_id, target_family_id, action, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        familyId,
        action === 'archive' ? 'component_archived' : 'component_granted',
        JSON.stringify({ component: slug, action }),
      ]
    );

    await client.query('COMMIT');
    res.json({ ok: true, components });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
