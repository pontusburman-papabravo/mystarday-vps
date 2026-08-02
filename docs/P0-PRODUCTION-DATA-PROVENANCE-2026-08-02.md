# P0 — Live data provenance (2026-08-02) <!-- pragma: allowlist secret -->

<!-- pragma: allowlist secret -->
<!-- Incident metadata only — no credentials, PII, or raw connection strings -->

**Status:** OPEN — canonical historical dataset not recoverable from verified backups alone  
**Live site:** HTTPS health endpoint (healthy at investigation time) <!-- pragma: allowlist secret -->
**Deployed app SHA:** `58b9b110a46566eca2c89240642cdcd724825ecc`  
**Incident class:** P0 live data provenance / catastrophic local data loss on VPS PostgreSQL

**Absolute constraints observed during this investigation:** no restore, import, cutover, `DATABASE_URL` change, deletion, feature-flag upsert, product deploy, new migration, or direct mutation of candidate databases. Read-only forensics except one new consistent backup of current live data.

---

## 1. Executive summary

The live app today points at **local PostgreSQL on the VPS** (host category `localhost`, identity hash `5b995b2304ae4e5b`, masked database name `my***y`). That database currently holds only **four families**, all created on **2026-08-01** after an evening reset, with **132** applied migrations and **two** `feature_flag` rows (manually repaired earlier in the incident window).

Journal and scheduler evidence show the **same localhost identity** carried **roughly 300+ active families** through **2026-08-01 ~11:35 UTC** (`Family #279` registration, daily-log generation `generated=306` at 02:00 UTC). Between **~11:35 and ~21:46 UTC on 2026-08-01** the family corpus was wiped or replaced; new families `#2`, `#3`, `#4` were created starting **21:46 UTC**. **No managed Neon/Supabase/RDS host** appeared in deploy-user-readable env copies on the VPS; historical docs still reference Neon from the pre-VPS era.

**No verified `pg_dump` exists for the ~279-family state.** The only custom-format dump captured in this incident is **post-wipe** (362 652 bytes, SHA-256 below). Partial JSON harvest exports from **June 2026** contain **108 families** and are **not** a full snapshot of July/August live.

**Split-brain between two live writers:** **No** (single observed connection identity on VPS). **Data loss + post-wipe stub:** **Yes**.

**Recommended path:** **Alternativ B** (restore historical backup into a **new** local database name, verify, then planned cutover) **if** a pre-wipe dump or provider PITR is found; otherwise **Alternativ A** only if `RC1_QA_DATABASE_URL` / Neon console proves an external DB still holds full history. **Do not resume Fas 7** until canonical DB is chosen and verified.

---

## 2. Current live database

| Metric | Value |
|--------|--------|
| Host category | `localhost` |
| DB identity hash | `5b995b2304ae4e5b` |
| Masked DB name | `my***y` |
| Families | 4 |
| Parents | 4 |
| Children | 2 |
| Signup date range (families) | 2026-08-01 only |
| Approx. DB size | ~15 MB (operator estimate; P0 dump 362 652 bytes) |
| `_migrations` count | 132 |
| `feature_flag` rows | 2 (manual repair; seed incomplete) |
| Daily-log gen (2026-08-02 02:00 UTC) | `generated=1` |

Sources: P0 backup metadata, `app-systemd-unit` journal (`DAILY-LOG-GEN`, `Family #N created`), health endpoint `git_sha`.

---

## 3. Historical product picture

| Period | Evidence | Approx. families |
|--------|----------|------------------|
| Jun 2026 | Operator JSON harvest `stjarndag-full-2026-06-08` | 108 family export dirs |
| Jul 28–31 2026 | `DAILY-LOG-GEN` ~305/day | ~300+ children/families on scheduler path |
| 2026-08-01 before 11:35 UTC | `Family #279 created` | ~279 sequential family counter |
| 2026-08-01 after 21:46 UTC | `Family #2`–`#4` | stub DB |
| Docs / archive | Polsia/Neon handoff, `RELEASE.md` | 200+ families at VPS migration narrative |

---

## 4. Connection timeline (`DATABASE_URL` / host identity)

Normalized identity = SHA-256 of `driver | host | port | database | sslmode` (password **never** hashed).

| Period | Source | Host category | DB identity | Evidence strength |
|--------|--------|---------------|-------------|-------------------|
| Investigation window | Live `app-systemd-unit` process + P0 backup metadata | `localhost` | `5b995b2304ae4e5b` | **High** |
| VPS `.env` / `.env.bak` / `rc1-qa.env` (deploy-readable scans) | Same | `localhost` | `5b995b2304ae4e5b` | **High** |
| Pre-VPS era | `docs/RELEASE.md`, `docs/archive/polsia/*` | `managed_service` (Neon narrative) | *not verified in this run* | **Low** (documentation only) |
| GitHub Actions | `RC1_QA_DATABASE_URL` in `rc1-qa-db-prepare` / release-gate workflows | *unknown without secret read* | *hash not computed* | **Medium** (reference only) |

