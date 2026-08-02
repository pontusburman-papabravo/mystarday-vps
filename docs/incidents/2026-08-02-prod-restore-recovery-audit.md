# P0 Live Restore Recovery Audit — 2026-08-02

**Status:** `DB MIGRATION HUMAN GATE REQUIRED` (Scenario C)  
**Recovery verdict:** `CODE RECOVERED — DB GATE PENDING`  
**Operator:** Cursor cloud agent (single-agent, Composer 2.5)  
**Audit dir (VPS):** `/var/tmp/<app>-recovery-audit-20260802-20260802T082441Z/`  
**Recovery backup (VPS):** `/home/deploy/<app>-backups/recovery-20260802T082633Z/` (chmod 700)

No live-env mutate/deploy/migrate/restart was performed after inventory + backup.

---

## 1. Recovery verdict

`CODE RECOVERED — DB GATE PENDING`

Stop signal for next step: **`DB MIGRATION HUMAN GATE REQUIRED`**

Chosen scenario: **C** — server code is behind stable candidate; live DB is missing required migrations for that candidate. Deploy + migrate were intentionally not executed.

---

## 2. Restore identity

| Item | Result |
|------|--------|
| Server reboot / restore window | Boot `2026-08-02 10:04 CEST`; app service started `10:12:32 CEST`; uptime ~19 min at audit start |
| App tree mtime | `$VPS_APP_PATH` ≈ `2026-07-30 07:44 CEST` |
| Last migration applied | `1810000000015_iap_webhook_log_audit_fields` at `2026-07-30 07:44:54` |
| Last new family `created_at` | `2026-07-30 07:45:05 UTC` |
| DB size | ~64 MB |
| Families / parents / children | **276 / 287 / 304** (not the Aug-1 stub of ~4/4/2) |
| Completions (`daily_log_item`) | 133 121 rows; last pre-gap `completed_date` **2026-07-29**; post-restore activity on **2026-08-02** |
| Estimated data gap vs incident (~2026-08-01 11:35 UTC) | **~28–36 hours** of missing new signups + routine activity after ~2026-07-30 08:00 UTC through wipe |
| Confidence | **HIGH** that this is a real Jul-30 full restore, **not** the stub DB |
| Backup created now | `/home/deploy/<app>-backups/recovery-20260802T082633Z/` — `pg_dump` custom ~10 MB, `pg_restore --list` 726 lines, app tarball ~499 MB, data/uploads ~40 MB, SHA-256 written; globals dump failed (no passwordless superuser) |

```text
Databasen innehåller data fram till ungefär:
2026-07-30 08:05 UTC (analytics/family edge); family signups stop 2026-07-30 07:45 UTC

Uppskattad dataförlust jämfört med incidenttid:
~28–36 hours (new families + day-to-day writes Jul 30 afternoon → Aug 1)

Säkerhetsnivå:
HIGH (identity of restore point); MEDIUM for completeness of post-Jul-30 data (no later dump/WAL found)
```

Later recovery sources searched (read-only): `/home/deploy`, `/var/tmp`, `/tmp`, `/var/backups`, app `Backup/` harvests (Jun 2026 only), no Docker, single disk `vda2`, no pgBackRest/Barman, no newer `pg_dump` than the one created in this audit.

---

## 3. Code state

