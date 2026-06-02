/**
 * Full database SQL export (all public tables).
 * GET /api/admin/export/sql
 *
 * Requires admin session and MIGRATION_EXPORT_ENABLED=true.
 * Streams a .sql file (schema via pg_dump when available + INSERT data).
 */

const express = require('express');
const db = require('../../lib/db');
const {
  isDatabaseExportEnabled,
  streamFullDatabaseExport,
} = require('../../lib/full-database-export-sql');

const router = express.Router();

router.get('/export/sql', async (req, res) => {
  if (!isDatabaseExportEnabled()) {
    return res.status(503).json({
      error:
        'Database export is disabled. Set MIGRATION_EXPORT_ENABLED=true on the server.',
    });
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `stjarndag-full-export-${date}.sql`;

  try {
    await db.query(
      `INSERT INTO admin_audit_log (admin_id, target_family_id, action, metadata)
       VALUES ($1, NULL, 'full_database_sql_export', $2)`,
      [req.user.id, JSON.stringify({ ip: req.ip })]
    );
  } catch (logErr) {
    console.warn('[ADMIN] full database export audit log failed:', logErr.message);
  }

  res.setHeader('Content-Type', 'application/sql; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');

  const client = await db.getClient();
  let clientReleased = false;

  const releaseClient = () => {
    if (!clientReleased) {
      clientReleased = true;
      client.release();
    }
  };

  req.on('close', () => {
    if (!res.writableEnded) {
      console.warn('[ADMIN] full database export: client disconnected');
      releaseClient();
    }
  });

  const write = (text) =>
    new Promise((resolve, reject) => {
      if (res.writableEnded) return resolve();
      const ok = res.write(text, 'utf8');
      if (ok) resolve();
      else res.once('drain', resolve);
      res.once('error', reject);
    });

  try {
    console.log(`[ADMIN] full database SQL export started by ${req.user.id}`);

    const result = await streamFullDatabaseExport(client, write, {
      includeSchema: true,
      redactSensitive: true,
      onTableStart: (table) => {
        if (process.env.DEBUG_EXPORT) {
          console.log(`[ADMIN] export table: ${table}`);
        }
      },
      onTableDone: (table, stat) => {
        if (stat.error) {
          console.warn(`[ADMIN] export table ${table} failed:`, stat.error);
        }
      },
    });

    res.end();
    console.log(
      `[ADMIN] full database SQL export complete: ${result.tables} tables by ${req.user.id}`
    );
  } catch (err) {
    console.error('[ADMIN] full database export error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Export failed' });
    }
    try {
      await write(`\n-- Export aborted: ${err.message}\n`);
      res.end();
    } catch {
      res.destroy();
    }
  } finally {
    releaseClient();
  }
});

module.exports = router;
