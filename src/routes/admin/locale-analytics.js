'use strict';

const express = require('express');
const db = require('../../lib/db');

const router = express.Router();

// GET /api/admin/locale-analytics
router.get('/locale-analytics', async (req, res) => {
  try {
    const localeFilter = req.query.locale;
    const params = [];
    let localeWhere = '';
    if (localeFilter === 'sv-SE' || localeFilter === 'en-GB') {
      localeWhere = 'WHERE COALESCE(f.preferred_locale, \'sv-SE\') = $1';
      params.push(localeFilter);
    }

    const distribution = await db.query(
      `SELECT COALESCE(f.preferred_locale, 'sv-SE') AS locale, COUNT(*)::int AS count
       FROM family f
       ${localeWhere}
       GROUP BY 1
       ORDER BY count DESC`,
      params
    );

    const totalFamilies = distribution.rows.reduce((s, r) => s + r.count, 0);

    const registrationsByDay = await db.query(
      `SELECT DATE(f.created_at) AS day,
              COALESCE(f.preferred_locale, 'sv-SE') AS locale,
              COUNT(*)::int AS count
       FROM family f
       WHERE f.created_at >= NOW() - INTERVAL '30 days'
       ${localeFilter ? 'AND COALESCE(f.preferred_locale, \'sv-SE\') = $1' : ''}
       GROUP BY 1, 2
       ORDER BY day DESC`,
      localeFilter ? [localeFilter] : []
    );

    const offerStates = await db.query(
      `SELECT english_beta_offer_state AS state, COUNT(*)::int AS count
       FROM family
       GROUP BY 1
       ORDER BY count DESC`
    );

    const languageReports = await db.query(
      `SELECT COALESCE(metadata->>'locale', 'unknown') AS locale,
              COALESCE(metadata->>'platform', 'unknown') AS platform,
              COALESCE(metadata->>'route', 'unknown') AS route,
              COUNT(*)::int AS count
       FROM contact_message
       WHERE message_type = 'language'
       GROUP BY 1, 2, 3
       ORDER BY count DESC
       LIMIT 50`
    );

    const switches = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM family
       WHERE previous_locale IS NOT NULL
         AND preferred_locale = 'en-GB'
         AND previous_locale = 'sv-SE'`
    );

    const switchesBack = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM family
       WHERE previous_locale = 'en-GB'
         AND preferred_locale = 'sv-SE'`
    );

    res.json({
      families_by_locale: distribution.rows.map((r) => ({
        locale: r.locale,
        count: r.count,
        percent: totalFamilies ? Math.round((r.count / totalFamilies) * 1000) / 10 : 0,
      })),
      registrations_last_30_days: registrationsByDay.rows,
      english_beta_offer_states: offerStates.rows,
      language_reports: languageReports.rows,
      locale_switches_sv_to_en: switches.rows[0]?.count || 0,
      locale_switches_en_to_sv: switchesBack.rows[0]?.count || 0,
      total_families: totalFamilies,
    });
  } catch (err) {
    console.error('[ADMIN] locale-analytics error:', err);
    res.status(500).json({ error: 'Kunde inte hämta språkstatistik' });
  }
});

module.exports = router;
