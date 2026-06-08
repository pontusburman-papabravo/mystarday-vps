const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../lib/db');
const { requireParent, requireAuth, resolveParentIdForLoginPicker } = require('../middleware/auth');
const { generateCsrfToken } = require('../middleware/csrf');
const { requireNotPedagogOnly, requirePrimaryParent } = require('../middleware/authz');
const { syncAccountType, getChildrenForParent } = require('../../db/parent-access');
const { sendEmail, sendInviteEmail } = require('../lib/email');
const { hashPassword } = require('../lib/hash');
const config = require('../lib/config');
const { validate, validateParams } = require('../middleware/validate');
const { inviteLimiter, parentPinLimiter } = require('../middleware/rateLimiter');
const {
  UpdateFamilySchema,
  UpdateFamilyMemberSchema,
  InviteMemberSchema,
  CheckFamilyMemberSchema,
  AcceptInviteSchema,
  UUIDParam,
} = require('../lib/schemas');
const {
  checkAdultInviteEligibility,
  checkChildNameInFamily,
  VALID_FAMILY_ROLES,
} = require('../lib/family-duplicates');
const { getLocalDateStr, getOrGenerateDailyLog } = require('../lib/daily-log-generator');

const router = express.Router();

// ─── Public: GET /api/family/invite/:token (no auth) ────
router.get('/invite/:token', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT fi.id, fi.email, fi.expires_at, fi.accepted, fi.child_ids, fi.family_id,
              fi.inviter_name, fi.invitee_name,
              f.name AS family_name
       FROM family_invite fi
       JOIN family f ON f.id = fi.family_id
       WHERE fi.token = $1`,
      [req.params.token]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inbjudan hittades inte' });
    }
    const invite = result.rows[0];
    if (invite.accepted) {
      return res.status(400).json({ error: 'Inbjudan har redan accepterats' });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Inbjudan/länken har gått ut, begär en ny' });
    }
    let children = [];
    if (invite.child_ids && invite.child_ids.length > 0) {
      const childResult = await db.query(
        'SELECT id, name, emoji FROM child WHERE id = ANY($1)',
        [invite.child_ids]
      );
      children = childResult.rows;
    }
    res.json({
      email: invite.email,
      familyId: invite.family_id,
      familyName: invite.family_name,
      inviterName: invite.inviter_name,
      inviteeName: invite.invitee_name,
      expiresAt: invite.expires_at,
      children,
    });
  } catch (err) {
    console.error('[FAMILY] Validate invite error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/family/invite/accept-new ────────────────────
// Public: Create a new parent account from an invite token (no prior login required).
// This replaces the old accept-invite flow where the invited user had to register first.
router.post('/invite/accept-new', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Inbjudningstoken krävs' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Lösenordet måste vara minst 8 tecken' });
    }

    // Look up invite
    const inviteResult = await db.query(
      `SELECT fi.id, fi.family_id, fi.email, fi.child_ids, fi.expires_at, fi.accepted,
              fi.invitee_name, fi.invitee_family_role,
              f.name AS family_name
       FROM family_invite fi
       JOIN family f ON f.id = fi.family_id
       WHERE fi.token = $1`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inbjudan hittades inte' });
    }

    const invite = inviteResult.rows[0];

    if (invite.accepted) {
      return res.status(400).json({ error: 'Inbjudan har redan accepterats' });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Inbjudan/länken har gått ut, begär en ny' });
    }

    const normalizedEmail = invite.email.toLowerCase().trim();

    // Check if email already has an account in any family
    const existingParent = await db.query(
      'SELECT id, family_id FROM parent WHERE LOWER(email) = $1',
      [normalizedEmail]
    );
    if (existingParent.rows.length > 0) {
      return res.status(409).json({ error: 'Det finns redan ett konto med den e-postadressen. Logga in och acceptera inbjudan istället.' });
    }

    const passwordHash = await hashPassword(password);
    const parentName = invite.invitee_name || normalizedEmail.split('@')[0];

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Create the new parent account (auto-verified, onboarding done)
      const roleFromInvite = invite.invitee_family_role && VALID_FAMILY_ROLES.includes(invite.invitee_family_role)
        ? invite.invitee_family_role
        : null;
      const newParentResult = await client.query(
        `INSERT INTO parent (family_id, email, password_hash, name, verified, is_admin, family_role, onboarding_completed)
         VALUES ($1, $2, $3, $4, true, false, $5, true)
         RETURNING id, email, name`,
        [invite.family_id, normalizedEmail, passwordHash, parentName, roleFromInvite]
      );
      const newParent = newParentResult.rows[0];

      // Create notification preferences
      await client.query(
        'INSERT INTO notification_preference (parent_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [newParent.id]
      );

      // Link new parent to invited child_ids (if specified), else all family children
      let childIdsToLink = invite.child_ids && invite.child_ids.length > 0
        ? invite.child_ids
        : null;

      if (!childIdsToLink) {
        const allChildrenResult = await client.query(
          'SELECT id FROM child WHERE family_id = $1',
          [invite.family_id]
        );
        childIdsToLink = allChildrenResult.rows.map(r => r.id);
      }

      for (const childId of childIdsToLink) {
        await client.query(
          `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'shared')
           ON CONFLICT (parent_id, child_id) DO NOTHING`,
          [newParent.id, childId]
        );
      }

      // Mark invite as accepted (single-use)
      await client.query(
        'UPDATE family_invite SET accepted = true WHERE id = $1',
        [invite.id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Konto aktiverat! Du kan nu logga in.',
        email: newParent.email,
        name: newParent.name,
      });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[FAMILY] Accept-new invite error:', err.message, err.stack);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// All remaining routes require parent auth
router.use(requireParent);

// ─── GET /api/family ────────────────────────────────────
// Blocked for pedagog-only (cannot see family data)
router.get('/', requireNotPedagogOnly, async (req, res) => {
  try {
    const familyResult = await db.query(
      `SELECT id, name, timezone, time_display_mode, morning_start, morning_end,
              day_start, day_end, evening_start, evening_end,
              night_start, night_end, streak_start_day, sound_enabled, created_at
       FROM family WHERE id = $1`,
      [req.user.familyId]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Familj hittades inte' });
    }

    const family = familyResult.rows[0];

    // Get parents in family with their child links
    const parentsResult = await db.query(
      'SELECT id, email, name, is_admin, family_role, created_at FROM parent WHERE family_id = $1',
      [req.user.familyId]
    );

    // Get parent-child links for all parents
    const parentChildLinks = await db.query(
      `SELECT pc.parent_id, pc.child_id, pc.role
       FROM parent_child pc
       JOIN parent p ON p.id = pc.parent_id
       WHERE p.family_id = $1`,
      [req.user.familyId]
    );
    const linksByParent = {};
    for (const link of parentChildLinks.rows) {
      if (!linksByParent[link.parent_id]) linksByParent[link.parent_id] = [];
      linksByParent[link.parent_id].push(link.child_id);
    }
    for (const p of parentsResult.rows) {
      p.linked_child_ids = linksByParent[p.id] || [];
    }

    // Get children in family (only those the current parent has access to — revoked_at filtered by getChildrenForParent)
    const children = await getChildrenForParent(req.user.id, { allowedRoles: ['primary', 'shared'] });
    // children already has .id, .name, .emoji, .birthday, .username, .timezone, .sort_order, .role
    // Add has_pin computed field
    const childrenWithPin = children.map(c => ({
      ...c,
      has_pin: c.pin != null && c.pin !== '',
    }));

    // Get ALL children in family (for parent-child assignment UI)
    const allChildrenResult = await db.query(
      `SELECT id, name, emoji FROM child WHERE family_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [req.user.familyId]
    );

    // Get pending invites
    const invitesResult = await db.query(
      `SELECT id, email, expires_at, accepted, created_at
       FROM family_invite
       WHERE family_id = $1 AND accepted = false AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.user.familyId]
    );

    res.json({
      ...family,
      parents: parentsResult.rows,
      children: childrenWithPin,
      allChildren: allChildrenResult.rows,
      pendingInvites: invitesResult.rows,
    });
  } catch (err) {
    console.error('[FAMILY] Get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/family ───────────────────────────────────────
router.put('/', validate(UpdateFamilySchema), async (req, res) => {
  try {
    const { name, timezone } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim() || null);
    }

    if (timezone !== undefined) {
      updates.push(`timezone = $${idx++}`);
      values.push(timezone);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Inga ändringar att spara' });
    }

    values.push(req.user.familyId);
    const result = await db.query(
      `UPDATE family SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, timezone`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Familj hittades inte' });
    }

    res.json({ message: 'Familj uppdaterad!', family: result.rows[0] });
  } catch (err) {
    console.error('[FAMILY] Put error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/family/members/:id ────────────────────────
router.put('/members/:id', validate(UpdateFamilyMemberSchema), async (req, res) => {
  try {
    const { family_role } = req.body;
    const memberId = req.params.id;

    // Verify member belongs to the same family
    const memberResult = await db.query(
      'SELECT id FROM parent WHERE id = $1 AND family_id = $2',
      [memberId, req.user.familyId]
    );
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medlem hittades inte' });
    }

    const validRoles = ['mamma', 'pappa', 'bonusförälder', 'annan'];
    if (family_role !== undefined) {
      if (family_role !== null && !validRoles.includes(family_role)) {
        return res.status(400).json({ error: 'Ogiltig roll. Välj: mamma, pappa, bonusförälder eller annan' });
      }
      await db.query(
        'UPDATE parent SET family_role = $1 WHERE id = $2',
        [family_role || null, memberId]
      );
    }

    res.json({ message: 'Roll uppdaterad!' });
  } catch (err) {
    console.error('[FAMILY] Member update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/family/members/:id/children ────────────────
// Update which children a parent can see
router.put('/members/:id/children', async (req, res) => {
  const client = await db.getClient();
  try {
    const memberId = req.params.id;
    const { childIds } = req.body;

    if (!Array.isArray(childIds) || childIds.length === 0) {
      return res.status(400).json({ error: 'Minst ett barn måste väljas' });
    }

    await client.query('BEGIN');

    // Verify member belongs to same family
    const memberResult = await client.query(
      'SELECT id FROM parent WHERE id = $1 AND family_id = $2',
      [memberId, req.user.familyId]
    );
    if (memberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Medlem hittades inte' });
    }

    // Verify all children belong to same family
    const childResult = await client.query(
      'SELECT id FROM child WHERE family_id = $1',
      [req.user.familyId]
    );
    const familyChildIds = childResult.rows.map(r => r.id);
    const invalidIds = childIds.filter(id => !familyChildIds.includes(id));
    if (invalidIds.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ogiltiga barn-ID:n' });
    }

    // Remove existing links
    await client.query('DELETE FROM parent_child WHERE parent_id = $1', [memberId]);

    // Re-create with selected children
    for (const childId of childIds) {
      await client.query(
        `INSERT INTO parent_child (parent_id, child_id, role)
         VALUES ($1, $2, 'shared')
         ON CONFLICT (parent_id, child_id) DO NOTHING`,
        [memberId, childId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Barnkopplingar uppdaterade!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Update member children error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/family/members/:id ─────────────────────
router.delete('/members/:id', async (req, res) => {
  const client = await db.getClient();
  try {
    const memberId = req.params.id;

    await client.query('BEGIN');

    // Prevent removing yourself if you're the last admin
    const allParents = await client.query(
      'SELECT id, is_admin FROM parent WHERE family_id = $1',
      [req.user.familyId]
    );
    if (allParents.rows.length <= 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Kan inte ta bort sista föräldern i familjen' });
    }

    const memberResult = await client.query(
      'SELECT id, is_admin FROM parent WHERE id = $1 AND family_id = $2',
      [memberId, req.user.familyId]
    );
    if (memberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Medlem hittades inte' });
    }

    // Don't let a non-admin remove an admin
    if (!req.user.isAdmin && memberResult.rows[0].is_admin) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Kan inte ta bort en admin' });
    }

    // Remove parent_child links first (no FK cascade on parent_id, so clean explicitly)
    await client.query(
      'DELETE FROM parent_child WHERE parent_id = $1',
      [memberId]
    );

    // Remove notification preferences (FK has no ON DELETE CASCADE despite original assumption)
    await client.query(
      'DELETE FROM notification_preference WHERE parent_id = $1',
      [memberId]
    );

    // Delete the parent
    await client.query('DELETE FROM parent WHERE id = $1', [memberId]);

    await client.query('COMMIT');
    res.json({ message: 'Förälder borttagen från famiglia.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Member delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/family/children/:id ───────────────────
// Explicit cascading delete — older FK constraints lack ON DELETE CASCADE
// Blocked for pedagog-only parents
router.delete('/children/:id', requireNotPedagogOnly, async (req, res) => {
  const client = await db.getClient();
  try {
    const childId = req.params.id;

    // Verify child belongs to this family
    const childResult = await client.query(
      'SELECT id FROM child WHERE id = $1 AND family_id = $2',
      [childId, req.user.familyId]
    );
    if (childResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Barn hittades inte' });
    }

    await client.query('BEGIN');

    // Delete related records in dependency order (tables without ON DELETE CASCADE)
    await client.query('DELETE FROM streak WHERE child_id = $1', [childId]);
    await client.query('DELETE FROM parent_note WHERE child_id = $1', [childId]);
    await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [childId]);

    // daily_log_item ratings → daily_log_items → daily_logs
    await client.query(
      `DELETE FROM rating WHERE daily_log_item_id IN (
         SELECT dli.id FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id
         WHERE dl.child_id = $1
       )`, [childId]
    );
    await client.query(
      `DELETE FROM daily_log_item WHERE daily_log_id IN (
         SELECT id FROM daily_log WHERE child_id = $1
       )`, [childId]
    );
    await client.query('DELETE FROM daily_log WHERE child_id = $1', [childId]);

    // weekly_schedule_items → weekly_schedules
    await client.query(
      `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
         SELECT id FROM weekly_schedule WHERE child_id = $1
       )`, [childId]
    );
    await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [childId]);

    // parent-child links and child record
    await client.query('DELETE FROM parent_child WHERE child_id = $1', [childId]);
    await client.query('DELETE FROM child WHERE id = $1', [childId]);

    await client.query('COMMIT');
    res.json({ message: 'Barn borttaget' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Child delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

// ─── PUT /api/family/settings ───────────────────────────
router.put('/settings', requireNotPedagogOnly, validate(UpdateFamilySchema), async (req, res) => {
  try {
    const {
      name,
      timezone,
      time_display_mode,
      morning_start, morning_end,
      day_start, day_end,
      evening_start, evening_end,
      night_start, night_end,
      streak_start_day,
      sound_enabled,
    } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    // Family name
    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim() || null);
    }

    // Family timezone
    if (timezone !== undefined) {
      updates.push(`timezone = $${idx++}`);
      values.push(timezone);
    }

    // Validate time_display_mode
    if (time_display_mode !== undefined) {
      const validModes = ['simple', 'starttime', 'full'];
      if (!validModes.includes(time_display_mode)) {
        return res.status(400).json({ error: 'Ogiltigt tidsvisningsläge. Välj: simple, starttime eller full' });
      }
      updates.push(`time_display_mode = $${idx++}`);
      values.push(time_display_mode);
    }

    // Time fields — validate HH:MM format
    const timeFields = {
      morning_start, morning_end, day_start, day_end,
      evening_start, evening_end, night_start, night_end,
    };
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

    for (const [field, value] of Object.entries(timeFields)) {
      if (value !== undefined) {
        if (!timeRegex.test(value)) {
          return res.status(400).json({ error: `Ogiltigt tidsformat för ${field}. Använd HH:MM` });
        }
        updates.push(`${field} = $${idx++}`);
        values.push(value);
      }
    }

    // streak_start_day (0=Sunday ... 6=Saturday, 1=Monday default)
    if (streak_start_day !== undefined) {
      const day = parseInt(streak_start_day);
      if (isNaN(day) || day < 0 || day > 6) {
        return res.status(400).json({ error: 'Ogiltigt värde för streak-startdag (0-6)' });
      }
      updates.push(`streak_start_day = $${idx++}`);
      values.push(day);
    }

    if (sound_enabled !== undefined) {
      updates.push(`sound_enabled = $${idx++}`);
      values.push(!!sound_enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Inga inställningar att uppdatera' });
    }

    values.push(req.user.familyId);
    const result = await db.query(
      `UPDATE family SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, timezone, time_display_mode, morning_start, morning_end,
                 day_start, day_end, evening_start, evening_end,
                 night_start, night_end, streak_start_day, sound_enabled`,
      values
    );

    res.json({
      message: 'Inställningar uppdaterade!',
      settings: result.rows[0],
    });
  } catch (err) {
    console.error('[FAMILY] Settings error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/family/check-member ───────────────────────
router.post('/check-member', validate(CheckFamilyMemberSchema), async (req, res) => {
  try {
    const { email, childName } = req.body;
    const result = {};

    if (email) {
      const adult = await checkAdultInviteEligibility(db, email, req.user.familyId);
      result.adult = adult.ok
        ? { status: 'available' }
        : { status: adult.code, error: adult.error, existingName: adult.existingName || null };
    }

    if (childName) {
      const child = await checkChildNameInFamily(db, childName, req.user.familyId);
      result.child = child.ok
        ? { status: 'available' }
        : { status: child.code, error: child.error, suggestions: child.suggestions || [] };
    }

    res.json(result);
  } catch (err) {
    console.error('[FAMILY] check-member error:', err.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/family/invite ────────────────────────────
router.post('/invite', inviteLimiter, validate(InviteMemberSchema), async (req, res) => {
  try {
    const { email, name, childIds, family_role: familyRole } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const inviteeName = name ? name.trim() : null;

    const eligibility = await checkAdultInviteEligibility(db, normalizedEmail, req.user.familyId);
    if (!eligibility.ok) {
      return res.status(409).json({ error: eligibility.error, code: eligibility.code });
    }

    let inviteeFamilyRole = null;
    if (familyRole !== undefined && familyRole !== null && familyRole !== '') {
      if (!VALID_FAMILY_ROLES.includes(familyRole)) {
        return res.status(400).json({ error: 'Ogiltig roll. Välj: mamma, pappa, bonusförälder eller annan' });
      }
      inviteeFamilyRole = familyRole;
    }

    // Get inviter name and family name
    const inviterResult = await db.query(
      'SELECT name FROM parent WHERE id = $1',
      [req.user.id]
    );
    const familyResult = await db.query(
      'SELECT name FROM family WHERE id = $1',
      [req.user.familyId]
    );
    const inviterName = inviterResult.rows[0]?.name || req.user.email;
    const familyName = familyResult.rows[0]?.name || 'Min Stjärndag';

    // Create invite with crypto token (64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600_000); // 7 days

    await db.query(
      `INSERT INTO family_invite (family_id, email, child_ids, token, expires_at, inviter_name, invitee_name, invitee_family_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user.familyId, normalizedEmail, childIds || [], token, expiresAt, inviterName, inviteeName, inviteeFamilyRole]
    );

    // Send invite email
    const emailResult = await sendInviteEmail(normalizedEmail, token, { inviteeName, inviterName, familyName });
    if (!emailResult.success) {
      return res.status(502).json({ error: 'Kunde inte skicka inbjudan via e-post. Försök igen.' });
    }

    res.status(201).json({
      message: `Inbjudan skickad till ${normalizedEmail}!`,
      invite: {
        email: normalizedEmail,
        expiresAt,
      },
    });
  } catch (err) {
    console.error('[FAMILY] Invite error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── DELETE /api/family/invite/:inviteId ──────────────────
// Revoke a pending invitation (also removes the invited parent if they registered but haven't been removed)
router.delete('/invite/:inviteId', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check if invite exists and belongs to this family
    const inviteResult = await client.query(
      `SELECT fi.id, fi.email, fi.accepted
       FROM family_invite fi
       WHERE fi.id = $1 AND fi.family_id = $2`,
      [req.params.inviteId, req.user.familyId]
    );

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Inbjudan hittades inte' });
    }

    const invite = inviteResult.rows[0];

    // If there's a parent linked to this invite email in this family, remove them too
    // (cleanup parent_child links first, then the parent record)
    if (invite.email) {
      const parentResult = await client.query(
        `SELECT id FROM parent WHERE LOWER(email) = LOWER($1) AND family_id = $2`,
        [invite.email, req.user.familyId]
      );
      if (parentResult.rows.length > 0) {
        const parentId = parentResult.rows[0].id;
        // Remove parent_child links (no FK cascade on parent_id)
        await client.query('DELETE FROM parent_child WHERE parent_id = $1', [parentId]);
        // Remove notification preferences (FK has no ON DELETE CASCADE)
        await client.query('DELETE FROM notification_preference WHERE parent_id = $1', [parentId]);
        // Delete parent
        await client.query('DELETE FROM parent WHERE id = $1', [parentId]);
      }
    }

    // Delete the invite itself
    await client.query(
      `DELETE FROM family_invite WHERE id = $1`,
      [req.params.inviteId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Inbjudan återkallad' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Revoke invite error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

// ─── POST /api/family/add-parent ───────────────────────────
// Create a parent account directly (no email verification needed)
router.post('/add-parent', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({ error: 'Namn krävs' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Giltig e-postadress krävs' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Lösenordet måste vara minst 6 tecken' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();

    // Check if email already exists in ANY family (use pool, not transaction client)
    const existingAny = await db.query(
      'SELECT id FROM parent WHERE LOWER(email) = $1',
      [normalizedEmail]
    );
    if (existingAny.rows.length > 0) {
      return res.status(409).json({ error: 'E-postadressen används redan av ett annat konto' });
    }

    // Hash password before acquiring a client (CPU-bound, no need to hold connection)
    const passwordHash = await hashPassword(password);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Re-check email uniqueness inside the transaction to prevent races
      const doubleCheck = await client.query(
        'SELECT id FROM parent WHERE LOWER(email) = $1',
        [normalizedEmail]
      );
      if (doubleCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'E-postadressen används redan av ett annat konto' });
      }

      // Create the new parent account (auto-verified, same family, onboarding done)
      const newParentResult = await client.query(
        `INSERT INTO parent (family_id, email, password_hash, name, verified, is_admin, family_role, onboarding_completed)
         VALUES ($1, $2, $3, $4, true, false, NULL, true)
         RETURNING id, email, name`,
        [req.user.familyId, normalizedEmail, passwordHash, trimmedName]
      );
      const newParent = newParentResult.rows[0];

      // Create notification preferences (consistent with registration flow)
      await client.query(
        'INSERT INTO notification_preference (parent_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [newParent.id]
      );

      // Link new parent to all existing children in the family (shared access)
      const childrenResult = await client.query(
        'SELECT id FROM child WHERE family_id = $1',
        [req.user.familyId]
      );
      for (const child of childrenResult.rows) {
        await client.query(
          `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'shared')
           ON CONFLICT (parent_id, child_id) DO NOTHING`,
          [newParent.id, child.id]
        );
      }

      // Remove any pending invite for this email (cleanup)
      await client.query(
        `DELETE FROM family_invite
         WHERE family_id = $1 AND LOWER(email) = $2 AND accepted = false`,
        [req.user.familyId, normalizedEmail]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Konto skapat!',
        parent: {
          id: newParent.id,
          email: newParent.email,
          name: newParent.name,
        },
      });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[FAMILY] Add parent error:', err.message, err.stack);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/family/accept-invite ─────────────────────
router.post('/accept-invite', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Inbjudningstoken krävs' });
    }

    const inviteResult = await db.query(
      `SELECT id, family_id, email, child_ids, expires_at, accepted
       FROM family_invite WHERE token = $1`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inbjudan hittades inte' });
    }

    const invite = inviteResult.rows[0];
    if (invite.accepted) {
      return res.status(400).json({ error: 'Inbjudan har redan accepterats' });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Inbjudan har gått ut' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Update parent's family to the invited family
      await client.query(
        'UPDATE parent SET family_id = $1 WHERE id = $2',
        [invite.family_id, req.user.id]
      );

      // Create parent_child records for shared children
      if (invite.child_ids && invite.child_ids.length > 0) {
        for (const childId of invite.child_ids) {
          // Check if link already exists
          const existing = await client.query(
            'SELECT 1 FROM parent_child WHERE parent_id = $1 AND child_id = $2',
            [req.user.id, childId]
          );
          if (existing.rows.length === 0) {
            await client.query(
              `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'shared')`,
              [req.user.id, childId]
            );
          }
        }
      }

      // Mark invite as accepted
      await client.query(
        'UPDATE family_invite SET accepted = true WHERE id = $1',
        [invite.id]
      );

      await client.query('COMMIT');

      res.json({ message: 'Du har gått med i familjen!' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[FAMILY] Accept invite error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/family/dashboard-stats ────────────────────
// Returns per-child stats: today's progress, star balance, 7-day history
// Blocked for pedagog-only parents
router.get('/dashboard-stats', requireNotPedagogOnly, async (req, res) => {
  try {
    const parentId = req.user.id;

    // Get parent's children
    const childrenResult = await db.query(
      `SELECT c.id, c.name, c.emoji, c.timezone, c.birthday
       FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1
       ORDER BY c.created_at ASC`,
      [parentId]
    );
    const children = childrenResult.rows;

    if (children.length === 0) {
      return res.json({ children: [] });
    }

    const childIds = children.map(c => c.id);

    // Per-child "today" date in each child's own timezone (fallback to Europe/Stockholm)
    const childTodayMap = {};
    for (const child of children) {
      childTodayMap[child.id] = getLocalDateStr(new Date(), child.timezone || 'Europe/Stockholm');
    }
    const uniqueDates = [...new Set(Object.values(childTodayMap))];

    // Get today's log stats per child for all relevant dates (include log_id + is_paused for pause toggle)
    const todayStatsRaw = await db.query(
      `SELECT dl.child_id, dl.id AS log_id, dl.is_paused, dl.date::text,
              COUNT(dli.id) AS total,
              COUNT(CASE WHEN dli.completed THEN 1 END) AS completed
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = ANY($1) AND dl.date = ANY($2::date[])
       GROUP BY dl.child_id, dl.id, dl.is_paused, dl.date`,
      [childIds, uniqueDates]
    );

    // Match each child's stats to their local "today" date
    const todayStatsByChild = {};
    for (const row of todayStatsRaw.rows) {
      if (row.date === childTodayMap[row.child_id]) {
        todayStatsByChild[row.child_id] = { total: parseInt(row.total, 10), completed: parseInt(row.completed, 10), log_id: row.log_id, is_paused: row.is_paused };
      }
    }

    // Get star balances per child
    const earnedResult = await db.query(
      `SELECT dl.child_id, COALESCE(SUM(dli.star_value), 0) AS earned
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = ANY($1) AND dli.completed = true
       GROUP BY dl.child_id`,
      [childIds]
    );
    const spentResult = await db.query(
      `SELECT rr.child_id, COALESCE(SUM(rr.star_cost), 0) AS spent
       FROM reward_redemption rr
       WHERE rr.child_id = ANY($1) AND rr.status IN ('approved', 'auto') AND rr.star_cost IS NOT NULL
       GROUP BY rr.child_id`,
      [childIds]
    );
    // Fallback for children without star_cost snapshot (legacy redemptions)
    const spentFallbackResult = await db.query(
      `SELECT rr.child_id, COALESCE(SUM(r.star_cost), 0) AS spent
       FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       WHERE rr.child_id = ANY($1) AND rr.status IN ('approved', 'auto') AND rr.star_cost IS NULL
       GROUP BY rr.child_id`,
      [childIds]
    );

    const earnedMap = {};
    for (const row of earnedResult.rows) earnedMap[row.child_id] = parseInt(row.earned, 10);

    const spentMap = {};
    for (const row of spentResult.rows) {
      spentMap[row.child_id] = (spentMap[row.child_id] || 0) + parseInt(row.spent, 10);
    }
    for (const row of spentFallbackResult.rows) {
      spentMap[row.child_id] = (spentMap[row.child_id] || 0) + parseInt(row.spent, 10);
    }

    // 7-day completion history per child
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const fromStr = sevenDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });

    const historyResult = await db.query(
      `SELECT dl.child_id, dl.date::text AS date,
              COUNT(dli.id) AS total,
              COUNT(CASE WHEN dli.completed THEN 1 END) AS completed,
              dl.is_paused
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = ANY($1) AND dl.date >= $2
       GROUP BY dl.child_id, dl.date, dl.is_paused
       ORDER BY dl.date ASC`,
      [childIds, fromStr]
    );
    const historyByChild = {};
    for (const row of historyResult.rows) {
      if (!historyByChild[row.child_id]) historyByChild[row.child_id] = [];
      historyByChild[row.child_id].push({
        date: row.date,
        total: parseInt(row.total, 10),
        completed: parseInt(row.completed, 10),
        is_paused: row.is_paused,
        pct: row.total > 0 ? Math.round((parseInt(row.completed, 10) / parseInt(row.total, 10)) * 100) : null,
      });
    }

    // Pending redemptions per child
    const pendingResult = await db.query(
      `SELECT rr.child_id, COUNT(*) AS count
       FROM reward_redemption rr
       WHERE rr.child_id = ANY($1) AND rr.status = 'pending'
       GROUP BY rr.child_id`,
      [childIds]
    );
    const pendingMap = {};
    for (const row of pendingResult.rows) pendingMap[row.child_id] = parseInt(row.count, 10);

    // Pending goal change requests per child
    const pendingGoalMap = {};
    try {
      const pendingGoalResult = await db.query(
        `SELECT crgcr.child_id, COUNT(*) AS count
         FROM child_reward_goal_change_request crgcr
         WHERE crgcr.child_id = ANY($1) AND crgcr.status = 'pending'
         GROUP BY crgcr.child_id`,
        [childIds]
      );
      for (const row of pendingGoalResult.rows) pendingGoalMap[row.child_id] = parseInt(row.count, 10);
    } catch (_) {
      // Table may not exist yet
    }

    // Generate (or retrieve) daily logs for each child using the same canonical path as
    // Daglig logg. This replaces the old parallel sync code (syncDailyLogWithSchedule /
    // syncDailyLogForSpecialDay) with a single call that ensures both views show identical items.
    // getOrGenerateDailyLog handles: log creation, special day schedules, empty-log
    // population, and morning activity additions — all in one place.
    const logResults = await Promise.all(children.map(async c => {
      try {
        return await getOrGenerateDailyLog(c.id, childTodayMap[c.id]);
      } catch (err) {
        console.error(`[DASHBOARD] Daily log generation failed for child ${c.id}:`, err.message);
        return null;
      }
    }));

    // Re-fetch today's stats after log generation (items may have been populated)
    const refreshedStats = await db.query(
      `SELECT dl.child_id, dl.id AS log_id, dl.is_paused, dl.date::text,
              COUNT(dli.id) AS total,
              COUNT(CASE WHEN dli.completed THEN 1 END) AS completed
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = ANY($1) AND dl.date = ANY($2::date[])
       GROUP BY dl.child_id, dl.id, dl.is_paused, dl.date`,
      [childIds, uniqueDates]
    );
    for (const row of refreshedStats.rows) {
      if (row.date === childTodayMap[row.child_id]) {
        todayStatsByChild[row.child_id] = { total: parseInt(row.total, 10), completed: parseInt(row.completed, 10), log_id: row.log_id, is_paused: row.is_paused };
      }
    }

    // Build todayItemsMap from the canonical getOrGenerateDailyLog results.
    // This is the same data source Daglig logg uses — eliminating divergence between the two views.
    const todayItemsMap = {};
    for (let i = 0; i < children.length; i++) {
      const result = logResults[i];
      if (!result) continue;
      const childId = children[i].id;
      const stats = todayStatsByChild[childId];
      if (!stats || !stats.log_id) continue;
      todayItemsMap[stats.log_id] = result.items.map(item => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        section: item.section,
        start_time: item.start_time,
        end_time: item.end_time,
        star_value: item.star_value,
        completed: item.completed,
        sort_order: item.sort_order,
        is_once_task: !item.activity_template_id,
      }));
    }

    // Stars earned today per child (per-child timezone)
    const todayEarnedResult = await db.query(
      `SELECT dl.child_id, dl.date::text, COALESCE(SUM(dli.star_value), 0) AS earned_today
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = ANY($1) AND dl.date = ANY($2::date[]) AND dli.completed = true AND dli.star_value > 0
       GROUP BY dl.child_id, dl.date`,
      [childIds, uniqueDates]
    );
    const todayEarnedMap = {};
    for (const row of todayEarnedResult.rows) {
      if (row.date === childTodayMap[row.child_id]) {
        todayEarnedMap[row.child_id] = parseInt(row.earned_today, 10);
      }
    }

    // Nearest reward per child (lowest star_cost, visible + active, for parent's family)
    const rewardsResult = await db.query(
      `SELECT r.id, r.name, r.icon, r.star_cost FROM reward r
       JOIN parent_child pc ON pc.child_id = ANY($1)
       JOIN child c ON c.id = pc.child_id
       WHERE r.family_id = c.family_id AND r.is_active = true
       GROUP BY r.id, r.name, r.icon, r.star_cost
       ORDER BY r.star_cost ASC`,
      [childIds]
    );
    const allRewards = rewardsResult.rows;

    // Build response
    // Manual star grants per child
    const manualMap = {};
    try {
      const manualResult = await db.query(
        `SELECT child_id, COALESCE(SUM(star_count), 0) AS manual
         FROM manual_star_grant WHERE child_id = ANY($1)
         GROUP BY child_id`,
        [childIds]
      );
      for (const row of manualResult.rows) manualMap[row.child_id] = parseInt(row.manual, 10);
    } catch (_) {
      // Table may not exist yet on old instances
    }

    const childStats = children.map(c => {
      const earned = earnedMap[c.id] || 0;
      const manual = manualMap[c.id] || 0;
      const spent = spentMap[c.id] || 0;
      const balance = Math.max(0, earned + manual - spent);
      const today = todayStatsByChild[c.id] || { total: 0, completed: 0, log_id: null, is_paused: false };

      // Get today's items and annotate with status
      const rawItems = today.log_id ? (todayItemsMap[today.log_id] || []) : [];
      let nuAssigned = false;
      let nextaAssigned = false;
      const annotatedItems = rawItems.map(item => {
        let status = 'SEDAN';
        if (item.completed) {
          status = 'DONE';
        } else if (!nuAssigned) {
          status = 'NU';
          nuAssigned = true;
        } else if (!nextaAssigned) {
          status = 'NÄSTA';
          nextaAssigned = true;
        }
        return {
          id: item.id,
          name: item.name,
          icon: item.icon,
          section: item.section,
          star_value: item.star_value,
          completed: item.completed,
          start_time: item.start_time,
          end_time: item.end_time,
          is_once_task: item.is_once_task || false,
          status,
        };
      });

      // Nearest reward: first reward whose cost > balance (not yet earned), else first reward
      const nearestReward = allRewards.find(r => r.star_cost > balance) || allRewards[0] || null;

      return {
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        birthday: c.birthday || null,
        today_total: today.total,
        today_completed: today.completed,
        today_pct: today.total > 0 ? Math.round((today.completed / today.total) * 100) : null,
        today_log_id: today.log_id || null,
        today_is_paused: today.is_paused || false,
        star_balance: balance,
        stars_today: todayEarnedMap[c.id] || 0,
        today_items: annotatedItems,
        nearest_reward: nearestReward ? {
          id: nearestReward.id,
          name: nearestReward.name,
          icon: nearestReward.icon,
          star_cost: nearestReward.star_cost,
        } : null,
        pending_redemptions: pendingMap[c.id] || 0,
        pending_goal_changes: pendingGoalMap[c.id] || 0,
        history: historyByChild[c.id] || [],
      };
    });

    // Medförälder CTA: count parents in this family (excluding the current user's role)
    const parentCountResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM parent WHERE family_id = $1`,
      [req.user.familyId]
    );
    const parent_count = parentCountResult.rows[0].count;

    const totalPending = childStats.reduce((s, c) => s + c.pending_redemptions + c.pending_goal_changes, 0);

    res.json({
      children: childStats,
      todayByChild: childTodayMap,
      total_pending_redemptions: totalPending,
      parent_count,
    });
  } catch (err) {
    console.error('[FAMILY] Dashboard stats error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/family/star-history ────────────────────────
// Returns per-child weekly star totals for the last 8 weeks
router.get('/star-history', async (req, res) => {
  try {
    const parentId = req.user.id;

    const childrenResult = await db.query(
      `SELECT c.id, c.name, c.emoji FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1
       ORDER BY c.created_at ASC`,
      [parentId]
    );
    const children = childrenResult.rows;
    if (children.length === 0) return res.json({ children: [], weeks: [] });

    const childIds = children.map(c => c.id);

    // Get weekly star data (8 weeks back)
    const weeksBack = 8;
    const now = new Date();
    const dow = now.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + mondayOffset);
    thisMonday.setHours(0, 0, 0, 0);

    const fromDate = new Date(thisMonday);
    fromDate.setDate(thisMonday.getDate() - (weeksBack - 1) * 7);
    const fromStr = fromDate.toLocaleDateString('sv-SE');

    // Get stars earned per child per date from completed log items
    const starsResult = await db.query(
      `SELECT dl.child_id, dl.date::text AS date, COALESCE(SUM(dli.star_value), 0) AS stars_earned
       FROM daily_log dl
       JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = ANY($1) AND dl.date >= $2 AND dli.completed = true AND dli.star_value > 0
       GROUP BY dl.child_id, dl.date
       ORDER BY dl.date ASC`,
      [childIds, fromStr]
    );

    // Get manual star grants per child per date
    const manualResult = await db.query(
      `SELECT child_id, created_at::date::text AS date, COALESCE(SUM(star_count), 0) AS stars_manual
       FROM manual_star_grant
       WHERE child_id = ANY($1) AND created_at >= $2
       GROUP BY child_id, created_at::date
       ORDER BY created_at::date ASC`,
      [childIds, fromStr]
    ).catch(() => ({ rows: [] })); // graceful if table not yet migrated

    // Build lookup: childId -> date -> { earned, manual }
    const byChild = {};
    for (const c of children) byChild[c.id] = {};
    for (const row of starsResult.rows) {
      if (!byChild[row.child_id][row.date]) byChild[row.child_id][row.date] = { earned: 0, manual: 0 };
      byChild[row.child_id][row.date].earned = parseInt(row.stars_earned, 10);
    }
    for (const row of manualResult.rows) {
      if (!byChild[row.child_id][row.date]) byChild[row.child_id][row.date] = { earned: 0, manual: 0 };
      byChild[row.child_id][row.date].manual = parseInt(row.stars_manual, 10);
    }

    // Build 8 weeks
    const weeks = [];
    for (let w = weeksBack - 1; w >= 0; w--) {
      const weekStart = new Date(thisMonday);
      weekStart.setDate(thisMonday.getDate() - w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekLabel = `V${getWeekNumber(weekStart)}`;
      const weekStartStr = weekStart.toLocaleDateString('sv-SE');

      const childTotals = {};
      for (const c of children) {
        let total = 0;
        for (let d = 0; d < 7; d++) {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + d);
          const dayStr = day.toLocaleDateString('sv-SE');
          const data = byChild[c.id][dayStr];
          if (data) total += (data.earned || 0) + (data.manual || 0);
        }
        childTotals[c.id] = total;
      }

      weeks.push({
        week_label: weekLabel,
        week_start: weekStartStr,
        is_current: w === 0,
        child_totals: childTotals,
      });
    }

    res.json({
      children: children.map(c => ({ id: c.id, name: c.name, emoji: c.emoji })),
      weeks,
    });
  } catch (err) {
    console.error('[FAMILY] Star history error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// GET /api/family/subscription-status — returns trial info for the banner
// WHY payment_enabled is included: frontend hides all payment UI unless this is true
router.get('/subscription-status', requireParent, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT subscription_status, trial_ends_at, is_lifetime_free FROM family WHERE id = $1`,
      [req.user.familyId || req.user.family_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Familj hittades inte' });
    const { subscription_status, trial_ends_at, is_lifetime_free } = rows[0];
    let trial_days_remaining = null;
    if (subscription_status === 'trial' && trial_ends_at) {
      const diff = new Date(trial_ends_at) - new Date();
      trial_days_remaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    const payment_enabled = false; // Web Stripe removed — IAP via Apple/Google only
    res.json({ subscription_status, is_lifetime_free: !!is_lifetime_free, is_beta: subscription_status === 'beta', trial_days_remaining, payment_enabled });
  } catch (err) {
    console.error('[FAMILY] subscription-status error:', err);
    res.status(500).json({ error: 'Kunde inte hämta prenumerationsstatus' });
  }
});

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// ─── DELETE /api/family/delete-account ─────────────────────
// Apple App Store Guideline 5.1.1: Account deletion must be accessible from settings.
// Requires parent auth (requireParent blocks child PIN sessions) + global CSRF.
// Permanently deletes the entire family and all associated data.
router.delete('/delete-account', requireParent, async (req, res) => {
  const client = await db.getClient();
  try {
    const parentRow = await client.query(
      'SELECT id, family_id FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (parentRow.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Konto hittades inte' });
    }
    const family_id = parentRow.rows[0].family_id;

    await client.query('BEGIN');

    // Delete in dependency order (no ON DELETE CASCADE in schema).
    await client.query(`
      DELETE FROM rating WHERE daily_log_item_id IN (
        SELECT dli.id FROM daily_log_item dli
        JOIN daily_log dl ON dli.daily_log_id = dl.id
        JOIN child c ON dl.child_id = c.id WHERE c.family_id = $1
      )`, [family_id]);
    await client.query(`
      DELETE FROM daily_log_item WHERE daily_log_id IN (
        SELECT dl.id FROM daily_log dl JOIN child c ON dl.child_id = c.id
        WHERE c.family_id = $1
      )`, [family_id]);
    await client.query(`DELETE FROM daily_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);

    await client.query(`DELETE FROM reward_redemption WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM reward_redemption WHERE reward_id IN (SELECT id FROM reward WHERE family_id = $1)`, [family_id]);

    await client.query(`DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
      SELECT ws.id FROM weekly_schedule ws JOIN child c ON ws.child_id = c.id WHERE c.family_id = $1
    )`, [family_id]);
    await client.query(`DELETE FROM weekly_schedule WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM special_day_schedule_item WHERE special_day_schedule_id IN (
      SELECT sds.id FROM special_day_schedule sds JOIN child c ON sds.child_id = c.id WHERE c.family_id = $1
    )`, [family_id]);
    await client.query(`DELETE FROM special_day_schedule WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);

    await client.query(`DELETE FROM streak WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM parent_note WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM pedagog_notes WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM child_observation WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM general_observations WHERE family_id = $1`, [family_id]);

    await client.query(`DELETE FROM reward WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM activity_template WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM category WHERE family_id = $1`, [family_id]);

    await client.query(`DELETE FROM pin_lockout WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM pin_notification_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM pin_audit_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);

    await client.query(`DELETE FROM family_invite WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM pedagog_invite WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM professional_share_link WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM system_messages WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM win_back_email_log WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM push_subscriptions WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM notification_log WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM refresh_token WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM email_verification WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM password_reset WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM waitlist WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM notification_preference WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM parent_child WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM parent_child WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM email_subscriptions WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);

    await client.query(`DELETE FROM child WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM parent WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM family WHERE id = $1`, [family_id]);

    await client.query('COMMIT');

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.clearCookie('token');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[FAMILY] delete-account error:', err);
    res.status(500).json({ error: 'Något gick fel vid radering. Försök igen.' });
  } finally {
    client.release();
  }
});

// ─── POST /api/family/invite-pedagog ───────────────────────
// Create a new pedagog invite. Primary parent only.
router.post('/invite-pedagog', requireParent, requirePrimaryParent, async (req, res) => {
  try {
    const { email, name, childIds } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Giltig e-postadress krävs' });
    }
    if (!Array.isArray(childIds) || childIds.length === 0) {
      return res.status(400).json({ error: 'Välj minst ett barn att dela med pedagogen' });
    }

    // Verify all childIds belong to this family and are linked to the primary parent
    const childCheck = await db.query(
      `SELECT c.id FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1 AND pc.role = 'primary' AND c.id = ANY($2) AND c.family_id = $3`,
      [req.user.id, childIds, req.user.familyId]
    );
    if (childCheck.rows.length !== childIds.length) {
      return res.status(400).json({ error: 'Ett eller flera barn hittades inte eller saknar behörighet' });
    }

    const { createInvite } = require('../../db/pedagog-invite');
    const invite = await createInvite({
      familyId: req.user.familyId,
      inviterParentId: req.user.id,
      email,
      inviteeName: name || null,
      childIds,
    });

    // Send invite email
    const inviterResult = await db.query('SELECT name FROM parent WHERE id = $1', [req.user.id]);
    const familyResult = await db.query('SELECT name FROM family WHERE id = $1', [req.user.familyId]);
    const inviterName = inviterResult.rows[0]?.name || 'En förälder';
    const familyName = familyResult.rows[0]?.name || 'Min Stjärndag';

    const emailResult = await require('../lib/email').sendPedagogInviteEmail({
      to: email,
      inviteeName: name || null,
      inviterName,
      familyName,
      inviteToken: invite.token,
    });

    if (!emailResult.success) {
      console.error('[FAMILY] invite-pedagog: email send failed:', emailResult.error);
    }

    res.status(201).json({
      success: true,
      inviteId: invite.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    });
  } catch (err) {
    console.error('[FAMILY] invite-pedagog POST error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/family/invite-pedagog ──────────────────────────
// List active pedagogen links + pending invites. Spec-compliant format.
// Required by settings-UI pedagog invite section.
router.get('/invite-pedagog', async (req, res) => {
  try {
    const { listPedagogLinks, listPendingInvites } = require('../../db/pedagog-invite');

    const [links, pendingInvites] = await Promise.all([
      listPedagogLinks(req.user.familyId),
      listPendingInvites(req.user.familyId),
    ]);

    // Deduplicate pedagogen parents (one pedagogen can be linked to multiple children)
    const pedagogenMap = {};
    for (const link of links) {
      if (!pedagogenMap[link.parent_id]) {
        pedagogenMap[link.parent_id] = {
          parentId: link.parent_id,
          name: link.parent_name,
          email: link.email,
          childIds: [],
          connectedAt: link.connected_at,
        };
      }
      if (!pedagogenMap[link.parent_id].childIds.includes(link.child_id)) {
        pedagogenMap[link.parent_id].childIds.push(link.child_id);
      }
    }

    res.json({
      pedagogs: Object.values(pedagogenMap),
      pending: pendingInvites.map(inv => ({
        inviteId: inv.id,
        email: inv.email,
        childIds: inv.child_ids,
        expiresAt: inv.expires_at,
      })),
    });
  } catch (err) {
    console.error('[FAMILY] invite-pedagog GET error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── DELETE /api/family/invite-pedagog/:id ───────────────────
// Revoke a pending (non-accepted) invite. Primary parent only.
router.delete('/invite-pedagog/:id', requirePrimaryParent, async (req, res) => {
  try {
    const { revokeInvite } = require('../../db/pedagog-invite');
    const deleted = await revokeInvite(req.params.id, req.user.familyId);

    if (!deleted) {
      return res.status(404).json({ error: 'Inbjudan hittades inte eller är redan accepterad' });
    }

    res.json({ message: 'Inbjudan återkallad' });
  } catch (err) {
    console.error('[FAMILY] revoke invite error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/family/pedagog-access/revoke ─────────────────
// Soft-revoke a pedagogen's access to a child.
// Primary parent only.
router.post('/pedagog-access/revoke', requirePrimaryParent, async (req, res) => {
  try {
    const { pedagogParentId, childId } = req.body || {};

    if (!pedagogParentId || !childId) {
      return res.status(400).json({ error: 'parentId och childId krävs' });
    }

    const { revokePedagogLink } = require('../../db/pedagog-invite');

    // Verify the child belongs to this family
    const childCheck = await db.query(
      'SELECT id FROM child WHERE id = $1 AND family_id = $2',
      [childId, req.user.familyId]
    );
    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Barn hittades inte' });
    }

    // Verify the pedagog parent exists
    const pedagogCheck = await db.query(
      'SELECT id FROM parent WHERE id = $1',
      [pedagogParentId]
    );
    if (pedagogCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Pedagog hittades inte' });
    }

    await revokePedagogLink({
      pedagogParentId,
      childId,
      revokerParentId: req.user.id,
    });

    // Sync account_type for the pedagogen
    await syncAccountType(pedagogParentId);
    // Also sync for the revoking parent (might transition from dual to family)
    await syncAccountType(req.user.id);

    res.json({ message: 'Åtkomst återkallad' });
  } catch (err) {
    console.error('[FAMILY] pedagog-access revoke error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── Parent PIN (F) — Föräldralås (unik PIN per vuxen) ────────────────────────
const parentPinDb = require('../../db/parent-pin');

/** Resolve parent + family from barnväljare (active parent JWT or stjarndag_parent_session). */
async function resolvePickerParentContext(req) {
  const parentId = resolveParentIdForLoginPicker(req);
  if (!parentId) return null;
  const parentResult = await db.query(
    `SELECT id, email, family_id, is_admin, onboarding_completed
     FROM parent WHERE id = $1`,
    [parentId]
  );
  const parentRow = parentResult.rows[0];
  if (!parentRow) return null;
  return {
    parentId: parentRow.id,
    familyId: parentRow.family_id,
    parent: parentRow,
  };
}

/** Activate parent httpOnly cookies from stjarndag_parent_session (add-child / onboarding). */
function activateParentSessionCookies(req, res) {
  const parentSessionCookie = req.cookies?.stjarndag_parent_session;
  if (!parentSessionCookie) return false;
  let session;
  try {
    session = JSON.parse(Buffer.from(parentSessionCookie, 'base64').toString('utf8'));
  } catch {
    return false;
  }
  if (!session?.access_token || !session?.refresh_token) return false;

  res.cookie('access_token', session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
  res.clearCookie('stjarndag_parent_session', { path: '/' });
  return true;
}

/** Attach req.user from barnväljare for rate limiting on picker PIN routes. */
async function attachPickerFamily(req, res, next) {
  try {
    const ctx = await resolvePickerParentContext(req);
    if (!ctx) {
      return res.status(401).json({ error: 'Ingen sparad vuxensession. Logga in som vuxen.' });
    }
    req.user = { id: ctx.parentId, familyId: ctx.familyId, type: 'parent' };
    next();
  } catch (err) {
    console.error('[FAMILY] attachPickerFamily error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
}

// ─── GET /api/family/parent-pin-status-picker ────────────────
// Barnväljare without active JWT — uses stjarndag_parent_session only.
router.get('/parent-pin-status-picker', async (req, res) => {
  try {
    const ctx = await resolvePickerParentContext(req);
    if (!ctx) {
      return res.json({ has_session: false, has_pin: false });
    }
    const hasPin = await parentPinDb.parentHasPin(ctx.parentId);
    res.json({
      has_session: true,
      has_pin: hasPin,
    });
  } catch (err) {
    console.error('[FAMILY] parent-pin-status-picker error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── POST /api/family/verify-pin-picker ────────────────────────
// Verify parent PIN from barnväljare (no active JWT) and restore parent session cookies.
router.post('/verify-pin-picker', attachPickerFamily, parentPinLimiter, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ error: 'PIN-kod krävs (4 siffror)' });
    }

    if (!(await parentPinDb.parentHasPin(req.user.id))) {
      return res.status(400).json({ error: 'Ingen PIN-kod satt för ditt konto' });
    }

    const { ok } = await parentPinDb.verifyParentPin({
      familyId: req.user.familyId,
      parentId: req.user.id,
      pin,
    });
    if (!ok) {
      return res.status(401).json({ ok: false, attempts_remaining: null });
    }

    const gateToken = jwt.sign(
      { type: 'gate', familyId: req.user.familyId, parentId: req.user.id },
      config.jwt.secret,
      { expiresIn: '15m' }
    );
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const ctx = await resolvePickerParentContext(req);
    activateParentSessionCookies(req, res);

    const csrfToken = generateCsrfToken(res);
    const p = ctx?.parent;

    res.json({
      ok: true,
      gateToken,
      expiresAt,
      csrfToken,
      parent: p ? {
        id: p.id,
        email: p.email || null,
        familyId: p.family_id,
        isAdmin: p.is_admin || false,
        type: 'parent',
        onboarding_completed: p.onboarding_completed,
      } : undefined,
    });
  } catch (err) {
    console.error('[FAMILY] verify-pin-picker error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── GET /api/family/parent-pin-status ───────────────────────
// Parent: own PIN. Child session: any adult in family has PIN (for "Jag är vuxen" gate).
// Why requireAuth (not requireParent): child-login.js calls this from a child session.
router.get('/parent-pin-status', requireAuth, async (req, res) => {
  try {
    let hasPin;
    if (req.user.type === 'parent') {
      hasPin = await parentPinDb.parentHasPin(req.user.id);
    } else {
      hasPin = await parentPinDb.familyAnyParentHasPin(req.user.familyId);
    }
    res.json({ has_pin: hasPin });
  } catch (err) {
    console.error('[FAMILY] parent-pin-status error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── POST /api/family/set-pin ──────────────────────────────────
// Set or change the logged-in adult's own parent PIN.
// First set: { pin, confirmPin }
// Change (with current PIN): { pin, confirmPin, currentPin }
// Change (PIN forgotten): { pin, confirmPin, password }
router.post('/set-pin', requireParent, async (req, res) => {
  try {
    const { pin, confirmPin, currentPin, password } = req.body;

    // Validate: exactly 4 digits
    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ error: 'PIN-koden måste vara exakt 4 siffror' });
    }
    if (pin !== confirmPin) {
      return res.status(400).json({ error: 'PIN-koderna matchar inte' });
    }

    const pinRow = await parentPinDb.getParentPinRow(req.user.id);

    if (pinRow?.parent_pin_hash) {
      // ── Changing existing PIN ──────────────────────────────
      if (!currentPin && !password) {
        return res.status(400).json({ error: 'Ange nuvarande PIN-kod eller lösenord för att ändra' });
      }

      if (currentPin) {
        const pinOk = await require('../lib/hash').comparePassword(currentPin, pinRow.parent_pin_hash);
        if (!pinOk) {
          return res.status(401).json({ error: 'Felaktig nuvarande PIN-kod' });
        }
      } else {
        const parentResult = await db.query(
          'SELECT password_hash FROM parent WHERE id = $1',
          [req.user.id]
        );
        if (!parentResult.rows[0]?.password_hash) {
          return res.status(400).json({ error: 'Kontot saknar lösenord — ange nuvarande PIN-kod' });
        }
        const pwOk = await require('../lib/hash').comparePassword(password, parentResult.rows[0].password_hash);
        if (!pwOk) {
          return res.status(401).json({ error: 'Felaktigt lösenord' });
        }
      }
    }
    // First-time setup: no additional verification needed (requireParent already verified)

    const newHash = await require('../lib/hash').hashPassword(pin);
    await parentPinDb.setParentPinHash(req.user.id, newHash);

    res.json({ success: true });
  } catch (err) {
    console.error('[FAMILY] set-pin error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen.' });
  }
});

// ─── POST /api/family/verify-pin ──────────────────────────────
// Verify parent PIN and return a short-lived gate token (15 min JWT).
// Parent session: own PIN. Child session: any adult's PIN in the family.
// Why requireAuth (not requireParent): child-login.js PIN overlay calls this from child JWT.
router.post('/verify-pin', parentPinLimiter, requireAuth, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN-kod krävs (4 siffror)' });
    }

    const familyId = req.user.familyId;
    const isParent = req.user.type === 'parent';

    const hasPin = isParent
      ? await parentPinDb.parentHasPin(req.user.id)
      : await parentPinDb.familyAnyParentHasPin(familyId);

    if (!hasPin) {
      return res.status(400).json({
        error: isParent ? 'Ingen PIN-kod satt för ditt konto' : 'Ingen vuxen har satt PIN-kod ännu',
      });
    }

    const { ok, parentId: matchedParentId } = await parentPinDb.verifyParentPin({
      familyId,
      parentId: isParent ? req.user.id : undefined,
      pin,
    });
    if (!ok) {
      return res.status(401).json({ ok: false, attempts_remaining: null });
    }

    const gateParentId = matchedParentId || (isParent ? req.user.id : null);
    const gateToken = jwt.sign(
      { type: 'gate', familyId, parentId: gateParentId },
      config.jwt.secret,
      { expiresIn: '15m' }
    );
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    res.json({ ok: true, gateToken, expiresAt });
  } catch (err) {
    console.error('[FAMILY] verify-pin error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── POST /api/family/restore-parent-session ────────────────────
// Verify gateToken and restore the saved parent session cookies.
// Called after child logout when a parent session was saved.
router.post('/restore-parent-session', async (req, res) => {
  try {
    const { gateToken } = req.body;
    if (!gateToken) {
      return res.status(400).json({ error: 'gateToken krävs' });
    }

    let payload;
    try {
      payload = jwt.verify(gateToken, config.jwt.secret);
    } catch {
      return res.status(401).json({ error: 'Sessionen har gått ut. Ange PIN-koden igen.' });
    }

    if (payload.type !== 'gate') {
      return res.status(401).json({ error: 'Ogiltig sessionstoken.' });
    }

    const parentSessionCookie = req.cookies?.stjarndag_parent_session;
    if (!parentSessionCookie) {
      return res.status(401).json({ error: 'Ingen sparad session hittades. Logga in igen.' });
    }

    let session;
    try {
      session = JSON.parse(Buffer.from(parentSessionCookie, 'base64').toString('utf8'));
    } catch {
      return res.status(401).json({ error: 'Ogiltig session.' });
    }

    if (!session?.access_token || !session?.refresh_token) {
      return res.status(401).json({ error: 'Saknad session. Logga in igen.' });
    }

    res.cookie('access_token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
    res.clearCookie('stjarndag_parent_session', { path: '/' });

    res.json({ restored: true, expiresAt: payload.exp });
  } catch (err) {
    console.error('[FAMILY] restore-parent-session error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

module.exports = router;
