// Family management: CRUD, invites, member management, archiving, deletion.
// Owns: families, parents, parent_child links, family_invite.
// Does NOT own: children (see child.js), rewards (see reward.js), schedules (see schedule.js).

const express = require('express');
const db = require('../../lib/db');
const { hashPassword, comparePassword } = require('../../lib/hash');
const crypto = require('crypto');
const { sendEmail } = require('../../lib/email');

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function guardParentId(id, res) {
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Ogiltigt parent-id' });
    return false;
  }
  return true;
}

// ─── GET /api/admin/families ──────────────────────────
router.get('/families', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT f.id, f.created_at, f.time_display_mode,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', p.id, 'email', p.email, 'verified', p.verified, 'locked', COALESCE(p.locked, false)))
          FILTER (WHERE p.id IS NOT NULL), '[]'
        ) as parents,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'emoji', c.emoji, 'username', c.username))
          FILTER (WHERE c.id IS NOT NULL), '[]'
        ) as children
      FROM family f
      LEFT JOIN parent p ON p.family_id = f.id
      LEFT JOIN child c ON c.family_id = f.id
      GROUP BY f.id
      ORDER BY f.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[ADMIN] Families error:', err);
    res.status(500).json({ error: 'Kunde inte hämta familjer' });
  }
});

// ─── GET /api/admin/families-grouped ──────────────────
// ?archived=true → show archived families; default → active only
router.get('/families-grouped', async (req, res) => {
  try {
    const showArchived = req.query.archived === 'true';
    const archiveFilter = showArchived
      ? 'WHERE f.archived_at IS NOT NULL'
      : 'WHERE f.archived_at IS NULL';

    const familyResult = await db.query(`
      SELECT f.id, f.name as family_name, f.created_at, f.archived_at,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', p.id, 'email', p.email, 'name', p.name,
          'verified', p.verified, 'is_admin', p.is_admin,
          'locked', COALESCE(p.locked, false), 'created_at', p.created_at,
          'hasPassword', p.password_hash IS NOT NULL,
          'hasAppleLinked', p.apple_user_id IS NOT NULL,
          'appleEmail', p.apple_email
        )) FILTER (WHERE p.id IS NOT NULL), '[]') as parents,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', c.id, 'name', c.name, 'emoji', c.emoji,
          'username', c.username, 'birthday', c.birthday, 'created_at', c.created_at
        )) FILTER (WHERE c.id IS NOT NULL), '[]') as children
      FROM family f
      LEFT JOIN parent p ON p.family_id = f.id
      LEFT JOIN child c ON c.family_id = f.id
      ${archiveFilter}
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `);

    res.json(familyResult.rows);
  } catch (err) {
    console.error('[ADMIN] Families grouped error:', err);
    res.status(500).json({ error: 'Kunde inte hämta familjer' });
  }
});

// ─── PUT /api/admin/families/:id/name ───────────────────
router.put('/families/:id/name', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Familjenamn krävs' });
    }
    const trimmedName = name.trim();

    // Check for duplicate family name (excluding this family)
    const existing = await db.query(
      'SELECT id FROM family WHERE LOWER(name) = LOWER($1) AND id != $2',
      [trimmedName, req.params.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'En familj med detta namn finns redan' });
    }

    const result = await db.query(
      'UPDATE family SET name = $1 WHERE id = $2 RETURNING id, name',
      [trimmedName, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Familjen hittades inte' });
    }
    res.json({ message: 'Familjenamn uppdaterat', family: result.rows[0] });
  } catch (err) {
    console.error('[ADMIN] Update family name error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera familjenamn' });
  }
});

// ─── PUT /api/admin/families/:id/archive ─────────────────
router.put('/families/:id/archive', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE family SET archived_at = NOW() WHERE id = $1 AND archived_at IS NULL RETURNING id, name',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Familjen hittades inte eller är redan arkiverad' });
    }
    console.log(`[ADMIN] Family ${req.params.id} archived by admin ${req.user.id}`);
    res.json({ message: 'Familjen har arkiverats', family: result.rows[0] });
  } catch (err) {
    console.error('[ADMIN] Archive family error:', err);
    res.status(500).json({ error: 'Kunde inte arkivera familjen' });
  }
});

