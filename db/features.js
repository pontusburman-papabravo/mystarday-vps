/**
 * Feature flag DB module.
 * Owns: features + family_features CRUD for the feature flag system.
 * Does NOT own: feature_flag table (legacy simple key/value flags — see admin/system.js).
 */

const db = require('../src/lib/db');

// CORE_FEATURES: these 12 slugs can never be turned off — always return true from hasAccess()
const CORE_FEATURES = [
  'veckoschema', 'daglogg', 'beloningssystem', 'aktivitetsbibliotek',
  'specialdagar', 'kalender', 'familjeinbjudan', 'onboarding',
  'manuella_stjarnor', 'barninloggning', 'streak', 'admin_analytics',
  'child_creation_wizard', // add-child onboarding + child-wizard — must work for all families
];

// ─── Features CRUD ─────────────────────────────────────

/**
 * List all features with family count.
 * For 'live' features: count ALL active (non-archived, non-expired) families.
 * For 'dev' features: count only families assigned via family_features.
 */
async function listFeatures() {
  const result = await db.query(`
    SELECT
      f.*,
      CASE
        WHEN f.status = 'live'
          THEN (
            SELECT COUNT(*)::int
            FROM family fam
            WHERE fam.archived_at IS NULL
              AND fam.subscription_status IN ('active', 'trial', 'beta')
          )
        ELSE COUNT(ff.family_id)::int
      END AS family_count
    FROM features f
    LEFT JOIN family_features ff ON ff.feature_slug = f.slug
    GROUP BY f.id
    ORDER BY f.category ASC NULLS LAST, f.priority DESC, f.created_at ASC
  `);
  return result.rows;
}

/**
 * Get a single feature by slug.
 */
async function getFeature(slug) {
  const result = await db.query(
    'SELECT * FROM features WHERE slug = $1',
    [slug]
  );
  return result.rows[0] || null;
}

/**
 * Create a new feature.
 * Returns the created row.
 */
