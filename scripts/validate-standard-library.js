#!/usr/bin/env node
'use strict';

const path = require('path');
const {
  DEFAULT_MANIFEST_PATH,
  validateStandardLibraryManifest,
  readManifestFile,
} = require('../src/lib/standard-library-manifest');

function main() {
  const manifestPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_MANIFEST_PATH;

  let raw;
  try {
    raw = readManifestFile(manifestPath);
  } catch (err) {
    console.error(`[validate:standard-library] Failed to read manifest: ${err.message}`);
    process.exit(1);
  }

  const result = validateStandardLibraryManifest(raw);
  if (!result.ok) {
    console.error('[validate:standard-library] Validation failed:');
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log(`[validate:standard-library] OK — ${manifestPath}`);
}

main();
