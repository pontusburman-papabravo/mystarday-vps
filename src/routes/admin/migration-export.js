/**
 * Admin-triggered full family export (ZIP stream).
 * POST /api/admin/migration-export
 *
 * Requires:
 *   - Admin session (cookie)
 *   - X-CSRF-Token (from login response)
 *   - MIGRATION_EXPORT_ENABLED=true on server
 *   - X-Migration-Export-Secret matching MIGRATION_EXPORT_SECRET
 */

const express = require('express');
const archiver = require('archiver');
const db = require('../../lib/db');
const {
  appendFamiliesToArchive,
  isMigrationExportEnabled,
  verifyMigrationExportSecret,
} = require('../../lib/family-export');

const router = express.Router();

router.post('/migration-export', async (req, res) => {
  if (!isMigrationExportEnabled()) {
    return res.status(503).json({
      error: 'Migration export is disabled. Set MIGRATION_EXPORT_ENABLED=true on the server.',
    });
  }

  const secretCheck = verifyMigrationExportSecret(req);
  if (!secretCheck.ok) {
    return res.status(403).json({ error: secretCheck.error });
  }

  const familyId = typeof req.body?.familyId === 'string' ? req.body.familyId.trim() : null;
  const date = new Date().toISOString().slice(0, 10);

  try {
    await db.query(
      `INSERT INTO admin_audit_log (admin_id, target_family_id, action, metadata)
       VALUES ($1, $2, 'migration_export_start', $3)`,
      [
        req.user.id,
        familyId || null,
        JSON.stringify({ family_id: familyId || 'all', ip: req.ip }),
      ]
    );
  } catch (logErr) {
    console.warn('[ADMIN] migration export audit log failed:', logErr.message);
  }

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => {
    console.error('[ADMIN] migration-export archive error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Export failed while building archive' });
    } else {
      res.destroy();
    }
  });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="stjarndag-families-${date}.zip"`
  );
  archive.pipe(res);

  const query = (sql, params) => db.query(sql, params);

  try {
    console.log(
      `[ADMIN] migration-export started by ${req.user.id}` +
        (familyId ? ` family=${familyId}` : ' (all families)')
    );

    const { familyCount } = await appendFamiliesToArchive(query, archive, {
      familyId,
      onProgress: ({ index, total, familyId: fid }) => {
        if (index % 10 === 0 || index === total) {
          console.log(`[ADMIN] migration-export progress ${index}/${total} (${fid})`);
        }
      },
    });

    await archive.finalize();
    console.log(`[ADMIN] migration-export complete: ${familyCount} families`);
  } catch (err) {
    console.error('[ADMIN] migration-export error:', err);
    archive.abort();
    if (!res.headersSent) {
      const status = err.code === 'FAMILY_NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ error: err.message || 'Export failed' });
    }
    res.destroy();
  }
});

module.exports = router;