// ─── PUT /api/admin/families/:id/restore ─────────────────
router.put('/families/:id/restore', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE family SET archived_at = NULL WHERE id = $1 AND archived_at IS NOT NULL RETURNING id, name',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Familjen hittades inte eller är inte arkiverad' });
    }
    console.log(`[ADMIN] Family ${req.params.id} restored by admin ${req.user.id}`);
    res.json({ message: 'Familjen har återställts', family: result.rows[0] });
  } catch (err) {
    console.error('[ADMIN] Restore family error:', err);
    res.status(500).json({ error: 'Kunde inte återställa familjen' });
  }
});

// ─── DELETE /api/admin/families/:id ──────────────────────
// Hard cascade delete — GDPR compliant, no data remains
router.delete('/families/:id', async (req, res) => {
  const client = await db.getClient();
  try {
    const familyId = req.params.id;

    await client.query('BEGIN');

    // Verify family exists
    const fam = await client.query('SELECT id, name FROM family WHERE id = $1', [familyId]);
    if (fam.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Familjen hittades inte' });
    }
    const familyName = fam.rows[0].name || familyId;

    // Delete all children and their dependent data
    const children = await client.query('SELECT id FROM child WHERE family_id = $1', [familyId]);
    for (const child of children.rows) {
      await client.query('DELETE FROM parent_note WHERE child_id = $1', [child.id]);
      await client.query('DELETE FROM streak WHERE child_id = $1', [child.id]);
      await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [child.id]);
      // Delete ratings → daily_log_items → daily_logs (respecting FK order)
      await client.query(
        `DELETE FROM rating WHERE daily_log_item_id IN (
           SELECT dli.id FROM daily_log_item dli
           JOIN daily_log dl ON dl.id = dli.daily_log_id
           WHERE dl.child_id = $1
         )`, [child.id]);
      await client.query(
        `DELETE FROM daily_log_item WHERE daily_log_id IN (
           SELECT id FROM daily_log WHERE child_id = $1
         )`, [child.id]);
      await client.query('DELETE FROM daily_log WHERE child_id = $1', [child.id]);
      // Delete weekly_schedule_items → weekly_schedules
      await client.query(
        `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
           SELECT id FROM weekly_schedule WHERE child_id = $1
         )`, [child.id]);
      await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [child.id]);
    }

    // Delete parent_child BEFORE children (FK: parent_child.child_id → child.id)
    await client.query(
      `DELETE FROM parent_child WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
    await client.query('DELETE FROM child WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM reward WHERE family_id = $1', [familyId]);

    // Delete all parents and their dependent data
    const parents = await client.query('SELECT id FROM parent WHERE family_id = $1', [familyId]);
    for (const parent of parents.rows) {
      await client.query('DELETE FROM notification_preference WHERE parent_id = $1', [parent.id]);
      await client.query('DELETE FROM email_verification WHERE parent_id = $1', [parent.id]);
      await client.query('DELETE FROM password_reset WHERE parent_id = $1', [parent.id]);
    }
    await client.query('DELETE FROM parent WHERE family_id = $1', [familyId]);

    // Delete family-level data: activity_templates → categories (FK order), invites
    await client.query('DELETE FROM activity_template WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM category WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM family_invite WHERE family_id = $1', [familyId]);

    // Finally delete the family
    await client.query('DELETE FROM family WHERE id = $1', [familyId]);

    await client.query('COMMIT');
    console.log(`[ADMIN] Family "${familyName}" (${familyId}) permanently deleted by admin ${req.user.id}`);
    res.json({ message: `Familjen "${familyName}" har tagits bort permanent` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ADMIN] Delete family error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort familjen' });
  } finally {
    client.release();
  }
});

// ─── PUT /api/admin/parents/:id/admin ────────────────────
// Toggle is_admin status for a parent account
router.put('/parents/:id/admin', async (req, res) => {
  try {
    const { id } = req.params;
    if (!guardParentId(id, res)) return;
    // Prevent self-demotion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Du kan inte ta bort dina egna admin-rättigheter' });
    }
    const result = await db.query(
      'UPDATE parent SET is_admin = NOT is_admin WHERE id = $1 RETURNING id, email, is_admin',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Förälder hittades inte' });
    }
    const p = result.rows[0];
    console.log(`[ADMIN] Admin toggle for ${p.email}: now is_admin=${p.is_admin} by admin ${req.user.id}`);
    res.json({ message: p.is_admin ? 'Admin-rättigheter tilldelade' : 'Admin-rättigheter borttagna', is_admin: p.is_admin });
  } catch (err) {
    console.error('[ADMIN] Toggle admin error:', err);
    res.status(500).json({ error: 'Kunde inte ändra admin-rättigheter' });
  }
});

// ─── PUT /api/admin/approve-parent/:id ──────────────────
router.put('/approve-parent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!guardParentId(id, res)) return;
    const result = await db.query(
      'UPDATE parent SET verified = true WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Förälder hittades inte' });
    }
    res.json({ message: 'Kontot har godkänts' });
  } catch (err) {
    console.error('[ADMIN] Approve parent error:', err);
    res.status(500).json({ error: 'Kunde inte godkänna konto' });
  }
});

// ─── PUT /api/admin/lock-parent/:id ──────────────────────
router.put('/lock-parent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!guardParentId(id, res)) return;
    const result = await db.query(
      'UPDATE parent SET locked = true WHERE id = $1 AND is_admin = false RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Förälder hittades inte eller är admin' });
    }
    res.json({ message: 'Kontot har låsts' });
  } catch (err) {
    console.error('[ADMIN] Lock parent error:', err);
    res.status(500).json({ error: 'Kunde inte låsa konto' });
  }
});

// ─── PUT /api/admin/unlock-parent/:id ────────────────────
router.put('/unlock-parent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!guardParentId(id, res)) return;
    const result = await db.query(
      'UPDATE parent SET locked = false WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Förälder hittades inte' });
    }
    res.json({ message: 'Kontot har låsts upp' });
  } catch (err) {
    console.error('[ADMIN] Unlock parent error:', err);
    res.status(500).json({ error: 'Kunde inte låsa upp konto' });
  }
});

// ─── POST /api/admin/create-admin ────────────────────────
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-post och lösenord krävs' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Lösenordet måste vara minst 8 tecken' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await db.query(
      'SELECT id FROM parent WHERE LOWER(email) = $1',
      [normalizedEmail]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'E-postadressen är redan registrerad' });
    }

    const passwordHash = await hashPassword(password);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Create family for admin
      const familyResult = await client.query(
        'INSERT INTO family DEFAULT VALUES RETURNING id'
      );
      const familyId = familyResult.rows[0].id;

      // Create admin parent (verified + is_admin)
      const parentResult = await client.query(
        `INSERT INTO parent (family_id, email, password_hash, verified, is_admin, name)
         VALUES ($1, $2, $3, true, true, $4)
         RETURNING id, email, name, is_admin, verified`,
        [familyId, normalizedEmail, passwordHash, name || null]
      );

      await client.query('COMMIT');

      console.log(`[ADMIN] New admin created: ${normalizedEmail} by admin ${req.user.id}`);
      res.status(201).json({
        message: `Admin-konto skapat för ${normalizedEmail}`,
        admin: parentResult.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[ADMIN] Create admin error:', err);
    res.status(500).json({ error: 'Kunde inte skapa admin-konto' });
  }
});

// ─── PUT /api/admin/parents/:id/email ────────────────────
// Admin changes a parent's email address. Requires reason (min 10 chars).
// Notifies both old and new address. Logs to admin_audit_log.
router.put('/parents/:id/email', async (req, res) => {
  try {
    const { id } = req.params;
    if (!guardParentId(id, res)) return;

    const { newEmail, reason } = req.body;
    if (!newEmail || typeof newEmail !== 'string' || newEmail.trim().length === 0) {
      return res.status(400).json({ error: 'Ny e-postadress krävs' });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Ange en orsak (minst 10 tecken)' });
    }

    // Check email not already in use
    const existing = await db.query(
      'SELECT id FROM parent WHERE LOWER(email) = LOWER($1) AND id != $2',
      [newEmail.trim(), id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'E-postadressen används redan' });
    }

    // Get current email for notification
    const parentResult = await db.query(
      'SELECT id, email, name, family_id FROM parent WHERE id = $1',
      [id]
    );
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Förälder hittades inte' });
    }
    const parent = parentResult.rows[0];
    const oldEmail = parent.email;
    const trimmedEmail = newEmail.trim().toLowerCase();

    await db.query('UPDATE parent SET email = $1 WHERE id = $2', [trimmedEmail, id]);

    // Notify both addresses
    await sendEmail({
      to: oldEmail,
      subject: 'Din e-postadress på Min Stjärndag har ändrats',
      html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">E-postadress ändrad</h2>
        <p>Din e-postadress på Min Stjärndag har ändrats av en administratör.</p>
        <p><strong>Ny adress:</strong> ${trimmedEmail}</p>
        <p>Om du inte känner igen denna ändring, kontakta oss direkt.</p>
      </div>`,
    });
    await sendEmail({
      to: trimmedEmail,
      subject: 'Din e-postadress på Min Stjärndag har ändrats',
      html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">E-postadress bekräftad</h2>
        <p>Din e-postadress på Min Stjärndag har ändrats till denna adress.</p>
        <p>Du kan nu logga in med: ${trimmedEmail}</p>
      </div>`,
    });

    await db.query(
      `INSERT INTO admin_audit_log (admin_id, target_family_id, action, metadata)
       VALUES ($1, $2, 'admin_change_email', $3)`,
      [req.user.id, parent.family_id, JSON.stringify({
        target_parent_id: id,
        target_email: trimmedEmail,
        old_email: oldEmail,
        reason: reason.trim(),
      })]
    );

    console.log(`[ADMIN] Email changed for parent ${id}: ${oldEmail} → ${trimmedEmail} by admin ${req.user.id}`);
    res.json({ message: 'E-postadress uppdaterad', email: trimmedEmail });
  } catch (err) {
    console.error('[ADMIN] Change parent email error:', err);
    res.status(500).json({ error: 'Kunde inte ändra e-postadress' });
  }
});

// ─── DELETE /api/admin/parents/:id/apple-link ──────────────
// Admin forcibly unlinks Apple from a parent account. Requires reason + parent must have password.
router.delete('/parents/:id/apple-link', async (req, res) => {
  try {
    const { id } = req.params;
    if (!guardParentId(id, res)) return;

    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Ange en orsak' });
    }

    // Get parent info + check password exists
    const parentResult = await db.query(
      'SELECT id, email, name, family_id, password_hash IS NOT NULL as has_password, apple_user_id FROM parent WHERE id = $1',
      [id]
    );
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Förälder hittades inte' });
    }
    const parent = parentResult.rows[0];

    if (!parent.has_password) {
      return res.status(400).json({
        error: 'Föräldern måste ha ett lösenord innan Apple kan kopplas bort. Återställ lösenordet först.',
      });
    }

    if (!parent.apple_user_id) {
      return res.status(400).json({ error: 'Ingen Apple-link att ta bort' });
    }

    await db.query(
      'UPDATE parent SET apple_user_id = NULL, apple_email = NULL WHERE id = $1',
      [id]
    );

    await db.query(
      `INSERT INTO admin_audit_log (admin_id, target_family_id, action, metadata)
       VALUES ($1, $2, 'admin_unlink_apple', $3)`,
      [req.user.id, parent.family_id, JSON.stringify({
        target_parent_id: id,
        target_email: parent.email,
        reason: reason.trim(),
      })]
    );

    console.log(`[ADMIN] Apple unlinked for parent ${id} (${parent.email}) by admin ${req.user.id}`);
    res.json({ message: 'Apple-konto har kopplats bort' });
  } catch (err) {
    console.error('[ADMIN] Admin unlink Apple error:', err);
    res.status(500).json({ error: 'Kunde inte koppla bort Apple' });
  }
});

// ─── GET /api/admin/families/:familyId/audit-log ──────────
// Returns the 20 most recent admin audit log entries for a family.
// Covers: admin_reset_password, admin_change_email, admin_unlink_apple, impersonate_start
router.get('/families/:familyId/audit-log', async (req, res) => {
  try {
    const { familyId } = req.params;
    if (!UUID_RE.test(familyId)) {
      return res.status(400).json({ error: 'Ogiltigt family-id' });
    }

    const result = await db.query(`
      SELECT aal.id, aal.action, aal.metadata, aal.created_at,
             p.email as admin_email
      FROM admin_audit_log aal
      LEFT JOIN parent p ON p.id = aal.admin_id
      WHERE aal.target_family_id = $1
        AND aal.action IN ('admin_reset_password', 'admin_change_email', 'admin_unlink_apple', 'impersonate_start')
      ORDER BY aal.created_at DESC
      LIMIT 20
    `, [familyId]);

    res.json(result.rows);
  } catch (err) {
    console.error('[ADMIN] Audit log error:', err);
    res.status(500).json({ error: 'Kunde inte hämta audit-log' });
  }
});

// ─── PUT /api/admin/change-password ───────────────────────
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Nuvarande och nytt lösenord krävs' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Lösenordet måste vara minst 8 tecken' });
    }

    const result = await db.query(
      'SELECT password_hash FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    const valid = await comparePassword(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Nuvarande lösenord är felaktigt' });
    }

    const newHash = await hashPassword(newPassword);
    await db.query(
      'UPDATE parent SET password_hash = $1 WHERE id = $2',
      [newHash, req.user.id]
    );

    res.json({ message: 'Lösenordet har ändrats!' });
  } catch (err) {
    console.error('[ADMIN] Change password error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/admin/reset-parent-password/:id ───────────
router.put('/reset-parent-password/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find parent — newPassword from body is intentionally ignored; always generate random
    const parentResult = await db.query(
      'SELECT id, email, family_id, password_hash IS NOT NULL as had_password, apple_user_id IS NOT NULL as had_apple_linked FROM parent WHERE id = $1',
      [id]
    );
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Föräldern hittades inte' });
    }
    const parent = parentResult.rows[0];

    // Generate a cryptographically random password — never predictable, never logged
    const password = crypto.randomBytes(16).toString('base64url');
    const passwordHash = await hashPassword(password);
    await db.query('UPDATE parent SET password_hash = $1 WHERE id = $2', [passwordHash, id]);

    // Send the new password to the parent's email — do NOT include it in the API response
    await sendEmail({
      to: parent.email,
      subject: 'Ditt lösenord på Min Stjärndag har återställts',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1B2340;">Lösenord återställt</h2>
          <p>En administratör har återställt ditt lösenord på Min Stjärndag.</p>
          <p>Ditt nya tillfälliga lösenord är:</p>
          <div style="background: #F5F5F5; border-radius: 8px; padding: 12px 20px; font-family: monospace; font-size: 18px; letter-spacing: 1px; margin: 16px 0;">
            ${password}
          </div>
          <p>Logga in och byt lösenord så snart som möjligt under Inställningar.</p>
        </div>
      `,
    });

    await db.query(
      `INSERT INTO admin_audit_log (admin_id, target_family_id, action, metadata)
       VALUES ($1, $2, 'admin_reset_password', $3)`,
      [req.user.id, parent.family_id, JSON.stringify({
        target_parent_id: id,
        target_email: parent.email,
        had_password_before: parent.had_password,
        had_apple_linked: parent.had_apple_linked,
      })]
    );

    console.log(`[ADMIN] Password reset for ${parent.email} by admin ${req.user.id}`);
    res.json({ success: true, message: 'Lösenord skickat via e-post' });
  } catch (err) {
    console.error('[ADMIN] Reset password error:', err.message);
    res.status(500).json({ error: 'Kunde inte återställa lösenordet' });
  }
});

