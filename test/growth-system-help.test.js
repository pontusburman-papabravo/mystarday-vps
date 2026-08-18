'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyBlockingStep,
  evaluateStuckFamily,
} = require('../src/lib/growth-stuck-classifier');
const {
  buildHelpPayload,
  computeProgressionOutcome,
  SURFACE_BY_BLOCKING_STEP,
} = require('../src/lib/growth-system-help');
const { mapGrowthStuckFamily } = require('../src/lib/growth-stuck-work-queue');

describe('growth-stuck-classifier', () => {
  const now = new Date('2026-08-18T12:00:00Z');

  it('classifies onboarding, schema, login and return cohorts', () => {
    assert.equal(
      classifyBlockingStep({ onboarding_completed: false }),
      'onboarding_incomplete'
    );
    assert.equal(
      classifyBlockingStep({
        onboarding_completed: true,
        schema_saved_at: '2026-08-10T00:00:00Z',
        child_access_completed_at: null,
      }),
      'schema_no_child_login'
    );
    assert.equal(
      classifyBlockingStep({
        onboarding_completed: true,
        child_access_completed_at: '2026-08-10T00:00:00Z',
        first_completion_at: null,
      }),
      'login_no_completion'
    );
    assert.equal(
      classifyBlockingStep({
        onboarding_completed: true,
        first_completion_at: '2026-08-01T00:00:00Z',
        last_login_at: '2026-08-05T00:00:00Z',
      }, now),
      'completion_no_return'
    );
    assert.equal(
      classifyBlockingStep({ onboarding_completed: true, has_core_flow_error: true }),
      'core_flow_errors'
    );
  });

  it('requires 48h–14d family age for stuck window', () => {
    const tooYoung = evaluateStuckFamily({
      family_created_at: '2026-08-17T12:00:00Z',
      onboarding_completed: false,
    }, now);
    assert.equal(tooYoung.blockingStep, null);

    const inWindow = evaluateStuckFamily({
      family_created_at: '2026-08-15T12:00:00Z',
      onboarding_completed: false,
    }, now);
    assert.equal(inWindow.blockingStep, 'onboarding_incomplete');
    assert.equal(inWindow.inWindow, true);
  });
});

describe('growth-system-help content', () => {
  it('maps blocking step to contextual surfaces and copy', () => {
    const help = buildHelpPayload('schema_no_child_login', 'sv-SE');
    assert.equal(help.helpType, 'preview_child_login_help');
    assert.match(help.headline, /logga in/i);
    assert.equal(help.ctaAction, 'start_child_login');
    assert.ok(SURFACE_BY_BLOCKING_STEP.schema_no_child_login.includes('child_handoff'));
  });

  it('computes 24h / 72h progression outcomes', () => {
    const shown = new Date('2026-08-18T08:00:00Z');
    assert.equal(
      computeProgressionOutcome(shown, new Date('2026-08-18T20:00:00Z')),
      'progressed_24h'
    );
    assert.equal(
      computeProgressionOutcome(shown, new Date('2026-08-20T08:00:00Z')),
      'progressed_72h'
    );
    assert.equal(
      computeProgressionOutcome(shown, new Date('2026-08-22T08:00:00Z')),
      null
    );
  });
});

describe('admin mapper exposes recommended system help', () => {
  it('includes recommendedSystemHelp aligned with in-app help', () => {
    const mapped = mapGrowthStuckFamily({
      family_id: 'f1',
      family_name: 'Test',
      created_at: '2026-08-15T08:00:00Z',
      blocking_step: 'schema_no_child_login',
      schema_saved_at: '2026-08-16T08:00:00Z',
    });
    assert.match(mapped.recommendedSystemHelp, /barninlogg/i);
    assert.match(mapped.manualNextStep, /barninlogg/i);
    assert.equal(mapped.autoSendAllowed, false);
  });
});

describe('growth-system-help route contract', () => {
  it('exports contextual API routes', () => {
    const router = require('../src/routes/growth-system-help');
    assert.ok(router);
    const stack = router.stack || [];
    const paths = stack.map((layer) => layer.route && layer.route.path).filter(Boolean);
    assert.ok(paths.includes('/context'));
    assert.ok(paths.includes('/shown'));
    assert.ok(paths.includes('/engage'));
    assert.ok(paths.includes('/support-request'));
  });
});

