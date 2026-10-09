'use strict';

/**
 * Manual read-only check for the App Store Connect Team API key.
 * Prints a redacted report. Never prints the private key, key id, issuer id, or JWT.
 */

const fs = require('fs');
const path = require('path');
const {
  exitCodeForReport,
  renderReportMarkdown,
  verifyAppStoreConnectAccess,
} = require('../src/lib/app-store-connect-read');

function parseArgs(argv) {
  let outPath = '';
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      outPath = argv[i + 1] || '';
      i += 1;
    } else {
      throw Object.assign(new Error('APPLE_CONNECT_USAGE'), { code: 'APPLE_CONNECT_USAGE' });
    }
  }
  return { outPath };
}

async function main(argv, env, fetchImpl) {
  const args = parseArgs(argv || process.argv);
  const report = await verifyAppStoreConnectAccess({ env: env || process.env, fetchImpl });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (args.outPath) {
    fs.mkdirSync(path.dirname(path.resolve(args.outPath)), { recursive: true });
    fs.writeFileSync(args.outPath, json);
    const mdPath = args.outPath.replace(/\.json$/i, '') + '.md';
    fs.writeFileSync(mdPath, renderReportMarkdown(report));
  }
  process.stdout.write(json);
  return exitCodeForReport(report);
}

if (require.main === module) {
  main(process.argv, process.env)
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      const code = error && error.code === 'APPLE_CONNECT_USAGE'
        ? 'APPLE_CONNECT_USAGE'
        : 'APPLE_CONNECT_VERIFY_FAILED';
      process.stderr.write(`${code}\n`);
      process.exit(code === 'APPLE_CONNECT_USAGE' ? 2 : 1);
    });
}

module.exports = { main };
