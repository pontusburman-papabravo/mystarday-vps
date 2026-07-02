/**
 * Pedagog invite routes.
 * Owns: invite creation, token validation, accept flow for educators.
 * Does NOT own: parent-child revoked logic (db/parent-access.js), auth (middleware/auth.js).
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { requirePrimaryParent } = require('../middleware/authz');
const { sendPedagogInviteEmail } = require('../lib/email');
const { syncAccountType } = require('../../db/parent-access');

const router = express.Router();

// ─── GET /api/pedagog-invite/:token (public) ───────────────────
router.get('/:token', async (req, res) => {
  try {
    const { getInviteByToken, getInviteChildren } = require('../../db/pedagog-invite');
    const invite = await getInviteByToken(req.params.token);

    if (!invite) {
      return res.json({ valid: false, reason: 'not_found' });
    }

    if (invite.accepted) {
      return res.json({ valid: false, reason: 'already_accepted' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.json({ valid: false, reason: 'expired' });
    }

    const children = await getInviteChildren(invite.child_ids);

    res.json({
      valid: true,
      children,
      inviterName: invite.inviter_name,
      familyName: invite.family_name,
      expiresAt: invite.expires_at,
    });
  } catch (err) {
    console.error('[PEDAGOG-INVITE] GET token error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/pedagog-invite (requireParent + requirePrimaryParent) ───
router.post('/', requireParent, requirePrimaryParent, async (req, res) => {
  try {
    const { email, name, childIds } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Giltig e-postadress krävs' });
    }

    if (!Array.isArray(childIds) || childIds.length === 0) {
      return res.status(400).json({ error: 'Välj minst ett barn att dela med pedagogen' });
    }

    const { verifyPrimaryChildrenForInvite, createInvite } = require('../../db/pedagog-invite');
    const childCheck = await verifyPrimaryChildrenForInvite(req.user.id, req.user.familyId, childIds);
    if (childCheck.length !== childIds.length) {
      return res.status(400).json({ error: 'Ett eller flera barn hittades inte eller saknar behörighet' });
    }

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

    const emailResult = await sendPedagogInviteEmail({
      to: email,
      inviteeName: name || null,
      inviterName,
      familyName,
      inviteToken: invite.token,
    });

    if (!emailResult.success) {
      console.error('[PEDAGOG-INVITE] Email send failed:', emailResult.error);
      // Don't fail the request — the invite is created, just email failed
    }

    res.status(201).json({
      success: true,
      inviteId: invite.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    });
  } catch (err) {
    console.error('[PEDAGOG-INVITE] POST error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// All remaining routes require parent auth
router.use(requireParent);

// ─── POST /api/pedagog-invite/accept (logged-in parent accepts) ────
// Teacher/pedagog who already has an account accepts the invite
router.post('/accept', async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Token krävs' });
    }

    const { getInviteByToken, acceptExistingParent } = require('../../db/pedagog-invite');
    const invite = await getInviteByToken(token);

    if (!invite) {
      return res.status(404).json({ error: 'Inbjudan hittades inte' });
    }

    if (invite.accepted) {
      return res.status(400).json({ error: 'Inbjudan har redan accepterats' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Inbjudan/länken har gått ut' });
    }

    // Verify the logged-in user's email matches the invite email
    if (req.user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return res.status(403).json({
        error: 'Inbjudan är skickad till en annan e-postadress. Logga in med ' + invite.email + ' för att acceptera.'
      });
    }

    const result = await acceptExistingParent({
      pedagogParentId: req.user.id,
      inviteId: invite.id,
      token,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Sync account_type for the accepting parent
    const newAccountType = await syncAccountType(req.user.id);

    res.json({
      message: 'Du är nu kopplad som pedagog!',
      accountType: newAccountType,
      redirectUrl: '/pedagog-oversikt',
    });
  } catch (err) {
    console.error('[PEDAGOG-INVITE] accept error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/pedagog-invite/accept-new (new account accepts) ────
// Creates a new educator parent account
router.post('/accept-new', async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Token krävs' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Lösenordet måste vara minst 8 tecken' });
    }

    const { getInviteByToken, acceptNewParent } = require('../../db/pedagog-invite');
    const invite = await getInviteByToken(token);

    if (!invite) {
      return res.status(404).json({ error: 'Inbjudan hittades inte' });
    }

    if (invite.accepted) {
      return res.status(400).json({ error: 'Inbjudan har redan accepterats' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Inbjudan/länken har gått ut' });
    }

    const result = await acceptNewParent({
      token,
      password,
      inviteId: invite.id,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      message: 'Konto aktiverat! Du kan nu logga in.',
      email: result.newParent.email,
      name: result.newParent.name,
      accountType: result.newParent.account_type,
      redirectUrl: '/pedagog-oversikt',
    });
  } catch (err) {
    console.error('[PEDAGOG-INVITE] accept-new error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;