async function createFeature({ slug, name, description, status, tags, priority, complexity, estimatedHours }) {
  const result = await db.query(`
    INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [slug, name, description || null, status || 'off', tags || [], priority || 'medium', complexity || 5, estimatedHours || null]);
  return result.rows[0];
}

/**
 * Update a feature (partial update).
 * Returns the updated row.
 */
async function updateFeature(slug, fields) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(fields)) {
    const colMap = {
      name: 'name', description: 'description', status: 'status',
      tags: 'tags', priority: 'priority', complexity: 'complexity',
      estimatedHours: 'estimated_hours',
      documentation: 'documentation',
      dev_notes: 'dev_notes',
      changelog: 'changelog',
      category: 'category',
    };
    if (colMap[key]) {
      setClauses.push(`${colMap[key]} = $${idx}`);
      values.push(value);
      idx++;
    }
  }

  if (setClauses.length === 0) return getFeature(slug);

  setClauses.push('updated_at = NOW()');
  values.push(slug);

  const result = await db.query(
    `UPDATE features SET ${setClauses.join(', ')} WHERE slug = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Delete a feature by slug.
 * Returns true if deleted.
 */
async function deleteFeature(slug) {
  const result = await db.query(
    'DELETE FROM features WHERE slug = $1 RETURNING id',
    [slug]
  );
  return result.rows.length > 0;
}

// ─── Documentation ──────────────────────────────────────

/**
 * Update documentation fields (partial JSONB merge).
 * Accepts key/value pairs; overwrites nested keys.
 * Returns updated documentation JSONB.
 */
async function updateDocs(slug, docUpdates) {
  const existing = await db.query(
    'SELECT documentation FROM features WHERE slug = $1',
    [slug]
  );
  if (existing.rows.length === 0) return null;

  const current = existing.rows[0].documentation || {};
  const merged = { ...current, ...docUpdates };

  const result = await db.query(
    `UPDATE features SET documentation = $1, updated_at = NOW() WHERE slug = $2 RETURNING documentation`,
    [JSON.stringify(merged), slug]
  );
  return result.rows[0].documentation;
}

/**
 * Add a dev note to documentation.dev_notes array.
 * { date: ISO string, note: string }
 */
async function addDevNote(slug, { note, date }) {
  const existing = await db.query(
    'SELECT documentation FROM features WHERE slug = $1',
    [slug]
  );
  if (existing.rows.length === 0) return null;

  const current = existing.rows[0].documentation || {};
  const devNotes = current.dev_notes || [];
  devNotes.push({ date: date || new Date().toISOString(), note });
  const merged = { ...current, dev_notes: devNotes };

  const result = await db.query(
    `UPDATE features SET documentation = $1, updated_at = NOW() WHERE slug = $2 RETURNING documentation`,
    [JSON.stringify(merged), slug]
  );
  return result.rows[0].documentation;
}

/**
 * Add a changelog entry to documentation.changelog array.
 * { version: string, date: ISO string, change: string }
 */
async function addChangelog(slug, { version, change, date }) {
  const existing = await db.query(
    'SELECT documentation FROM features WHERE slug = $1',
    [slug]
  );
  if (existing.rows.length === 0) return null;

  const current = existing.rows[0].documentation || {};
  const changelog = current.changelog || [];
  changelog.push({ version, date: date || new Date().toISOString(), change });
  const merged = { ...current, changelog };

  const result = await db.query(
    `UPDATE features SET documentation = $1, updated_at = NOW() WHERE slug = $2 RETURNING documentation`,
    [JSON.stringify(merged), slug]
  );
  return result.rows[0].documentation;
}

// ─── Family Assignment ──────────────────────────────────

/**
 * Add a family to the feature's dev access list.
 */
async function addFamily(familyId, featureSlug) {
  const result = await db.query(`
    INSERT INTO family_features (family_id, feature_slug)
    VALUES ($1, $2)
    ON CONFLICT (family_id, feature_slug) DO NOTHING
    RETURNING *
  `, [familyId, featureSlug]);
  return result.rows[0] || null;
}

/**
 * Remove a family from the feature's dev access list.
 */
async function removeFamily(familyId, featureSlug) {
  const result = await db.query(
    'DELETE FROM family_features WHERE family_id = $1 AND feature_slug = $2 RETURNING family_id',
    [familyId, featureSlug]
  );
  return result.rows.length > 0;
}

/**
 * List families assigned to a feature.
 */
async function listFeatureFamilies(featureSlug) {
  const result = await db.query(`
    SELECT
      ff.family_id,
      ff.enabled_at,
      f.name AS family_name
    FROM family_features ff
    JOIN "family" f ON f.id = ff.family_id
    WHERE ff.feature_slug = $1
    ORDER BY ff.enabled_at DESC
  `, [featureSlug]);
  return result.rows;
}

// ─── Family Search (admin) ────────────────────────────

/**
 * Search families by name/email for the admin search UI.
 * Excludes families already assigned to the given feature.
 */
async function searchFamilies(query, featureSlug, limit = 20) {
  const result = await db.query(`
    SELECT
      f.id,
      COALESCE(f.name, 'Familj ' || LEFT(f.id::text, 8)) AS family_name,
      COUNT(DISTINCT p.id) AS parent_count,
      COUNT(DISTINCT c.id) AS child_count
    FROM family f
    LEFT JOIN parent p ON p.family_id = f.id AND p.is_admin = false
    LEFT JOIN child c ON c.family_id = f.id
    WHERE f.archived_at IS NULL
      AND (
        f.name ILIKE '%' || $1 || '%'
        OR p.email ILIKE '%' || $1 || '%'
        OR p.name ILIKE '%' || $1 || '%'
        OR c.name ILIKE '%' || $1 || '%'
      )
      AND f.id NOT IN (
        SELECT family_id FROM family_features WHERE feature_slug = $2
      )
    GROUP BY f.id
    ORDER BY f.name ASC NULLS LAST
    LIMIT $3
  `, [query, featureSlug, limit]);
  return result.rows;
}

// ─── Public: Feature Access Check ────────────────────

/**
 * Check if a family has access to a feature.
 * Returns true if:
 *   - status = 'live' (global), OR
 *   - status = 'dev' AND family is in family_features table
 */
async function hasAccess(familyId, featureSlug) {
  // CORE_FEATURES: always allowed — cannot be disabled
  if (CORE_FEATURES.includes(featureSlug)) return true;

  const feature = await getFeature(featureSlug);
  if (!feature) return false;

  if (feature.status === 'live') return true;
  if (feature.status === 'dev') {
    const result = await db.query(
      'SELECT 1 FROM family_features WHERE family_id = $1 AND feature_slug = $2',
      [familyId, featureSlug]
    );
    return result.rows.length > 0;
  }
  return false;
}

/**
 * Get all accessible features for a family.
 * Returns features where status='live' OR (status='dev' AND family assigned).
 */
async function getAccessibleFeatures(familyId) {
  const result = await db.query(`
    SELECT f.slug, f.name, f.status, f.tags
    FROM features f
    WHERE f.slug = ANY($1)
       OR f.status = 'live'
       OR (f.status = 'dev' AND EXISTS (
         SELECT 1 FROM family_features ff
         WHERE ff.family_id = $2 AND ff.feature_slug = f.slug
       ))
    ORDER BY f.name ASC
  `, [CORE_FEATURES, familyId]);
  return result.rows;
}

/**
 * List all active (non-off) features — public endpoint data.
 */
async function listActiveFeatures() {
  const result = await db.query(`
    SELECT slug, name, status, tags
    FROM features
    WHERE status IN ('dev', 'live')
    ORDER BY name ASC
  `);
  return result.rows;
}

module.exports = {
  listFeatures,
  getFeature,
  createFeature,
  updateFeature,
  deleteFeature,
  updateDocs,
  addDevNote,
  addChangelog,
  addFamily,
  removeFamily,
  listFeatureFamilies,
  searchFamilies,
  hasAccess,
  getAccessibleFeatures,
  listActiveFeatures,
};