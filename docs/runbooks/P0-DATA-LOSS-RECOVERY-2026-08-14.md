# P0 data loss recovery — 2026-08-14

**Status:** Operator runbook only. Do **not** execute prod restore until recovery DB verification is complete. <!-- pragma: allowlist secret -->

**Incident:** Integration tests truncated prod PostgreSQL on VPS (~13:33 UTC). Known-good state: **282 families**, ~95.7 MB at **13:02 UTC**. <!-- pragma: allowlist secret -->

**Verified recovery source (do not search for newer unless forensic evidence contradicts):**

| Field | Value |
|-------|-------|
| Dump | `/var/lib/app-db-backups/predeploy_2026-08-14T13-02-31-227Z_5eb4edf79be6.dump` |
| Metadata | `/var/lib/app-db-backups/predeploy_2026-08-14T13-02-31-227Z_5eb4edf79be6.meta.json` |
| Created | 2026-08-14 13:02:35 UTC |
| Deploy SHA | `5eb4edf79be6b19d643697a873694b6a4ff7bf3f` |
| Expected families | 282 |
| Expected size | ~95.7 MB |
| SHA-256 | `b031b72088f8f4aab8ead02b9f5722c439b6ed97a1f666845c69dd0e0d54f59f` |
| Format | PostgreSQL custom (`pg_dump -Fc`) |
| pg_restore --list | 794 entries (already validated) |

---

## B1 — Preserve forensic state

Before touching the damaged prod database:

1. **Stop further destructive commands** on VPS — do not run `npm test`, `test:gate`, `release:pre-public-gate`, or `npm run migrate` against prod.
2. **Preserve shell history** — copy `/home/deploy/.bash_history` (or relevant user) to secure storage.
3. **Preserve logs:**
   - `sudo journalctl -u APP_SERVICE --since "2026-08-14 12:30" --until "2026-08-14 14:00" --no-pager > /var/backups/incident-20260814-journal-APP_SERVICE.log` <!-- pragma: allowlist secret -->
   - Deploy / GitHub Actions logs for failed deploy and gate runs.
4. **Preserve deploy snapshots** under `/var/lib/app-db-backups/` and any `artifacts/pre-public-release-gate.json` from failed runs.
5. **Dump damaged DB (new forensic artifact):**
   ```bash
   TS="$(date -u +%Y-%m-%dT%H-%M-%S)"
   OUT="/var/lib/app-db-backups/incident_damaged_${TS}.dump"
   pg_dump "$DATABASE_URL" -Fc -f "$OUT"
   sha256sum "$OUT" | tee "${OUT%.dump}.sha256"
   ```
   Do **not** delete the damaged database.

---

## B2 — Verify known-good dump (read-only)

On VPS (no credentials in shared logs):

```bash
DUMP="/var/lib/app-db-backups/predeploy_2026-08-14T13-02-31-227Z_5eb4edf79be6.dump"
sha256sum "$DUMP"
# Must equal: b031b72088f8f4aab8ead02b9f5722c439b6ed97a1f666845c69dd0e0d54f59f

pg_restore --list "$DUMP" | wc -l
# Expect ~794 list entries; must exit 0
```

Optional: compare with `.meta.json` family count and deployed SHA.

---

## B3 — Restore to separate recovery database

**Do not** use `--clean` against live prod at this stage.

```bash
RECOVERY_DB="incident_recovery_20260814"

# As postgres superuser (adjust if your VPS uses a different admin path)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${RECOVERY_DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${RECOVERY_DB}";
CREATE DATABASE "${RECOVERY_DB}" OWNER <app_role>;
SQL

# Restore (no --clean on prod — this targets RECOVERY_DB only)
pg_restore -d "$RECOVERY_DB" --no-owner --role=<app_role> \
  /var/lib/app-db-backups/predeploy_2026-08-14T13-02-31-227Z_5eb4edf79be6.dump
```

Build a connection URL for the recovery DB (same host/user as prod, different database name). Do not alter the live prod database.

---

## B4 — Verify recovery database

Connect read-only to `incident_recovery_20260814`:

```sql
SELECT COUNT(*) AS family_count FROM family;
-- Expected: 282

SELECT pg_size_pretty(pg_database_size(current_database()));
-- Expect ~95 MB (reasonable match to 13:02 snapshot)

SELECT COUNT(*) FROM parent;
SELECT COUNT(*) FROM child;
SELECT COUNT(*) FROM parent_child;
SELECT COUNT(*) FROM weekly_schedule;
SELECT COUNT(*) FROM weekly_schedule_item;
SELECT COUNT(*) FROM daily_log;
SELECT COUNT(*) FROM daily_log_item;
SELECT COUNT(*) FROM activity_template;
SELECT COUNT(*) FROM category;
SELECT COUNT(*) FROM reward;
SELECT COUNT(*) FROM reward_redemption;
SELECT COUNT(*) FROM family_subscriptions;
SELECT COUNT(*) FROM refresh_token;
SELECT COUNT(*) FROM feature_flag;

SELECT name, applied_at FROM _migrations ORDER BY id DESC LIMIT 5;
-- Compare to 13:02 metadata / deploy SHA 5eb4edf7
```

Referential integrity (examples):

```sql
SELECT COUNT(*) FROM parent_child pc
LEFT JOIN parent p ON p.id = pc.parent_id
WHERE p.id IS NULL;

SELECT COUNT(*) FROM child c
LEFT JOIN family f ON f.id = c.family_id
WHERE f.id IS NULL;
```

Do not print PII (emails, names) in incident reports.

---

## B5 — Post-13:02 delta analysis

Compare **damaged live prod** vs **recovery DB** (counts and timestamps only):

```sql
-- On recovery DB: baseline max created_at per table
-- On damaged prod: rows with created_at > '2026-08-14 13:02:35+00'

-- Families created after backup
SELECT COUNT(*) FROM family WHERE created_at > '2026-08-14 13:02:35+00';

-- Parents / children after backup
SELECT COUNT(*) FROM parent WHERE created_at > '2026-08-14 13:02:35+00';
SELECT COUNT(*) FROM child WHERE created_at > '2026-08-14 13:02:35+00';

-- Subscription / schedule / daily_log changes (adjust columns as needed)
SELECT COUNT(*) FROM family_subscriptions WHERE ... ;
```

**Separate:**

| Category | Indicators |
|----------|------------|
| Integration test fixtures | `@example.com` emails, names like `integration-*`, `sse-coparent-*`, created ~13:33 UTC |
| Potentially legitimate user writes | Real domains, created between 13:02–13:33 UTC |

**Do not** blindly merge damaged-DB rows into recovery. Produce an explicit delta report first.

Known damaged-state fixtures (2026-08-14):

- `integration-*@example.com` (from test helpers)
- `sse-coparent-*@example.com` (from integration tests)
- Created **2026-08-14 13:33:43 UTC**

---

## B6 — prod cutover plan (after recovery DB verified)

Execute only with founder approval. **Maintenance window required.**

1. **Announce maintenance** — read-only / write freeze for users.
2. **`sudo systemctl stop APP_SERVICE`**
3. **Final damaged-prod dump** (forensic):
   ```bash
   pg_dump "$DATABASE_URL" -Fc -f /var/lib/app-db-backups/pre_cutover_damaged_$(date -u +%Y%m%dT%H%M%S).dump
   ```
4. **Verify target prod DB identity** — database name, role, `EXPECTED_DATABASE_IDENTITY_HASH` / backup meta.
5. **Restore verified 13:02 dump into prod DB** using postgres admin:
   - Terminate connections to prod DB
   - `DROP DATABASE` / `CREATE DATABASE` **or** restore into empty DB with `pg_restore --clean` **only after** steps 1–4
   - Use the **verified** dump from B2, not an unverified copy
6. **Selective merge** — only if B5 identified verified legitimate post-13:02 writes (manual SQL or controlled import; never merge test fixtures).
7. **Grants / ownership** — re-apply app role grants if restore used `--no-owner`.
8. **Migration history** — `_migrations` must match deployed code SHA; run `npm run migrate` only after restore if needed (deploy SHA `5eb4edf7` or chosen target).
9. **Verify `SELECT COUNT(*) FROM family = 282`** (or expected after selective merge).
10. **`sudo systemctl start APP_SERVICE`**
11. **Health:** `sleep 3 && curl -s http://127.0.0.1:3000/health`
12. **Smoke:** founder read-only login (no test accounts in reports).
13. **Background jobs:** confirm schedulers / push / email not error-looping in journal.

**Do not deploy new code** until DB recovery is complete and P0 safety PR is merged.

---

## Related code fix

See draft PR on branch `cursor/db-safety-p0-f764` — `TEST_DATABASE_URL` + `TEST_DB_DESTRUCTIVE_CONFIRM` fail-closed guards. **Do not run release gate on VPS** until merged.

**prod RESTORE EXECUTED = NO** (this document is planning only).
