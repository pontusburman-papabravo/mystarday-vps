// System administration: stats, app configuration, feature flags, contact messages, push notifications, system messages.
// Owns: stats, feature-flags, release-readiness, app-config, contact-messages, system-messages, push, login-stats.
// Does NOT own: app-mode, families (see family.js), children (see child.js), activities (see schedule.js), rewards (see reward.js).

const express = require('express');
const db = require('../../lib/db');
const contactMessages = require('../../../db/contact-messages');

const router = express.Router();

function familyActivityScore(family) {
  const parentScore = (family.parents || []).reduce((sum, u) => sum + (u.logins || 0), 0);
  const childScore = (family.children || []).reduce(
    (sum, u) => sum + (u.logins || 0) + (u.completions || 0),
    0
  );
  return parentScore + childScore;
}

// ─── GET /api/admin/stats ─────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [families, parents, children, messageCounts, totalMessages] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM family WHERE archived_at IS NULL'),
      db.query('SELECT COUNT(*) as count FROM parent'),
      db.query('SELECT COUNT(*) as count FROM child'),
      contactMessages.getMessageCounts(),
      db.query('SELECT COUNT(*) as count FROM contact_message'),
    ]);
    const counts = messageCounts || {};

    res.json({
      families: parseInt(families.rows[0].count),
      parents: parseInt(parents.rows[0].count),
      children: parseInt(children.rows[0].count),
      unreadMessages: parseInt(counts.meddelanden_unread_count, 10) || 0,
      openIncidents: parseInt(counts.incidenter_open_count, 10) || 0,
      totalMessages: parseInt(totalMessages.rows[0].count),
    });
  } catch (err) {
    console.error('[ADMIN] Stats error:', err);
    res.status(500).json({ error: 'Kunde inte hämta statistik' });
  }
});