**First observed localhost live load:** VPS local Postgres has been the live target throughout the Jul–Aug 2026 journal window (daily-log counts imply continuous localhost operation, not a recent cutover from an external host during July).

**Last observed full corpus on localhost:** **2026-08-01 ~11:35 UTC** (family counter #279).

---

## 5. Backup inventory

| Backup | Date | Size | Type | Verifiable | Candidate for ~279 families |
|--------|------|------|------|------------|------------------------------|
| `/home/deploy/p0-incident-backups/20260802T055006Z/live-local.custom.dump` | 2026-08-02 | 362 652 B | `pg_dump` custom | `pg_restore --list` (744 entries) | **No** (post-wipe stub) |
| `…/schema-only.sql` (same dir) | 2026-08-02 | ~181 KB | schema SQL | file present | Schema reference only |
| `…/stjarndag-full-2026-06-08` | 2026-06-08 | ~60 MB | JSON harvest | 108 family dirs | **Partial** (Jun snapshot) |
| `…/stjarndag-harvest-2026-06-02` | 2026-06-02 | ~54 MB | JSON harvest | index + enrich files | **Partial** |
| `/var/backups`, `/opt`, `/srv` (scan) | — | — | — | No other `.dump` / `.sql.gz` found | — |

**P0 live backup checksum:** SHA-256 `76f36e18e156ecf0f6717aaec17364d29c9e48a949b89142409a731953f68d61`  
**Storage:** outside deploy tree, mode `700` dir / `600` files, owner `deploy`.

---

## 6. Candidate databases (aggregated, read-only)

| Candidate | Families | Children | Date range | Size | Migrations | Assessment |
|-----------|----------|----------|------------|------|------------|------------|
| Live VPS localhost (now) | 4 | 2 | 2026-08-01 | ~15 MB / 362 KB dump | 132 | Current stub — **not** historical live |
| VPS localhost pre-wipe (journal inference) | ~279 | ~300+ (scheduler) | through 2026-08-01 morning | unknown | likely 132 | **Probable historical live database** — **no dump found** |
| JSON harvest 2026-06-08 | 108 | (per export) | Jun 2026 | 60 MB tree | N/A | Partial archive |
| External via `RC1_QA_DATABASE_URL` | *not queried* | *not queried* | *unknown* | *unknown* | *unknown* | **Requires founder/GitHub secret or Neon console** |

Row counts for rewards, redemptions, analytics, schedules on live stub were not re-queried in this pass (deploy user cannot read live `.env` over SSH); pre-wipe totals inferred from scheduler and family counter only.

---

## 7. Split-brain assessment

| Question | Result |
|----------|--------|
| Two concurrent write targets with different hosts? | **No** — only `localhost` identity observed on VPS |
| Historical DB last write | **~2026-08-01 11:35 UTC** (last high family counter) |
| Local stub first write | **~2026-08-01 21:46 UTC** (`Family #2`) |
| Local stub latest write | Investigation window Aug 2 |
| Overlap period | **None** on same corpus — wipe/replace, not dual-write |
| Flag | **Not split-brain** — **catastrophic local loss** + new stub |

**Post-wipe local data types (metadata only):** new registrations on 2026-08-01 evening; possible QA/smoke families; minimal daily-log generation (`1` on 2026-08-02). Distinguish customer vs test by signup window and lifetime-free flags in journal (`lifetime_free: true` on stub families).

---

## 8. Risks

- **Customer data loss** for all families not in partial June JSON exports.
- **False recovery** if June harvest mistaken for full live.
- **Schema drift** if an old external Neon instance is reattached without migration audit.
- **Feature-flag gaps** on any restored DB (seed migrations not re-run on empty table).
- **Compliance / trust** until provenance and recovery path are documented to users if needed.

---

## 9. Restore / cutover alternatives (not executed)

### Alternativ A — Reconnect managed database

| Area | Assessment |
|------|------------|
| Risk | Medium — wrong URL or stale schema breaks login |
| Data loss | Low if external DB intact |
| Downtime | Short write pause + restart |
| Rollback | Revert `DATABASE_URL` secret + restart |
| Effort | Medium |
| Recommendation | **Only after** read-only proof that `RC1_QA_DATABASE_URL` (or Neon project) holds ≥200 families and signup dates span pre-Aug-2026 |

### Alternativ B — Restore backup to new local DB

| Area | Assessment |
|------|------------|
| Risk | Medium — need **pre-wipe** dump (currently **missing**) |
| Data loss | Low if good dump exists |
| Downtime | Hours (restore + verify + cutover) |
| Rollback | Point `DATABASE_URL` back to stub + keep stub dump |
| Effort | High |
| Recommendation | **Preferred** once a verified pre-2026-08-01 custom dump or provider snapshot is located |

### Alternativ C — Reconciliation

| Area | Assessment |
|------|------------|
| Risk | High — duplicate keys, orphan rows |
| Data loss | Medium |
| Downtime | Long |
| Rollback | Complex |
| Effort | Very high |
| Recommendation | **Only if** overlap writes proven; current evidence says **not applicable** |

---

## 10. Recommended decision (investigation phase)

1. **Locate pre-wipe backup** — operator laptops, Mac path `operator-mac-deploy-mirror`, Neon PITR, GitHub artifacts, any `pg_dump` before 2026-08-01 21:00 UTC.
2. **Read-only verify** external candidate via `RC1_QA_DATABASE_URL` or Neon console (counts only).
3. **Hold** feature-flag repair until canonical DB selected.
4. **Do not** treat PR #811 / #812 or Fas 6 smoke as closure of this P0.

**Provisional recommendation:** **Alternativ B** when a dump appears; else **Alternativ A** after Neon/secret verification.

---

## 11. Exact verification steps before any cutover

1. Identity hash match checklist for chosen target.
2. Aggregated counts: families, parents, children, schedules, daily_logs, rewards, redemptions, analytics_events.
3. `min`/`max` family `created_at` vs expected history.
4. `_migrations` count and latest name vs app `npm run migrate` manifest on deployed SHA.
5. Orphan checks (children without family, logs without child) — totals only.
6. `feature_flag` key count vs migration-derived expected set (dry-run).
7. Restore rehearsal on **non-live** database name.
8. Fresh P0-style backup of **current** stub before any URL change.
9. Smoke: health, parent login, child PIN, one completion (QA account policy).
10. Founder sign-off on downtime window.

---

## 12. Rollback plan

1. Keep `live-local.custom.dump` (SHA-256 above) immutable.
2. Before cutover, second backup of stub.
3. Rollback = restore previous `DATABASE_URL` in EnvironmentFile + `systemctl restart app-systemd-unit` + health check (no code deploy required).
4. Document rollback SHA separately from data rollback.

---

## 13. Open questions

1. **Who/what wiped localhost data** between 11:35 and 21:46 UTC on 2026-08-01? (No `DROP`/`TRUNCATE` in accessible `app-systemd-unit` journal; possible manual `psql`, fresh DB + migrate, or destructive script outside logged app paths.)
2. Does **Neon** (or other managed project) still exist with full row counts? **Credential:** GitHub environment secret `RC1_QA_DATABASE_URL` and/or Neon org admin.
3. Any **Mac/local operator** `pg_dump` from 2026-07-31 or 2026-08-01 morning?
4. Was **credential rotation** on 2026-08-01 afternoon related? (Operator folder timestamp 17:42 UTC; failed deploy ~13:44 UTC blocked by untracked file — separate from DB but same incident day.)
5. Should **post-wipe real signups** (if any) be merged into recovered DB under Alternativ C?

---

## 14. Feature-flag repair plan (do not run before canonical DB)

**Goal:** Idempotent insert of **missing** default `feature_flag` keys from migration seeds; never overwrite `enabled` / `description` on existing rows.

**Planned ops command (not executed — implement in follow-up ops PR after canonical DB):**

```bash
# 1) Derive expected keys from migrations/* inserting into feature_flag
# 2) Dry-run: SELECT key FROM feature_flag → diff → print missing keys only
# 3) Apply: INSERT … ON CONFLICT (key) DO NOTHING — never UPDATE existing rows
# Guard: FF_RESEED_CONFIRM=1 and explicit --apply on ops host only
```

**Tests required before any apply:** fresh DB, full seeded DB, deliberately emptied `feature_flag` table — assert missing keys only, no updates to existing rows.

---

## 15. Related PRs (not closure of P0)

| PR | Branch | CI | Merge guidance |
|----|--------|-----|----------------|
| #811 | `cursor/stabilize-fas6-concurrency-ci-01b8` | SUCCESS | OK to merge if still green — test TRUNCATE retry only; **no deploy required** |
| #812 | `cursor/fas6-prod-smoke-report-01b8` | SUCCESS | OK if doc sanitized — Fas 6 smoke only; **does not resolve P0** |

---

## 16. Fas 7 GO / NO-GO

**NO-GO** until:

- Canonical live database identified and verified,
- Recoverable backup or provider snapshot confirmed,
- Cutover verification checklist (§11) completed on a rehearsal DB,
- Feature-flag repair dry-run acceptable on chosen DB.

---

## Appendix A — Step 1 artefact manifest (sanitized)

| Artefact | Notes |
|----------|--------|
| `live-local.custom.dump` | 362 652 B, SHA-256 above |
| `pg_restore_list.txt` | 744 lines |
| `schema-only.sql` | schema-only dump |
| `metadata.json` | identity hash, deployed SHA, timestamps |
| systemd unit | not captured (sudo required on VPS) |
| EnvironmentFile | path under `/var/www/…/shared/.env` — not readable by deploy SSH user |

---

*Report prepared under read-only incident rules. No restore, cutover, or live mutation performed.*
