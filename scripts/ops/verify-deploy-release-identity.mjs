#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  readExpectedCacheNameFromRepo,
  verifyDeployReleaseIdentity,
} from './lib/deploy-release-identity.mjs';

function parseArgs(argv) {
  const out = {
    sha: process.env.DEPLOY_SHA || '',
    healthJsonPath: null,
    swPath: null,
    appRoot: process.env.VPS_APP_PATH || process.cwd(),
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--sha') out.sha = argv[++i];
    else if (argv[i] === '--health-json') out.healthJsonPath = argv[++i];
    else if (argv[i] === '--sw') out.swPath = argv[++i];
    else if (argv[i] === '--app-root') out.appRoot = argv[++i];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.sha || !/^[0-9a-f]{40}$/.test(args.sha)) {
    console.error('[release-identity] invalid --sha');
    process.exit(1);
  }
  if (!args.healthJsonPath) {
    console.error('[release-identity] --health-json required');
    process.exit(1);
  }
  const healthJson = JSON.parse(fs.readFileSync(args.healthJsonPath, 'utf8'));
  const expectedCache = readExpectedCacheNameFromRepo(path.resolve(args.appRoot));
  let swText;
  if (args.swPath && fs.existsSync(args.swPath)) {
    swText = fs.readFileSync(args.swPath, 'utf8');
  }
  try {
    verifyDeployReleaseIdentity({
      healthJson,
      expectedSha: args.sha,
      expectedCache,
      swText,
    });
  } catch (err) {
    console.error(`[release-identity] ${err.message}`);
    process.exit(1);
  }
  console.error('[release-identity] OK');
}

main();
