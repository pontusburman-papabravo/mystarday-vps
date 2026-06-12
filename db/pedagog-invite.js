/**
 * pedagog_invite query layer.
 * Owns: pedagog_invite CRUD, parent_child link management for pedagog invites.
 * Does NOT own: child table, parent table, family table.
 */

const db = require('../src/lib/db');
const { createNewsletterSubscription } = require('../src/lib/newsletter-subscribe');

/**
 * Create or find an existing (non-accepted) invite for this email in this family.
 * Idempotent: returns the existing token so duplicate sends hit the same invite.
 */
async function createInvite({ familyId, inviterParentId, email, inviteeName, childIds }) {
  // Check for existing non-accepted invite for this email in this family
  const existing = await db.query(
    `SELECT id, token FROM pedagog_invite
     WHERE family_id = $1 AND LOWER(email) = LOWER($2) AND accepted = false AND expires_at > NOW()
     LIMIT 1`,
    [familyId, email]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0]; // reuse existing token
  }

  // Create new invite — token generated here (no DEFAULT in schema)
  const result = await db.query(
    `INSERT INTO pedagog_invite (family_id, inviter_parent_id, email, invitee_name, child_ids, token)
     VALUES ($1, $2, $3, $4, $5, gen_random_uuid()::text)
     RETURNING id, token`,
    [familyId, inviterParentId, email.toLowerCase().trim(), inviteeName || null, childIds || []]
  );
  return result.rows[0];
}

/**
 * Get invite by token (public — no auth).
 */
async function getInviteByToken(token) {
  const result = await db.query(
    `SELECT pi.id, pi.family_id, pi.email, pi.invitee_name, pi.child_ids,
            pi.expires_at, pi.accepted, pi.accepted_at, pi.created_at,
            p.name AS inviter_name,
            f.name AS family_name
     FROM pedagog_invite pi
     JOIN parent p ON p.id = pi.inviter_parent_id
     JOIN family f ON f.id = pi.family_id
     WHERE pi.token = $1`,
    [token]
  );
  return result.rows[0] || null;
}

/**
 * Get children in an invite (for display on accept page).
 */
async function getInviteChildren(childIds) {
  if (!childIds || childIds.length === 0) return [];
  const result = await db.query(
    'SELECT id, name, emoji FROM child WHERE id = ANY($1)',
    [childIds]
  );
  return result.rows;
}

/**
 * Accept an invite for an existing logged-in parent.
 * - If link already exists (revoked): un-revoke it
 * - If link doesn't exist: INSERT ON CONFLICT DO NOTHING
 * - Primary/shared links are never mutated by pedagog invites
 */
