# Activation — Founder QA targeted flag

**Feature:** `activation_first_success_v1`  
**Goal:** Enable First Success for one founder QA family while global `feature_flag.enabled = false` and cohort = 0%.

## Datamodell

Table `family_feature_override`:

| Column | Purpose |
|--------|---------|
| `family_id` | FK → `family`, ON DELETE CASCADE |
| `feature_key` | Allowlisted `feature_flag.key` (today: `activation_first_success_v1`) |
| `enabled` | `true` = allow, `false` = explicit deny |
| `reason` | Operator note (no PII) |
| `source` | e.g. `cli` |
| `created_by` | Operator label |
| `expires_at` | Optional auto-expiry |
| `created_at` / `updated_at` | Audit timestamps |

Unique `(family_id, feature_key)`. No automatic seeds.

Migration: `1810160000000_family_feature_override.js`.

## Precedence (server-only)

Evaluated in `src/lib/activation-flags.js` → `isActivationFlagEnabled(key, familyId)`:

1. Missing or **archived** family → **OFF**
2. Explicit family **deny** override → **OFF**
3. Explicit family **allow** override → **ON** (bypasses global OFF and cohort)
4. Global `feature_flag.enabled` false → **OFF**
5. `ACTIVATION_ONBOARDING_LAUNCH_AT` cohort (if set)
6. Otherwise **ON** when global enabled

Client payloads never influence this path. `familyId` comes from authenticated session / server DB.

## Tenant isolation

- Parents only receive their own family’s `next-action` / readiness flags via `req.user.familyId`.
- Child sessions use child token family scope (existing auth).
- Overrides for other families are not exposed via API.

## Operator commands

Dry-run is default. Writes require `--apply`.

```bash
export FOUNDER_QA_EMAIL='…'   # from secret store — founder household only

npm run feature:family-override -- \
  --family-id <uuid> \
  --feature activation_first_success_v1 \
  --enable \
  --reason founder-dark-launch

npm run feature:family-override -- \
  --family-id <uuid> \
  --feature activation_first_success_v1 \
  --enable \
  --reason founder-dark-launch \
  --apply

npm run feature:family-override -- \
  --family-id <uuid> \
  --feature activation_first_success_v1 \
  --disable \
  --apply

npm run feature:family-override -- \
  --family-id <uuid> \
  --feature activation_first_success_v1 \
  --verify
```

**QA guard:** CLI refuses non-founder families unless `FEATURE_FAMILY_OVERRIDE_SKIP_QA_GUARD=1` (tests only).

**Audit:** `admin_audit_log` with `action=family_feature_override_enabled|family_feature_override_removed`.

**Rollback:** `--disable --apply` or delete row; invalidate cache is automatic via CLI.

**Expiry:** `--expires-at 2026-08-10T00:00:00Z` on enable; expired rows are ignored.

**Safety:** CLI cannot toggle global `feature_flag` — family override only.

## Dark launch (Fas 1)

1. Deploy with global OFF (default).
2. `feature:family-override --enable --apply` on founder QA `family_id`.
3. Verify `--verify` → `effective_enabled: true`, `global_enabled: false`.
4. Run founder browser smoke (dashboard coach, child completion, `first_success`).
5. Remove override after test (`--disable --apply`).

## Tests

- `test/activation-family-feature-override.test.js` — precedence, expiry, archive, cache, QA guard.
- `test/activation-first-success-canonical.test.js` — coach contract.
- `npm run test:activation-first-success-browser` — sv-SE / en-GB harness.

## Cache

In-process override cache (~30s TTL) in `activation-flag-family-cache.js`; invalidated on CLI writes.
