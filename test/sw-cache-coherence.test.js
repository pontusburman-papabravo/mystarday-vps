const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Fas 8 regression guard. When a monolith is split into a host file + satellite
// modules loaded as separate <script> tags, two things must hold or a service-worker
// stale-while-revalidate deploy will serve a version-skewed mix (host JS without its
// satellites) → undefined onclick handlers → dead buttons:
//   1. The host file's <script> must carry a cache-busting ?v= query so a content
//      change forces a fresh fetch (its cache key must change with the HTML).
//   2. The host + satellites must share one global scope without duplicate top-level
//      let/const declarations (a duplicate is a SyntaxError in the browser's shared
//      global lexical environment and silently kills the second script).

const PAGES = {
  'public/dashboard.html': {
    host: '/js/dashboard.js',
    modules: [
      'public/js/schedule-core.js', 'public/js/dashboard.js',
      'public/js/dashboard-views.js', 'public/js/dashboard-activity-modal.js',
      'public/js/dashboard-approvals.js', 'public/js/dashboard-dnd.js',
      'public/js/dashboard-copy-modals.js', 'public/js/dashboard-card-actions.js',
    ],
  },
  'public/schedule.html': {
    host: '/js/schedule.js',
    modules: [
      'public/js/schedule-core.js', 'public/js/schedule.js',
      'public/js/schedule-special-days.js', 'public/js/schedule-template-mode.js',
      'public/js/schedule-insert-fill.js',
    ],
  },
  'public/child-dashboard.html': {
    host: '/js/child-dashboard.js',
    modules: [
      'public/js/child-dashboard.js', 'public/js/child-dashboard-celebrations.js',
      'public/js/child-dashboard-rewards.js',
    ],
  },
};

describe('Fas 8 split — SW cache coherence', () => {
  for (const [page, cfg] of Object.entries(PAGES)) {
    it(`${path.basename(page)} cache-busts its host script (${cfg.host})`, () => {
      const html = read(page);
      const re = new RegExp(`<script src="${cfg.host.replace(/[/.]/g, '\\$&')}\\?v=[^"]+"`);
      assert.match(html, re, `${cfg.host} must be loaded with a ?v= cache-busting query in ${page}`);
    });

    it(`${path.basename(page)} module set has no duplicate top-level declarations`, () => {
      const concat = cfg.modules.map(read).join('\n;\n');
      assert.doesNotThrow(() => new vm.Script(concat), `${page} module set must parse as one shared scope`);
    });
  }
});
