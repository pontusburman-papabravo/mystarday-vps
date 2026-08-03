# Prod backup & restore rehearsal — 2026-08-03

<!-- pragma: allowlist secret -->

Ops-only rehearsal for deploy candidate `e7678a237b7855d3e6a25f2c5c9f4974dcad0ad3` (merged IAP / SSRF / backup-gate on `main`). **No deploy, no live DB migrate, no service restart.** <!-- pragma: allowlist secret -->

## 1. Prod freeze snapshot

| Item | Value |
|------|--------|
| Host | `vps-prod-188-66-60-93` (sanitized label) |
| Rehearsal UTC | `2026-08-03T07:34–07:37Z` (host local +02:00) |
| App systemd unit | `active` | <!-- pragma: allowlist secret -->
| Live checkout SHA | `f0517b318513e174f5fd7a139f39e6219b9a0e0d` |
| `origin/main` | `e7678a237b7855d3e6a25f2c5c9f4974dcad0ad3` |
| `/health` (sanitized) | `{"status":"healthy","version":"2.3.1"}` |
| Disk `/` | ~30% used, ~33G avail |
| PostgreSQL | 16.14 (Ubuntu) |
| Node | v20.20.2 |

## 2. Database identity

All sources matched (shell `.env`, systemd `EnvironmentFiles`, backup gate):

| Field | Value |
|-------|--------|
| **Identity hash** | `08d712b0e6d29743486bb8120030d8991e702f92d29078b60fa8e4211389c942` |
| Driver | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| SSL | `false` |
| DB size (prod) | `90_790_935` bytes |

No `DATABASE_IDENTITY_MISMATCH`.

## 3. Pre-backup read-only snapshot (live DB)

Tool: `db-integrity-snapshot.mjs` from worktree `e7678a23` at `/tmp/rehearsal-e7678a23/repo`.  
Artifact on VPS: `/tmp/rehearsal-report-20260803T093553/pre-snapshot.json` (mode `600`).

| Table | Rows | Fingerprint (sha256) |
|-------|------|----------------------|
| `family` | 279 | `fd2824434ac95bfd813a32fdeaadc294f0a1574c1d6f689d813f13158999b1c8` |
| `parent` | 290 | `1a733837acd08defdd8cadbd851a090b89c7dbb2242c3d4791ba17872bed9f73` |
| `child` | 307 | `a25ea7b95266cfd58e627e4bdb55802c32f9ebc1247e66ed2a4ad80f86f74507` |
| `parent_child` | 330 | `076fee7661181148ef0c26bae6015f6aa32c286cee508b3fad31699c7be62fd1` |
| `weekly_schedule` | 1888 | `539fa4952d71804a688eeb601676887e3069f6e9cd9e962b07940fc7ad96ea9f` |
| `daily_log` | 15597 | `69c67fe862e1608aa33356f3234e1bc6e7c4c2551e042b54d942883a05f0d147` |
| `daily_log_item` | 135930 | `b06ba027872c8586e9465788a236623f3d229688f004c1d75bdff6b8c7d32009` |
| `reward` | 4229 | `75e5dca5511ddd09352bfbee2a885991c41beea1afdb88aa696b2ff4e5afa05c` |
| `reward_redemption` | 34 | (fingerprint null in snapshot schema) |
| `feature_flag` | 39 | `a51cef01ac43a441ecdbbdf74851bf524394a7c179a75883ba79360fcd45919f` |
| `_migrations` | 133 | `090550790acb340cee7af52084c51839a5e210e73325401943c7d947ab03d159` |
| `iap_webhook_log` | 0 | empty-table fingerprint |

Family count ~279 — consistent with expected live dataset scale (not stub/empty).

## 4. Pending migrations (live VPS `_migrations` vs `e7678a23` files)

| Status | Count |
|--------|------:|
| Applied on prod | 133 |
| Migration files on `e7678a23` | 133 |
| **Pending** | **2** |

Pending names only:

1. `1810000000016_iap_event_ordering_audit` — expand-only nullable columns on `family` / `iap_webhook_log`
2. `1810130000000_iap_event_ordering_tiebreak` — expand-only nullable columns on `family`

No other pending migrations. **Not run on live VPS in this rehearsal.**

## 5. VPS backup-gate configuration (deploy path)

| Variable | Status |
|----------|--------|
| `APP_DEPLOY_PRODUCTION` | MISSING (not in `.env`; set only at deploy time today) | <!-- pragma: allowlist secret -->
| `BACKUP_REQUIRED` | MISSING |
| `APP_DB_BACKUP_DIR` | MISSING |
| `PROD_MIN_FAMILY_COUNT` | MISSING |
| `PROD_MIN_DATABASE_BYTES` | MISSING |
| `EXPECTED_DATABASE_IDENTITY_HASH` | MISSING |

Rehearsal used **explicit temporary** gate env (`APP_DEPLOY_PRODUCTION=1` <!-- pragma: allowlist secret -->, `BACKUP_REQUIRED=1`, `PROD_MIN_FAMILY_COUNT=200`, `PROD_MIN_DATABASE_BYTES=50000000`) and backup dir:

- Path pattern: `/home/deploy/<app>-db-backups-rehearsal` (mode `0700`, outside app tree)
- **Future automated deploy remains NO-GO** until live VPS systemd/drop-in sets the above.

