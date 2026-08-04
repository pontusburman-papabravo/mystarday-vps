#!/usr/bin/env node
'use strict';

/**
 * CLI entry for deterministic native child-first cold launch harness (no browser).
 */

const {
  legacyIntermittentResolveMeType,
  fixedResolveMeType,
  runColdLaunchHarness,
} = require('../test/helpers/native-child-cold-launch-harness');

const staleParentChildRefresh = {
  accessType: 'parent',
  refreshType: 'child',
  refreshValid: true,
};

function main() {
  const legacy = runColdLaunchHarness(legacyIntermittentResolveMeType, staleParentChildRefresh, 8);
  const fixed = runColdLaunchHarness(fixedResolveMeType, staleParentChildRefresh, 8);

  const report = {
    scenario: 'stale_parent_access_valid_child_refresh',
    legacy,
    fixed,
    pass:
      legacy.stableOnChildToday === false
      && legacy.totalNavigations >= 2
      && fixed.stableOnChildToday === true
      && fixed.redirectLoop === false,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main();
