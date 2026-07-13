#!/usr/bin/env node
import { runGenerate } from '../lib/generate.mjs';
import { runRender } from '../lib/render.mjs';
import { parseArgs, printHelp } from '../lib/cli.mjs';

const { flags } = parseArgs();
if (flags.has('help')) {
  printHelp('all');
  process.exit(0);
}

async function main() {
  await runGenerate();
  await runRender();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
