'use strict';

/**
 * Parent-invite routes (check / create / revoke / add-parent / accept).
 * Mounted at /api/family AFTER router.use(requireParent) in index.js.
 */

const express = require('express');
const crypto = require('crypto');
const db = require('../../lib/db');
const { hashPassword } = require('../../lib/hash');
const { validate } = require('../../middleware/validate');
const { inviteLimiter } = require('../../middleware/rateLimiter');
const { createNewsletterSubscription } = require('../../lib/newsletter-subscribe');
const { sendInviteEmail } = require('../../lib/email');
const { resolveCommunicationLocale } = require('../../lib/communication-locale');
const { CheckFamilyMemberSchema, InviteMemberSchema } = require('../../lib/schemas');
const {
  checkAdultInviteEligibility,
  checkChildNameInFamily,
  VALID_FAMILY_ROLES,
} = require('../../lib/family-duplicates');
const { resolveInviteChildIdsForParent } = require('../../lib/family-invite-child-ids');
const { syncAccountType } = require('../../../db/parent-access');

const router = express.Router();

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
    const { email, name, child_ids: childIdsSnake, family_role: familyRole } = req.body;
    const requestedChildIds = childIdsSnake;

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
      'SELECT name, COALESCE(preferred_locale, \'sv-SE\') AS preferred_locale FROM family WHERE id = $1',
      [req.user.familyId]
    );
    const inviterName = inviterResult.rows[0]?.name || req.user.email;
    const familyName = familyResult.rows[0]?.name || 'Min Stjärndag'; // pragma: allowlist secret
    const locale = resolveCommunicationLocale(familyResult.rows[0]?.preferred_locale);

    const childResolution = await resolveInviteChildIdsForParent(
      req.user.id,
      req.user.familyId,
      requestedChildIds
    );
    if (!childResolution.ok) {
      return res.status(childResolution.status).json({ error: childResolution.error });
    }
    const inviteChildIds = childResolution.childIds;

    // Create invite with crypto token (64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600_000); // 7 days

    await db.query(
      `INSERT INTO family_invite (family_id, email, child_ids, token, expires_at, inviter_name, invitee_name, invitee_family_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user.familyId, normalizedEmail, inviteChildIds, token, expiresAt, inviterName, inviteeName, inviteeFamilyRole]
    );

    // Send invite email
    const emailResult = await sendInviteEmail(normalizedEmail, token, { inviteeName, inviterName, familyName, locale });
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

      await createNewsletterSubscription(client, newParent.id, normalizedEmail);

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

      // Create parent_child records for invited children only
      let childIdsToLink = invite.child_ids && invite.child_ids.length > 0
        ? invite.child_ids
        : [];
      if (childIdsToLink.length === 0) {
        const allInFamily = await client.query(
          'SELECT id FROM child WHERE family_id = $1',
          [invite.family_id]
        );
        childIdsToLink = allInFamily.rows.map((r) => r.id);
      } else {
        const valid = await client.query(
          'SELECT id FROM child WHERE family_id = $1 AND id = ANY($2::uuid[])',
          [invite.family_id, childIdsToLink]
        );
        if (valid.rows.length !== childIdsToLink.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Inbjudan innehåller ogiltiga barn' });
        }
      }

      const { setActiveChildrenForParent } = require('../../../db/parent-child-links');
      await setActiveChildrenForParent(client, req.user.id, childIdsToLink, {});

      // Mark invite as accepted
      await client.query(
        'UPDATE family_invite SET accepted = true WHERE id = $1',
        [invite.id]
      );

      await client.query('COMMIT');

      await syncAccountType(req.user.id);

      require('../../lib/journey/ingest').ingestMilestoneAsync({
        familyId: invite.family_id,
        milestone: 'coparent_joined',
        metadata: { parent_id: req.user.id },
      });

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

module.exports = router;
