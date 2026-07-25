'use strict';

const express = require('express');
const archiver = require('archiver');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { resolveCommunicationLocale } = require('../../lib/communication-locale');
const { t } = require('../../lib/i18n');

const router = express.Router();

// ─── In-memory rate limit: 1 export per 24h per parent ──
// Map<parentId, lastExportTimestamp>
const exportRateLimit = new Map();
const EXPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ─── Helper: convert array of objects to CSV string ─────
function toCsv(rows, locale = 'sv-SE') {
  if (!rows || rows.length === 0) return `${t(locale, 'api.export.noData')}\n`;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    // Wrap in quotes if contains comma, quote, or newline
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n') + '\n';
}

// ─── GET /api/account/export-data ───────────────────────
// GDPR: Export all family data as a ZIP of CSV files.
// Rate-limited to 1 request per 24h per parent.
router.get('/export-data', requireParent, async (req, res) => {
  const parentId = req.user.id;

  const localeRow = await db.query(
    `SELECT f.preferred_locale FROM parent p JOIN family f ON f.id = p.family_id WHERE p.id = $1`,
    [parentId]
  );
  const locale = resolveCommunicationLocale(localeRow.rows[0]?.preferred_locale);

  // Rate limit check
  const lastExport = exportRateLimit.get(parentId);
  if (lastExport && Date.now() - lastExport < EXPORT_COOLDOWN_MS) {
    const nextAllowed = new Date(lastExport + EXPORT_COOLDOWN_MS);
    const hoursLeft = Math.ceil((nextAllowed - Date.now()) / (1000 * 60 * 60));
    return res.status(429).json({
      error: t(locale, 'api.export.rateLimit', { hours: String(hoursLeft) }),
      next_allowed_at: nextAllowed.toISOString(),
    });
  }

  try {
    // Fetch parent + family info
    const parentRow = await db.query(
      `SELECT p.id, p.name, p.email, p.created_at, p.family_id,
              f.name AS family_name, f.timezone, f.preferred_locale
       FROM parent p JOIN family f ON f.id = p.family_id
       WHERE p.id = $1`,
      [parentId]
    );
    if (parentRow.rows.length === 0) {
      return res.status(404).json({ error: t(locale, 'api.export.notFound') });
    }
    const { family_id } = parentRow.rows[0];

    // ── Fetch all data ───────────────────────────────────
    const [childrenRes, weeklyItemsRes, rewardsRes, redemptionsRes,
           dailyLogsRes, dailyLogItemsRes, ratingsRes, manualStarsRes] = await Promise.all([
      // Children (anonymised IDs — we use child_id labels, not real UUIDs in export)
      db.query(
        `SELECT id AS barn_id, name AS namn, emoji, birthday AS fodelsedag,
                created_at AS skapad
         FROM child WHERE family_id = $1 ORDER BY created_at`,
        [family_id]
      ),
      // Weekly schedule items
      db.query(
        `SELECT c.name AS barn, ws.day_of_week AS veckodag,
                at2.name AS aktivitet, wsi.section, wsi.sort_order AS ordning,
                ws.created_at AS schema_skapad
         FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON wsi.weekly_schedule_id = ws.id
         JOIN child c ON ws.child_id = c.id
         JOIN activity_template at2 ON wsi.activity_template_id = at2.id
         WHERE c.family_id = $1
         ORDER BY c.name, ws.day_of_week, wsi.sort_order`,
        [family_id]
      ),
      // Rewards
      db.query(
        `SELECT name AS namn, icon, star_cost AS stjarnkostnad,
                is_active AS aktiv, created_at AS skapad
         FROM reward WHERE family_id = $1 ORDER BY created_at`,
        [family_id]
      ),
      // Reward redemptions
      db.query(
        `SELECT c.name AS barn, r.name AS beloning,
                COALESCE(rr.star_cost, r.star_cost) AS stjarnor,
                rr.redeemed_at AS inlost
         FROM reward_redemption rr
         JOIN child c ON rr.child_id = c.id
         JOIN reward r ON rr.reward_id = r.id
         WHERE c.family_id = $1
         ORDER BY rr.redeemed_at DESC`,
        [family_id]
      ),
      // Daily log summary (per child per day)
      db.query(
        `SELECT c.name AS barn, dl.date AS datum,
                COALESCE(SUM(dli.star_value) FILTER (WHERE dli.completed), 0) AS totala_stjarnor,
                COUNT(*) FILTER (WHERE dli.completed) AS avbockade,
                COUNT(dli.id) AS totalt
         FROM daily_log dl
         JOIN child c ON dl.child_id = c.id
         LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
         WHERE c.family_id = $1
         GROUP BY c.name, dl.id, dl.date
         ORDER BY c.name, dl.date DESC`,
        [family_id]
      ),
      // Daily log items (activity completions)
      db.query(
        `SELECT c.name AS barn, dl.date AS datum, at2.name AS aktivitet,
                dli.completed AS avbockad, dli.star_value AS tjänade_stjärnor,
                dli.completed_at AS avbockad_kl, dli.section
         FROM daily_log_item dli
         JOIN daily_log dl ON dli.daily_log_id = dl.id
         JOIN child c ON dl.child_id = c.id
         LEFT JOIN activity_template at2 ON dli.activity_template_id = at2.id
         WHERE c.family_id = $1
         ORDER BY c.name, dl.date DESC, dli.section`,
        [family_id]
      ),
      // Ratings
      db.query(
        `SELECT c.name AS barn, dl.date AS datum, at2.name AS aktivitet,
                r.score AS betyg, r.user_type AS bedomare, r.comment AS kommentar,
                r.created_at AS registrerad
         FROM rating r
         JOIN daily_log_item dli ON r.daily_log_item_id = dli.id
         JOIN daily_log dl ON dli.daily_log_id = dl.id
         JOIN child c ON dl.child_id = c.id
         LEFT JOIN activity_template at2 ON dli.activity_template_id = at2.id
         WHERE c.family_id = $1
         ORDER BY r.created_at DESC`,
        [family_id]
      ),
      // Manual star grants
      db.query(
        `SELECT c.name AS barn, msg.star_count AS stjarnor,
                msg.reason AS anledning, msg.created_at AS datum
         FROM manual_star_grant msg
         JOIN child c ON msg.child_id = c.id
         WHERE c.family_id = $1
         ORDER BY msg.created_at DESC`,
        [family_id]
      ),
    ]);

    // Record export time now (before streaming, to prevent concurrent abuse)
    exportRateLimit.set(parentId, Date.now());

    // ── Build ZIP and stream to client ──────────────────
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="min-data-${new Date().toISOString().slice(0, 10)}.zip"`
    );

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('[ACCOUNT] Export archive error:', err);
      // Cannot change headers at this point; just destroy
      res.destroy();
    });
    archive.pipe(res);

    archive.append(toCsv(parentRow.rows.map(r => ({
      namn: r.namn || r.name,
      e_post: r.email,
      familjenamn: r.family_name,
      tidszon: r.timezone,
      registrerad: r.created_at,
    })), locale), { name: '01_profil.csv' });

    archive.append(toCsv(childrenRes.rows, locale), { name: '02_barn.csv' });
    archive.append(toCsv(weeklyItemsRes.rows, locale), { name: '03_scheman.csv' });
    archive.append(toCsv(rewardsRes.rows, locale), { name: '04_beloningar.csv' });
    archive.append(toCsv(redemptionsRes.rows, locale), { name: '05_inlosningar.csv' });
    archive.append(toCsv(dailyLogsRes.rows, locale), { name: '06_dagliga_loggar.csv' });
    archive.append(toCsv(dailyLogItemsRes.rows, locale), { name: '07_aktiviteter.csv' });
    archive.append(toCsv(ratingsRes.rows, locale), { name: '08_betygssattning.csv' });
    archive.append(toCsv(manualStarsRes.rows, locale), { name: '09_manuella_stjarnor.csv' });

    await archive.finalize();
  } catch (err) {
    console.error('[ACCOUNT] Export data error:', err);
    // Only send error response if headers not yet sent
    if (!res.headersSent) {
      res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
    }
  }
});

module.exports = router;