// ─── DELETE /api/admin/account/:type/:id ─────────────────
// type = 'parent' | 'child'
router.delete('/account/:type/:id', async (req, res) => {
  const client = await db.getClient();
  try {
    const { type, id } = req.params;
    if (!['parent', 'child'].includes(type)) {
      return res.status(400).json({ error: 'Ogiltig kontotyp' });
    }

    await client.query('BEGIN');

    if (type === 'parent') {
      // Delete parent-related records (no ON DELETE CASCADE on these)
      await client.query('DELETE FROM notification_preference WHERE parent_id = $1', [id]);
      await client.query('DELETE FROM email_verification WHERE parent_id = $1', [id]);
      await client.query('DELETE FROM password_reset WHERE parent_id = $1', [id]);
      await client.query('DELETE FROM parent_child WHERE parent_id = $1', [id]);
      // Finally delete the parent account
      const result = await client.query(
        'DELETE FROM parent WHERE id = $1 RETURNING id, family_id',
        [id]
      );
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Förälder hittades inte' });
      }
      // If no parents remain in the family, also delete all children (and their
      // dependent records) so the FK constraint on child.family_id doesn't block
      // the family delete.
      const remaining = await client.query(
        'SELECT COUNT(*) as count FROM parent WHERE family_id = $1',
        [result.rows[0].family_id]
      );
      if (parseInt(remaining.rows[0].count) === 0) {
        const children = await client.query(
          'SELECT id FROM child WHERE family_id = $1',
          [result.rows[0].family_id]
        );
        for (const child of children.rows) {
          await client.query('DELETE FROM parent_note WHERE child_id = $1', [child.id]);
          await client.query('DELETE FROM streak WHERE child_id = $1', [child.id]);
          await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [child.id]);
          const logs = await client.query('SELECT id FROM daily_log WHERE child_id = $1', [child.id]);
          for (const log of logs.rows) {
            await client.query('DELETE FROM daily_log_item WHERE daily_log_id = $1', [log.id]);
          }
          await client.query('DELETE FROM daily_log WHERE child_id = $1', [child.id]);
          const schedules = await client.query('SELECT id FROM weekly_schedule WHERE child_id = $1', [child.id]);
          for (const sched of schedules.rows) {
            await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [sched.id]);
          }
          await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [child.id]);
          await client.query('DELETE FROM child WHERE id = $1', [child.id]);
        }
        await client.query('DELETE FROM family WHERE id = $1', [result.rows[0].family_id]);
      }
    } else {
      // Child: delete child-related records first (no ON DELETE CASCADE)
      await client.query('DELETE FROM parent_note WHERE child_id = $1', [id]);
      await client.query('DELETE FROM streak WHERE child_id = $1', [id]);
      await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [id]);
      // Get daily logs first
      const logs = await client.query('SELECT id FROM daily_log WHERE child_id = $1', [id]);
      for (const log of logs.rows) {
        await client.query('DELETE FROM daily_log_item WHERE daily_log_id = $1', [log.id]);
      }
      await client.query('DELETE FROM daily_log WHERE child_id = $1', [id]);
      // Get weekly schedules first
      const schedules = await client.query('SELECT id FROM weekly_schedule WHERE child_id = $1', [id]);
      for (const sched of schedules.rows) {
        await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [sched.id]);
      }
      await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [id]);
      // Finally delete the child
      const result = await client.query(
        'DELETE FROM child WHERE id = $1 RETURNING id',
        [id]
      );
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Barn hittades inte' });
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Kontot har tagits bort' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ADMIN] Delete account error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort konto' });
  } finally {
    client.release();
  }
});