describe('growth-system-help outcome semantics', () => {
  it('never downgrades progressed_24h to progressed_72h or no_progress', () => {
    const rank = (outcome) => {
      if (outcome === 'progressed_24h') return 3;
      if (outcome === 'progressed_72h') return 2;
      if (outcome === 'no_progress') return 1;
      return 0;
    };
    const upgrade = (current, next) => {
      if (!next) return current;
      if (!current) return next;
      if (current === 'no_progress' && (next === 'progressed_24h' || next === 'progressed_72h')) return next;
      if (current === 'progressed_72h' && next === 'progressed_24h') return 'progressed_24h';
      return current;
    };
    assert.equal(upgrade('progressed_24h', 'progressed_72h'), 'progressed_24h');
    assert.equal(upgrade('progressed_24h', 'no_progress'), 'progressed_24h');
    assert.equal(upgrade('no_progress', 'progressed_24h'), 'progressed_24h');
    assert.ok(rank(upgrade('progressed_72h', 'progressed_24h')) > rank('progressed_72h'));
  });

  it('no_progress cutoff requires full 72h after shown', () => {
    const shown = new Date('2026-08-18T08:00:00Z');
    const at71h = new Date(shown.getTime() + 71 * 3600000);
    const at72h = new Date(shown.getTime() + 72 * 3600000 + 1000);
    const cutoff71 = new Date(at71h.getTime() - 72 * 3600000);
    const cutoff72 = new Date(at72h.getTime() - 72 * 3600000);
    assert.equal(shown < cutoff71, false);
    assert.equal(shown < cutoff72, true);
  });
});

describe('growth-system-help migration', () => {
  it('creates state table and feature flag', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const migration = fs.readFileSync(
      path.join(__dirname, '../migrations/1810300000000_family_system_help_state.js'),
      'utf8'
    );
    assert.match(migration, /family_system_help_state/);
    assert.match(migration, /growth_system_help_v1/);
    assert.match(migration, /progressed_24h/);
    assert.match(migration, /support_requested_at/);
    assert.match(migration, /snapshotContract/);
    assert.match(migration, /featureFlagInserts/);
  });
});

describe('growth-system-help support report', () => {
  const {
    sanitizeReportContext,
    formatSupportReportMessage,
  } = require('../src/lib/growth-system-help');

  it('sanitizes technical context for support reports', () => {
    const ctx = sanitizeReportContext({
      surface: 'help_panel',
      blocking_step: 'schema_no_child_login',
      route: '/dashboard',
      locale: 'sv-SE',
      evil: '<script>',
      nested: { nope: true },
    });
    assert.equal(ctx.surface, 'help_panel');
    assert.equal(ctx.blocking_step, 'schema_no_child_login');
    assert.equal(ctx.evil, undefined);
    assert.equal(ctx.nested, undefined);
  });

  it('formats support report message with technical context', () => {
    const msg = formatSupportReportMessage(
      { blocking_step: 'login_no_completion', help_type: 'first_star_help' },
      { surface: 'help_panel', route: '/daily-log', locale: 'sv-SE' }
    );
    assert.match(msg, /Rapportera problem/);
    assert.match(msg, /login_no_completion/);
    assert.match(msg, /\/daily-log/);
  });
});

describe('growth-system-help deploy snapshot contract', () => {
  it('declares migration snapshot registry entry for deploy gate', async () => {
    const { loadMigrationSnapshotContract, expectedFeatureFlagInserts } = await import(
      '../scripts/ops/lib/migration-snapshot-manifest.mjs'
    );
    const name = '1810300000000_family_system_help_state';
    const contract = loadMigrationSnapshotContract(name);
    assert.equal(contract?.backwardCompatible, true);
    assert.equal(contract?.schemaOnly, true);
    const inserts = expectedFeatureFlagInserts([name]);
    assert.deepEqual(inserts, [
      { key: 'growth_system_help_v1', enabled: false, migration: name },
    ]);
  });

  it('allowlists growth_system_help_v1 for per-family overrides', () => {
    const familyOverrides = require('../db/family-feature-overrides');
    const { FLAG_KEYS } = require('../src/lib/activation-flags');
    assert.equal(familyOverrides.isOverrideFeatureKey(FLAG_KEYS.growthSystemHelp), true);
  });
});
