# Pre-deploy database backup gate

Mandatory **ops-only** protection before `npm run migrate` on production VPS deploys. No product code changes — scripts, deploy integration, and tests only.

> **A verified backup is not sufficient long-term proof until a restore rehearsal has been performed.**

See also: `docs/VPS-DEPLOY-GITHUB-ACTIONS.md`, `scripts/vps-deploy-revision.sh`.

---

## Configuration (VPS — do not commit real values)

| Variable | Purpose |
|----------|---------|
| `BACKUP_REQUIRED` | Must be `1` for production deploy (`APP_DEPLOY_PRODUCTION=1` or `NODE_ENV=production`) |
| `APP_DB_BACKUP_DIR` | Directory **outside** the app tree for `.dump` + `.meta.json` (mode `0700`) |
| `APP_DEPLOY_PRODUCTION` | Set to `1` by `vps-deploy-revision.sh` on VPS |
| `PROD_MIN_FAMILY_COUNT` | Fail-closed floor for `family` row count (order-of-magnitude guard, not exact) |
| `PROD_MIN_DATABASE_BYTES` | Fail-closed minimum `pg_database_size` |
| `EXPECTED_DATABASE_IDENTITY_HASH` | Optional SHA-256 identity fingerprint — mismatch blocks deploy |
| `BACKUP_MIN_FREE_BYTES` | Free disk required on backup volume (default 2_000_000_000) |
| `BACKUP_EMERGENCY_MARKER_FILE` / `DEPLOY_EMERGENCY_MARKER` | **Incident only:** short-lived JSON marker (max 30 min) — skips `pg_dump` after identity guards; env `BACKUP_EMERGENCY_OVERRIDE` is **rejected** |
| `DISPOSABLE_DB_PREFIX` | Prefix required for restore rehearsal DB names (default `integrity_restore_`) |
| `PROTECTED_DATABASE_NAME` | Production DB name — refused as restore target |
| `DEPLOY_SHA` | Git SHA (set by deploy script) |

Placeholders in `.env.example` — configure on VPS via systemd drop-in or deploy env.

---

## Normal deploy order (`vps-deploy-revision.sh`)

1. Preflight / checkout candidate SHA  
2. `npm ci`  
3. **Pre-deploy snapshot** → `data/deploy/snapshots/pre-<sha>.json`  
4. **Backup gate** → `pg_dump -Fc` under `APP_DB_BACKUP_DIR` + metadata + verification  
5. `npm run migrate` (only if gate passed)  
6. Restart + `/health`  
7. **Post-deploy snapshot** + compare to pre-deploy (business tables; `_migrations` may increase)

If the backup gate fails, **migrate and restart do not run**. Backup files are **not** deleted on failure.

---

## Backup format

- PostgreSQL custom format (`pg_dump -Fc`)  
- Sidecar `*.meta.json`: UTC time, deploy SHA, identity hash, sizes, SHA-256, pending migrations list (names only), family count  
- **No credentials** in metadata or logs  

Verify locally:

```bash
pg_restore --list /path/to/backup.dump | head
```

---

## Database identity hash

Computed from: driver, host, port, database name, user, SSL mode — **never** the password or full URL.

```bash
node -e "import('./scripts/ops/lib/database-identity.mjs').then(m=>console.log(m.databaseIdentityHash(process.env.DATABASE_URL)))"
```

(Run on VPS with `DATABASE_URL` in environment; do not print the URL.)

---

## Snapshot JSON (read-only)

Script: `scripts/ops/db-integrity-snapshot.mjs`

Per table (when present): `row_count`, `min_id`, `max_id`, timestamp bounds, `row_fingerprint_sha256` from **non-PII** columns only (ids, statuses, foreign keys — no email, names, tokens, PIN hashes).

Compare:

```bash
node scripts/ops/compare-db-snapshots.mjs --before pre.json --after post.json
```

**Note:** Live traffic between two snapshots can change counts and fingerprints. Comparison is an **alarm**, not transactional proof. Post-migrate deploy compare expects **no business-table drift** from migration alone.

---

## Restore rehearsal (manual / CI disposable)

```bash
export DATABASE_URL=postgresql://...@localhost:5432/postgres
node scripts/ops/verify-backup-restore.mjs \
  --backup /path/to/backup.dump \
  --target-db integrity_restore_20260802 \
  --baseline-snapshot pre.json \
  --run-migrate
```

Requirements:

- Explicit backup file path  
- Target DB name must start with `DISPOSABLE_DB_PREFIX`  
- Refuses `PROTECTED_DATABASE_NAME` and blocked names  
- **Never** targets production  

Run rehearsal:

- After backup/restore script changes  
- Before large migrations  
- Before paid/IAP rollout  
- After DB incident  
- Periodically per ops policy  

---

## Retention (policy — no aggressive auto-delete in gate)

- Keep last **N** verified backups (recommend N ≥ 7 on VPS)  
- Keep daily backups **30** days where disk allows  
- **Never** delete the only verified backup  
- Prune only after a **new** backup passes `pg_restore --list` + checksum  
- Log deleted filenames  
- Mark incident backups (manual) — exclude from auto-prune  

Pre-deploy gate checks **free disk** before `pg_dump`; it does **not** auto-prune.

---

## Incident & rollback

- **No automatic DB restore** in deploy scripts  
- App rollback: revert git + redeploy previous SHA (existing rollback in deploy script)  
- DB restore: separate incident decision + rehearsal-tested dump  
- `BACKUP_EMERGENCY_MARKER_FILE` / `DEPLOY_EMERGENCY_MARKER`: skip `pg_dump` only when a valid marker file is present (see below). Identity hash and family/migration guards still run. **Do not** set `BACKUP_EMERGENCY_OVERRIDE` in `.env` or systemd — the gate rejects it.

### Emergency marker file (incident only)

Create a JSON file on the VPS (not in git), pass path via `DEPLOY_EMERGENCY_MARKER` for one deploy:

```json
{
  "acknowledged": "INCIDENT_ACKNOWLEDGED",
  "deploy_sha": "<40-char DEPLOY_SHA>",
  "operator": "on-call-handle",
  "created_at_utc": "2026-08-02T18:00:00.000Z"
}
```

Valid for 30 minutes; must match `DEPLOY_SHA`. Logged with operator and UTC time. Remove file after incident deploy.

---

## Migration runner lock

`migrate.js` on `main` may not yet include `pg_try_advisory_lock`; deploy uses GitHub Actions `concurrency: vps-deploy` and a single `npm run migrate` per deploy. When advisory lock lands (separate PR), contract tests will assert lock/unlock patterns.

---

## Scripts

| Script | Role |
|--------|------|
| `scripts/ops/pre-deploy-backup-gate.mjs` | Gate implementation |
| `scripts/ops/pre-deploy-backup-gate.sh` | Shell wrapper |
| `scripts/ops/db-integrity-snapshot.mjs` | Read-only snapshot |
| `scripts/ops/compare-db-snapshots.mjs` | Pre/post compare |
| `scripts/ops/verify-backup-restore.mjs` | Disposable restore rehearsal |

---

## Automated vs manual

| Step | Auto on VPS deploy | Manual |
|------|-------------------|--------|
| Pre snapshot | Yes | — |
| pg_dump + verify | Yes (if `BACKUP_REQUIRED=1`) | — |
| Migrate | Yes (after gate) | — |
| Post snapshot compare | Yes | — |
| Full restore rehearsal | No | Required before major releases |
| Retention pruning | No | Ops cron (documented) |
