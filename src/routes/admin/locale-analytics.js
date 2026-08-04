'use strict';

const express = require('express');
const db = require('../../lib/db');

const router = express.Router();

// GET /api/admin/locale-analytics
router.get('/locale-analytics', async (req, res) => {
  try {
    const localeFilter = req.query.locale;
    const countryFilter = req.query.country;
    const regionFilter = req.query.market_region;
    const params = [];
    const filters = [];

    if (localeFilter === 'sv-SE' || localeFilter === 'en-GB') {
      params.push(localeFilter);
      filters.push(`COALESCE(f.preferred_locale, 'sv-SE') = $${params.length}`);
    }
    if (countryFilter && /^[A-Z]{2}$/i.test(countryFilter)) {
      params.push(countryFilter.toUpperCase());
      filters.push(`COALESCE(f.country_code, 'SE') = $${params.length}`);
    }
    if (['EU', 'UK', 'US', 'OTHER'].includes(regionFilter)) {
      params.push(regionFilter);
      filters.push(`COALESCE(f.market_region, 'EU') = $${params.length}`);
    }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const distribution = await db.query(
      `SELECT COALESCE(f.preferred_locale, 'sv-SE') AS locale, COUNT(*)::int AS count
       FROM family f
       ${whereClause}
       GROUP BY 1
       ORDER BY count DESC`,
      params
    );

    const totalFamilies = distribution.rows.reduce((s, r) => s + r.count, 0);

    const byCountry = await db.query(
      `SELECT COALESCE(f.country_code, 'SE') AS country_code,
              COALESCE(f.market_region, 'EU') AS market_region,
              COUNT(*)::int AS count
       FROM family f
       ${whereClause}
       GROUP BY 1, 2
       ORDER BY count DESC`,
      params
    );

    const byRegion = await db.query(
      `SELECT COALESCE(f.market_region, 'EU') AS market_region, COUNT(*)::int AS count
       FROM family f
       ${whereClause}
       GROUP BY 1
       ORDER BY count DESC`,
      params
    );

    const registrationsByDay = await db.query(
      `SELECT DATE(f.created_at) AS day,
              COALESCE(f.preferred_locale, 'sv-SE') AS locale,
              COALESCE(f.country_code, 'SE') AS country_code,
              COUNT(*)::int AS count
       FROM family f
       WHERE f.created_at >= NOW() - INTERVAL '30 days'
       ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
       GROUP BY 1, 2, 3
       ORDER BY day DESC`,
      params
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

    const gateFlags = await db.query(
      `SELECT key, enabled FROM feature_flag
       WHERE key LIKE 'market_%_open' OR key = 'english_language_offer'
          OR key = 'english_app_global_enabled'
       ORDER BY key`
    );

    res.json({
      families_by_locale: distribution.rows.map((r) => ({
        locale: r.locale,
        count: r.count,
        percent: totalFamilies ? Math.round((r.count / totalFamilies) * 1000) / 10 : 0,
      })),
      families_by_country: byCountry.rows,
      families_by_market_region: byRegion.rows,
      registrations_last_30_days: registrationsByDay.rows,
      english_beta_offer_states: offerStates.rows,
      language_reports: languageReports.rows,
      locale_switches_sv_to_en: switches.rows[0]?.count || 0,
      locale_switches_en_to_sv: switchesBack.rows[0]?.count || 0,
      market_gate_flags: gateFlags.rows,
      total_families: totalFamilies,
      activation_per_locale_backlog: true,
    });
  } catch (err) {
    console.error('[ADMIN] locale-analytics error:', err);
    res.status(500).json({ error: 'Kunde inte hämta språkstatistik' });
  }
});

module.exports = router;
