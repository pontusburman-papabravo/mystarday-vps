'use strict';

/**
 * Full test suite runner — ensures non-zero exit when TAP reports failures.
 * npm's default `node --test test/*.test.js` can exit 0 while subtests fail on some Node versions/setups.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function parseTapSummary(output) {
  let pass = 0;
  let fail = 0;
  let skip = 0;
  let cancelled = 0;
  for (const line of output.split('\n')) {
    if (line.startsWith('# pass ')) pass = Number(line.slice(7).trim());
    if (line.startsWith('# fail ')) fail = Number(line.slice(7).trim());
    if (line.startsWith('# skipped ')) skip = Number(line.slice(10).trim());
    if (line.startsWith('# cancelled ')) cancelled = Number(line.slice(12).trim());
  }
  return { pass, fail, skip, cancelled };
}

function runFullNpmTest() {
  const result = spawnSync(
    'node',
    ['-r', './test/helpers/apply-test-database-env.js', '--test', 'test/*.test.js'],
    {
      cwd: ROOT,
      env: process.env,
      shell: true,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }
  );

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const summary = parseTapSummary(output);

  if (process.env.NPM_TEST_RUNNER_VERBOSE === '1') {
    process.stdout.write(output);
  } else {
    process.stdout.write(
      `# npm test summary: pass=${summary.pass} fail=${summary.fail} skip=${summary.skip} cancelled=${summary.cancelled}\n`
    );
    if (summary.fail > 0) {
      const fails = output.split('\n').filter((l) => l.startsWith('not ok'));
      for (const line of fails.slice(0, 30)) {
        process.stdout.write(`${line}\n`);
      }
      if (fails.length > 30) {
        process.stdout.write(`# ... ${fails.length - 30} more not ok lines\n`);
      }
    }
  }

  if (summary.fail > 0 || summary.cancelled > 0) {
    process.exit(1);
  }
  if (result.status !== 0 && result.status !== null) {
    process.exit(result.status);
  }
  process.exit(0);
}

module.exports = { parseTapSummary };

if (require.main === module) {
  runFullNpmTest();
}
