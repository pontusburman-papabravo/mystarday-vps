# Turbok — Bootstrap Overlay Plan

**Status:** `TURBOK_REPO: NOT_VERIFIED / NOT_IN_SCOPE` (repo not in current workspace)

When Turbok repo is bootstrapped, copy the global core and create a minimal overlay.

## Step 1 — Copy global core

From any repo using this model:

```
config/process/global-core.json
docs/process/GLOBAL_CORE.md
docs/process/TEST_EXECUTION_MODEL.md
docs/process/contracts/*
.cursor/rules/131-test-execution-model.mdc
.cursor/rules/152-agent-operating-contracts.mdc
scripts/lib/test-routing/*   (unchanged)
```

## Step 2 — Create `config/process/overlays/turbok.json`

Minimal template (adjust paths when Turbok stack is known):

```json
{
  "version": 1,
  "project": "turbok",
  "displayName": "Turbok",
  "criticalAreas": ["auth/session", "data integrity", "privacy/security"],
  "externalSystems": [],
  "productPrinciples": ["simplicity", "recoverability"],
  "domains": {
    "auth-security": { "pathGlobs": [], "testGlobs": [] },
    "db-migrations": { "pathGlobs": ["migrations/**"], "testGlobs": ["test/migration*.test.js"] }
  }
}
```

**Do not** copy family-app domains wholesale (child UX, RevenueCat, family adaptability) unless they apply.

## Step 3 — Wire entry config

`config/test-routing.json`:

```json
{
  "globalCore": "config/process/global-core.json",
  "overlay": "config/process/overlays/turbok.json"
}
```

## Step 4 — Define domains incrementally

Start with 2–3 domains matching actual Turbok architecture. Add domains only with concrete evidence — same rule as family-app.

## Step 5 — L6 store delta

Only if Turbok ships native store binaries. Otherwise omit `config/store-manual-delta.json` or set all items `NOT_APPLICABLE`.

## Verification

```bash
npm run test:changed -- --json
npm run test:domain -- --list
```

No Turbok-specific files are committed in the family-app repo.