// ─── GET /api/admin/overview-stats ────────────────────────
// Period-scoped growth + activity metrics for admin overview (not just logins).
// Query: ?period=24h|7d|30d|365d (default 7d)
router.get('/overview-stats', async (req, res) => {
  try {
    const PERIOD_MAP = { '24h': '24 hours', '7d': '7 days', '30d': '30 days', '365d': '365 days' };
    const periodKey = req.query.period && PERIOD_MAP[req.query.period] ? req.query.period : '7d';
    const interval = PERIOD_MAP[periodKey];

    const [newCounts, activeCounts, loginCounts, activityCounts, familiesResult] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM family WHERE archived_at IS NULL AND created_at >= NOW() - $1::interval) AS families,
          (SELECT COUNT(*)::int FROM parent WHERE is_admin = false AND created_at >= NOW() - $1::interval) AS parents,
          (SELECT COUNT(*)::int FROM child WHERE created_at >= NOW() - $1::interval) AS children
      `, [interval]),
      db.query(`
        WITH since AS (SELECT NOW() - $1::interval AS t),
        active_families AS (
          SELECT DISTINCT family_id FROM (
            SELECT c.family_id
            FROM daily_log_item dli
            JOIN daily_log dl ON dl.id = dli.daily_log_id
            JOIN child c ON c.id = dl.child_id
            CROSS JOIN since
            WHERE dli.completed = true AND dli.completed_at >= since.t
            UNION
            SELECT le.family_id FROM login_event le CROSS JOIN since WHERE le.occurred_at >= since.t
            UNION
            SELECT ae.family_id FROM analytics_events ae CROSS JOIN since WHERE ae.created_at >= since.t
          ) x
        ),
        active_children AS (
          SELECT DISTINCT dl.child_id
          FROM daily_log_item dli
          JOIN daily_log dl ON dl.id = dli.daily_log_id
          CROSS JOIN since
          WHERE dli.completed = true AND dli.completed_at >= since.t
        ),
        active_parents AS (
          SELECT DISTINCT p.id
          FROM parent p
          CROSS JOIN since
          WHERE p.is_admin = false
            AND (
              EXISTS (
                SELECT 1 FROM login_event le
                WHERE le.user_id = p.id AND le.role = 'parent' AND le.occurred_at >= since.t
              )
              OR EXISTS (SELECT 1 FROM active_families af WHERE af.family_id = p.family_id)
            )
        )
        SELECT
          (SELECT COUNT(*)::int FROM active_families) AS families,
          (SELECT COUNT(*)::int FROM active_parents) AS parents,
          (SELECT COUNT(*)::int FROM active_children) AS children
      `, [interval]),
      db.query(`
        SELECT role, COUNT(*)::int AS total
        FROM login_event
        WHERE role IN ('parent', 'child')
          AND occurred_at >= NOW() - $1::interval
        GROUP BY role
      `, [interval]),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE dli.completed = true)::int AS completions,
          COALESCE(SUM(dli.star_value) FILTER (WHERE dli.completed = true), 0)::int AS stars,
          COUNT(*) FILTER (WHERE dli.completed = true AND dli.completed_by = 'child')::int AS child_self_completions,
          COUNT(DISTINCT dl.child_id) FILTER (
            WHERE dli.completed = true AND dli.completed_by = 'child'
          )::int AS child_self_unique
        FROM daily_log_item dli
        JOIN daily_log dl ON dl.id = dli.daily_log_id
        WHERE dli.completed = true
          AND dli.completed_at >= NOW() - $1::interval
      `, [interval]),
      db.query(`
        WITH since AS (SELECT NOW() - $1::interval AS t),
        parent_logins AS (
          SELECT le.user_id, COUNT(*)::int AS logins, MAX(le.occurred_at) AS last_login
          FROM login_event le CROSS JOIN since
          WHERE le.role = 'parent' AND le.occurred_at >= since.t
          GROUP BY le.user_id
        ),
        child_logins AS (
          SELECT le.user_id, COUNT(*)::int AS logins, MAX(le.occurred_at) AS last_login
          FROM login_event le CROSS JOIN since
          WHERE le.role = 'child' AND le.occurred_at >= since.t
          GROUP BY le.user_id
        ),
        child_completions AS (
          SELECT dl.child_id,
                 COUNT(*)::int AS completions,
                 COUNT(*) FILTER (WHERE dli.completed_by = 'child')::int AS self_completions,
                 COALESCE(SUM(dli.star_value), 0)::int AS stars,
                 MAX(dli.completed_at) AS last_activity
          FROM daily_log_item dli
          JOIN daily_log dl ON dl.id = dli.daily_log_id
          CROSS JOIN since
          WHERE dli.completed = true AND dli.completed_at >= since.t
          GROUP BY dl.child_id
        ),
        parent_family_activity AS (
          SELECT p.id AS parent_id, MAX(cc.last_activity) AS last_child_activity
          FROM parent p
          JOIN child c ON c.family_id = p.family_id
          LEFT JOIN child_completions cc ON cc.child_id = c.id
          GROUP BY p.id
        )
        SELECT
          f.id AS family_id,
          COALESCE(f.name, 'Namnlös familj') AS family_name,
          json_agg(DISTINCT jsonb_build_object(
            'id', p.id,
            'name', COALESCE(p.name, ''),
            'email', COALESCE(p.email, ''),
            'logins', COALESCE(pl.logins, 0),
            'completions', 0,
            'stars', 0,
            'last_activity', CASE
              WHEN pl.last_login IS NULL AND pfa.last_child_activity IS NULL THEN NULL
              ELSE GREATEST(COALESCE(pl.last_login, '-infinity'::timestamptz), COALESCE(pfa.last_child_activity, '-infinity'::timestamptz))
            END
          )) FILTER (WHERE p.id IS NOT NULL) AS parents,
          json_agg(DISTINCT jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'username', COALESCE(c.username, ''),
            'logins', COALESCE(cl.logins, 0),
            'completions', COALESCE(cc.completions, 0),
            'self_completions', COALESCE(cc.self_completions, 0),
            'stars', COALESCE(cc.stars, 0),
            'last_activity', CASE
              WHEN cl.last_login IS NULL AND cc.last_activity IS NULL THEN NULL
              ELSE GREATEST(COALESCE(cl.last_login, '-infinity'::timestamptz), COALESCE(cc.last_activity, '-infinity'::timestamptz))
            END
          )) FILTER (WHERE c.id IS NOT NULL) AS children
        FROM family f
        LEFT JOIN parent p ON p.family_id = f.id AND p.is_admin = false
        LEFT JOIN parent_logins pl ON pl.user_id = p.id
        LEFT JOIN parent_family_activity pfa ON pfa.parent_id = p.id
        LEFT JOIN child c ON c.family_id = f.id
        LEFT JOIN child_logins cl ON cl.user_id = c.id
        LEFT JOIN child_completions cc ON cc.child_id = c.id
        WHERE f.archived_at IS NULL
        GROUP BY f.id, f.name
        ORDER BY f.created_at DESC
      `, [interval]),
    ]);

    const logins = { parents: 0, children: 0 };
    for (const row of loginCounts.rows) {
      if (row.role === 'parent') logins.parents = row.total;
      if (row.role === 'child') logins.children = row.total;
    }

    res.json({
      period: periodKey,
      new: {
        families: newCounts.rows[0].families,
        parents: newCounts.rows[0].parents,
        children: newCounts.rows[0].children,
      },
      active: {
        families: activeCounts.rows[0].families,
        parents: activeCounts.rows[0].parents,
        children: activeCounts.rows[0].children,
      },
      logins,
      activity: {
        completions: activityCounts.rows[0].completions,
        stars: activityCounts.rows[0].stars,
        child_self: {
          unique_children: activityCounts.rows[0].child_self_unique,
          completions: activityCounts.rows[0].child_self_completions,
        },
      },
      families: familiesResult.rows
        .map(row => ({
          family_id: row.family_id,
          family_name: row.family_name,
          parents: (row.parents || []).map(p => ({
            ...p,
            logins: parseInt(p.logins, 10) || 0,
            completions: parseInt(p.completions, 10) || 0,
            stars: parseInt(p.stars, 10) || 0,
          })),
          children: (row.children || []).map(c => ({
            ...c,
            logins: parseInt(c.logins, 10) || 0,
            completions: parseInt(c.completions, 10) || 0,
            self_completions: parseInt(c.self_completions, 10) || 0,
            stars: parseInt(c.stars, 10) || 0,
          })),
        }))
        .sort((a, b) => familyActivityScore(b) - familyActivityScore(a)),
    });
  } catch (err) {
    console.error('[ADMIN] Overview stats error:', err);
    res.status(500).json({ error: 'Kunde inte hämta översiktsstatistik' });
  }
});

