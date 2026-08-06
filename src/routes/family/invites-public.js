'use strict';

/**
 * Public family-invite routes (mounted at /api/family, BEFORE requireParent).
 * No authentication: invite validation + new-account acceptance.
 */

const express = require('express');
const db = require('../../lib/db');
const { hashPassword } = require('../../lib/hash');
const { createNewsletterSubscription } = require('../../lib/newsletter-subscribe');
const { VALID_FAMILY_ROLES } = require('../../lib/family-duplicates');

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

      await createNewsletterSubscription(client, newParent.id, normalizedEmail);

      // Link new parent to invited child_ids (always explicit on new invites)
      let childIdsToLink = invite.child_ids && invite.child_ids.length > 0
        ? invite.child_ids
        : null;

      if (!childIdsToLink) {
        const allChildrenResult = await client.query(
          'SELECT id FROM child WHERE family_id = $1',
          [invite.family_id]
        );
        childIdsToLink = allChildrenResult.rows.map(r => r.id);
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
      await setActiveChildrenForParent(client, newParent.id, childIdsToLink, {});

      // Mark invite as accepted (single-use)
      await client.query(
        'UPDATE family_invite SET accepted = true WHERE id = $1',
        [invite.id]
      );

      await client.query('COMMIT');

      const { syncAccountType } = require('../../../db/parent-access');
      await syncAccountType(newParent.id);

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

module.exports = router;
