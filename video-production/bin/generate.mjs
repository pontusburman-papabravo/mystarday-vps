#!/usr/bin/env node
import { runGenerate } from '../lib/generate.mjs';
import { parseArgs, printHelp } from '../lib/cli.mjs';

const { flags } = parseArgs();
if (flags.has('help')) {
  printHelp('generate');
  process.exit(0);
}

runGenerate().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