## 6. Verified backup (live DB)

| Item | Value |
|------|--------|
| Gate | `pre-deploy-backup-gate.mjs` (`e7678a23` worktree) |
| Candidate SHA | `e7678a237b7855d3e6a25f2c5c9f4974dcad0ad3` |
| Backup basename | `predeploy_2026-08-03T07-36-50-987Z_e7678a237b78.dump` |
| Size | `10_603_680` bytes |
| SHA-256 | `bf40a35833a5e09ed838ea180c1d498d824d3d08bb3ed9188d372c35d3276b80` |
| File mode | `600` |
| `pg_restore --list` entries | 743 |
| Format | PostgreSQL custom (`pg_dump -Fc`), PG 16.14 |
| Identity hash in metadata | matches live VPS |
| Pending at backup time | same 2 migrations |
| Pre-snapshot linked | yes (`pre-backup-rehearsal`) |

**Backup retained on VPS** (not deleted). Do not prune until a newer verified backup exists.

## 7. Restore rehearsal on VPS

**Result: blocked**

- Target attempted: `integrity_restore_20260803_093700`
- Error: `permission denied to create database`
- Cause: application DB role has `rolcreatedb = false`; no `DATABASE_ADMIN_URL`; deploy user has no passwordless `sudo` to `postgres`.

**Required before on-host restore:** grant `CREATEDB` to a dedicated ops role **or** configure `DATABASE_ADMIN_URL` (superuser / createdb) for `verify-backup-restore.mjs` only (see runbook update).

## 8. Supplementary restore validation (same dump, off live VPS host)

To prove dump integrity without mutating live VPS, the **same** `.dump` and pre-snapshot were restored on an isolated CI-style Postgres using `verify-backup-restore.mjs`:

- Target: `integrity_restore_vps_rehearsal_20260803`
- Baseline compare: **OK** (`compare-db-snapshots` with `ignoreIdentityHash`)
- This does **not** replace on-VPS restore rehearsal for deploy sign-off.

## 9. Migration rehearsal (off-host restore copy only)

On the supplementary restore database, pending IAP migrations were applied (expand-only). `_migrations` went 133 → 135. Business-table row counts and fingerprints unchanged except new nullable IAP audit columns (expected).

Second migrate pass: idempotent (no further pending).

**Advisory lock:** `migrate.js` on `e7678a23` uses `pg_try_advisory_lock(1099)` — not exercised on live VPS; covered by repo `migration-rollback-gate.test.js` on disposable DBs.

## 10. Credential / IAP readiness (live VPS `.env`)

Presence only (no values):

| Variable | Status |
|----------|--------|
| `REVENUECAT_API_KEY` | MISSING |
| `REVENUECAT_SECRET_API_KEY` | MISSING |
| `REVENUECAT_IOS_PUBLIC_SDK_KEY` | MISSING |
| `REVENUECAT_ANDROID_PUBLIC_SDK_KEY` | MISSING |
| `REVENUECAT_WEBHOOK_*` | MISSING |
| `REVENUECAT_ALLOWED_APP_IDS` | MISSING |
| `REVENUECAT_ALLOWED_PRODUCT_IDS` | MISSING |
| `REVENUECAT_ENTITLEMENT_ID` | MISSING |

**Exposure class:** `NOT_DETERMINABLE` (no legacy client key in current `.env`).  
Before IAP: configure fail-closed allowlist + public SDK keys + server secrets; if historical `REVENUECAT_API_KEY` ever held `sk_`/`rcsk_`, rotate in RevenueCat dashboard.

## 11. Blockers & owner decisions

| # | Blocker | Owner action |
|---|---------|----------------|
| 1 | On-VPS restore not executed | Provide `DATABASE_ADMIN_URL` or `CREATEDB` ops role; re-run `verify-backup-restore.mjs` on VPS |
| 2 | Backup-gate env not in live VPS systemd | Set `APP_DB_BACKUP_DIR`, `BACKUP_REQUIRED`, `PROD_MIN_*`, optional `EXPECTED_DATABASE_IDENTITY_HASH` |
| 3 | Two pending migrations on live DB | Run only after backup gate on deploy — not in this rehearsal |
| 4 | RevenueCat not configured on VPS | Configure before IAP rollout |
| 5 | Live SHA ≠ `e7678a23` | Normal; deploy is separate after gates pass |

## 12. GO / NO-GO

| Gate | Decision |
|------|----------|
| Backup integrity | **GO** |
| Restore integrity (on VPS) | **NO-GO** |
| Restore integrity (dump + snapshot, off-host) | **GO** (supplementary) |
| Migration safety (expand-only, rehearsal copy) | **GO WITH FOLLOW-UP** (repeat on VPS after restore works) |
| Credential readiness | **GO WITH FOLLOW-UP** |
| IAP rollout | **NO-GO** |
| Deploy `e7678a23` | **NO-GO** |

**LIVE DEPLOY = NO-GO** until on-VPS restore rehearsal passes and backup-gate systemd config is complete.

---

*Rehearsal artifacts on VPS: `/tmp/rehearsal-report-20260803T093553/`, backup under deploy home `*-db-backups-rehearsal/`.*
