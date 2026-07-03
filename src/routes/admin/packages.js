/**
 * Admin Paket workspace API (V2).
 * Per-package overview, families, starter content, features, preview config.
 */

const express = require('express');
const db = require('../../lib/db');
const packageInterest = require('../../../db/package-interest');
const { getSubscriptionStats } = require('../../../db/subscription-admin-stats');
const { listFeatures, listFeatureFamilies, addFamily } = require('../../../db/features');
const {
  PACKAGE_COMPONENTS,
  DEFAULT_PACKAGE_CONTENT,
  getPackageMeta,
  listPackageMeta,
} = require('../../../config/package-admin-meta');
const { getFeaturesForComponent } = require('../../../config/component-feature-map');
const { PACKAGE_LABELS, INTEREST_SOURCES } = require('../../lib/package-interest-constants');
const {
  getMergedPreviewPackage,
  getPackageContentConfig,
  setPackageContentConfig,
  setPreviewOverride,
  getPreviewOverride,
} = require('../../lib/preview-package-config');
const { getPreviewPackage } = require('../../../config/preview-data');
const { notifyLibraryUpdate } = require('../../lib/library-notifications');

const router = express.Router();

function assertComponent(component, res) {
  if (!PACKAGE_COMPONENTS.includes(component)) {
    res.status(400).json({ error: 'Ogiltigt paket' });
    return false;
  }
  return true;
}

router.get('/', async (req, res, next) => {
  try {
    res.json({ packages: listPackageMeta() });
  } catch (err) {
    next(err);
  }
});

router.get('/:component', async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!assertComponent(component, res)) return;

    const period = ['7d', '30d', '90d'].includes(req.query.period) ? req.query.period : '30d';
    const [stats, interestCounts, activeFamilies, starterCount, content, preview] = await Promise.all([
      getSubscriptionStats(period),
      packageInterest.getInterestCountsByComponent(),
      countActiveFamilies(component),
      countStarterContent(component),
      getPackageContentConfig(component, DEFAULT_PACKAGE_CONTENT[component]),
      getMergedPreviewPackage(component),
    ]);

    const componentStats = stats.by_component.find((c) => c.component === component) || {
      component,
      interest_families: 0,
      preview_families: 0,
      conversion_pct: null,
    };
    const interestRow = interestCounts.find((r) => r.component === component);

    res.json({
      meta: getPackageMeta(component),
      stats: {
        ...componentStats,
        interest_families: interestRow?.families || componentStats.interest_families || 0,
        active_families: activeFamilies,
        starter_activities: starterCount,
        period,
        rollout_mode: stats.rollout_mode,
      },
      content,
      preview,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:component/families', async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!assertComponent(component, res)) return;
    const rows = await listFamiliesWithComponent(component);
    res.json({ families: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

router.get('/:component/families/lookup', async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!assertComponent(component, res)) return;
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email || email.length < 3) {
      return res.status(400).json({ error: 'Ange minst 3 tecken e-post' });
    }
    const { rows } = await db.query(
      `SELECT DISTINCT f.id, f.name,
         (SELECT string_agg(p.email, ', ') FROM parent p WHERE p.family_id = f.id AND NOT p.is_admin) AS parent_emails
       FROM family f
       JOIN parent p ON p.family_id = f.id AND LOWER(p.email) LIKE $1
       WHERE f.archived_at IS NULL
       LIMIT 5`,
      [`%${email}%`]
    );
    res.json({ families: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:component/interest', async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!assertComponent(component, res)) return;
    const source = INTEREST_SOURCES.includes(req.query.source) ? req.query.source : undefined;
    const { rows, total } = await packageInterest.listInterest({
      component,
      source,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    });
    res.json({
      rows: rows.map((row) => ({
        ...row,
        component_label: PACKAGE_LABELS[row.component] || row.component,
      })),
      total,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:component/features', async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!assertComponent(component, res)) return;
    const slugs = getFeaturesForComponent(component);
    const all = await listFeatures();
    const features = await Promise.all(
      all
        .filter((f) => slugs.includes(f.slug))
        .map(async (f) => {
          const families = await listFeatureFamilies(f.slug);
          return { ...f, assigned_families: families };
        })
    );
    res.json({ features });
  } catch (err) {
    next(err);
  }
});

router.get('/:component/starter-content', async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!assertComponent(component, res)) return;
    const { rows } = await db.query(
      `SELECT id, name, icon, star_value, sort_order, sub_steps, seven_questions, package_component, updated_at
       FROM default_activity_template
       WHERE package_component = $1
       ORDER BY sort_order ASC, name ASC`,
      [component]
    );
    res.json({ activities: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/:component/starter-content', async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!assertComponent(component, res)) return;
    const { name, icon, star_value, sort_order, seven_questions, sub_steps } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Namn krävs' });
    }
    const result = await db.query(
      `INSERT INTO default_activity_template
         (name, icon, star_value, sort_order, sub_steps, seven_questions, package_component)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
       RETURNING *`,
      [
        String(name).trim(),
        icon || '📌',
        parseInt(star_value, 10) || 1,
        parseInt(sort_order, 10) || 0,
        JSON.stringify(Array.isArray(sub_steps) ? sub_steps : []),
        JSON.stringify(seven_questions && typeof seven_questions === 'object' ? seven_questions : {}),
        component,
      ]
    );
    notifyLibraryUpdate('activity', `Paket-mall tillagd: ${result.rows[0].name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:component/starter-content/:id', async (req, res, next) => {
  try {
    const { component, id } = req.params;
    if (!assertComponent(component, res)) return;
    const { name, icon, star_value, sort_order, seven_questions, sub_steps } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(String(name).trim()); }
    if (icon !== undefined) { updates.push(`icon = $${idx++}`); values.push(icon); }
    if (star_value !== undefined) { updates.push(`star_value = $${idx++}`); values.push(parseInt(star_value, 10) || 1); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); values.push(parseInt(sort_order, 10) || 0); }
    if (sub_steps !== undefined) {
      updates.push(`sub_steps = $${idx++}`);
      values.push(JSON.stringify(Array.isArray(sub_steps) ? sub_steps : []));
    }
    if (seven_questions !== undefined) {
      updates.push(`seven_questions = $${idx++}`);
      values.push(JSON.stringify(seven_questions && typeof seven_questions === 'object' ? seven_questions : {}));
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Inget att uppdatera' });

    updates.push('updated_at = NOW()');
    values.push(id, component);

    const result = await db.query(
      `UPDATE default_activity_template SET ${updates.join(', ')}
       WHERE id = $${idx++} AND package_component = $${idx}
       RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Mallen hittades inte' });
    notifyLibraryUpdate('activity', `Paket-mall uppdaterad: ${result.rows[0].name}`);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:component/starter-content/:id', async (req, res, next) => {
  try {
    const { component, id } = req.params;
    if (!assertComponent(component, res)) return;
    const result = await db.query(
      'DELETE FROM default_activity_template WHERE id = $1 AND package_component = $2 RETURNING id',
      [id, component]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Mallen hittades inte' });
    notifyLibraryUpdate('activity', 'Paket-mall borttagen');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.put('/:component/content', async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!assertComponent(component, res)) return;
    const defaults = DEFAULT_PACKAGE_CONTENT[component] || {};
    const merged = { ...defaults, ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    await setPackageContentConfig(component, merged, req.user.id);
    res.json({ ok: true, content: merged });
  } catch (err) {
    next(err);
  }
});

router.get('/:component/preview', async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!assertComponent(component, res)) return;
    const base = getPreviewPackage(component);
    const override = await getPreviewOverride(component);
    const merged = await getMergedPreviewPackage(component);
    res.json({ base, override, merged });
  } catch (err) {
    next(err);
  }
});

router.put('/:component/preview', async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!assertComponent(component, res)) return;
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Preview-data krävs' });
    }
    await setPreviewOverride(component, req.body, req.user.id);
    const merged = await getMergedPreviewPackage(component);
    res.json({ ok: true, preview: merged });
  } catch (err) {
    next(err);
  }
});

