# PR-825 — Database safety gate (pre-deploy)

This runbook is **mandatory** before applying IAP migration `1810000000016_iap_event_ordering_audit` (and follow-up `1810130000000_iap_event_ordering_tiebreak`) on production. It does **not** authorize deploy by itself; every step must pass or the outcome is **NO-GO**.

**Supersedes:** informal checklists only. Pair with `docs/PR-825-PRE-DEPLOY-CHECKLIST.md` and `docs/PR-825-MERGE-READINESS-2026-08-02.md`.

---

## Rollback policy (normal)

- Migration `down` is **destructive** (drops nullable IAP columns). **Do not** use `down` as production rollback.
- **Normal rollback:** keep migrated schema; roll back **application code** only if the previous release is compatible with the new nullable columns.
- If the previous code version is **not** compatible with the new columns, **block deploy** until a forward-fix or a compatible rollback build exists.
- **Database restore** from backup only after verified data corruption and a separate incident decision — never wired into deploy scripts.

---

## 6.1 Identify the correct database

Prove that these four targets share the **same database identity** (never log full `DATABASE_URL`):

| Component | What to check |
|-----------|----------------|
| Active Node (systemd app unit) | `DATABASE_URL` in process environment |
| Deploy script / `npm run migrate` | Same `DATABASE_URL` as systemd unit |
| Backup command | Same host, port, database name, user, SSL mode |
| This runbook’s pre-check script | Hash matches |

**Identity hash** (store in deploy log):

```bash
# Example — adjust to your secret store; output is non-secret fingerprint only
node -e "
const u=new URL(process.env.DATABASE_URL);
const crypto=require('crypto');
const id=[u.protocol,u.hostname,u.port||'5432',u.pathname.slice(1),decodeURIComponent(u.username),'ssl='+(!u.hostname.includes('localhost'))].join('|');
console.log(crypto.createHash('sha256').update(id).digest('hex'));
"
```

If any path disagrees: **NO-GO**.

---

## 6.2 Stop on wrong data volume (read-only)

Before backup or migration, run read-only counts on production (or a verified read replica). Compare to **expected post-restore baseline** (order of magnitude — not empty/stub).

| Table / check | Purpose |
|---------------|---------|
| `family` | Core households |
| `parent`, `child` | Accounts |
| `weekly_schedule` (+ items if sampled) | Schedules |
| `daily_log` (+ items) | Activity history |
| `reward`, `reward_redemption` | Skattkammaren |
| `feature_flag` | Ops flags |
| `_migrations` | Applied migration count |

**Rules:**

- No PII in the report (counts only).
- If totals are far below restored historical baseline (e.g. near-zero families): **NO-GO**.

---

## 6.3 Create a new backup immediately before deploy

Requirements:

1. **PostgreSQL** `pg_dump -Fc` (custom format) to a path **outside** the application deploy directory.
2. Global roles/metadata if your restore procedure requires it.
3. App bundle: tagged git SHA, sanitized env **keys only** (not values), systemd unit, nginx site, upload archive if applicable.
4. File mode `0600` (or stricter group policy).
5. Record: UTC timestamp, git SHA, database identity hash, `pg_database_size`, free disk on backup volume.
6. **SHA-256** of dump file stored beside the dump.

---

## 6.4 Verify the backup

Before migration:

```bash
pg_restore --list /path/to/backup.dump | head
```

Confirm:

- File size &gt; 0
- Checksum file matches
- List includes core tables (`family`, `parent`, `child`, `iap_webhook_log`, …)
- Free disk ≥ 2× dump size for restore rehearsal
- Archive is readable (no truncation)

“Dump exited 0” alone is **not** sufficient.

---

## 6.5 Restore rehearsal (disposable database)

On a **separate** server or local disposable instance:

1. `CREATE DATABASE` (unique name, not production).
2. `pg_restore` the new dump into it.
3. Compare table counts to production pre-deploy snapshot.
4. Run pending migrations (expect `1810000000016` + `1810130000000` only if not already on restore point).
5. Run IAP-focused tests (`test/iap-webhook*.js`, `test/revenuecat-*.js`) against rehearsal DB.
6. Confirm no row loss on `family`, `iap_webhook_log`, rewards, flags.

**Never** restore over production. Failure: **NO-GO**.

---

## 7. Production migration execution

Prerequisites: §6.1–6.5 passed, maintenance window agreed if required.

1. Confirmed backup + rehearsal.
2. Record exact deploy git SHA.
3. `SELECT name FROM _migrations ORDER BY id` → list pending; expect **only** planned migrations.
4. Confirm single expected forward migration(s) for this release.
5. Short read-only/maintenance window per deploy model.
6. Log start/end (no credentials).
7. `migrate.js` sets `lock_timeout` / `statement_timeout` and **advisory lock 1099** — do not run a second migrator in parallel.
8. Check `pg_stat_activity` for long transactions before migrate.
9. One deploy + one migration runner at a time.
10. Post-migrate: schema columns present, counts unchanged (§8).

---

## 8. Post-deploy read-only verification

Compare to pre-deploy snapshot:

- Counts: families, parents, children, schedules, daily logs, rewards, redemptions, feature flags, subscription rows, `iap_webhook_log` rows.
- **Expectation:** migration alone does not change business counts.
- New nullable IAP columns exist on `family` / `iap_webhook_log`.
- `/health`: `iap_webhook_ready` reflects allowlist config; no secret values in JSON.
- No migration errors in journal; no FK/constraint errors.
- No unexplained subscription status shifts attributable to migration.

---

## 9. Incident / rollback

On application failure after migrate:

1. Stop rollout.
2. Disable IAP processing via safe config (empty webhook impact: allowlist / feature flags) if needed.
3. **Keep** database schema.
4. Revert code only to a build compatible with nullable IAP columns.
5. Schema bugs → forward migration, not `down` on prod.
6. DB restore → incident commander only, from §6.3 dump.

No automatic DB restore in CI/CD.

---

## Automated checks in CI / agent runs

| Check | Test / script |
|-------|----------------|
| Expand-only new migrations | `test/migration-destructive-contract.test.js` |
| No edits to shipped migrations | `test/migration-files-immutable.test.js` |
| Empty / pre-0016 / restore-like DB | `test/migration-iap-safety.integration.test.js` |
| Disposable DB guard | `scripts/assert-disposable-database.mjs` |

Static SQL analysis is **not** complete protection — it is an extra gate alongside disposable DB rehearsals.

---

## Related migrations

| Name | `up` | `down` |
|------|------|--------|
| `1810000000016_iap_event_ordering_audit` | Nullable IAP ordering + audit columns | Drops columns — **not** prod rollback |
| `1810130000000_iap_event_ordering_tiebreak` | Nullable `iap_last_revenuecat_event_id`, `iap_last_event_type` | Drops columns — **not** prod rollback |

---

*Document version: PR-825 P1 closeout. See workspace deploy rules (`.cursor/rules/*-deploy.mdc`) for host, service, and path.*
