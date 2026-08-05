#!/usr/bin/env node
'use strict';

/**
 * Founder parent English prod smoke — runs API + browser, merges report, exit 1 unless PASS.
 */
const { runApiSmoke } = require('./founder-parent-english-prod-smoke-api.cjs');
const { runBrowserSmoke } = require('./founder-parent-english-prod-smoke-browser.cjs');
const { finalizeFounderSmokeReport } = require('./founder-smoke-report-lib.cjs');

const mode = process.env.FOUNDER_SMOKE_MODE || process.argv[2] || 'all';

async function main() {
  const requireRestore = process.env.FOUNDER_SMOKE_VPS === '1';

  if (mode === 'api') {
    const report = await runApiSmoke({});
    console.log(JSON.stringify(report, null, 2));
    if (report.overall !== 'PASS') process.exit(1);
    return;
  }

  if (mode === 'browser') {
    const browserReport = await runBrowserSmoke();
    const report = {
      base: browserReport.base,
      part: 'browser',
      browser: browserReport.browser,
      browser_scenarios: browserReport.scenarios,
      overall: browserReport.browser?.pass ? 'PASS' : 'INCOMPLETE',
    };
    console.log(JSON.stringify(report, null, 2));
    if (report.overall !== 'PASS') process.exit(1);
    return;
  }

  if (mode === 'all') {
    const apiReport = await runApiSmoke({ finalize: false });
    const browserReport = await runBrowserSmoke();
    const merged = finalizeFounderSmokeReport(
      {
        ...apiReport,
        browser: browserReport.browser,
        browser_scenarios: browserReport.scenarios,
      },
      { requireRestore, requireBrowser: true }
    );
    console.log(JSON.stringify(merged, null, 2));
    if (merged.overall !== 'PASS') process.exit(1);
    return;
  }

  console.error('Unknown mode. Use api | browser | all');
  process.exit(2);
}

main().catch((e) => {
  console.error(JSON.stringify({ overall: 'INCOMPLETE', errors: [e.message] }, null, 2));
  process.exit(1);
});