// ─── GET /api/admin/export-emails ─────────────────────────
// Exports all registered family emails as a CSV file
router.get('/export-emails', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.email, f.name as family_name, f.created_at
      FROM parent p
      JOIN family f ON f.id = p.family_id
      WHERE f.archived_at IS NULL
        AND p.email IS NOT NULL
        AND p.email != ''
      ORDER BY f.name ASC NULLS LAST, f.created_at ASC, p.email ASC
    `);

    const header = 'E-post,Familjenamn,Registreringsdatum\n';
    const rows = result.rows.map(r => {
      const date = new Date(r.created_at).toISOString().split('T')[0];
      const email = '"' + (r.email || '').replace(/"/g, '""') + '"';
      const familyName = '"' + (r.family_name || '').replace(/"/g, '""') + '"';
      return email + ',' + familyName + ',' + date;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=familjer-mailadresser.csv');
    res.send('\uFEFF' + header + rows);
  } catch (err) {
    console.error('[ADMIN] Export emails error:', err);
    res.status(500).json({ error: 'Kunde inte exportera mailadresser' });
  }
});

// ─── GET /api/admin/release-readiness ────────────────────
// Read-only effective kill-switch status for release gates. No secrets or raw env.
router.get('/release-readiness', async (req, res) => {
  try {
    const authzHardeningEnabled = process.env.AUTHZ_HARDENING_ENABLED !== 'false';
    const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';
    console.log(`[ADMIN] Release readiness read by admin ${req.user.id}`);
    res.json({ authzHardeningEnabled, rateLimitEnabled });
  } catch (err) {
    console.error('[ADMIN] Release readiness error:', err);
    res.status(500).json({ error: 'Kunde inte hämta release-readiness' });
  }
});

// ─── GET /api/admin/feature-flags ────────────────────────
router.get('/feature-flags', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT key, enabled, description, updated_at FROM feature_flag ORDER BY key ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[ADMIN] Feature flags error:', err);
    res.status(500).json({ error: 'Kunde inte hämta funktionsflaggor' });
  }
});

// ─── PUT /api/admin/feature-flags/:key ─────────────────
router.put('/feature-flags/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled krävs (boolean)' });
    }

    const result = await db.query(
      `UPDATE feature_flag
       SET enabled = $1, updated_at = NOW(), updated_by = $2
       WHERE key = $3
       RETURNING key, enabled, description, updated_at`,
      [enabled, req.user.id, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flaggan hittades inte' });
    }

    console.log(`[ADMIN] Feature flag "${key}" set to ${enabled} by admin ${req.user.id}`);
    res.json({ message: `Flaggan "${key}" har uppdaterats`, ...result.rows[0] });
  } catch (err) {
    console.error('[ADMIN] Update feature flag error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera funktionsflagga' });
  }
});

// ─── GET /api/admin/app-config ────────────────────────────
// Returns all app config settings as { key: value } object
router.get('/app-config', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT key, value, description, updated_at FROM app_config ORDER BY key ASC'
    );
    // Return as flat object for easy frontend consumption
    const config = {};
    for (const row of result.rows) {
      config[row.key] = { value: row.value, description: row.description, updated_at: row.updated_at };
    }
    res.json(config);
  } catch (err) {
    console.error('[ADMIN] Get app config error:', err);
    res.status(500).json({ error: 'Kunde inte hämta konfiguration' });
  }
});

// ─── PUT /api/admin/app-config/:key ───────────────────────
router.put('/app-config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'value krävs' });
    }

    const result = await db.query(
      `UPDATE app_config
       SET value = $1, updated_at = NOW(), updated_by = $2
       WHERE key = $3
       RETURNING key, value, description, updated_at`,
      [String(value), req.user.id, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Konfigurationsnyckeln hittades inte' });
    }

    console.log(`[ADMIN] App config "${key}" set to "${value}" by admin ${req.user.id}`);
    res.json({ message: `Inställningen "${key}" har uppdaterats`, ...result.rows[0] });
  } catch (err) {
    console.error('[ADMIN] Update app config error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera konfiguration' });
  }
});

// ─── GET /api/admin/login-stats ───────────────────────────
// Admin-only. Returns login stats per family with parent/child breakdowns
router.get('/login-stats', async (req, res) => {
  try {
    // Resolve period filter for totals
    const PERIOD_MAP = { '24h': '24 hours', '7d': '7 days', '30d': '30 days', '365d': '365 days' };
    const periodKey = req.query.period && PERIOD_MAP[req.query.period] ? req.query.period : null;
    const intervalSql = periodKey ? `AND occurred_at >= NOW() - INTERVAL '${PERIOD_MAP[periodKey]}'` : '';

    // Totals by role (exclude admin logins from overview counts), filtered by period if provided
    const totalsResult = await db.query(`
      SELECT role, COUNT(*) AS total
      FROM login_event
      WHERE role IN ('parent', 'child')
      ${intervalSql}
      GROUP BY role
    `);
    const totals = { parents: 0, children: 0 };
    for (const row of totalsResult.rows) {
      if (row.role === 'parent') totals.parents = parseInt(row.total);
      if (row.role === 'child')  totals.children = parseInt(row.total);
    }

    // Per-family data: aggregate login stats for each parent and child
    const familiesResult = await db.query(`
      SELECT
        f.id            AS family_id,
        f.name          AS family_name,
        -- parents
        json_agg(DISTINCT jsonb_build_object(
          'id',             p.id,
          'name',           COALESCE(p.name, p.email),
          'role',           'parent',
          'total_logins',   COALESCE(pls.total_logins, 0),
          'logins_last_7d', COALESCE(pls.logins_last_7d, 0),
          'last_login',     pls.last_login
        )) FILTER (WHERE p.id IS NOT NULL) AS parents,
        -- children
        json_agg(DISTINCT jsonb_build_object(
          'id',             c.id,
          'name',           c.name,
          'role',           'child',
          'total_logins',   COALESCE(cls.total_logins, 0),
          'logins_last_7d', COALESCE(cls.logins_last_7d, 0),
          'last_login',     cls.last_login
        )) FILTER (WHERE c.id IS NOT NULL) AS children
      FROM family f
      LEFT JOIN parent p ON p.family_id = f.id AND p.is_admin = false
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(*) AS total_logins,
          COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days') AS logins_last_7d,
          MAX(occurred_at) AS last_login
        FROM login_event
        WHERE role = 'parent'
        GROUP BY user_id
      ) pls ON pls.user_id = p.id
      LEFT JOIN child c ON c.family_id = f.id
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(*) AS total_logins,
          COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days') AS logins_last_7d,
          MAX(occurred_at) AS last_login
        FROM login_event
        WHERE role = 'child'
        GROUP BY user_id
      ) cls ON cls.user_id = c.id
      WHERE f.archived_at IS NULL
      GROUP BY f.id, f.name
      ORDER BY f.created_at DESC
    `);

    res.json({
      totals,
      families: familiesResult.rows.map(row => ({
        family_id:   row.family_id,
        family_name: row.family_name || 'Namnlös familj',
        parents:     (row.parents  || []).sort((a, b) => b.total_logins - a.total_logins),
        children:    (row.children || []).sort((a, b) => b.total_logins - a.total_logins),
      })),
    });
  } catch (err) {
    console.error('[ADMIN] Login stats error:', err);
    res.status(500).json({ error: 'Kunde inte hämta inloggningsstatistik' });
  }
});

// ─── System Messages (Admin → Family) ─────────────────────────────────

const systemMessages = require('../../../db/system-messages');
const { broadcast } = require('../../lib/sse-broadcast');

/**
 * POST /api/admin/messages
 * Body: { family_id, message }
 * Creates a system message and broadcasts SYSTEM_ALERT via SSE to the family.
 */
router.post('/messages', async (req, res) => {
  try {
    const { family_id, message } = req.body;
    if (!family_id || typeof family_id !== 'string') {
      return res.status(400).json({ error: 'family_id krävs' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message krävs' });
    }

    // Verify family exists
    const familyResult = await db.query(
      'SELECT id FROM family WHERE id = $1',
      [family_id]
    );
    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Familjen hittades inte' });
    }

    const msg = await systemMessages.createSystemMessage(family_id, message.trim());

    // Broadcast SSE to the family — silent if no clients connected
    broadcast(family_id, 'SYSTEM_ALERT', {
      message_id: msg.id,
      message_text: msg.message,
      created_at: msg.created_at,
    });

    console.log(`[ADMIN] System message sent to family ${family_id} by admin ${req.user.id}`);

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    console.error('[ADMIN] System message error:', err);
    res.status(500).json({ error: 'Kunde inte skicka meddelande' });
  }
});

/**
 * GET /api/admin/messages/:familyId
 * Returns the 10 most recent system messages sent to a family.
 */
router.get('/messages/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const messages = await systemMessages.getRecentMessages(familyId);
    res.json(messages);
  } catch (err) {
    console.error('[ADMIN] Get family messages error:', err);
    res.status(500).json({ error: 'Kunde inte hämta meddelanden' });
  }
});

// ─── POST /api/admin/push/test ────────────────────────────
// Send a test push notification to a specific parent by email or to all subscribed parents.
// Body: { email?: string, title?: string, body?: string, url?: string }
// If email is omitted, sends to all parents with active push subscriptions.
router.post('/push/test', async (req, res) => {
  try {
    const { sendPushNotification } = require('../../lib/push-notifications');
    const { email, title, body: msgBody, url } = req.body;

    const payload = {
      title: title || '🔔 Test från Min Stjärndag',
      body: msgBody || 'Push-notiser fungerar korrekt!',
      icon: '/icon-192.png',
      url: url || '/dashboard',
    };

    if (email) {
      // Send to specific parent by email
      const parentResult = await db.query(
        'SELECT id, email FROM parent WHERE email = $1',
        [email.toLowerCase().trim()]
      );
      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: `Ingen förälder hittades med e-post: ${email}` });
      }
      const parent = parentResult.rows[0];
      const result = await sendPushNotification(parent.id, payload);
      return res.json({
        success: true,
        email: parent.email,
        sent: result.sent,
        cleaned: result.cleaned,
        message: result.sent > 0
          ? `Test-push skickat till ${parent.email} (${result.sent} enhet${result.sent > 1 ? 'er' : ''})`
          : `Ingen aktiv push-prenumeration för ${parent.email}`,
      });
    }

    // Send to all parents with subscriptions
    const subsResult = await db.query(
      'SELECT DISTINCT parent_id FROM push_subscriptions'
    );
    if (subsResult.rows.length === 0) {
      return res.json({ success: true, sent: 0, message: 'Inga push-prenumerationer i databasen' });
    }

    let totalSent = 0;
    let totalCleaned = 0;
    for (const row of subsResult.rows) {
      const r = await sendPushNotification(row.parent_id, payload);
      totalSent += r.sent;
      totalCleaned += r.cleaned;
    }

    res.json({
      success: true,
      recipients: subsResult.rows.length,
      sent: totalSent,
      cleaned: totalCleaned,
      message: `Test-push skickat till ${subsResult.rows.length} föräldrar (${totalSent} enheter totalt)`,
    });
  } catch (err) {
    console.error('[ADMIN] Test push error:', err);
    res.status(500).json({ error: 'Kunde inte skicka test-push: ' + err.message });
  }
});

// ─── POST /api/admin/test-push ───────────────────────────
// Send a test push to all iOS/Android devices for a specific family.
// Body: { family_id, title, body, url }
// Requires admin authentication (router.use(requireAdmin) is already applied).
router.post('/test-push', async (req, res) => {
  try {
    const { family_id, title, body: msgBody, url } = req.body;

    if (!family_id || typeof family_id !== 'string') {
      return res.status(400).json({ error: 'family_id krävs' });
    }

    // Resolve family
    const familyResult = await db.query(
      'SELECT id, name FROM family WHERE id = $1',
      [family_id]
    );
    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Familjen hittades inte' });
    }
    const family = familyResult.rows[0];

    // Get all parents in this family with native push subscriptions
    const parentsResult = await db.query(
      `SELECT DISTINCT p.id AS parent_id, p.email, p.name AS parent_name
       FROM parent p
       JOIN push_subscriptions ps ON ps.parent_id = p.id
       WHERE p.family_id = $1
         AND ps.platform IN ('ios', 'android')
         AND ps.native_token IS NOT NULL`,
      [family_id]
    );

    const payload = {
      title: title || '🔔 Test push från Min Stjärndag',
      body: msgBody || 'Push-notiser fungerar — administratörstest!',
      url: url || '/dashboard',
    };

    let totalSent = 0;
    let totalFailed = 0;

    if (parentsResult.rows.length === 0) {
      return res.json({
        success: false,
        family_id,
        family_name: family.name,
        sent: 0,
        message: `Inga iOS/Android-prenumerationer hittades för familj "${family.name}"`,
      });
    }

    const { sendPushNotification } = require('../../lib/push-notifications');

    for (const row of parentsResult.rows) {
      try {
        const result = await sendPushNotification(row.parent_id, payload);
        totalSent += result.sent;
        if (result.cleaned > 0) totalSent -= result.cleaned; // cleaned tokens not counted as sent
      } catch (err) {
        console.error(`[ADMIN] test-push failed for parent ${row.parent_id}:`, err.message);
        totalFailed++;
      }
    }

    const parentList = parentsResult.rows.map(r => r.email).join(', ');
    console.log(
      `[ADMIN] test-push sent to family "${family.name}" (${parentsResult.rows.length} parents): "${payload.title}"`
    );

    res.json({
      success: true,
      family_id,
      family_name: family.name,
      parents_targeted: parentsResult.rows.length,
      sent: totalSent,
      failed: totalFailed,
      payload,
      message: `Push skickad till ${totalSent} enhet${totalSent !== 1 ? 'er' : ''} för familj "${family.name}" (${parentList})`,
    });
  } catch (err) {
    console.error('[ADMIN] test-push error:', err);
    res.status(500).json({ error: 'Kunde inte skicka test-push: ' + err.message });
  }
});

// ─── GET /api/admin/push/stats ────────────────────────────
// Returns push subscription statistics.
router.get('/push/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) AS total_subscriptions,
        COUNT(DISTINCT parent_id) AS subscribed_parents
      FROM push_subscriptions
    `);
    res.json({
      total_subscriptions: parseInt(result.rows[0].total_subscriptions),
      subscribed_parents: parseInt(result.rows[0].subscribed_parents),
    });
  } catch (err) {
    console.error('[ADMIN] Push stats error:', err);
    res.status(500).json({ error: 'Kunne inte hämta push-statistik' });
  }
});

module.exports = router;