| Punkt | Resultat |
|-------|----------|
| Server HEAD | `8118f4bbe4624119e4d7a109a81563bb1584a90a` (detached, shallow; docs audit 2026-07-30) |
| `origin/main` | `58b9b110a46566eca2c89240642cdcd724825ecc` |
| Senaste verifierade stabila candidate | `58b9b110…` (tip of main; PR #809 merge; SW `stjarndag-v753`) |
| Server bakom candidate | yes (server SW `stjarndag-v739`) |
| Ocommittade serverändringar | nej (tracked clean); untracked ops/harvest dirs present |
| Candidate CI (GitHub) | fail on one Fas6 concurrent flake; local `test:gate` **pass** on disposable DB |
| Candidate previously live-verified | claimed by incident brief; GH “Deploy to VPS” for #809 was **skipped** after CI fail |
| Last successful GH deploy before incident | `2f84364e` (PR #804) and `5164db4c` (PR #806, SW v750) on 2026-08-01 ~07:44–07:49 UTC |
| PR #813 included | **nej** (draft/open; harness-only; not on `main`) |

### Why `58b9b110` is the candidate

1. Tip of `origin/main` and merge of PR #809.  
2. Contains required handoff + first-star starter work and SW `stjarndag-v753`.  
3. Ancestor of no further main commits (`count_after=0`).  
4. Local disposable-DB gate green (see §6).  
5. Explicitly **not** choosing draft PR #813 (`8a9c4119`).

### Explicitly not included

- Draft PR #813 / `cursor/rc1-handoff-navigation-race-a8bb` / `8a9c4119` and later harness commits.  
- Floating `git pull` / “latest whatever is checked out”.  
- Any deploy performed in this run.

Fallback reference `caa5753d…` remains valid ancestor on main but is behind `58b9b110` and still needs the same handoff migrations (minus `181011`).

---

## 4. Database state

| Item | Result |
|------|--------|
| Migration table | `_migrations` (id, name, applied_at) |
| Migrations in DB | **128** rows; latest `1810000000015_…` @ 2026-07-30 07:44:54 |
| Migrations in candidate code | **130** files under `migrations/` |
| Missing in DB (schema-impacting for candidate) | `1810000000017_pin_notification_log`, `1810000000018_parent_session_handoff`, `1810100000000_handoff_refresh_fk_set_null`, `1810110000000_first_star_starter_kind` |
| Present in DB under non-filename `name` | `ensure_features_schema`, `normalize_features_documentation` (already applied) |
| Extra in DB not in candidate filenames | `1808920000000_survey_respondent_core`, `1808930000000_survey_response_campaign_ref` (orphaned history; do not delete) |
| Integrity | orphans mostly 0; `weekly_schedule`→missing child = **6**; no duplicate parent emails / child usernames |
| Sequences | no sequence behind MAX(id) for sampled integer PKs |
| Schema support for stable handoff/locale/rewards | **Incomplete until the four migrations above run** (`parent_session_handoff` / `pin_notification_log` / `daily_log_item.starter_kind` absent) |

### Migration matrix (delta only)

| Migration | I vald kod | I live-DB | Säker att köra | Rollback | Åtgärd |
|-----------|----------:|----------:|----------------|----------|--------|
| 1810000000017_pin_notification_log | ja | nej | additive CREATE TABLE/INDEX | DROP TABLE | **HUMAN GATE** then migrate |
| 1810000000018_parent_session_handoff | ja | nej | additive CREATE TABLE/INDEX | DROP TABLE | **HUMAN GATE** then migrate |
| 1810100000000_handoff_refresh_fk_set_null | ja | nej | ALTER FK + DROP NOT NULL (needs 0018) | down() deletes NULL FK rows then restores CASCADE | **HUMAN GATE** |
| 1810110000000_first_star_starter_kind | ja | nej | ADD COLUMN + partial UNIQUE INDEX on `daily_log_item` (~133k rows; short lock risk) | DROP INDEX/COLUMN | **HUMAN GATE**; prefer low-traffic window |

No live migrate dry-run exists in tooling; analysis is static + disposable-DB proof only.

---

## 5. Actions performed

### Read-only / documentation

- Created audit directory and captured host/systemd/git/checksum/health metadata.  
- `git fetch --all --prune` on VPS (no checkout change).  
- Read-only SQL aggregates + integrity checks.  
- Searched for alternate dumps/WAL/snapshots (none newer found).  
- Compared SHAs via local git + `gh`.

### Mutating (allowed Phase 2 only)

```bash
# On VPS as deploy — backup only
bash /var/tmp/02-create-backup.sh
# → /home/deploy/<app>-backups/recovery-20260802T082633Z/
chmod -R go-rwx /home/deploy/<app>-backups
```

### Explicitly NOT done

- No `git reset/clean/pull` in `$VPS_APP_PATH`  
- No `npm install/ci/build/migrate` in live app dir  
- No `systemctl restart/reload`  
- No SQL DDL/DML on live DB  
- No deploy via `scripts/vps-deploy-revision.sh`  
- No restore from older backup  

### Offline verification (local cloud agent VM)

- Disposable DB `<app>_recovery_gate` on localhost (not live).  
- Candidate `58b9b110` `npm run migrate` + gates (see §6).

---

## 6. Automated verification

| Kommando | Resultat | Exit | Logg |
|----------|----------|------|------|
| `pg_dump` + `pg_restore --list` (live → backup) | VERIFY_OK (726 TOC lines) | 0 | VPS `BACKUP_LOG.txt` |
| Disposable `npm run migrate` @ `58b9b110` | Migrations complete incl. 0017/0018/181010/181011 | 0 | `/tmp/recovery-test-logs/migrate-disposable.log` |
| `NODE_ENV=test … npm run test:gate` (disposable DB) | pass 1680 + 330; fail 0 | 0 | `/tmp/recovery-test-logs/test-gate.log` |
| `npm run audit:i18n:strict` | 0 hits | 0 | `/tmp/recovery-test-logs/audit-i18n-strict.log` |
| `npm run check:css` | CACHE_NAME=stjarndag-v753; no diff | 0 | `/tmp/recovery-test-logs/check-css.log` |
| `node --test test/migration-rollback-gate.test.js` | 3/3 pass | 0 | `/tmp/recovery-test-logs/migration-rollback-gate.log` |
| Handoff integration suite (5 files) | 26/26 pass | 0 | `/tmp/recovery-test-logs/handoff-tests.log` |
| GitHub CI @ `58b9b110` | historical fail (Fas6 concurrent flake) | 1 | run `30710022155` |

---

## 7. Live smoke

| Smoke | Result |
|-------|--------|
| `systemctl is-active` app unit | PASS (`active`) |
| `GET /health` local + public | PASS (`healthy`, `git_sha=8118f4bb…`) |
| SW cache expected `stjarndag-v753` | FAIL vs current (`stjarndag-v739`) — expected until deploy |
| Family count still 276 after audit | PASS |
| Parent/child login, handoff, locale, rewards, mobile, PWA | **NOT RUN** (blocked pending migration human gate + deploy) |
| Controlled service restart survival | **NOT RUN** (restart forbidden until gate) |

---

## 8. Remaining blockers

1. **Human approval to run the four pending migrations on the live DB** (Scenario C).  
2. **Exact-SHA deploy of `58b9b110…` only after migration plan approval** (use `scripts/vps-deploy-revision.sh`, never floating pull).  
3. **Accepted data-loss window** ~2026-07-30 08:00 UTC → incident; no later DB artifact found on this VPS.  
4. **Globals/roles dump** still missing (needs sudo/postgres superuser).  
5. **Manual device smoke** (iPhone/Android + founder QA account) after deploy.  
6. **Six orphan `weekly_schedule` rows** (non-blocking; cleanup later).

---

## 9. Rollback

| Item | Value |
|------|-------|
| Backup path | `/home/deploy/<app>-backups/recovery-20260802T082633Z/` |
| Backup time | `2026-08-02T08:26:33Z` |
| Dump SHA-256 | `b367c1d66fe42f05b555480dcb284588901d3294fc1534c903aaf76e3ee1ee18` (`db/*.dump`) |
| SHA before any future deploy | `8118f4bbe4624119e4d7a109a81563bb1584a90a` |
| Code rollback | `DEPLOY_SHA=8118f4bbe4624119e4d7a109a81563bb1584a90a` via `scripts/vps-deploy-revision.sh` (or script’s built-in rollback) |
| DB rollback | restore custom dump with `pg_restore` into a **new** database first; cut over only after verification; do not overwrite without a second pre-change dump |

---

## 10. Final recommendation

1. **Är återläsningen korrekt?** Ja — fullständig Jul-30-kopia med ~276 familjer, inte stub-DB.  
2. **Hur mycket data saknas?** Cirka **1–1.5 dygn** (efter ~2026-07-30 08:00 UTC till wipe ~2026-08-01 11:35 UTC).  
3. **Kör servern senaste stabila kod?** **Nej** — `8118f4bb` / SW v739; candidate `58b9b110` / SW v753.  
4. **Är DB-schemat kompatibelt med candidate?** **Nej** — saknar 4 migrationer (handoff/PIN log/first-star starter). Nuvarande gamla kod ↔ DB är sinsemellan konsistenta.  
5. **Är miljön säker att använda?** **Begränsat ja** för restored Jul-30 feature set (service healthy, logins observed), men **inte** som “fullt återställd modern release”; handoff/first-star från senare main saknas.  
6. **Manuella kontroller kvar:** approve migration plan → exact-SHA deploy → health/`git_sha`/SW v753 → founder-QA functional smoke (incl. handoff + locale) → accept data-gap communication.

### Proposed post-approval deploy preamble

```text
DEPLOY_FROM=8118f4bbe4624119e4d7a109a81563bb1584a90a
DEPLOY_TO=58b9b110a46566eca2c89240642cdcd724825ecc
DATABASE_MIGRATIONS_REQUIRED=yes
BACKUP_VERIFIED=yes
TEST_GATE=pass
HUMAN_GATE=pending
```


---

## 11. Targeted Restore/2026-08-02-1 forensics (follow-up)

**Analysis dir:** `/var/tmp/<app>-targeted-restore-analysis-20260802T091146Z/`  
**Verdict:** `INCIDENT EVIDENCE FOUND — NO GAP DATA`  
**Stub dump:** `STUB DATABASE CONFIRMED`  
**Recovery decision:** unchanged — `CODE RECOVERED — DB GATE PENDING` / `DB MIGRATION HUMAN GATE REQUIRED`

### File identity (SHA stable before/after)

| Fil | Format | Storlek | SHA-256 | Klassificering |
| --- | ------ | ------: | ------- | -------------- |
| `backup-before-full-restore.env` | UTF-8 text | 2921 | `4208ca29…8401` | Same as active `.env` |
| `live-local-20260802T065849Z.custom.dump` | PG custom v1.15-0 | 365433 | `ebaf81de…9352` | Stub dump (incident evidence) |
| `<app>.service.backup` | UTF-8 text | 529 | `255f8004…03c94` | Same as active systemd unit |
| `operator-local-MAC.tar.gz` | gzip/tar (~114 MiB unpacked) | 7550277 | `66568656…7636` | Jun-2026 harvest JSON + ad-hoc scripts |
| `p0-incident-backups-MAC.tar.gz` | gzip/tar (~4.6 MiB unpacked) | 693236 | `3aeaedc0…ec57` | Stub dump series + wipe-window journal |

All five originals: size/mtime/SHA unchanged after analysis.

### Stub dump

- Archive created **2026-08-02 06:58:49 UTC** (filename + `pg_restore --list` agree).
- PG 16.14 custom/gzip; TOC ~743 lines; schema includes `parent_session_handoff` / `pin_notification_log` / `starter_kind`.
- Metadata siblings: **4 families / 4 parents / 1 child**; `family_max_created=2026-08-01 23:14:53+02`; **132 migrations**; `deployedGitSha=58b9b110…`.
- Same SHA as archive member `…/20260802T065849Z-manual-from-mac-request/live-local.custom.dump`.
- **Not** a full recovery source (≈365 KB vs current restored dump ≈10 MB / 276 families).

### `p0-incident-backups-MAC.tar.gz`

- Six ~365 KB `live-local.custom.dump` snapshots from **2026-08-02 05:50–06:58 UTC** (pre-freeze → post-stop → manual).
- Forensics journal `*-journal-wipe-window.txt` (~2.1 MB, 14 254 lines): app logs **2026-08-01 ~10:04 CEST → 2026-08-02 ~00:56 CEST**.
- No WAL/datadir/`PG_VERSION`/base backup.
- No `DROP DATABASE` / `dropdb` / `pg_restore` / `npm run migrate` strings in journal.
- Timeline evidence (local CEST = UTC+2):
  - `11:35:48` Family **#279** created (`lifetime_free: false`) — full DB still present.
  - `19:23:43` deploy restart; push milestones still fire for many children at `19:28` — full DB still present.
  - `20:44:28` existing Apple Sign-In login **200** — full DB still present.
  - `21:46:26` Family **#2** created (`lifetime_free: true`) — stub DB in effect.
- **Likely wipe window:** **2026-08-01 18:44–19:46 UTC** (20:44–21:46 CEST). Exact wipe command: **UNCONFIRMED**.

### `operator-local-MAC.tar.gz`

- Path prefix `deploy/<app>-vps-operator-local/20260801/`.
- 218 `harvest.json` under Backup harvests dated **2026-06-02 / 2026-06-08** only.
- Ad-hoc diagnose scripts; `package*.backup`; no `.git`, no `.env`, no SQL/WAL/PG datadir, no gap-period exports.

### Env + systemd

- Backup `.env` **byte-identical** to active `.env`; `DATABASE_URL` → `localhost:5432` same user/db fingerprints as live process.
- No rclone/restic/pgBackRest/Barman/Hetzner/WAL backup config keys.
- Systemd backup **identical** to active unit: `ExecStart=/usr/bin/node server.js`, EnvironmentFile=`$VPS_APP_PATH/.env`, **no** ExecStartPre migrate/build hooks.

### Effect on plan

1. Datagap **not reduced** for Jul-30→wipe business data.  
2. Gap-interval DB rows **not recoverable** from these five files.  
3. No full backup / PITR / WAL material here.  
4. External provider backups: **no credentials/paths found** in this material; still worth separate Hetzner/snapshot check outside these files.  
5. Migration human gate **unchanged**.  
6. Candidate `58b9b110` **unchanged** (stub era already ran it against empty DB; restored Jul-30 DB still lacks 0017/0018/181010/181011).  
7. Keep **`DB MIGRATION HUMAN GATE REQUIRED`**.

### Next safe step

Do **not** import stub dumps. Keep disposable-only policy. Proceed only after human approval of the four migrations + exact-SHA deploy plan already documented above. Optionally investigate host/provider snapshots covering **2026-08-01 18:00–20:00 UTC** outside this archive set.