async function acceptExistingParent({ pedagogParentId, inviteId, token }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Re-accept: update revoked_at=NULL for existing pedagog links
    const inviteResult = await client.query(
      'SELECT child_ids, family_id FROM pedagog_invite WHERE id = $1 AND token = $2',
      [inviteId, token]
    );
    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Inbjudan hittades inte' };
    }

    const { child_ids } = inviteResult.rows[0];

    // Un-revoke any previously revoked pedagog links
    if (child_ids && child_ids.length > 0) {
      await client.query(
        `UPDATE parent_child
         SET revoked_at = NULL, revoked_by = NULL, connected_at = NOW()
         WHERE parent_id = $1 AND child_id = ANY($2) AND role = 'pedagog' AND revoked_at IS NOT NULL`,
        [pedagogParentId, child_ids]
      );
    }

    // Insert new links (ON CONFLICT DO UPDATE SET connected_at for re-accept)
    if (child_ids && child_ids.length > 0) {
      for (const childId of child_ids) {
        await client.query(
          `INSERT INTO parent_child (parent_id, child_id, role, connected_at)
           VALUES ($1, $2, 'pedagog', NOW())
           ON CONFLICT (parent_id, child_id) WHERE role = 'pedagog'
           DO UPDATE SET connected_at = NOW()`,
          [pedagogParentId, childId]
        );
      }
    }

    // Mark invite accepted
    await client.query(
      `UPDATE pedagog_invite SET accepted = true, accepted_at = NOW()
       WHERE id = $1`,
      [inviteId]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Accept an invite by creating a new parent account.
 * Creates a minimal "pedagog family" for the educator.
 * Calls syncAccountType() after to set account_type='educator'.
 */
async function acceptNewParent({ token, password, inviteId }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Look up invite
    const inviteResult = await client.query(
      `SELECT pi.id, pi.family_id, pi.email, pi.invitee_name, pi.child_ids, pi.expires_at, pi.accepted,
              f.name AS family_name
       FROM pedagog_invite pi
       JOIN family f ON f.id = pi.family_id
       WHERE pi.id = $1 AND pi.token = $2`,
      [inviteId, token]
    );
    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Inbjudan hittades inte' };
    }

    const invite = inviteResult.rows[0];

    if (invite.accepted) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Inbjudan har redan accepterats' };
    }
    if (new Date(invite.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Inbjudan/länken har gått ut' };
    }

    const normalizedEmail = invite.email.toLowerCase().trim();

    // Check if email already exists
    const existingParent = await client.query(
      'SELECT id FROM parent WHERE LOWER(email) = $1',
      [normalizedEmail]
    );
    if (existingParent.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Det finns redan ett konto med denna e-post. Logga in och acceptera inbjudan istället.' };
    }

    // Hash password
    const { hashPassword } = require('../src/lib/hash');
    const passwordHash = await hashPassword(password);
    const parentName = invite.invitee_name || normalizedEmail.split('@')[0];

    // Create new parent in the family's family_id (educator joins the family's world)
    const newParentResult = await client.query(
      `INSERT INTO parent (family_id, email, password_hash, name, verified, is_admin, onboarding_completed, account_type)
       VALUES ($1, $2, $3, $4, true, false, true, 'educator')
       RETURNING id, email, name`,
      [invite.family_id, normalizedEmail, passwordHash, parentName]
    );
    const newParent = newParentResult.rows[0];

    // Create notification preferences
    await client.query(
      'INSERT INTO notification_preference (parent_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [newParent.id]
    );

    await createNewsletterSubscription(client, newParent.id, normalizedEmail);

    // Link pedagogen to invited children (role='pedagog')
    if (invite.child_ids && invite.child_ids.length > 0) {
      for (const childId of invite.child_ids) {
        await client.query(
          `INSERT INTO parent_child (parent_id, child_id, role, connected_at)
           VALUES ($1, $2, 'pedagog', NOW())
           ON CONFLICT (parent_id, child_id) WHERE role = 'pedagog'
           DO UPDATE SET connected_at = NOW()`,
          [newParent.id, childId]
        );
      }
    }

    // Mark invite accepted
    await client.query(
      `UPDATE pedagog_invite SET accepted = true, accepted_at = NOW() WHERE id = $1`,
      [inviteId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      newParent: {
        id: newParent.id,
        email: newParent.email,
        name: newParent.name,
        account_type: 'educator',
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * List active pedagog links (role='pedagog', revoked_at IS NULL) per child for a family.
 * Used by GET /api/family/invite-pedagog.
 */
async function listPedagogLinks(familyId) {
  const result = await db.query(
    `SELECT pc.parent_id, pc.child_id, pc.role, pc.revoked_at, pc.connected_at,
            p.email, p.name AS parent_name,
            c.name AS child_name, c.emoji AS child_emoji
     FROM parent_child pc
     JOIN parent p ON p.id = pc.parent_id
     JOIN child c ON c.id = pc.child_id
     WHERE c.family_id = $1 AND pc.role = 'pedagog' AND pc.revoked_at IS NULL
     ORDER BY c.sort_order ASC, p.name ASC`,
    [familyId]
  );
  return result.rows;
}

/**
 * List pending (non-accepted) invites for a family.
 */
async function listPendingInvites(familyId) {
  const result = await db.query(
    `SELECT pi.id, pi.email, pi.invitee_name, pi.child_ids, pi.token,
            pi.expires_at, pi.accepted, pi.created_at
     FROM pedagog_invite pi
     WHERE pi.family_id = $1 AND pi.accepted = false AND pi.expires_at > NOW()
     ORDER BY pi.created_at DESC`,
    [familyId]
  );
  return result.rows;
}

/**
 * Revoke (soft-delete) a pedagog invite (pending, not yet accepted).
 */
async function revokeInvite(inviteId, familyId) {
  const result = await db.query(
    `DELETE FROM pedagog_invite
     WHERE id = $1 AND family_id = $2 AND accepted = false
     RETURNING id`,
    [inviteId, familyId]
  );
  return result.rows[0] || null;
}

/**
 * Soft-revoke a parent_child link for a pedagogen.
 * Used by POST /api/family/pedagog-access/revoke.
 */
async function revokePedagogLink({ pedagogParentId, childId, revokerParentId }) {
  const result = await db.query(
    `UPDATE parent_child
     SET revoked_at = NOW(), revoked_by = $3
     WHERE parent_id = $1 AND child_id = $2 AND role = 'pedagog'`,
    [pedagogParentId, childId, revokerParentId]
  );
  return result.rowCount > 0 ? { parent_id: pedagogParentId, child_id: childId } : null;
}

module.exports = {
  createInvite,
  getInviteByToken,
  getInviteChildren,
  acceptExistingParent,
  acceptNewParent,
  listPedagogLinks,
  listPendingInvites,
  revokeInvite,
  revokePedagogLink,
};