// ─── POST /api/admin/impersonate/:familyId ────────────────
// Returns a short-lived (15 min) read-only impersonation token for admin support.
// Logs the session to admin_audit_log for full audit trail.
router.post('/impersonate/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;

    // Verify family exists and is not archived
    const familyResult = await db.query(
      "SELECT id, name FROM family WHERE id = $1 AND archived_at IS NULL",
      [familyId]
    );
    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Familjen hittades inte' });
    }
    const family = familyResult.rows[0];

    // Get a parent from this family to impersonate (first primary parent)
    const parentResult = await db.query(
      "SELECT p.id, p.email, p.name FROM parent p WHERE p.family_id = $1 AND p.is_admin = false ORDER BY p.created_at ASC LIMIT 1",
      [familyId]
    );

    const parentId = parentResult.rows.length > 0 ? parentResult.rows[0].id : null;
    const parentEmail = parentResult.rows.length > 0 ? parentResult.rows[0].email : null;

    // Mint a 15-minute impersonation JWT
    const jwt = require('jsonwebtoken');
    const config = require('../../lib/config');
    const token = jwt.sign(
      {
        id: parentId || req.user.id,
        type: 'parent',
        familyId: familyId,
        email: parentEmail,
        isImpersonation: true,
        impersonatedBy: req.user.id,
        familyName: family.name || 'Namnlös familj',
      },
      config.jwt.secret,
      { expiresIn: '15m' }
    );

    // Audit log: record impersonation session start
    await db.query(
      `INSERT INTO admin_audit_log (admin_id, target_family_id, action, metadata)
       VALUES ($1, $2, 'impersonate_start', $3)`,
      [
        req.user.id,
        familyId,
        JSON.stringify({
          family_name: family.name,
          target_parent_id: parentId,
          target_email: parentEmail,
        }),
      ]
    );

    console.log(`[ADMIN] Impersonation started: admin ${req.user.id} → family ${familyId} (${family.name})`);

    res.json({
      token,
      familyId,
      familyName: family.name || 'Namnlös familj',
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (err) {
    console.error('[ADMIN] Impersonate error:', err);
    res.status(500).json({ error: 'Kunde inte starta support-läge' });
  }
});

module.exports = router;
