#!/usr/bin/env node
import { runRender } from '../lib/render.mjs';
import { parseArgs, printHelp } from '../lib/cli.mjs';

const { flags } = parseArgs();
if (flags.has('help')) {
  printHelp('render');
  process.exit(0);
}

runRender().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
