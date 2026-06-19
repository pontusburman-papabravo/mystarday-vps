'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../src/lib/db');
const analyticsDbPath = require.resolve('../db/analytics');
const analyticsRoutePath = require.resolve('../src/routes/analytics');

let queryCalls = [];

before(() => {
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (sql, params) => {
        queryCalls.push({ sql, params });
        if (sql.includes('COALESCE(child_view_config')) {
          return { rows: [{ view_mode: 'classic', count: 10 }, { view_mode: 'new', count: 2 }] };
        }
        if (sql.includes('families_with_preview_access')) {
          return { rows: [{ families_with_preview_access: 3 }] };
        }
        if (sql.includes('ui_view_mode_switched')) {
          return {
            rows: [{
              sessions: [
                { role: 'parent', mode: 'classic', session_count: 5, unique_families: 3 },
                { role: 'parent', mode: 'magic', session_count: 2, unique_families: 2 },
              ],
              latest_modes: [
                { family_id: 'a', role: 'parent', current_mode: 'magic' },
                { family_id: 'b', role: 'parent', current_mode: 'classic' },
              ],
              switches: [
                {
                  family_id: 'a',
                  role: 'parent',
                  switches_to_magic: 1,
                  switches_back_to_classic: 1,
                },
              ],
              child_config_switches: {
                to_new: 2,
                back_to_classic: 1,
                families_tried_new: 2,
              },
            }],
          };
        }
        return { rows: [] };
      },
    },
  };

  require.cache[require.resolve('../src/lib/magic-view-access')] = {
    id: require.resolve('../src/lib/magic-view-access'),
    filename: require.resolve('../src/lib/magic-view-access'),
    loaded: true,
    exports: { getAllowlist: () => ['test@example.com'] },
  };
});

after(() => {
  delete require.cache[dbPath];
  delete require.cache[analyticsDbPath];
  delete require.cache[analyticsRoutePath];
  delete require.cache[require.resolve('../src/lib/magic-view-access')];
});

describe('view mode analytics', () => {
  it('client route whitelists ui view events', () => {
    delete require.cache[analyticsRoutePath];
    const fs = require('fs');
    const src = fs.readFileSync(analyticsRoutePath, 'utf8');
    assert.match(src, /ui_view_mode_session/);
    assert.match(src, /ui_view_mode_switched/);
    assert.match(src, /child_view_config_switched/);
  });

  it('getViewModeStats aggregates parent switch-back rate', async () => {
    delete require.cache[analyticsDbPath];
    queryCalls = [];
    const analytics = require('../db/analytics');
    const stats = await analytics.getViewModeStats(30);

    assert.equal(stats.period_days, 30);
    assert.equal(stats.preview_access_families, 3);
    assert.equal(stats.child_db_view.classic, 10);
    assert.equal(stats.child_db_view.new, 2);
    assert.equal(stats.ui_toggle.parent.tried_magic, 1);
    assert.equal(stats.ui_toggle.parent.switched_back, 1);
    assert.equal(stats.ui_toggle.parent.switch_back_rate_pct, 100);
    assert.equal(stats.ui_toggle.parent.latest_mode.magic, 1);
    assert.equal(stats.child_config_switches.to_new, 2);
    assert.equal(stats.child_config_switches.switch_back_rate_pct, 50);
    assert.ok(queryCalls.length >= 3);
  });
});
