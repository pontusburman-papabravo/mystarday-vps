const express = require('express');
const crypto = require('crypto');
const db = require('../lib/db');
const { hashPassword, pinFingerprint } = require('../lib/hash');
const { requireAuth, requireParent } = require('../middleware/auth');
const { requireNotPedagogOnly, getChildAccess, requireChildAccess } = require('../middleware/authz');
const { validate, validateParams } = require('../middleware/validate');
const {
  CreateChildSchema,
  UpdateChildSchema,
  UpdateChildPinSchema,
  ChildViewConfigSchema,
  VisualThemeBodySchema,
  ReorderSchema,
  UUIDParam,
} = require('../lib/schemas');
const pinLockout = require('../../db/pin-lockout');
const { getChildrenForParent } = require('../../db/parent-access');
const { checkChildNameInFamily } = require('../lib/family-duplicates');
const { getOrGenerateDailyLog } = require('../lib/daily-log-generator');
const { resolveDefaultScheduleName, seedChildDefaultSchedule } = require('../lib/seed-child-default-schedule');
const {
  mergeChildViewConfig,
  applyWarmEchoOptInMetadata,
} = require('../lib/child-view-config');

const router = express.Router();

// ─── GET /api/children/:id/view-config (parent OR child self) ──
router.get('/:id/view-config', requireAuth, validateParams(UUIDParam), async (req, res) => {
  try {
    if (req.user.type === 'child') {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
      }
    } else {
      const access = await db.query(
        `SELECT role FROM parent_child
         WHERE parent_id = $1 AND child_id = $2 AND revoked_at IS NULL`,
        [req.user.id, req.params.id]
      );
      if (access.rows.length === 0) {
        return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
      }
    }

    const result = await db.query(
      'SELECT child_view_config FROM child WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barnet hittades inte' });
    }

    res.json(result.rows[0].child_view_config);
  } catch (err) {
    console.error('[VIEW-CONFIG] GET error:', err.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PATCH /api/children/:id/view-config/self (child — view_mode only) ──
router.patch('/:id/view-config/self', requireAuth, validateParams(UUIDParam), async (req, res) => {
  try {
    if (req.user.type !== 'child' || req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    }

    const { view_mode: viewMode } = req.body || {};
    if (!viewMode || !['classic', 'new'].includes(viewMode)) {
      return res.status(400).json({ error: 'view_mode must be "classic" or "new"' });
    }

    const existing = await db.query(
      'SELECT child_view_config FROM child WHERE id = $1',
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Barnet hittades inte' });
    }

    const current = existing.rows[0].child_view_config || {};
    const merged = { ...current, view_mode: viewMode };

    await db.query(
      'UPDATE child SET child_view_config = $1 WHERE id = $2',
      [JSON.stringify(merged), req.params.id]
    );

    res.json(merged);
  } catch (err) {
    console.error('[VIEW-CONFIG] PATCH self error:', err.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PATCH /api/children/:id/visual-theme (child self or parent — visual_theme only) ──
router.patch('/:id/visual-theme', requireAuth, validateParams(UUIDParam), validate(VisualThemeBodySchema), async (req, res) => {
  try {
    const childId = req.params.id;

    if (req.user.type === 'child') {
      if (req.user.id !== childId) {
        return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
      }
    } else {
      const access = await db.query(
        `SELECT role FROM parent_child
         WHERE parent_id = $1 AND child_id = $2 AND revoked_at IS NULL`,
        [req.user.id, childId]
      );
      if (access.rows.length === 0) {
        return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
      }
    }

    const result = await db.query(
      `UPDATE child SET child_view_config = jsonb_set(
        COALESCE(child_view_config, '{}'::jsonb),
        '{visual_theme}',
        to_jsonb($1::text),
        true
      )
      WHERE id = $2
      RETURNING child_view_config`,
      [req.body.visual_theme, childId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barnet hittades inte' });
    }

    res.json(result.rows[0].child_view_config);
  } catch (err) {
    console.error('[VISUAL-THEME] PATCH error:', err.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// All other routes require parent auth + pedagogen-only guard
router.use(requireParent);
router.use(requireNotPedagogOnly);

/**
 * Check if a Postgres error is a unique_violation on child_family_name_unique.
 */
function isDuplicateNameError(err) {
  return err.code === '23505' && (
    (err.constraint && err.constraint.includes('child_family_name')) ||
    (err.detail && err.detail.toLowerCase().includes('name'))
  );
}

/**
 * Build suggestion names for a duplicate child name.
 * Uses number suffixes (e.g. "Emma 2", "Emma 3") instead of emojis,
 * because emojis can't be typed via keyboard.
 */
function buildNameSuggestions(name) {
  return [2, 3, 4].map(n => `${name} ${n}`);
}

/**
 * Generate a username from child name.
 * Swedish chars normalized, lowercase, + 3-digit suffix.
 */
function generateUsername(name) {
  const base = name
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${base}${suffix}`;
}

/**
 * Generate a random 4-digit PIN.
 */
function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Validate that a PIN is not a weak/common code.
 * Returns null if OK, or an error message if rejected.
 */
function validatePin(pin) {
  // Reject all same digit
  if (/^(\d)\1{3}$/.test(pin)) return 'PIN-koden kan inte bestå av fyra likadana siffror';

  // Reject sequential (ascending)
  const seqAsc = ['0123', '1234', '2345', '3456', '4567', '5678', '6789', '7890'];
  if (seqAsc.includes(pin)) return 'PIN-koden kan inte vara en stigande sifferföljd';

  // Reject sequential (descending)
  const seqDesc = ['9876', '8765', '7654', '6543', '5432', '4321', '3210', '2109'];
  if (seqDesc.includes(pin)) return 'PIN-koden kan inte vara en sjunkande sifferföljd';

  return null;
}

function toChildListResponse(row) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    birthday: row.birthday,
    timezone: row.timezone,
    view_mode: row.view_mode,
    allow_child_reorder: row.allow_child_reorder,
    show_now_next: row.show_now_next,
    require_sequential_completion: row.require_sequential_completion,
    show_mood_rating: row.show_mood_rating,
    mood_input_mode: row.mood_input_mode || 'slider',
    transition_lead_minutes: row.transition_lead_minutes,
    hide_clock: row.hide_clock,
    lock_schedule: row.lock_schedule,
    dopamin_animation: row.dopamin_animation,
    visual_timer: row.visual_timer,
    activity_timers_enabled: row.activity_timers_enabled === true,
    time_adjustment: row.time_adjustment,
    color_coding: row.color_coding,
    view_type: row.view_type,
    username: row.username,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    role: row.role,
  };
}

// ─── GET /api/children ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const rows = await getChildrenForParent(req.user.id, { allowedRoles: ['primary', 'shared'] });
    res.json(rows.map(toChildListResponse));
  } catch (err) {
    console.error('[CHILDREN] List error for parent', req.user.id, ':', err.message, err.stack);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PATCH /api/children/:id/view-config ───────────────────
router.patch('/:id/view-config', validateParams(UUIDParam), requireChildAccess('id'), validate(ChildViewConfigSchema), async (req, res) => {
  try {
    console.log('[VIEW-CONFIG] PATCH for child', req.params.id, 'fields:', Object.keys(req.body));

    // Fetch existing config
    const existing = await db.query(
      'SELECT child_view_config FROM child WHERE id = $1',
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      console.warn('[VIEW-CONFIG] PATCH child not found:', req.params.id);
      return res.status(404).json({ error: 'Barnet hittades inte' });
    }

    // Deep-merge incoming fields over existing config
    const current = existing.rows[0].child_view_config || {};
    let merged = mergeChildViewConfig(current, req.body);
    if (req.user.type === 'parent') {
      merged = applyWarmEchoOptInMetadata(merged, current, req.user.id);
    }

    // Validate view_mode if provided
    if (merged.view_mode && !['classic', 'new'].includes(merged.view_mode)) {
      console.warn('[VIEW-CONFIG] PATCH invalid view_mode:', merged.view_mode);
      return res.status(400).json({ error: 'view_mode must be "classic" or "new"' });
    }

    await db.query(
      'UPDATE child SET child_view_config = $1 WHERE id = $2',
      [JSON.stringify(merged), req.params.id]
    );

    console.log('[VIEW-CONFIG] PATCH saved for child', req.params.id);
    res.json(merged);
  } catch (err) {
    console.error('[VIEW-CONFIG] PATCH error:', err.message, err.stack);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/children ─────────────────────────────────
router.post('/', validate(CreateChildSchema), async (req, res) => {
  try {
    const { name, emoji, birthday, timezone, view_mode, pin } = req.body;

    // Validation
    if (!name || !emoji) {
      return res.status(400).json({ error: 'Namn och emoji krävs' });
    }
    if (name.trim().length < 1) {
      return res.status(400).json({ error: 'Namn krävs' });
    }

    const dupName = await checkChildNameInFamily(db, name.trim(), req.user.familyId);
    if (!dupName.ok) {
      return res.status(409).json({
        error: dupName.error,
        code: dupName.code,
        suggestions: dupName.suggestions,
      });
    }

    // Validate birthday format if provided
    if (birthday) {
      const birthDate = new Date(birthday);
      if (isNaN(birthDate.getTime())) {
        return res.status(400).json({ error: 'Ogiltigt datumformat' });
      }
    }

    // Validate PIN if provided (parent-chosen) — must be 4 digits and not weak
    let rawPin;
    if (pin !== undefined && pin !== null && pin !== '') {
      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: 'PIN-koden måste vara exakt 4 siffror' });
      }
      const pinError = validatePin(pin);
      if (pinError) {
        return res.status(400).json({ error: pinError });
      }
      rawPin = pin;
    } else {
      rawPin = generatePin();
    }

    const childTimezone = timezone || 'Europe/Stockholm';
    const childViewMode = view_mode || 'auto';

    // Compute PIN fingerprint (fast synchronous HMAC)
    const pinFp = pinFingerprint(rawPin);

    // Run PIN hash (expensive scrypt) + DB uniqueness checks in parallel to save ~200ms
    const candidateUsername = generateUsername(name.trim());
    const [pinHash, resolvedUsername, pinExistsResult] = await Promise.all([
      hashPassword(rawPin),
      (async () => {
        // Retry until unique username found (collisions are rare)
        let u = candidateUsername;
        for (let attempts = 0; attempts < 10; attempts++) {
          const exists = await db.query(
            'SELECT id FROM child WHERE LOWER(username) = $1',
            [u.toLowerCase()]
          );
          if (exists.rows.length === 0) return u;
          u = generateUsername(name.trim());
        }
        return u;
      })(),
      db.query(
        'SELECT id FROM child WHERE pin_fingerprint = $1 AND LOWER(name) = LOWER($2)',
        [pinFp, name.trim()]
      ),
    ]);

    const username = resolvedUsername;

    // Check (name + PIN) uniqueness globally.
    // Siblings within the same family may share a PIN as long as their names differ.
    if (pinExistsResult.rows.length > 0) {
      return res.status(409).json({ error: 'Den kombinationen är inte tillgänglig. Försök med ett annat namn eller en annan PIN.' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Create child
      const childResult = await client.query(
        `INSERT INTO child (family_id, name, emoji, birthday, timezone, view_mode, view_type, pin, username, pin_fingerprint, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, 'now_next_later', $7, $8, $9, $10)
         RETURNING id, name, emoji, birthday, timezone, view_mode, view_type, username, avatar_url, created_at`,
        [req.user.familyId, name.trim(), emoji, birthday || null, childTimezone, childViewMode, pinHash, username, pinFp, req.body.avatar_url || null]
      );

      const child = childResult.rows[0];

      // Create parent-child relationship for creating parent (primary)
      await client.query(
        'INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, $3)',
        [req.user.id, child.id, 'primary']
      );

      // Also link all other parents in the family to the new child (shared)
      const otherParents = await client.query(
        'SELECT id FROM parent WHERE family_id = $1 AND id != $2',
        [req.user.familyId, req.user.id]
      );
      for (const op of otherParents.rows) {
        await client.query(
          `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'shared')
           ON CONFLICT (parent_id, child_id) DO NOTHING`,
          [op.id, child.id]
        );
      }

      // Create streak record
      await client.query(
        'INSERT INTO streak (child_id) VALUES ($1)',
        [child.id]
      );

      const defaultScheduleName = resolveDefaultScheduleName(birthday);

      await client.query('COMMIT');

      // Schedule seeding is best-effort — child must exist even if library/schema seeding fails.
      let seeded = false;
      try {
        const seedResult = await seedChildDefaultSchedule({
          childId: child.id,
          familyId: req.user.familyId,
          birthday,
        });
        seeded = seedResult.seeded;
      } catch (seedErr) {
        console.error(
          '[CHILDREN] Default schedule seed failed for child',
          child.id,
          ':',
          seedErr.code,
          seedErr.message,
          seedErr.detail || ''
        );
      }

      if (seeded) {
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: childTimezone });
        try {
          await getOrGenerateDailyLog(child.id, todayStr);
        } catch (dlErr) {
          console.error('[CHILDREN] Daily log generation after child creation failed:', dlErr.message);
        }
      }

      res.status(201).json({
        ...child,
        pin: rawPin,
        message: `${name.trim()} har lagts till! Spara PIN-koden: ${rawPin}`,
        wizard: true,
        default_schedule_name: defaultScheduleName,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (isDuplicateNameError(err)) {
      const trimmedName = req.body.name.trim();
      const suggestions = buildNameSuggestions(trimmedName);
      return res.status(409).json({
        error: `${trimmedName} finns redan i din familj`,
        code: 'DUPLICATE_CHILD_NAME',
        suggestions,
      });
    }
    console.error(
      '[CHILDREN] Create error for parent',
      req.user?.id,
      'family',
      req.user?.familyId,
      ':',
      err.code,
      err.message,
      err.detail || '',
      err.stack
    );
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/children/:id ──────────────────────────────
router.get('/:id', validateParams(UUIDParam), async (req, res) => {
  try {
    const access = await getChildAccess(req.user.id, req.params.id);
    if (!access) {
      return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    }

    const result = await db.query(
      `SELECT id, name, emoji, birthday, timezone, view_mode, allow_child_reorder, show_now_next, require_sequential_completion, show_mood_rating,
              mood_input_mode, transition_lead_minutes,
              hide_clock, lock_schedule, dopamin_animation, visual_timer, activity_timers_enabled,
              username, avatar_url, created_at
       FROM child WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barnet hittades inte' });
    }

    res.json({ ...result.rows[0], role: access.role });
  } catch (err) {
    console.error('[CHILDREN] Get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/children/reorder ────────────────────────
// IMPORTANT: This route MUST be defined before /:id to avoid Express matching "reorder" as a UUID
router.put('/reorder', validate(ReorderSchema), async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of { id, sort_order }' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      for (const item of order) {
        if (!item.id || typeof item.sort_order !== 'number') continue;
        await client.query(
          `UPDATE child SET sort_order = $1 WHERE id = $2 AND family_id = $3`,
          [item.sort_order, item.id, req.user.familyId]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Ordning uppdaterad' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[CHILDREN] Reorder error:', err);
    res.status(500).json({ error: 'Något gick fel vid sparandet.' });
  }
});

// ─── PUT /api/children/:id ──────────────────────────────
router.put('/:id', validateParams(UUIDParam), validate(UpdateChildSchema), async (req, res) => {
  try {
    const access = await getChildAccess(req.user.id, req.params.id);
    if (!access) {
      return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    }

    const { name, emoji, birthday, timezone, view_mode, view_type, allow_child_reorder, show_now_next, require_sequential_completion, show_mood_rating, mood_input_mode, transition_lead_minutes, hide_clock, lock_schedule, dopamin_animation, visual_timer, activity_timers_enabled, time_adjustment, color_coding, avatar_url } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      if (name.trim().length < 1) {
        return res.status(400).json({ error: 'Namn krävs' });
      }
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (emoji !== undefined) {
      updates.push(`emoji = $${idx++}`);
      values.push(emoji);
    }
    if (birthday !== undefined) {
      const d = new Date(birthday);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Ogiltigt datumformat' });
      }
      updates.push(`birthday = $${idx++}`);
      values.push(birthday);
    }
    if (timezone !== undefined) {
      updates.push(`timezone = $${idx++}`);
      values.push(timezone);
    }
    if (view_mode !== undefined) {
      updates.push(`view_mode = $${idx++}`);
      values.push(view_mode);
    }
    if (view_type !== undefined) {
      const allowed = ['day_sections', 'now_next_later'];
      if (!allowed.includes(view_type)) {
        return res.status(400).json({ error: 'Ogiltigt view_type' });
      }
      updates.push(`view_type = $${idx++}`);
      values.push(view_type);
    }
    if (allow_child_reorder !== undefined) {
      updates.push(`allow_child_reorder = $${idx++}`);
      values.push(!!allow_child_reorder);
    }
    if (show_now_next !== undefined) {
      updates.push(`show_now_next = $${idx++}`);
      values.push(!!show_now_next);
    }
    if (require_sequential_completion !== undefined) {
      updates.push(`require_sequential_completion = $${idx++}`);
      values.push(!!require_sequential_completion);
    }
    if (show_mood_rating !== undefined) {
      updates.push(`show_mood_rating = $${idx++}`);
      values.push(!!show_mood_rating);
    }
    if (mood_input_mode !== undefined) {
      const allowedModes = ['cards', 'slider', 'off'];
      if (!allowedModes.includes(mood_input_mode)) {
        return res.status(400).json({ error: 'Ogiltigt mood_input_mode' });
      }
      updates.push(`mood_input_mode = $${idx++}`);
      values.push(mood_input_mode);
    }
    if (transition_lead_minutes !== undefined) {
      const { normalizeLeadMinutes } = require('../lib/transition-support');
      const normalized = normalizeLeadMinutes(transition_lead_minutes);
      updates.push(`transition_lead_minutes = $${idx++}`);
      values.push(JSON.stringify(normalized));
    }
    if (hide_clock !== undefined) {
      updates.push(`hide_clock = $${idx++}`);
      values.push(!!hide_clock);
    }
    if (lock_schedule !== undefined) {
      updates.push(`lock_schedule = $${idx++}`);
      values.push(!!lock_schedule);
    }
    if (dopamin_animation !== undefined) {
      updates.push(`dopamin_animation = $${idx++}`);
      values.push(!!dopamin_animation);
    }
    if (visual_timer !== undefined) {
      updates.push(`visual_timer = $${idx++}`);
      values.push(!!visual_timer);
    }
    if (activity_timers_enabled !== undefined) {
      updates.push(`activity_timers_enabled = $${idx++}`);
      values.push(!!activity_timers_enabled);
    }
    if (time_adjustment !== undefined) {
      updates.push(`time_adjustment = $${idx++}`);
      values.push(!!time_adjustment);
    }
    if (color_coding !== undefined) {
      updates.push(`color_coding = $${idx++}`);
      values.push(!!color_coding);
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Inget att uppdatera' });
    }

    values.push(req.params.id);
    const result = await db.query(
      `UPDATE child SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, emoji, birthday, timezone, view_mode, view_type, allow_child_reorder, show_now_next, require_sequential_completion, show_mood_rating, mood_input_mode, transition_lead_minutes, hide_clock, lock_schedule, dopamin_animation, visual_timer, activity_timers_enabled, time_adjustment, color_coding, username, avatar_url, created_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (isDuplicateNameError(err)) {
      const trimmedName = (req.body.name || '').trim();
      const suggestions = buildNameSuggestions(trimmedName);
      return res.status(409).json({
        error: `${trimmedName} finns redan i din familj`,
        code: 'DUPLICATE_CHILD_NAME',
        suggestions,
      });
    }
    console.error('[CHILDREN] Update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/children/:id/apply-template — REMOVED ────
// This endpoint was removed intentionally. Schema application now uses
// dedicated schedule package endpoints:
// - POST /api/standard-library/schedules/:id/copy (standard schedules)
// - POST /api/schedule-templates/:templateId/apply (family templates)

// ─── DELETE /api/children/:id ───────────────────────────
router.delete('/:id', validateParams(UUIDParam), async (req, res) => {
  try {
    // Verify parent has primary access
    const access = await db.query(
      `SELECT role FROM parent_child WHERE parent_id = $1 AND child_id = $2 AND role = 'primary'`,
      [req.user.id, req.params.id]
    );
    if (access.rows.length === 0) {
      return res.status(403).json({ error: 'Bara primär förälder kan ta bort barn' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Delete related records in order of dependencies
      await client.query('DELETE FROM streak WHERE child_id = $1', [req.params.id]);
      await client.query('DELETE FROM parent_note WHERE child_id = $1', [req.params.id]);
      await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [req.params.id]);

      // Delete daily log items (via daily_log)
      await client.query(
        `DELETE FROM rating WHERE daily_log_item_id IN (
           SELECT dli.id FROM daily_log_item dli
           JOIN daily_log dl ON dl.id = dli.daily_log_id
           WHERE dl.child_id = $1
         )`,
        [req.params.id]
      );
      await client.query(
        `DELETE FROM daily_log_item WHERE daily_log_id IN (
           SELECT id FROM daily_log WHERE child_id = $1
         )`,
        [req.params.id]
      );
      await client.query('DELETE FROM daily_log WHERE child_id = $1', [req.params.id]);

      // Delete weekly schedule items and schedules
      await client.query(
        `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
           SELECT id FROM weekly_schedule WHERE child_id = $1
         )`,
        [req.params.id]
      );
      await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [req.params.id]);

      // Delete parent-child links and child
      await client.query('DELETE FROM parent_child WHERE child_id = $1', [req.params.id]);
      await client.query('DELETE FROM child WHERE id = $1', [req.params.id]);

      await client.query('COMMIT');
      res.json({ message: 'Barnet har tagits bort' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[CHILDREN] Delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/children/:id/pin ──────────────────────────
router.put('/:id/pin', validateParams(UUIDParam), requireChildAccess('id'), validate(UpdateChildPinSchema), async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN-koden måste vara exakt 4 siffror' });
    }

    // Reject weak PINs
    const weakError = validatePin(pin);
    if (weakError) {
      return res.status(400).json({ error: weakError });
    }

    // Fetch child's name so we can check (name + PIN) combination uniqueness.
    const pinFp = pinFingerprint(pin);
    const childRow = await db.query('SELECT name FROM child WHERE id = $1', [req.params.id]);
    const childName = childRow.rows[0]?.name || '';

    // Check (name + PIN) uniqueness globally — exclude current child (updating their own PIN is fine).
    const pinExists = await db.query(
      'SELECT id FROM child WHERE pin_fingerprint = $1 AND LOWER(name) = LOWER($2) AND id != $3',
      [pinFp, childName, req.params.id]
    );
    if (pinExists.rows.length > 0) {
      return res.status(409).json({ error: 'Den kombinationen är inte tillgänglig. Försök med ett annat namn eller en annan PIN.' });
    }

    const pinHash = await hashPassword(pin);
    await db.query('UPDATE child SET pin = $1, pin_fingerprint = $2 WHERE id = $3', [pinHash, pinFp, req.params.id]);

    res.json({ message: 'PIN-koden har ändrats!' });
  } catch (err) {
    console.error('[CHILDREN] Change PIN error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/children/:id/unlock-pin ──────────────────
// Parent clears a child's PIN lockout and resets the attempt counter.
// Does NOT change the PIN — only resets the lockout state.
router.post('/:id/unlock-pin', validateParams(UUIDParam), requireChildAccess('id'), async (req, res) => {
  try {
    await pinLockout.clearLockout(req.params.id);

    // Audit: parent unlocked the child
    const childRow = await db.query('SELECT family_id, name FROM child WHERE id = $1', [req.params.id]);
    pinLockout.auditLog(req.params.id, childRow.rows[0]?.family_id, 'lockout_cleared', req.ip || null, {
      cleared_by: 'parent',
      parent_id: req.user.id,
    }).catch(() => {});

    res.json({ message: 'Låsning upphävd. Barnet kan logga in igen.' });
  } catch (err) {
    console.error('[CHILDREN] Unlock PIN error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/children/:id/pin-status ───────────────────
// Parent can check if a child is currently locked out.
router.get('/:id/pin-status', validateParams(UUIDParam), requireChildAccess('id'), async (req, res) => {
  try {
    const status = await pinLockout.checkLockout(req.params.id);
    const lockoutRow = await pinLockout.getLockout(req.params.id);
    res.json({
      locked: status.locked,
      locked_until: status.locked ? status.locked_until : null,
      attempt_count: lockoutRow?.attempt_count || 0,
      max_attempts: pinLockout.MAX_ATTEMPTS,
    });
  } catch (err) {
    console.error('[CHILDREN] PIN status error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/children/:id/progress ─────────────────────
router.get('/:id/progress', validateParams(UUIDParam), requireChildAccess('id'), async (req, res) => {
  try {
    // Placeholder — will be filled in later phases
    const streak = await db.query(
      'SELECT current_streak, cycle_day, last_active_date FROM streak WHERE child_id = $1',
      [req.params.id]
    );

    res.json({
      childId: req.params.id,
      streak: streak.rows[0] || { current_streak: 0, cycle_day: 0, last_active_date: null },
      totalStars: 0,
      completedToday: 0,
      totalToday: 0,
      message: 'Framsteg fylls i i kommande faser',
    });
  } catch (err) {
    console.error('[CHILDREN] Progress error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
