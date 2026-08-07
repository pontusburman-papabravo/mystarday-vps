'use strict';

/**
 * Pedagog (educator) invite + access routes.
 * Mounted at /api/family AFTER router.use(requireParent) in index.js.
 * Primary-parent gated where noted.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { requirePrimaryParent } = require('../../middleware/authz');
const { syncAccountType } = require('../../../db/parent-access');
const { notifyParentAccessRevoked } = require('../../lib/parent-access-sse');

const router = express.Router();

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

    const { verifyPrimaryChildrenForInvite, createInvite } = require('../../../db/pedagog-invite');
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
    const familyResult = await db.query(
      'SELECT name, COALESCE(preferred_locale, \'sv-SE\') AS preferred_locale FROM family WHERE id = $1',
      [req.user.familyId]
    );
    const inviterName = inviterResult.rows[0]?.name || 'En förälder';
    const familyName = familyResult.rows[0]?.name || 'Min Stjärndag'; // pragma: allowlist secret
    const locale = require('../../lib/communication-locale').resolveCommunicationLocale(
      familyResult.rows[0]?.preferred_locale
    );

    const emailResult = await require('../../lib/email').sendPedagogInviteEmail({
      to: email,
      inviteeName: name || null,
      inviterName,
      familyName,
      inviteToken: invite.token,
      locale,
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
    const { listPedagogLinks, listPendingInvites } = require('../../../db/pedagog-invite');

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
    const { revokeInvite } = require('../../../db/pedagog-invite');
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

    const { revokePedagogLink } = require('../../../db/pedagog-invite');

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

    notifyParentAccessRevoked(pedagogParentId, req.user.familyId);

    res.json({ message: 'Åtkomst återkallad' });
  } catch (err) {
    console.error('[FAMILY] pedagog-access revoke error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