router.post('/:component/families/:familyId/dev-features', async (req, res, next) => {
  try {
    const { component, familyId } = req.params;
    if (!assertComponent(component, res)) return;
    const slugs = getFeaturesForComponent(component);
    const all = await listFeatures();
    const devSlugs = all.filter((f) => slugs.includes(f.slug) && f.status === 'dev').map((f) => f.slug);
    const added = [];
    for (const slug of devSlugs) {
      const ok = await addFamily(familyId, slug);
      if (ok) added.push(slug);
    }
    res.json({ ok: true, added, dev_slugs: devSlugs });
  } catch (err) {
    next(err);
  }
});

async function countActiveFamilies(component) {
  const { rows } = await db.query(
    `SELECT COUNT(DISTINCT fs.family_id)::int AS count
     FROM family_subscriptions fs
     JOIN family f ON f.id = fs.family_id AND f.archived_at IS NULL
     CROSS JOIN LATERAL jsonb_array_elements(fs.components) elem
     WHERE elem->>'component' = $1
       AND COALESCE(elem->>'state', 'active') = 'active'`,
    [component]
  );
  return rows[0]?.count || 0;
}

async function countStarterContent(component) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count FROM default_activity_template WHERE package_component = $1`,
    [component]
  );
  return rows[0]?.count || 0;
}

async function listFamiliesWithComponent(component) {
  const { rows } = await db.query(
    `SELECT
       f.id,
       f.name,
       elem->>'granted_at' AS granted_at,
       elem->>'source' AS source,
       (
         SELECT string_agg(DISTINCT p.email, ', ' ORDER BY p.email)
         FROM parent p
         WHERE p.family_id = f.id AND p.is_admin = false
       ) AS parent_emails,
       (
         SELECT string_agg(DISTINCT c.name, ', ' ORDER BY c.name)
         FROM child c WHERE c.family_id = f.id
       ) AS child_names
     FROM family_subscriptions fs
     JOIN family f ON f.id = fs.family_id AND f.archived_at IS NULL
     CROSS JOIN LATERAL jsonb_array_elements(fs.components) elem
     WHERE elem->>'component' = $1
       AND COALESCE(elem->>'state', 'active') = 'active'
     ORDER BY f.name ASC`,
    [component]
  );
  return rows;
}

module.exports = router;
