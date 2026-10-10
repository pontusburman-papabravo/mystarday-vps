'use strict';

/**
 * Manual read-only Apple Live Audit and store dry-run.
 * Writes redacted reports. Never prints a private key, key id, issuer id, or JWT.
 */

const fs = require('fs');
const path = require('path');
const { collectAppleLiveAudit, exitCodeForAudit, renderAuditMarkdown } = require('../src/lib/apple-live-audit');
const { buildAppleStorePlan, renderPlanMarkdown } = require('../src/lib/apple-store-plan');

function parseArgs(argv) {
  let outDir = '';
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out-dir') {
      outDir = argv[i + 1] || '';
      i += 1;
    } else {
      throw Object.assign(new Error('APPLE_AUDIT_USAGE'), { code: 'APPLE_AUDIT_USAGE' });
    }
  }
  return { outDir };
}

function writeReport(dir, name, json, markdown) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), json);
  fs.writeFileSync(path.join(dir, `${name}.md`), markdown);
}

async function main(argv, env, fetchImpl) {
  const args = parseArgs(argv || process.argv);
  const audit = await collectAppleLiveAudit({ env: env || process.env, fetchImpl });
  const plan = buildAppleStorePlan(audit);
  const auditJson = `${JSON.stringify(audit, null, 2)}\n`;
  const planJson = `${JSON.stringify(plan, null, 2)}\n`;
  if (args.outDir) {
    writeReport(args.outDir, 'apple-live-audit', auditJson, renderAuditMarkdown(audit));
    writeReport(args.outDir, 'apple-store-plan', planJson, renderPlanMarkdown(plan));
  }
  process.stdout.write(renderPlanMarkdown(plan));
  return exitCodeForAudit(audit);
}

if (require.main === module) {
  main(process.argv, process.env)
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      const code = error && error.code === 'APPLE_AUDIT_USAGE'
        ? 'APPLE_AUDIT_USAGE'
        : 'APPLE_AUDIT_FAILED';
      process.stderr.write(`${code}\n`);
      process.exit(code === 'APPLE_AUDIT_USAGE' ? 2 : 1);
    });
}

module.exports = { main };
